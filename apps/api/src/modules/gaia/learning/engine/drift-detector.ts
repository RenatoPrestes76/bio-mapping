export type DriftType = 'DATA_DRIFT' | 'CONCEPT_DRIFT' | 'FEATURE_DRIFT' | 'POPULATION_DRIFT';

export interface DriftDetectionResult {
  driftType: DriftType;
  driftScore: number;
  threshold: number;
  hasDrift: boolean;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  affectedFeatures?: string[];
}

const DEFAULT_THRESHOLD = 0.1;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function calculateMeanDrift(baseline: number[], current: number[]): number {
  if (baseline.length === 0 || current.length === 0) return 0;
  const baseMean = baseline.reduce((s, v) => s + v, 0) / baseline.length;
  const curMean = current.reduce((s, v) => s + v, 0) / current.length;
  const baseStd = Math.sqrt(baseline.reduce((s, v) => s + Math.pow(v - baseMean, 2), 0) / baseline.length) || 1;
  return round4(Math.abs(curMean - baseMean) / baseStd);
}

export function calculateKLDivergence(baseline: number[], current: number[]): number {
  if (baseline.length === 0 || current.length === 0) return 0;
  const eps = 1e-10;
  const len = Math.max(baseline.length, current.length);
  const bNorm = baseline.map((v) => v / (baseline.reduce((s, x) => s + x, 0) + eps));
  const cNorm = current.map((v) => v / (current.reduce((s, x) => s + x, 0) + eps));
  let kl = 0;
  for (let i = 0; i < len; i++) {
    const p = (bNorm[i] ?? 0) + eps;
    const q = (cNorm[i] ?? 0) + eps;
    kl += p * Math.log(p / q);
  }
  return round4(Math.max(0, kl));
}

function gradeSeverity(score: number, threshold: number): DriftDetectionResult['severity'] {
  const ratio = score / threshold;
  if (ratio >= 3) return 'CRITICAL';
  if (ratio >= 2) return 'HIGH';
  if (ratio >= 1) return 'MODERATE';
  return 'LOW';
}

export function detectDataDrift(baseline: number[], current: number[], threshold = DEFAULT_THRESHOLD): DriftDetectionResult {
  const driftScore = calculateMeanDrift(baseline, current);
  const hasDrift = driftScore > threshold;
  return { driftType: 'DATA_DRIFT', driftScore, threshold, hasDrift, severity: gradeSeverity(driftScore, threshold) };
}

export function detectConceptDrift(recentAccuracies: number[], threshold = 0.05): DriftDetectionResult {
  if (recentAccuracies.length < 2) {
    return { driftType: 'CONCEPT_DRIFT', driftScore: 0, threshold, hasDrift: false, severity: 'LOW' };
  }
  const half = Math.floor(recentAccuracies.length / 2);
  const firstHalf = recentAccuracies.slice(0, half);
  const secondHalf = recentAccuracies.slice(half);
  const firstMean = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const secondMean = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
  const driftScore = round4(Math.abs(firstMean - secondMean));
  const hasDrift = driftScore > threshold;
  return { driftType: 'CONCEPT_DRIFT', driftScore, threshold, hasDrift, severity: gradeSeverity(driftScore, threshold) };
}

export function detectFeatureDrift(
  baselineStats: Record<string, number>,
  currentStats: Record<string, number>,
  threshold = DEFAULT_THRESHOLD,
): DriftDetectionResult {
  const features = Object.keys(baselineStats);
  if (features.length === 0) {
    return { driftType: 'FEATURE_DRIFT', driftScore: 0, threshold, hasDrift: false, severity: 'LOW', affectedFeatures: [] };
  }
  const drifted: string[] = [];
  let totalScore = 0;
  for (const feat of features) {
    const base = baselineStats[feat] ?? 0;
    const cur = currentStats[feat] ?? 0;
    const std = Math.abs(base) || 1;
    const score = Math.abs(cur - base) / std;
    totalScore += score;
    if (score > threshold) drifted.push(feat);
  }
  const driftScore = round4(totalScore / features.length);
  const hasDrift = drifted.length > 0;
  return { driftType: 'FEATURE_DRIFT', driftScore, threshold, hasDrift, severity: gradeSeverity(driftScore, threshold), affectedFeatures: drifted };
}

export function detectPopulationDrift(
  baselineDist: Record<string, number>,
  currentDist: Record<string, number>,
  threshold = DEFAULT_THRESHOLD,
): DriftDetectionResult {
  const categories = [...new Set([...Object.keys(baselineDist), ...Object.keys(currentDist)])];
  if (categories.length === 0) {
    return { driftType: 'POPULATION_DRIFT', driftScore: 0, threshold, hasDrift: false, severity: 'LOW' };
  }
  const baseTotal = Object.values(baselineDist).reduce((s, v) => s + v, 0) || 1;
  const curTotal = Object.values(currentDist).reduce((s, v) => s + v, 0) || 1;
  const baseVec = categories.map((c) => (baselineDist[c] ?? 0) / baseTotal);
  const curVec = categories.map((c) => (currentDist[c] ?? 0) / curTotal);
  const driftScore = calculateKLDivergence(baseVec, curVec);
  const hasDrift = driftScore > threshold;
  return { driftType: 'POPULATION_DRIFT', driftScore, threshold, hasDrift, severity: gradeSeverity(driftScore, threshold) };
}

export function runAllDriftDetectors(input: {
  baselineValues: number[];
  currentValues: number[];
  recentAccuracies: number[];
  baselineFeatureStats: Record<string, number>;
  currentFeatureStats: Record<string, number>;
  baselinePopulation: Record<string, number>;
  currentPopulation: Record<string, number>;
  threshold?: number;
}): DriftDetectionResult[] {
  const t = input.threshold ?? DEFAULT_THRESHOLD;
  return [
    detectDataDrift(input.baselineValues, input.currentValues, t),
    detectConceptDrift(input.recentAccuracies, 0.05),
    detectFeatureDrift(input.baselineFeatureStats, input.currentFeatureStats, t),
    detectPopulationDrift(input.baselinePopulation, input.currentPopulation, t),
  ].filter((r) => r.hasDrift);
}
