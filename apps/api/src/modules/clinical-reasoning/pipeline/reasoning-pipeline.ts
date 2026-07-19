import { ClinicalCase, BiomarkerValue } from '../entities/clinical-case.entity.js';
import { ClinicalHypothesis } from '../entities/clinical-hypothesis.entity.js';
import { InferenceResult, ClinicalAlert, AlertSeverity } from '../entities/inference-result.entity.js';
import { ReasoningStep } from '../entities/reasoning-step.entity.js';
import { ReasoningContext, NormalizedCaseData, HypothesisCandidate } from '../engine/reasoning-context.js';
import { InferenceEngine } from '../engine/inference-engine.js';
import { IReasoningStrategy } from '../strategies/reasoning-strategy.interface.js';
import { RuleBasedStrategy } from '../strategies/rule-based.strategy.js';
import { EvidenceStrategy } from '../strategies/evidence.strategy.js';
import { OntologyStrategy } from '../strategies/ontology.strategy.js';
import { PredictionStrategy } from '../strategies/prediction.strategy.js';
import { RiskStrategy } from '../strategies/risk.strategy.js';
import { HybridStrategy } from '../strategies/hybrid.strategy.js';

export class ReasoningPipeline {
  private readonly engine: InferenceEngine;
  private readonly strategies: IReasoningStrategy[];

  constructor() {
    this.strategies = [
      new RuleBasedStrategy(),
      new EvidenceStrategy(),
      new OntologyStrategy(),
      new PredictionStrategy(),
      new RiskStrategy(),
      new HybridStrategy(),
    ];
    this.engine = new InferenceEngine(this.strategies);
  }

  execute(clinicalCase: ClinicalCase): InferenceResult {
    const normalizedData = this.normalizeCase(clinicalCase);
    const context = new ReasoningContext(clinicalCase, normalizedData);

    const inferenceOutput = this.engine.run(context);

    const hypotheses = this.buildHypotheses(inferenceOutput.candidates);
    const alerts = (context.getMeta<ClinicalAlert[]>('riskAlerts') ?? []).concat(
      this.buildAlertsFromHypotheses(hypotheses),
    );
    const recommendations = this.buildRecommendations(inferenceOutput.candidates);

    return new InferenceResult({
      id: `inference-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      patientId: clinicalCase.patientId ?? clinicalCase.id,
      hypotheses,
      recommendations,
      alerts,
      steps: context.steps,
      confidence: this.computeOverallConfidence(hypotheses),
    });
  }

  private normalizeCase(clinicalCase: ClinicalCase): NormalizedCaseData {
    const abnormal = this.detectAbnormalBiomarkers(clinicalCase);
    const critical = abnormal.filter((b) => this.isCritical(b));

    const hasCardiovascularRisk =
      clinicalCase.isSmoker() ||
      clinicalCase.hasCondition('diabetes') ||
      clinicalCase.hasCondition('hipertensão') ||
      clinicalCase.hasFamilyHistory('infarto') ||
      clinicalCase.hasFamilyHistory('cardiac');

    const hasMetabolicRisk =
      clinicalCase.isSedentary() ||
      clinicalCase.hasCondition('diabetes') ||
      clinicalCase.hasCondition('obesidade') ||
      (clinicalCase.getBiomarker('bmi')?.value ?? 0) >= 30;

    const hasEndocrineRisk =
      (clinicalCase.getBiomarker('tsh')?.value ?? 0) > 4.5 ||
      clinicalCase.hasCondition('hipotireoidismo') ||
      clinicalCase.hasCondition('thyroid');

    const riskScore =
      (hasCardiovascularRisk ? 0.35 : 0) +
      (hasMetabolicRisk ? 0.30 : 0) +
      (hasEndocrineRisk ? 0.15 : 0) +
      (clinicalCase.isElderly() ? 0.10 : 0) +
      (clinicalCase.isSmoker() ? 0.10 : 0);

    return {
      riskScore: Math.min(1, riskScore),
      hasCardiovascularRisk,
      hasMetabolicRisk,
      hasEndocrineRisk,
      abnormalBiomarkers: abnormal,
      criticalBiomarkers: critical,
    };
  }

  private detectAbnormalBiomarkers(clinicalCase: ClinicalCase): BiomarkerValue[] {
    return clinicalCase.biomarkers.filter((b) => {
      if (b.referenceMin !== undefined && b.value < b.referenceMin) return true;
      if (b.referenceMax !== undefined && b.value > b.referenceMax) return true;
      return false;
    });
  }

  private isCritical(b: BiomarkerValue): boolean {
    const name = b.name.toLowerCase();
    if ((name === 'fasting_glucose' || name === 'glicemia') && b.value >= 400) return true;
    if ((name === 'systolic_bp' || name === 'pas') && b.value >= 180) return true;
    if (name === 'hba1c' && b.value >= 10) return true;
    return false;
  }

  private buildHypotheses(candidates: HypothesisCandidate[]): ClinicalHypothesis[] {
    return candidates.map((c, idx) =>
      new ClinicalHypothesis({
        id: `hyp-${Date.now()}-${idx}`,
        condition: c.condition,
        icdCode: c.icdCode,
        probability: c.rawProbability,
        confidence: c.rawConfidence,
        supportingEvidence: c.supportingEvidence,
        contradictingEvidence: c.contradictingEvidence,
        recommendedActions: c.recommendedActions,
      }),
    );
  }

  private buildAlertsFromHypotheses(hypotheses: ClinicalHypothesis[]): ClinicalAlert[] {
    return hypotheses
      .filter((h) => h.isHighPriority() && h.probability >= 0.75)
      .map((h) => ({
        id: `alert-hyp-${h.id}`,
        severity: h.probability >= 0.85 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
        condition: h.condition,
        message: `Alta probabilidade (${(h.probability * 100).toFixed(0)}%) de ${h.condition}`,
        action: h.recommendedActions[0] ?? 'Avaliação médica recomendada',
      }));
  }

  private buildRecommendations(candidates: HypothesisCandidate[]): string[] {
    const seen = new Set<string>();
    const recs: string[] = [];
    for (const c of candidates) {
      for (const action of c.recommendedActions) {
        if (!seen.has(action)) {
          seen.add(action);
          recs.push(action);
        }
      }
    }
    return recs;
  }

  private computeOverallConfidence(hypotheses: ClinicalHypothesis[]): number {
    if (hypotheses.length === 0) return 0.5;
    const avg = hypotheses.reduce((sum, h) => sum + h.confidence, 0) / hypotheses.length;
    return Math.min(1, avg);
  }
}
