import { calculatePersonalizedRisk, classifyRiskLevel } from '../../precision/engine/risk-personalizer.js';
import {
  getScenarioTemplate,
  estimateConfidence,
  TIME_HORIZON_FACTOR,
  TIME_HORIZON_LABEL,
  type ScenarioType,
  type TimeHorizon,
  type ScenarioParameters,
  type ScenarioEffect,
} from './scenario-engine.js';
import { extractBaselineRiskScore, type DigitalTwinModel } from './twin-builder.js';

export interface SimulationInput {
  twin: DigitalTwinModel;
  scenarioType: ScenarioType;
  parameters?: ScenarioParameters;
  timeHorizon: TimeHorizon;
}

export interface TopFactor {
  factor: string;
  contribution: number;
  description: string;
}

export interface SimulationOutput {
  scenarioType: ScenarioType;
  scenarioLabel: string;
  timeHorizon: TimeHorizon;
  timeHorizonLabel: string;
  baselineRiskScore: number;
  simulatedRiskScore: number;
  expectedRiskVariation: number;
  expectedRiskVariationPercent: number;
  confidence: number;
  baselineRiskLevel: string;
  simulatedRiskLevel: string;
  topFactors: TopFactor[];
  assumptions: string[];
  limitations: string[];
  missingData: string[];
}

function buildSimulatedProfile(twin: DigitalTwinModel, effect: ScenarioEffect, horizonFactor: number) {
  const clinical = twin.clinicalHistory as Record<string, unknown>;
  const lifestyle = twin.lifestyle as Record<string, unknown>;

  const currentBmi = clinical.bmi as number | undefined;
  const simulatedBmi = currentBmi !== undefined
    ? Math.max(10, currentBmi + effect.bmiDelta * horizonFactor)
    : undefined;

  const baseRiskScore = extractBaselineRiskScore(twin);
  const directAdj = effect.baseRiskAdjustment * horizonFactor;

  return {
    baseRiskScore: Math.max(0, Math.min(1, baseRiskScore + directAdj)),
    familyHistory: twin.riskFactors,
    lifestyle: (effect.lifestyleOverride ?? (lifestyle.activityLevel as string | undefined)) as string | undefined,
    smoking: effect.smokingOverride !== undefined ? effect.smokingOverride : (lifestyle.smoking as boolean | undefined) ?? false,
    alcohol: (effect.alcoholOverride ?? (lifestyle.alcohol as string | undefined)) as string | undefined,
    bmi: simulatedBmi,
    age: (twin.demographics as Record<string, unknown>).age as number | undefined,
  };
}

function computeTopFactors(effect: ScenarioEffect, horizonFactor: number): TopFactor[] {
  const factors: TopFactor[] = [];

  if (effect.smokingOverride === false) {
    factors.push({ factor: 'Cessação do tabagismo', contribution: -0.12 * horizonFactor, description: 'Eliminação do fator de risco tabágico' });
  }
  if (Math.abs(effect.bmiDelta) > 0.4) {
    const contribution = effect.bmiDelta * 0.02 * horizonFactor;
    factors.push({
      factor: effect.bmiDelta < 0 ? 'Redução do IMC' : 'Aumento do IMC',
      contribution,
      description: `Variação de IMC: ${effect.bmiDelta > 0 ? '+' : ''}${(effect.bmiDelta * horizonFactor).toFixed(1)} unidades`,
    });
  }
  if (effect.lifestyleOverride) {
    const protective = ['VERY_ACTIVE', 'ATHLETE', 'MODERATELY_ACTIVE'].includes(effect.lifestyleOverride);
    factors.push({
      factor: protective ? 'Melhora do estilo de vida' : 'Piora do estilo de vida',
      contribution: protective ? -0.05 * horizonFactor : 0.05 * horizonFactor,
      description: `Estilo de vida alterado para: ${effect.lifestyleOverride}`,
    });
  }
  if (effect.alcoholOverride === 'NONE' || effect.alcoholOverride === 'OCCASIONAL') {
    factors.push({ factor: 'Redução do álcool', contribution: -0.04 * horizonFactor, description: 'Redução ou cessação do consumo de álcool' });
  }
  if (Math.abs(effect.baseRiskAdjustment) > 0.01) {
    const adj = effect.baseRiskAdjustment * horizonFactor;
    factors.push({
      factor: adj < 0 ? 'Benefício clínico da intervenção' : 'Impacto negativo estimado',
      contribution: adj,
      description: 'Ajuste direto de risco com base na evidência do cenário',
    });
  }

  return factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

export function runSimulation(input: SimulationInput): SimulationOutput {
  const template = getScenarioTemplate(input.scenarioType);
  if (!template) throw new Error(`Unknown scenario type: ${input.scenarioType}`);

  const params = input.parameters ?? template.defaultParameters;
  const effect = template.getEffect(params);
  const horizonFactor = TIME_HORIZON_FACTOR[input.timeHorizon];

  const baselineRiskScore = extractBaselineRiskScore(input.twin);
  const baselineRiskLevel = classifyRiskLevel(baselineRiskScore);

  const simProfile = buildSimulatedProfile(input.twin, effect, horizonFactor);
  const simRiskResult = calculatePersonalizedRisk({
    baseRiskScore: simProfile.baseRiskScore,
    familyHistory: simProfile.familyHistory,
    lifestyle: simProfile.lifestyle as any,
    smoking: simProfile.smoking,
    alcohol: simProfile.alcohol as any,
    bmi: simProfile.bmi,
    age: simProfile.age,
  });

  const simulatedRiskScore = simRiskResult.finalRiskScore;
  const simulatedRiskLevel = classifyRiskLevel(simulatedRiskScore);
  const expectedRiskVariation = parseFloat(((simulatedRiskScore - baselineRiskScore) * 100).toFixed(2));
  const expectedRiskVariationPercent = baselineRiskScore > 0
    ? parseFloat(((simulatedRiskScore - baselineRiskScore) / baselineRiskScore * 100).toFixed(1))
    : 0;

  const hasMissingCritical = input.twin.missingFields.some((f) => ['age', 'bmi', 'lifestyle'].includes(f));
  const confidence = estimateConfidence(input.twin.dataCompleteness, input.timeHorizon, hasMissingCritical);

  return {
    scenarioType: input.scenarioType,
    scenarioLabel: template.name,
    timeHorizon: input.timeHorizon,
    timeHorizonLabel: TIME_HORIZON_LABEL[input.timeHorizon],
    baselineRiskScore,
    simulatedRiskScore,
    expectedRiskVariation,
    expectedRiskVariationPercent,
    confidence,
    baselineRiskLevel,
    simulatedRiskLevel,
    topFactors: computeTopFactors(effect, horizonFactor),
    assumptions: [...effect.assumptions],
    limitations: [...effect.limitations],
    missingData: input.twin.missingFields,
  };
}
