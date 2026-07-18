export interface ConfusionMatrix {
  tp: number;
  tn: number;
  fp: number;
  fn: number;
}

export interface ModelMetricsResult {
  accuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  sensitivity: number;
  f1Score: number;
  rocAuc: number;
  calibration: number;
}

export interface PredictionSample {
  predicted: boolean;
  actual: boolean;
  confidence?: number;
}

export interface CalibrationBin {
  avgConfidence: number;
  accuracy: number;
  count: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateAccuracy(m: ConfusionMatrix): number {
  const total = m.tp + m.tn + m.fp + m.fn;
  if (total === 0) return 0;
  return round2((m.tp + m.tn) / total);
}

export function calculatePrecision(m: ConfusionMatrix): number {
  const denom = m.tp + m.fp;
  if (denom === 0) return 0;
  return round2(m.tp / denom);
}

export function calculateRecall(m: ConfusionMatrix): number {
  const denom = m.tp + m.fn;
  if (denom === 0) return 0;
  return round2(m.tp / denom);
}

export function calculateSpecificity(m: ConfusionMatrix): number {
  const denom = m.tn + m.fp;
  if (denom === 0) return 0;
  return round2(m.tn / denom);
}

export function calculateSensitivity(m: ConfusionMatrix): number {
  return calculateRecall(m);
}

export function calculateF1Score(m: ConfusionMatrix): number {
  const precision = calculatePrecision(m);
  const recall = calculateRecall(m);
  const denom = precision + recall;
  if (denom === 0) return 0;
  return round2((2 * precision * recall) / denom);
}

export function estimateRocAuc(samples: PredictionSample[]): number {
  if (samples.length === 0) return 0.5;
  const positives = samples.filter((s) => s.actual).length;
  const negatives = samples.length - positives;
  if (positives === 0 || negatives === 0) return 0.5;
  let concordant = 0;
  for (const pos of samples.filter((s) => s.actual)) {
    for (const neg of samples.filter((s) => !s.actual)) {
      const posConf = pos.confidence ?? (pos.predicted ? 0.8 : 0.2);
      const negConf = neg.confidence ?? (neg.predicted ? 0.8 : 0.2);
      if (posConf > negConf) concordant++;
      else if (posConf === negConf) concordant += 0.5;
    }
  }
  return round2(concordant / (positives * negatives));
}

export function calculateECE(bins: CalibrationBin[]): number {
  const total = bins.reduce((s, b) => s + b.count, 0);
  if (total === 0) return 0;
  const ece = bins.reduce((s, b) => s + (b.count / total) * Math.abs(b.avgConfidence - b.accuracy), 0);
  return round2(ece);
}

export function buildConfusionMatrix(samples: PredictionSample[]): ConfusionMatrix {
  return samples.reduce(
    (m, s) => {
      if (s.predicted && s.actual) m.tp++;
      else if (!s.predicted && !s.actual) m.tn++;
      else if (s.predicted && !s.actual) m.fp++;
      else m.fn++;
      return m;
    },
    { tp: 0, tn: 0, fp: 0, fn: 0 },
  );
}

export function calculateMetrics(matrix: ConfusionMatrix, samples?: PredictionSample[], calibrationBins?: CalibrationBin[]): ModelMetricsResult {
  const rocAuc = samples ? estimateRocAuc(samples) : 0.5;
  const calibration = calibrationBins ? 1 - calculateECE(calibrationBins) : 1;
  return {
    accuracy: calculateAccuracy(matrix),
    precision: calculatePrecision(matrix),
    recall: calculateRecall(matrix),
    specificity: calculateSpecificity(matrix),
    sensitivity: calculateSensitivity(matrix),
    f1Score: calculateF1Score(matrix),
    rocAuc,
    calibration: round2(Math.max(0, Math.min(1, calibration))),
  };
}

export function metricsFromOutcomes(predictedPriority: string, actualOutcome: string): PredictionSample {
  const positiveOutcomes = new Set(['IMPROVED', 'RESOLVED', 'STABLE']);
  const highPriorities = new Set(['HIGH', 'URGENT', 'CRITICAL']);
  const predicted = highPriorities.has(predictedPriority);
  const actual = !positiveOutcomes.has(actualOutcome);
  return { predicted, actual };
}
