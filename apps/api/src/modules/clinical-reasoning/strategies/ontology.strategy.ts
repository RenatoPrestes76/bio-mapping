import { IReasoningStrategy, StrategyOutput } from './reasoning-strategy.interface.js';
import { ReasoningContext, HypothesisCandidate } from '../engine/reasoning-context.js';
import { ReasoningStep } from '../entities/reasoning-step.entity.js';

const ONTOLOGY_EXPANSION: Record<string, string[]> = {
  'Diabetes Mellitus tipo 2': ['Dislipidemia', 'Hipertensão Arterial', 'Síndrome Metabólica'],
  'Hipertensão Arterial': ['Alto Risco Cardiovascular', 'Dislipidemia'],
  'Obesidade': ['Síndrome Metabólica', 'Pré-diabetes', 'Dislipidemia'],
  'Síndrome Metabólica': ['Dislipidemia', 'Hipertensão Arterial', 'Alto Risco Cardiovascular'],
  'Dislipidemia': ['Alto Risco Cardiovascular'],
  'Sedentarismo': ['Obesidade', 'Síndrome Metabólica', 'Alto Risco Cardiovascular'],
  'Inflamação Crônica de Baixo Grau': ['Alto Risco Cardiovascular', 'Dislipidemia'],
};

export class OntologyStrategy implements IReasoningStrategy {
  readonly name = 'ONTOLOGY';
  readonly weight = 0.75;

  apply(context: ReasoningContext): StrategyOutput {
    const start = Date.now();
    const candidates: HypothesisCandidate[] = [];
    const existingConditions = new Set(context.candidates.map((c) => c.condition));
    const added = new Set<string>();

    for (const cand of context.candidates) {
      const related = ONTOLOGY_EXPANSION[cand.condition] ?? [];
      for (const relatedCondition of related) {
        if (!existingConditions.has(relatedCondition) && !added.has(relatedCondition)) {
          added.add(relatedCondition);
          candidates.push({
            condition: relatedCondition,
            rawProbability: cand.rawProbability * 0.5,
            rawConfidence: 0.55,
            supportingEvidence: [`Derivado ontologicamente de: ${cand.condition}`],
            contradictingEvidence: [],
            recommendedActions: [],
            strategyName: this.name,
          });
        }
      }
    }

    const step = new ReasoningStep({
      id: `step-ontology-${Date.now()}`,
      strategyName: this.name,
      description: `Ontology expansion added ${candidates.length} derived conditions`,
      confidence: 0.70,
      duration: Date.now() - start,
      input: { existingCount: existingConditions.size },
      output: { derivedConditions: candidates.map((c) => c.condition) },
    });

    return { candidates, steps: [step], strategyName: this.name, confidence: 0.70 };
  }
}
