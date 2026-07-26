import { Injectable } from '@nestjs/common';
import { DecisionContext } from '../entities/decision-context.entity.js';
import { ClinicalDecision } from '../entities/clinical-decision.entity.js';
import type { EvaluatePatientDto, DecisionResponseDto } from '../dto/athena-cdss.dto.js';
import { DecisionAggregationEngine } from '../engines/decision-aggregation.engine.js';
import { DecisionRankingEngine } from '../engines/decision-ranking.engine.js';
import { AlertGenerationEngine } from '../engines/alert-generation.engine.js';
import { ContraindicationEngine } from '../engines/contraindication.engine.js';
import { EvidenceLinkEngine } from '../engines/evidence-link.engine.js';
import { RecommendationConflictResolverEngine } from '../engines/recommendation-conflict-resolver.engine.js';
import { DecisionExplanationEngine } from '../engines/decision-explanation.engine.js';
import { DecisionStrategyRegistry } from '../registry/decision-strategy.registry.js';
import { AlertRegistry } from '../registry/alert.registry.js';
import { EvidenceRegistry } from '../registry/evidence.registry.js';
import { confidenceToGrade } from '../utils/clinical-threshold.utils.js';

const MODULES_QUERIED = [
  'EmergencyStrategy',
  'TherapeuticStrategy',
  'DiagnosticStrategy',
  'MonitoringStrategy',
  'PreventiveStrategy',
  'LifestyleStrategy',
  'ContraindicationEngine',
  'AlertGenerationEngine',
  'EvidenceLinkEngine',
];

@Injectable()
export class AthenaCdssProvider {
  private readonly decisions = new Map<string, DecisionResponseDto>();
  private readonly decisionsByPatient = new Map<string, DecisionResponseDto[]>();

  private readonly aggregation = new DecisionAggregationEngine();
  private readonly ranking = new DecisionRankingEngine();
  private readonly alertEngine = new AlertGenerationEngine();
  private readonly contraindicationEngine = new ContraindicationEngine();
  private readonly evidenceLinkEngine = new EvidenceLinkEngine();
  private readonly conflictResolver = new RecommendationConflictResolverEngine();
  private readonly explanationEngine = new DecisionExplanationEngine();
  private readonly strategyRegistry = new DecisionStrategyRegistry();
  private readonly alertRegistry = new AlertRegistry();
  private readonly evidenceRegistry = new EvidenceRegistry();

