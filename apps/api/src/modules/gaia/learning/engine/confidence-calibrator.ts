export type CalibrationGrade = 'WELL_CALIBRATED' | 'OVERCONFIDENT' | 'UNDERCONFIDENT';

export interface CalibrationResult {
  predictedConfidence: number;
  actualAccuracy: number;
  calibrationError: number;
  calibrationGrade: CalibrationGrade;
  description: string;
}

export interface ConfidenceBucket {
  minConf: number;
  maxConf: number;
  samples: Array<{ confidence: number; correct: boolean }>;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function evaluateCalibration(predictedConfidence: number, actualAccuracy: number): CalibrationResult {
  const calibrationError = round2(Math.abs(predictedConfidence - actualAccuracy));
  let calibrationGrade: CalibrationGrade;
  let description: string;

  if (calibrationError <= 0.05) {
    calibrationGrade = 'WELL_CALIBRATED';
    description = `Modelo bem calibrado. Confiança prevista ${Math.round(predictedConfidence * 100)}%, acertos reais ${Math.round(actualAccuracy * 100)}%.`;
  } else if (predictedConfidence > actualAccuracy) {
    calibrationGrade = 'OVERCONFIDENT';
    description = `Modelo superconfiante. Confiança prevista ${Math.round(predictedConfidence * 100)}%, acertos reais apenas ${Math.round(actualAccuracy * 100)}%. Considere recalibração.`;
  } else {
    calibrationGrade = 'UNDERCONFIDENT';
    description = `Modelo subconfiante. Confiança prevista ${Math.round(predictedConfidence * 100)}%, acertos reais ${Math.round(actualAccuracy * 100)}%. Modelo é mais preciso do que indica.`;
  }

  return { predictedConfidence, actualAccuracy, calibrationError, calibrationGrade, description };
}

export function buildCalibrationBins(
  samples: Array<{ confidence: number; correct: boolean }>,
  numBins = 10,
): Array<{ avgConfidence: number; accuracy: number; count: number }> {
  const bins: ConfidenceBucket[] = Array.from({ length: numBins }, (_, i) => ({
    minConf: i / numBins,
    maxConf: (i + 1) / numBins,
    samples: [],
  }));

  for (const s of samples) {
    const idx = Math.min(Math.floor(s.confidence * numBins), numBins - 1);
    bins[idx].samples.push(s);
  }

  return bins
    .filter((b) => b.samples.length > 0)
    .map((b) => ({
      avgConfidence: round2(b.samples.reduce((s, x) => s + x.confidence, 0) / b.samples.length),
      accuracy: round2(b.samples.filter((x) => x.correct).length / b.samples.length),
      count: b.samples.length,
    }));
}

export function computeOverallCalibrationScore(
  samples: Array<{ confidence: number; correct: boolean }>,
): CalibrationResult {
  if (samples.length === 0) {
    return evaluateCalibration(0, 0);
  }
  const avgConfidence = samples.reduce((s, x) => s + x.confidence, 0) / samples.length;
  const actualAccuracy = samples.filter((x) => x.correct).length / samples.length;
  return evaluateCalibration(round2(avgConfidence), round2(actualAccuracy));
}

export function interpretCalibrationGrade(grade: CalibrationGrade): string {
  const map: Record<CalibrationGrade, string> = {
    WELL_CALIBRATED: 'Bem Calibrado',
    OVERCONFIDENT: 'Superconfiante',
    UNDERCONFIDENT: 'Subconfiante',
  };
  return map[grade];
}
