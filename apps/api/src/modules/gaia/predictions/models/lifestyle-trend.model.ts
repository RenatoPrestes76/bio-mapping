import { computeTrend, TrendDirection } from '@bio/bioscore-engine';
import { ClinicalContext } from '../../contracts';
import { PredictionModel, PredictionStateResult, PredictionWindow } from '../prediction.types';

const MIN_SCORE = 0;
const NEUTRAL_SCORE = 5;
const MAX_SCORE = 10;
const NUDGE = 1;
const MIN_POINTS_FOR_TREND = 2;

interface SignalState {
  trend: TrendDirection | null;
  score: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Banda 0–10 por direção de tendência (mesma convenção do MetabolicRiskModel). */
function scoreFromTrend(trend: TrendDirection | null): number {
  if (trend === 'IMPROVING') return MAX_SCORE;
  if (trend === 'DECLINING') return MIN_SCORE;
  return NEUTRAL_SCORE; // 'STABLE' ou sem dado suficiente — neutro
}

/** Previsão por persistência: a tendência atual se mantém na próxima janela. */
function nudgeScore(score: number, trend: TrendDirection | null): number {
  if (trend === 'IMPROVING') return clamp(score + NUDGE, MIN_SCORE, MAX_SCORE);
  if (trend === 'DECLINING') return clamp(score - NUDGE, MIN_SCORE, MAX_SCORE);
  return score;
}

/** `null` com menos de 2 pontos — nunca inventa tendência sem dado (Diretriz 8: tendência, não suposição). */
function trendFor(values: number[]): TrendDirection | null {
  if (values.length < MIN_POINTS_FOR_TREND) return null;
  return computeTrend(values).trend;
}

function signalState(values: number[]): SignalState {
  const trend = trendFor(values);
  return { trend, score: scoreFromTrend(trend) };
}

function wearableSeries(context: ClinicalContext, metricType: string): number[] {
  return context.wearables.items
    .filter((item) => item.metricType === metricType)
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())
    .map((item) => item.value);
}

function weightSeries(context: ClinicalContext): number[] {
  return context.vitals.items
    .filter((item) => item.weight !== null)
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())
    .map((item) => item.weight as number);
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
}

function asSignalStates(state: Record<string, unknown>): {
  activity: SignalState;
  sleep: SignalState;
  weight: SignalState;
} {
  return state as { activity: SignalState; sleep: SignalState; weight: SignalState };
}

/**
 * Piloto arquitetural (Sprint 14.5, P5) — prova a arquitetura do Prediction
 * Engine, não a precisão do modelo. Reaproveita `computeTrend()` de
 * `@bio/bioscore-engine` (regressão linear + média móvel, já testado na
 * Sprint BIOSCORE) como dependência de infraestrutura pura — nenhuma regra
 * clínica acoplada a ele (Diretriz 9). Regras determinísticas, sem Machine
 * Learning, sem IA generativa, sem inferência além dessa regressão linear.
 *
 * Previsão de TENDÊNCIA, nunca diagnóstico (Diretriz 8): as recomendações
 * descrevem direção observada ("tendência de redução"), nunca uma conclusão
 * clínica.
 */
export const LIFESTYLE_TREND_MODEL: PredictionModel = {
  name: 'lifestyle-trend',
  predictionType: 'TREND',
  version: '0.1.0',
  requiredCapabilities: ['wearables', 'vitals'],

  computeStates(context: ClinicalContext): PredictionStateResult {
    const activity = signalState(wearableSeries(context, 'STEPS'));
    const sleep = signalState(wearableSeries(context, 'SLEEP'));
    const weight = signalState(weightSeries(context));

    const current = { activity, sleep, weight };
    const predicted = {
      activity: { trend: activity.trend, score: nudgeScore(activity.score, activity.trend) },
      sleep: { trend: sleep.trend, score: nudgeScore(sleep.score, sleep.trend) },
      weight: { trend: weight.trend, score: nudgeScore(weight.score, weight.trend) },
    };

    return {
      current,
      predicted,
      currentScore: average([activity.score, sleep.score, weight.score]),
      predictedScore: average([predicted.activity.score, predicted.sleep.score, predicted.weight.score]),
    };
  },

  buildPredictionWindow(context: ClinicalContext): PredictionWindow {
    const { from, to } = context.metadata.window;
    const durationMs = Math.max(to.getTime() - from.getTime(), 24 * 60 * 60 * 1000);
    const durationDays = Math.max(1, Math.round(durationMs / (24 * 60 * 60 * 1000)));

    return {
      start: to,
      end: new Date(to.getTime() + durationMs),
      duration: durationDays,
      unit: 'DAYS',
    };
  },

  buildRecommendations(result: PredictionStateResult): string[] {
    const { activity, sleep, weight } = asSignalStates(result.current);
    const recommendations: string[] = [];

    if (activity.trend === 'DECLINING') recommendations.push('Tendência de redução na atividade física recente');
    if (activity.trend === 'IMPROVING') recommendations.push('Tendência de aumento na atividade física recente');
    if (sleep.trend === 'DECLINING') recommendations.push('Tendência de redução na duração do sono recente');
    if (sleep.trend === 'IMPROVING') recommendations.push('Tendência de melhora na duração do sono recente');
    if (weight.trend === 'IMPROVING') recommendations.push('Tendência de aumento de peso no período recente');
    if (weight.trend === 'DECLINING') recommendations.push('Tendência de redução de peso no período recente');

    if (recommendations.length === 0) {
      recommendations.push('Nenhuma tendência significativa identificada no período — reavaliação periódica recomendada');
    }

    return recommendations;
  },
};
