import { computeTrend } from '@bio/bioscore-engine';

/**
 * Fluxo: computeTrend() [matemática, @bio/bioscore-engine] → interpretTrend() [interpretação
 * de domínio, aqui] → anexado a HabitPattern/MilestonePrediction/JourneyPath → DTO.
 * interpretTrend() nunca recalcula tendência — só traduz o TrendReport do computeTrend()
 * (ou a ausência de dados) em algo legível. computeTrend() continua a única fonte matemática.
 */

export type TrendInsightDirection =
  'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA';

export interface TrendInsight {
  direction: TrendInsightDirection;
  magnitude: number | null;
  confidence: 'LOW' | 'MODERATE' | 'HIGH';
  dataPoints: number;
  explanation: string;
  limitations: string[];
}

const MIN_POINTS_FOR_TREND = 2;
const MIN_POINTS_FOR_HIGH_CONFIDENCE = 3;
const REGRESSION_LIMITATION =
  'Baseado em regressão linear simples sobre os dados disponíveis — não é diagnóstico.';
const PLATEAU_LIMITATION =
  'Platô detectado — a variação mais recente pode não refletir a tendência de longo prazo.';
const FEW_POINTS_LIMITATION =
  'Poucos pontos de dados disponíveis — confiança limitada.';

function explanationFor(
  direction: TrendInsightDirection,
  dataPoints: number,
): string {
  switch (direction) {
    case 'IMPROVING':
      return `Tendência de evolução positiva nas últimas ${dataPoints} observações.`;
    case 'DECLINING':
      return `Tendência de queda nas últimas ${dataPoints} observações.`;
    case 'STABLE':
      return `Sem variação significativa nas últimas ${dataPoints} observações — tendência estável.`;
    case 'INSUFFICIENT_DATA':
      return 'Ainda não há dados históricos suficientes para identificar uma tendência confiável.';
  }
}

export function interpretTrend(
  values: number[],
  opts?: { higherIsBetter?: boolean },
): TrendInsight {
  const dataPoints = values.length;

  if (dataPoints < MIN_POINTS_FOR_TREND) {
    return {
      direction: 'INSUFFICIENT_DATA',
      magnitude: null,
      confidence: 'LOW',
      dataPoints,
      explanation: explanationFor('INSUFFICIENT_DATA', dataPoints),
      limitations: [FEW_POINTS_LIMITATION],
    };
  }

  const { trend, changePct, isPlateauDetected } = computeTrend(
    values,
    opts?.higherIsBetter,
  );
  const confidence =
    dataPoints >= MIN_POINTS_FOR_HIGH_CONFIDENCE ? 'HIGH' : 'MODERATE';

  const limitations = [REGRESSION_LIMITATION];
  if (isPlateauDetected) limitations.push(PLATEAU_LIMITATION);
  if (dataPoints < MIN_POINTS_FOR_HIGH_CONFIDENCE)
    limitations.push(FEW_POINTS_LIMITATION);

  return {
    direction: trend,
    magnitude: changePct,
    confidence,
    dataPoints,
    explanation: explanationFor(trend, dataPoints),
    limitations,
  };
}
