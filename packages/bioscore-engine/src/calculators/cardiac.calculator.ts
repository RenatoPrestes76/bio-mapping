import { round1 } from '../utils/math.utils.js';
import type {
  CardioClassification,
  CardioMetricsInput,
  CardioMetricsResult,
  HrZones,
} from '../interfaces/index.js';

// Tanaka formula (more accurate than 220-age for adults)
export function estimateMaxHr(ageYears: number): number {
  return Math.round(208 - 0.7 * ageYears);
}

export function calculateHrZones(maxHr: number): HrZones {
  return {
    zone1: {
      min: Math.round(maxHr * 0.5),
      max: Math.round(maxHr * 0.6),
      name: 'Zona 1 — Recuperação Ativa',
    },
    zone2: {
      min: Math.round(maxHr * 0.6),
      max: Math.round(maxHr * 0.7),
      name: 'Zona 2 — Base Aeróbica / Queima de Gordura',
    },
    zone3: {
      min: Math.round(maxHr * 0.7),
      max: Math.round(maxHr * 0.8),
      name: 'Zona 3 — Aeróbico',
    },
    zone4: {
      min: Math.round(maxHr * 0.8),
      max: Math.round(maxHr * 0.9),
      name: 'Zona 4 — Limiar Anaeróbico',
    },
    zone5: {
      min: Math.round(maxHr * 0.9),
      max: maxHr,
      name: 'Zona 5 — VO₂ Máx / Potência',
    },
  };
}

export function classifyRestingHr(restingHr: number): CardioClassification {
  if (restingHr < 55) return 'EXCELENTE';
  if (restingHr < 65) return 'MUITO_BOM';
  if (restingHr < 70) return 'BOM';
  if (restingHr < 75) return 'REGULAR';
  return 'RUIM';
}

// Heart Rate Reserve method: VO2max ≈ 15 × (HRmax / HRrest)
export function estimateVo2MaxFromHr(restingHr: number, maxHr: number): number {
  return round1(15 * (maxHr / restingHr));
}

function cardioClassificationToScore(classification: CardioClassification): number {
  const map: Record<CardioClassification, number> = {
    EXCELENTE: 100,
    MUITO_BOM: 80,
    BOM: 60,
    REGULAR: 40,
    RUIM: 20,
  };
  return map[classification];
}

export function computeCardioMetrics(input: CardioMetricsInput): CardioMetricsResult {
  const maxHrEstimated = estimateMaxHr(input.ageYears);
  const effectiveMaxHr = input.maxHrMeasured ?? maxHrEstimated;
  const zones = calculateHrZones(effectiveMaxHr);

  let classification: CardioClassification | undefined;
  let vo2maxEstimated: number | undefined;

  if (input.restingHr != null) {
    classification = classifyRestingHr(input.restingHr);
    vo2maxEstimated = estimateVo2MaxFromHr(input.restingHr, effectiveMaxHr);
  }

  const score = classification ? cardioClassificationToScore(classification) : 50;

  return {
    maxHrEstimated,
    zones,
    classification,
    vo2maxEstimated,
    score,
  };
}
