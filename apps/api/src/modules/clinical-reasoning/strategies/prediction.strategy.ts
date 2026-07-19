import { IReasoningStrategy, StrategyOutput } from './reasoning-strategy.interface.js';
import { ReasoningContext, HypothesisCandidate } from '../engine/reasoning-context.js';
import { ReasoningStep } from '../entities/reasoning-step.entity.js';

export class PredictionStrategy implements IReasoningStrategy {
  readonly name = 'PREDICTION';
  readonly weight = 0.80;

  apply(context: ReasoningContext): StrategyOutput {
    const start = Date.now();
    const candidates: HypothesisCandidate[] = [];

    const cvdScore = this.calculateCVDRisk(context);
    const metabolicScore = this.calculateMetabolicRisk(context);

    if (cvdScore > 0.15) {
      candidates.push({
        condition: 'Alto Risco Cardiovascular',
        icdCode: 'Z82.49',
        rawProbability: Math.min(1, cvdScore),
        rawConfidence: 0.72,
        supportingEvidence: [`Escore de risco CVD calculado: ${(cvdScore * 100).toFixed(1)}%`],
        contradictingEvidence: [],
        recommendedActions: [
          'Calcular escore de Framingham para risco cardiovascular a 10 anos',
          'Avaliar terapia preventiva baseada no escore de risco',
        ],
        strategyName: this.name,
      });
    }

    if (metabolicScore > 0.30) {
      candidates.push({
        condition: 'Síndrome Metabólica',
        icdCode: 'E88.8',
        rawProbability: Math.min(1, metabolicScore),
        rawConfidence: 0.68,
        supportingEvidence: [`Escore de risco metabólico calculado: ${(metabolicScore * 100).toFixed(1)}%`],
        contradictingEvidence: [],
        recommendedActions: [
          'Investigar critérios de síndrome metabólica (NCEP ATP III / IDF)',
          'Intervenção preventiva multicomponente',
        ],
        strategyName: this.name,
      });
    }

    const step = new ReasoningStep({
      id: `step-prediction-${Date.now()}`,
      strategyName: this.name,
      description: `Prediction scores — CVD: ${(cvdScore * 100).toFixed(1)}%, Metabolic: ${(metabolicScore * 100).toFixed(1)}%`,
      confidence: 0.72,
      duration: Date.now() - start,
      input: { age: context.clinicalCase.age, sex: context.clinicalCase.sex },
      output: { cvdScore, metabolicScore, candidateCount: candidates.length },
    });

    return { candidates, steps: [step], strategyName: this.name, confidence: 0.72 };
  }

  private calculateCVDRisk(context: ReasoningContext): number {
    const { clinicalCase } = context;
    let score = 0;

    if (clinicalCase.age >= 65) score += 0.15;
    else if (clinicalCase.age >= 55) score += 0.10;
    else if (clinicalCase.age >= 45) score += 0.05;

    if (clinicalCase.isSmoker()) score += 0.15;
    if (clinicalCase.isSedentary()) score += 0.08;
    if (clinicalCase.hasCondition('diabetes') || clinicalCase.hasCondition('diabete')) score += 0.12;
    if (clinicalCase.hasCondition('hipertensão') || clinicalCase.hasCondition('hypertension')) score += 0.10;
    if (clinicalCase.hasFamilyHistory('infarto') || clinicalCase.hasFamilyHistory('myocardial infarction')) score += 0.12;

    const ldl = clinicalCase.getBiomarker('ldl');
    if (ldl && ldl.value >= 190) score += 0.15;
    else if (ldl && ldl.value >= 160) score += 0.08;

    const sbp = clinicalCase.getBiomarker('systolic_bp') ?? clinicalCase.getBiomarker('pas');
    if (sbp && sbp.value >= 160) score += 0.10;
    else if (sbp && sbp.value >= 140) score += 0.06;

    const bmi = clinicalCase.getBiomarker('bmi') ?? clinicalCase.getBiomarker('imc');
    if (bmi && bmi.value >= 35) score += 0.06;
    else if (bmi && bmi.value >= 30) score += 0.04;

    return Math.min(1, score);
  }

  private calculateMetabolicRisk(context: ReasoningContext): number {
    const { clinicalCase } = context;
    let criteriaCount = 0;

    const bmi = clinicalCase.getBiomarker('bmi') ?? clinicalCase.getBiomarker('imc');
    if (bmi && bmi.value >= 30) criteriaCount++;

    const glucose = clinicalCase.getBiomarker('fasting_glucose') ?? clinicalCase.getBiomarker('glicemia');
    if (glucose && glucose.value >= 100) criteriaCount++;

    const tg = clinicalCase.getBiomarker('triglycerides') ?? clinicalCase.getBiomarker('triglicerideos');
    if (tg && tg.value >= 150) criteriaCount++;

    const hdl = clinicalCase.getBiomarker('hdl');
    if (hdl && hdl.value <= 50) criteriaCount++;

    const sbp = clinicalCase.getBiomarker('systolic_bp') ?? clinicalCase.getBiomarker('pas');
    if (sbp && sbp.value >= 130) criteriaCount++;

    if (clinicalCase.isSedentary()) criteriaCount++;

    return criteriaCount / 6;
  }
}