  evaluate(dto: EvaluatePatientDto): DecisionResponseDto {
    const context = new DecisionContext({
      patientId: dto.patientId,
      demographics: dto.demographics,
      conditions: dto.conditions,
      biomarkers: dto.biomarkers,
      medications: dto.medications,
      allergies: dto.allergies,
      geneticProfile: dto.geneticProfile,
      timelineId: dto.timelineId,
      digitalTwinId: dto.digitalTwinId,
    });

    // 1. Strategy-based recommendations
    const strategiesToRun = dto.strategies?.length
      ? this.strategyRegistry.getAll().filter((s) => dto.strategies!.includes(s.type))
      : this.strategyRegistry.getAll();

    const moduleResults = strategiesToRun.map((strategy) => {
      const recs = strategy.evaluate(context);
      return this.aggregation.buildModuleResult(strategy.type, recs, [], 100);
    });

    // 2. Aggregate
    const aggregated = this.aggregation.aggregate(moduleResults, context);

    // 3. Contraindications
    const contraindications = this.contraindicationEngine.analyze(context);

    // 4. Resolve conflicts (allergy + genetic + absolute CI)
    const conflictResult = this.conflictResolver.resolve(
      aggregated.recommendations,
      contraindications,
      context,
    );

    // 5. Rank
    const ranked = this.ranking.getCriticalFirst(conflictResult.resolvedRecommendations);

    // 6. Evidence linking
    const linkedEvidence = this.evidenceLinkEngine.link(ranked, context);
    this.evidenceRegistry.attachAll(linkedEvidence);

    // 7. Alerts
    const alerts = this.alertEngine.generate(context);
    this.alertRegistry.registerAll(alerts);

    // 8. Confidence
    const completenessScore = Math.min(35, aggregated.modulesWithData.length * 5);
    const conflictPenalty = conflictResult.conflicts.length * 3;
    const alertBonus = alerts.filter((a) => a.isCritical()).length > 0 ? 0 : 5;
    const confidence = Math.max(10, Math.min(100, completenessScore + 40 + alertBonus - conflictPenalty));

    // 9. Explanation
    const explanation = this.explanationEngine.explain({
      context,
      recommendations: ranked,
      evidence: aggregated.evidence,
      linkedEvidence,
      alerts,
      contraindications,
      conflicts: conflictResult.conflicts,
      modulesWithData: aggregated.modulesWithData,
      modulesQueried: MODULES_QUERIED,
      confidenceScore: confidence,
    });

    // 10. Build decision
    const evidenceContributions = aggregated.modulesWithData.map((mod) => ({
      sourceModule: mod,
      evidenceType: 'CLINICAL_REASONING' as const,
      summary: `Data contributed by ${mod}`,
      confidenceWeight: 0.8,
      dataCompleteness: 100,
    }));

    const decision = new ClinicalDecision({
      patientId: dto.patientId,
      decisionType: 'COMPREHENSIVE',
      priority: this.computePriority(alerts, ranked),
      confidence,
      clinicalSummary: explanation.why,
      recommendations: ranked,
      evidence: evidenceContributions,
      explanation: {
        summary: explanation.why,
        contributingModules: aggregated.modulesWithData,
        keyFindings: explanation.keyAlerts,
        conflictsResolved: conflictResult.conflicts.length,
        reasoningChain: explanation.reasoning,
        limitations: explanation.limitations,
        dataCompleteness: explanation.dataCompleteness,
        modulesQueried: MODULES_QUERIED,
        modulesWithData: aggregated.modulesWithData,
      },
      conflictsResolved: conflictResult.conflicts,
      contributingModules: aggregated.modulesWithData,
    });

    const response: DecisionResponseDto = {
      decisionId: decision.id,
      patientId: dto.patientId,
      timestamp: new Date(),
      decision,
      alerts,
      contraindications,
      linkedEvidence,
      explanation,
      summary: {
        totalRecommendations: ranked.length,
        criticalAlerts: alerts.filter((a) => a.isCritical()).length,
        contraindications: contraindications.length,
        evidencePieces: linkedEvidence.length,
        confidence,
        requiresImmediateAction: decision.requiresImmediateAction(),
      },
    };

    this.decisions.set(decision.id, response);
    const patientHistory = this.decisionsByPatient.get(dto.patientId) ?? [];
    this.decisionsByPatient.set(dto.patientId, [response, ...patientHistory]);

    return response;
  }

  getById(decisionId: string): DecisionResponseDto | undefined {
    return this.decisions.get(decisionId);
  }

  getAlerts(patientId: string) {
    return this.alertRegistry.getActiveByPatient(patientId);
  }

  getHistory(patientId: string): DecisionResponseDto[] {
    return this.decisionsByPatient.get(patientId) ?? [];
  }

  getLatest(patientId: string): DecisionResponseDto | undefined {
    return (this.decisionsByPatient.get(patientId) ?? [])[0];
  }

  totalDecisions(): number {
    return this.decisions.size;
  }

  private computePriority(
    alerts: ClinicalDecision['priority'] extends string ? any[] : never,
    _recs: any[],
  ): ClinicalDecision['priority'] {
    const hasCritical = (alerts as any[]).some((a: any) => a.severity === 'CRITICAL');
    const hasHigh = (alerts as any[]).some((a: any) => a.severity === 'HIGH');
    const hasImmediate = _recs.some((r: any) => r.urgency === 'IMMEDIATE');

    if (hasCritical || hasImmediate) return 'CRITICAL';
    if (hasHigh) return 'HIGH';
    return 'MODERATE';
  }
}
