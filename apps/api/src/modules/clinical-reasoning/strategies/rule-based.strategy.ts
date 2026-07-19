import { IReasoningStrategy, StrategyOutput } from './reasoning-strategy.interface.js';
import { ReasoningContext, HypothesisCandidate } from '../engine/reasoning-context.js';
import { ReasoningStep } from '../entities/reasoning-step.entity.js';
import {
  CLINICAL_REASONING_RULES,
  ClinicalReasoningRule,
  BiomarkerCriterion,
} from '../rules/clinical-rules-registry.js';

export class RuleBasedStrategy implements IReasoningStrategy {
  readonly name = 'RULE_BASED';
  readonly weight = 1.0;

  apply(context: ReasoningContext): StrategyOutput {
    const start = Date.now();
    const candidates: HypothesisCandidate[] = [];

    for (const rule of CLINICAL_REASONING_RULES) {
      const candidate = this.evaluateRule(rule, context);
      if (candidate) {
        candidates.push(candidate);
      }
    }

    const step = new ReasoningStep({
      id: `step-rule-${Date.now()}`,
      strategyName: this.name,
      description: `Evaluated ${CLINICAL_REASONING_RULES.length} clinical rules; matched ${candidates.length}`,
      confidence: candidates.length > 0 ? 0.85 : 0.5,
      duration: Date.now() - start,
      input: { ruleCount: CLINICAL_REASONING_RULES.length },
      output: { matchedConditions: candidates.map((c) => c.condition) },
    });

    return { candidates, steps: [step], strategyName: this.name, confidence: 0.85 };
  }

  private evaluateRule(
    rule: ClinicalReasoningRule,
    context: ReasoningContext,
  ): HypothesisCandidate | null {
    const { clinicalCase } = context;
    let criteriaMet = 0;
    let probabilityBoost = 0;
    const supporting: string[] = [];

    for (const criterion of rule.biomarkerCriteria) {
      const bm = clinicalCase.getBiomarker(criterion.name);
      if (bm && this.meetsThreshold(bm.value, criterion)) {
        criteriaMet++;
        probabilityBoost += criterion.probabilityBoost;
        supporting.push(`Biomarcador ${criterion.name}=${bm.value} ${criterion.operator} ${criterion.threshold}`);
      }
    }

    for (const symptom of rule.symptomCriteria) {
      if (clinicalCase.hasSymptom(symptom)) {
        criteriaMet++;
        probabilityBoost += 0.10;
        supporting.push(`Sintoma: ${symptom}`);
      }
    }

    for (const rf of rule.riskFactors) {
      if (this.hasRiskFactor(rf, context)) {
        criteriaMet++;
        probabilityBoost += 0.08;
        supporting.push(`Fator de risco: ${rf}`);
      }
    }

    if (criteriaMet < rule.minCriteriaToPass) {
      return null;
    }

    const rawProbability = Math.min(1, rule.baseProbability + probabilityBoost);
    const rawConfidence = rule.baseConfidence;

    return {
      condition: rule.condition,
      icdCode: rule.icdCode,
      rawProbability,
      rawConfidence,
      supportingEvidence: supporting,
      contradictingEvidence: [],
      recommendedActions: rule.recommendations,
      strategyName: this.name,
    };
  }

  private meetsThreshold(value: number, criterion: BiomarkerCriterion): boolean {
    switch (criterion.operator) {
      case '>=': return value >= criterion.threshold;
      case '<=': return value <= criterion.threshold;
      case '>':  return value > criterion.threshold;
      case '<':  return value < criterion.threshold;
      case '=':  return value === criterion.threshold;
    }
  }

  private hasRiskFactor(rf: string, context: ReasoningContext): boolean {
    const { clinicalCase } = context;
    switch (rf) {
      case 'smoking':    return clinicalCase.isSmoker();
      case 'sedentary':  return clinicalCase.isSedentary();
      case 'obesity':    return !!clinicalCase.getBiomarker('bmi')?.value && (clinicalCase.getBiomarker('bmi')?.value ?? 0) >= 30
                              || !!clinicalCase.getBiomarker('imc')?.value && (clinicalCase.getBiomarker('imc')?.value ?? 0) >= 30;
      case 'diabetes':   return clinicalCase.hasCondition('diabetes') || clinicalCase.hasCondition('diabete');
      case 'metabolic_syndrome': return clinicalCase.hasCondition('síndrome metabólica') || clinicalCase.hasCondition('metabolic syndrome');
      default:           return clinicalCase.hasCondition(rf) || clinicalCase.hasFamilyHistory(rf);
    }
  }
}
