import type { ClinicalEvent } from '../entities/clinical-event.entity.js';
import { BiomarkerTrend } from '../entities/biomarker-trend.entity.js';
import type { TrendClassification, TrendDirection, TrendDataPoint } from '../entities/biomarker-trend.entity.js';

export interface BiomarkerNorm {
  low: number;
  high: number;
  unit: string;
  lowerIsBetter?: boolean;
}

export const BIOMARKER_NORMS: Record<string, BiomarkerNorm> = {
  hba1c: { low: 4.0, high: 5.6, unit: '%' },
  glucose: { low: 70, high: 99, unit: 'mg/dL' },
  ldl: { low: 0, high: 99, unit: 'mg/dL', lowerIsBetter: true },
  hdl: { low: 40, high: 999, unit: 'mg/dL' },
  triglycerides: { low: 0, high: 149, unit: 'mg/dL', lowerIsBetter: true },
  crp: { low: 0, high: 1.0, unit: 'mg/L', lowerIsBetter: true },
  creatinine: { low: 0.7, high: 1.2, unit: 'mg/dL' },
  egfr: { low: 60, high: 999, unit: 'mL/min/1.73m²' },
  bmi: { low: 18.5, high: 24.9, unit: 'kg/m²' },
  bp_systolic: { low: 90, high: 129, unit: 'mmHg', lowerIsBetter: true },
  bp_diastolic: { low: 60, high: 79, unit: 'mmHg', lowerIsBetter: true },
  pcr: { low: 0, high: 1.0, unit: 'mg/L', lowerIsBetter: true },
};

function computeDirection(first: number, last: number): TrendDirection {
  const delta = last - first;
  if (Math.abs(delta) < 0.001) return 'FLAT';
  return delta > 0 ? 'UP' : 'DOWN';
}

function computeCoefficientsOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function classifyTrend(
  first: number,
  last: number,
  cv: number,
  norm?: BiomarkerNorm,
  pointCount = 2,
): TrendClassification {
  if (pointCount >= 4 && cv > 0.25) return 'OSCILLATING';

  const variationPct = Math.abs((last - first) / (first || 1));
  if (variationPct < 0.03) return 'STABLE';

  if (!norm) {
    return last < first ? 'IMPROVING' : 'WORSENING';
  }

  const inRangeFirst = first >= norm.low && first <= norm.high;
  const inRangeLast = last >= norm.low && last <= norm.high;

  if (inRangeLast && !inRangeFirst) return 'IMPROVING';
  if (inRangeFirst && !inRangeLast) return 'WORSENING';

  if (norm.lowerIsBetter) {
    return last < first ? 'IMPROVING' : 'WORSENING';
  }

  const distFirst = Math.abs(first - (norm.low + norm.high) / 2);
  const distLast = Math.abs(last - (norm.low + norm.high) / 2);
  return distLast < distFirst ? 'IMPROVING' : distLast > distFirst ? 'WORSENING' : 'STABLE';
}

function computeConfidence(pointCount: number, cv: number): number {
  const pointScore = Math.min(1, pointCount / 5);
  const cvScore = Math.max(0, 1 - cv * 2);
  return Math.round((pointScore * 0.6 + cvScore * 0.4) * 100) / 100;
}

export class TrendAnalysisEngine {
  analyzeTrend(marker: string, events: ClinicalEvent[]): BiomarkerTrend | null {
    const dataPoints: TrendDataPoint[] = [];

    for (const event of events) {
      const v = event.getBiomarkerValue(marker);
      if (v !== undefined) {
        dataPoints.push({ date: event.date, value: v, eventId: event.id });
      }
    }

    if (dataPoints.length < 2) return null;

    dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());

    const values = dataPoints.map((p) => p.value);
    const first = values[0];
    const last = values[values.length - 1];
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const variation = last - first;
    const variationPercent = first !== 0 ? (variation / first) * 100 : 0;
    const cv = computeCoefficientsOfVariation(values);
    const direction = computeDirection(first, last);
    const norm = BIOMARKER_NORMS[marker.toLowerCase()];
    const classification = classifyTrend(first, last, cv, norm, dataPoints.length);
    const confidence = computeConfidence(dataPoints.length, cv);

    const influencingFactors: string[] = [];
    if (cv > 0.15) influencingFactors.push('High variability across measurements');
    if (dataPoints.length < 3) influencingFactors.push('Limited data points — trend may not be reliable');
    if (norm && last > norm.high) influencingFactors.push(`Above normal range (> ${norm.high} ${norm.unit ?? ''})`);
    if (norm && last < norm.low) influencingFactors.push(`Below normal range (< ${norm.low} ${norm.unit ?? ''})`);

    return new BiomarkerTrend({
      marker,
      unit: norm?.unit ?? '',
      firstValue: first,
      lastValue: last,
      minValue,
      maxValue,
      variation,
      variationPercent: Math.round(variationPercent * 10) / 10,
      direction,
      classification,
      confidence,
      dataPoints,
      normalRange: norm ? { low: norm.low, high: norm.high } : undefined,
      explanation: {
        eventsConsidered: dataPoints.length,
        periodStart: dataPoints[0].date,
        periodEnd: dataPoints[dataPoints.length - 1].date,
        influencingFactors,
        confidence,
        reasoning: `${marker} measured ${dataPoints.length} time(s). Direction: ${direction}. Classification: ${classification}.`,
      },
    });
  }

  analyzeAll(markers: string[], events: ClinicalEvent[]): BiomarkerTrend[] {
    const results: BiomarkerTrend[] = [];
    for (const marker of markers) {
      const trend = this.analyzeTrend(marker, events);
      if (trend) results.push(trend);
    }
    return results;
  }

  discoverTrackedMarkers(events: ClinicalEvent[]): string[] {
    const found = new Set<string>();
    for (const event of events) {
      for (const bv of event.getBiomarkers()) {
        found.add(bv.marker.toLowerCase());
      }
    }
    return [...found];
  }
}
