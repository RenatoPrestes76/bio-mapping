import { BIOMARKER_ALERT_THRESHOLDS } from '../constants/athena.constants.js';
import type { AlertSeverity } from '../entities/clinical-alert.entity.js';

export function getBiomarkerAlertSeverity(
  marker: string,
  value: number,
): AlertSeverity | null {
  const thresholds = BIOMARKER_ALERT_THRESHOLDS[marker.toLowerCase() as keyof typeof BIOMARKER_ALERT_THRESHOLDS];
  if (!thresholds) return null;

  const t = thresholds as Record<string, number>;

  if (t['criticalLow'] !== undefined && value <= t['criticalLow']) return 'CRITICAL';
  if (t['low'] !== undefined && value < t['low']) return 'HIGH';
  if (t['critical'] !== undefined && value >= t['critical']) return 'CRITICAL';
  if (t['high'] !== undefined && value >= t['high']) return 'HIGH';
  if (t['moderate'] !== undefined && value >= t['moderate']) return 'MODERATE';

  return null;
}

export function isWithinNormalRange(marker: string, value: number): boolean {
  return getBiomarkerAlertSeverity(marker, value) === null;
}

export function normalizeMarkerName(name: string): string {
  return name.toLowerCase().replace(/[_\s-]/g, '_');
}

export function computeRiskScore(factors: Array<{ weight: number; present: boolean }>): number {
  const total = factors.reduce((sum, f) => sum + f.weight, 0);
  const active = factors.reduce((sum, f) => (f.present ? sum + f.weight : sum), 0);
  return total > 0 ? Math.round((active / total) * 100) : 0;
}

export function confidenceToGrade(confidence: number): 'A' | 'B' | 'C' | 'D' {
  if (confidence >= 85) return 'A';
  if (confidence >= 70) return 'B';
  if (confidence >= 50) return 'C';
  return 'D';
}

export function gradeToWeight(grade: 'A' | 'B' | 'C' | 'D'): number {
  const weights: Record<string, number> = { A: 1.0, B: 0.75, C: 0.5, D: 0.25 };
  return weights[grade] ?? 0.5;
}
