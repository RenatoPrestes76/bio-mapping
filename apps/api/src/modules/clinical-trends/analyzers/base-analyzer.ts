import { TrendDirection, TrendType } from '@bio/database';
import { DataPoint, TrendAnalysisResult } from '../interfaces/clinical-trend-analyzer.interface.js';
import { linearRegression, toRegressionPoints } from './trend-math.js';

export interface AnalyzerConfig {
  metric: string;
  higherIsBetter?: boolean;
  stableThresholdPerDay?: number;
  fluctuatingR2Threshold?: number;
  minPoints?: number;
  summaryLabel?: string;
}

export function computeTrend(dataPoints: DataPoint[], config: AnalyzerConfig): TrendAnalysisResult {
  const minPoints = config.minPoints ?? 2;
  const startDate = dataPoints[0]?.timestamp ?? new Date();
  const endDate = dataPoints[dataPoints.length - 1]?.timestamp ?? new Date();
  const label = config.summaryLabel ?? config.metric;

  if (dataPoints.length < minPoints) {
    return {
      metric: config.metric,
      trendType: TrendType.INSUFFICIENT_DATA,
      direction: TrendDirection.STABLE,
      confidence: 0,
      startDate,
      endDate,
      summary: `Dados insuficientes para análise de ${label}`,
      metadata: { dataPoints: dataPoints.length },
    };
  }

  const regressionPoints = toRegressionPoints(dataPoints);
  const { slope, r2 } = linearRegression(regressionPoints);

  const stableThreshold = config.stableThresholdPerDay ?? 0.3;
  const fluctuatingThreshold = config.fluctuatingR2Threshold ?? 0.3;

  let direction: TrendDirection;
  let trendType: TrendType;

  if (Math.abs(slope) < stableThreshold) {
    direction = TrendDirection.STABLE;
    trendType = TrendType.STABLE;
  } else if (slope > 0) {
    direction = TrendDirection.INCREASING;
    trendType = config.higherIsBetter ? TrendType.IMPROVING : TrendType.WORSENING;
  } else {
    direction = TrendDirection.DECREASING;
    trendType = config.higherIsBetter ? TrendType.WORSENING : TrendType.IMPROVING;
  }

  if (trendType !== TrendType.STABLE && r2 < fluctuatingThreshold && dataPoints.length >= 4) {
    trendType = TrendType.FLUCTUATING;
  }

  const slopeAbs = Math.abs(slope).toFixed(2);
  const sign = slope > 0 ? '+' : '-';
  const summaryMap: Record<string, string> = {
    [TrendType.IMPROVING]: `${label} em melhora (${sign}${slopeAbs}/dia)`,
    [TrendType.WORSENING]: `${label} em piora (${sign}${slopeAbs}/dia)`,
    [TrendType.STABLE]: `${label} estável`,
    [TrendType.FLUCTUATING]: `${label} com oscilações`,
  };

  return {
    metric: config.metric,
    trendType,
    direction,
    confidence: Math.round(r2 * 100) / 100,
    startDate,
    endDate,
    summary: summaryMap[trendType] ?? `${label}: análise concluída`,
    metadata: {
      slope: Math.round(slope * 100) / 100,
      r2: Math.round(r2 * 100) / 100,
      dataPoints: dataPoints.length,
    },
  };
}
