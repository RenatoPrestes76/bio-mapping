import { IReasoningStrategy, StrategyOutput } from './reasoning-strategy.interface.js';
import { ReasoningContext, HypothesisCandidate } from '../engine/reasoning-context.js';
import { ReasoningStep } from '../entities/reasoning-step.entity.js';

const CONDITION_EVIDENCE_MAP: Record<string, { ids: string[]; confidenceBoost: number }> = {
  'Hipertensão Arterial': {
    ids: ['ev-dash-hypertension-sr-2020', 'ev-sprint-2015'],
    confidenceBoost: 0.10,
  },
  'Diabetes Mellitus tipo 2': {
    ids: ['ev-metformin-cochrane-2023', 'ev-accord-2008', 'ev-hba1c-microvascular-rct-2018'],
    confidenceBoost: 0.12,
  },
  'Pré-diabetes': {
    ids: ['ev-fiber-glycemic-meta-2020', 'ev-resistance-insulin-rct-2021'],
    confidenceBoost: 0.08,
  },
  'Dislipidemia': {
    ids: ['ev-statin-meta-2022', 'ev-omega3-cardio-meta-2021'],
    confidenceBoost: 0.10,
  },
  'Obesidade': {
    ids: ['ev-obesity-interventions-meta-2022', 'ev-sedentary-mortality-cohort-2020'],
    confidenceBoost: 0.08,
  },
  'Síndrome Metabólica': {
    ids: ['ev-mediterranean-meta-2019', 'ev-predimed-2013', 'ev-vitd-metabolic-meta-2022'],
    confidenceBoost: 0.10,
  },
  'Alto Risco Cardiovascular': {
    ids: ['ev-statin-meta-2022', 'ev-smoking-cv-cohort-2019', 'ev-crp-cardiac-cohort-2018'],
    confidenceBoost: 0.12,
  },
  'Inflamação Crônica de Baixo Grau': {
    ids: ['ev-crp-cardiac-cohort-2018', 'ev-mediterranean-meta-2019'],
    confidenceBoost: 0.08,
  },
  'Hipotireoidismo': {
    ids: ['ev-tsh-metabolic-cohort-2020'],
    confidenceBoost: 0.08,
  },
  'Sedentarismo': {
    ids: ['ev-sedentary-mortality-cohort-2020', 'ev-exercise-cardio-meta-2021'],
    confidenceBoost: 0.09,
  },
};

export class EvidenceStrategy implements IReasoningStrategy {
  readonly name = 'EVIDENCE';
  readonly weight = 0.85;

  apply(context: ReasoningContext): StrategyOutput {
    const start = Date.now();
    const candidates: HypothesisCandidate[] = [];

    const existingConditions = new Set(context.candidates.map((c) => c.condition));

    for (const [condition, mapping] of Object.entries(CONDITION_EVIDENCE_MAP)) {
      if (existingConditions.has(condition)) {
        candidates.push({
          condition,
          rawProbability: 0,
          rawConfidence: mapping.confidenceBoost,
          supportingEvidence: mapping.ids.map((id) => `Evidence study: ${id}`),
          contradictingEvidence: [],
          recommendedActions: [],
          strategyName: this.name,
        });
      }
    }

    const step = new ReasoningStep({
      id: `step-evidence-${Date.now()}`,
      strategyName: this.name,
      description: `Applied evidence boosts to ${candidates.length} conditions`,
      confidence: 0.80,
      duration: Date.now() - start,
      input: { candidateCount: existingConditions.size },
      output: { boostedConditions: candidates.map((c) => c.condition) },
    });

    return { candidates, steps: [step], strategyName: this.name, confidence: 0.80 };
  }
}
