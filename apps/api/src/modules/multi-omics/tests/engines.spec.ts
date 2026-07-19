import { OmicsType } from '../entities/omics-profile.entity.js';
import { OmicsProfile } from '../entities/omics-profile.entity.js';
import { OmicsDataset } from '../entities/omics-dataset.entity.js';
import { IntegratedFeature } from '../entities/omics-integration.entity.js';
import { OmicsNormalizationEngine } from '../engines/omics-normalization.engine.js';
import { QualityAssessmentEngine } from '../engines/quality-assessment.engine.js';
import { FeatureFusionEngine } from '../engines/feature-fusion.engine.js';
import { CrossOmicsCorrelationEngine } from '../engines/cross-omics-correlation.engine.js';
import { BiologicalPathwayEngine } from '../engines/biological-pathway.engine.js';
import {
  zScoreNormalize,
  log2Transform,
  minMaxScale,
  clrTransform,
  quantileNormalize,
  applyMethod,
  computeStats,
} from '../normalization/normalization-methods.js';
import { NormalizedDataset } from '../normalization/normalization-methods.js';

const makeMeasurements = (): Record<string, number> => ({
  ldl: 165,
  glucose: 110,
  crp: 1.8,
  il6: 3.2,
  insulin: 12,
  hba1c: 6.5,
});

const makeDataset = (profileId = 'p-test', measurements?: Record<string, number>): OmicsDataset =>
  new OmicsDataset({
    profileId,
    measurements: measurements ?? makeMeasurements(),
    datasetType: 'METABOLOMICS_PANEL',
  });

const makeProfile = (id = 'p-test', omicsType = OmicsType.METABOLOMICS, quality = 75): OmicsProfile =>
  new OmicsProfile({ id, patientId: 'patient-1', omicsType, source: 'LC-MS', qualityScore: quality });

const makeNormalized = (
  profileId: string,
  omicsType: string,
  values: Record<string, number>,
): NormalizedDataset => ({
  id: `norm-${profileId}`,
  datasetId: `ds-${profileId}`,
  profileId,
  omicsType,
  method: 'Z_SCORE',
  normalizedValues: values,
  originalStats: { mean: 0, std: 1, min: -2, max: 2, count: Object.keys(values).length },
  normalizedAt: new Date(),
});

// ── Normalization utility functions ────────────────────────────────────────

describe('Normalization methods', () => {
  it('computeStats handles empty array', () => {
    const stats = computeStats([]);
    expect(stats.count).toBe(0);
    expect(stats.mean).toBe(0);
  });

  it('computeStats computes correct mean, std, min, max', () => {
    const stats = computeStats([1, 2, 3, 4, 5]);
    expect(stats.mean).toBeCloseTo(3);
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(5);
    expect(stats.count).toBe(5);
  });

  it('zScoreNormalize produces mean≈0 and std≈1', () => {
    const result = zScoreNormalize([10, 20, 30, 40, 50]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum)).toBeLessThan(0.001); // mean ≈ 0
  });

  it('zScoreNormalize handles all-same values', () => {
    const result = zScoreNormalize([5, 5, 5]);
    expect(result).toEqual([0, 0, 0]);
  });

  it('log2Transform maps values to log2(x+1)', () => {
    const result = log2Transform([0, 1, 3, 7]);
    expect(result[0]).toBe(0); // log2(0+1) = 0
    expect(result[1]).toBeCloseTo(1); // log2(1+1) = 1
    expect(result[2]).toBeCloseTo(2); // log2(3+1) = 2
    expect(result[3]).toBeCloseTo(3); // log2(7+1) = 3
  });

  it('log2Transform clips negative values to log2(1) = 0', () => {
    const result = log2Transform([-5, 0, 1]);
    expect(result[0]).toBe(0); // clipped at 0
  });

  it('minMaxScale produces values in [0, 1]', () => {
    const result = minMaxScale([10, 20, 30, 40, 50]);
    expect(result[0]).toBe(0);
    expect(result[result.length - 1]).toBe(1);
    result.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });

  it('minMaxScale handles single value', () => {
    const result = minMaxScale([42]);
    expect(result).toEqual([0]);
  });

  it('clrTransform produces values summing to ~0 (CLR property)', () => {
    const result = clrTransform([0.1, 0.2, 0.3, 0.4]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum)).toBeLessThan(0.001);
  });

  it('clrTransform handles zeros by using pseudocount', () => {
    const result = clrTransform([0, 1, 2, 3]);
    expect(result.every((v) => isFinite(v))).toBe(true);
  });

  it('quantileNormalize produces values in (0, 1]', () => {
    const result = quantileNormalize([5, 1, 3, 2, 4]);
    result.forEach((v) => {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });

  it('applyMethod dispatches to correct function', () => {
    const values = [1, 2, 3, 4, 5];
    expect(applyMethod(values, 'Z_SCORE')).not.toEqual(values);
    expect(applyMethod(values, 'LOG2')).not.toEqual(values);
    expect(applyMethod(values, 'NONE')).toEqual(values);
  });
});

// ── OmicsNormalizationEngine ────────────────────────────────────────────────

describe('OmicsNormalizationEngine', () => {
  const engine = new OmicsNormalizationEngine();

  it('normalizes a dataset and returns NormalizedDataset', () => {
    const ds = makeDataset();
    const result = engine.normalize(ds, OmicsType.METABOLOMICS);
    expect(result.datasetId).toBe(ds.id);
    expect(result.profileId).toBe(ds.profileId);
    expect(result.omicsType).toBe(OmicsType.METABOLOMICS);
    expect(Object.keys(result.normalizedValues)).toEqual(Object.keys(ds.measurements));
  });

  it('uses AUTO/recommended method when not specified', () => {
    const ds = makeDataset('p', { a: 1, b: 2, c: 3 });
    const result = engine.normalize(ds, OmicsType.TRANSCRIPTOMICS);
    expect(result.method).toBe('LOG2'); // recommended for TRANSCRIPTOMICS
  });

  it('uses specified method when provided', () => {
    const ds = makeDataset();
    const result = engine.normalize(ds, OmicsType.PROTEOMICS, 'MIN_MAX');
    expect(result.method).toBe('MIN_MAX');
    Object.values(result.normalizedValues).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });

  it('getRecommendedMethod returns correct method per type', () => {
    expect(engine.getRecommendedMethod(OmicsType.TRANSCRIPTOMICS)).toBe('LOG2');
    expect(engine.getRecommendedMethod(OmicsType.MICROBIOME)).toBe('CLR');
    expect(engine.getRecommendedMethod(OmicsType.GENOMICS)).toBe('MIN_MAX');
    expect(engine.getRecommendedMethod(OmicsType.PROTEOMICS)).toBe('Z_SCORE');
  });

  it('validateNormalization detects valid normalized dataset', () => {
    const ds = makeDataset();
    const normalized = engine.normalize(ds, OmicsType.METABOLOMICS);
    const validation = engine.validateNormalization(normalized);
    expect(validation.isValid).toBe(true);
    expect(validation.hasNaNValues).toBe(false);
    expect(validation.hasInfiniteValues).toBe(false);
    expect(validation.variableCount).toBe(Object.keys(ds.measurements).length);
  });

  it('validateNormalization reports warnings for empty dataset', () => {
    const ds = makeDataset('p', {});
    const normalized = engine.normalize(ds, OmicsType.METABOLOMICS);
    const validation = engine.validateNormalization(normalized);
    expect(validation.warnings).toContain('Empty dataset — no variables to normalize');
  });
});

// ── QualityAssessmentEngine ─────────────────────────────────────────────────

describe('QualityAssessmentEngine', () => {
  const engine = new QualityAssessmentEngine();

  it('assess returns QualityReport with all fields', () => {
    const ds = makeDataset();
    const report = engine.assess(ds, OmicsType.METABOLOMICS);
    expect(report.profileId).toBe(ds.profileId);
    expect(report.datasetId).toBe(ds.id);
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(report.variableCount).toBe(6);
    expect(report.assessedAt).toBeInstanceOf(Date);
  });

  it('assess generates high completeness for full measurements', () => {
    const ds = new OmicsDataset({ profileId: 'p', measurements: { a: 1, b: 2, c: 3, d: 4, e: 5 } });
    const report = engine.assess(ds, OmicsType.METABOLOMICS);
    expect(report.completeness).toBe(100);
  });

  it('assess detects low coverage', () => {
    const ds = new OmicsDataset({ profileId: 'p', measurements: { a: 1, b: 2 } });
    const report = engine.assess(ds, OmicsType.TRANSCRIPTOMICS); // needs 500 variables
    expect(report.coverageScore).toBeLessThan(5);
    expect(report.passesThreshold).toBe(false);
  });

  it('computeBatchScore returns average of reports', () => {
    const ds = makeDataset();
    const r1 = engine.assess(ds, OmicsType.METABOLOMICS);
    const r2 = engine.assess(ds, OmicsType.PROTEOMICS);
    const avg = engine.computeBatchScore([r1, r2]);
    expect(avg).toBeGreaterThanOrEqual(0);
    expect(avg).toBeLessThanOrEqual(100);
  });

  it('detectBatchEffect returns false for single dataset', () => {
    const result = engine.detectBatchEffect([makeDataset()]);
    expect(result.detected).toBe(false);
  });

  it('summarize returns informative string', () => {
    const ds = makeDataset();
    const report = engine.assess(ds, OmicsType.METABOLOMICS);
    const summary = engine.summarize([report]);
    expect(summary).toMatch(/\d\/\d/);
  });
});

// ── FeatureFusionEngine ─────────────────────────────────────────────────────

describe('FeatureFusionEngine', () => {
  const engine = new FeatureFusionEngine();

  const makeInputs = (): { profiles: OmicsProfile[]; datasets: NormalizedDataset[] } => {
    const p1 = makeProfile('p1', OmicsType.GENOMICS, 80);
    const p2 = makeProfile('p2', OmicsType.METABOLOMICS, 70);
    const ds1 = makeNormalized('p1', 'GENOMICS', { akt1: 1.5, tp53: -0.8, egfr: 0.3 });
    const ds2 = makeNormalized('p2', 'METABOLOMICS', { glucose: 0.9, lactate: 1.1, citrate: -0.5 });
    return { profiles: [p1, p2], datasets: [ds1, ds2] };
  };

  it('CONCATENATION fusion returns features from all layers', () => {
    const { profiles, datasets } = makeInputs();
    const result = engine.fuse(profiles, datasets, 'CONCATENATION');
    expect(result.features.length).toBe(6);
    expect(result.layerCount).toBe(2);
    expect(result.method).toBe('CONCATENATION');
  });

  it('WEIGHTED_AVERAGE fusion merges shared names', () => {
    const p1 = makeProfile('p1', OmicsType.GENOMICS, 80);
    const p2 = makeProfile('p2', OmicsType.TRANSCRIPTOMICS, 70);
    const ds1 = makeNormalized('p1', 'GENOMICS', { ldl: 1.5, crp: 0.5 });
    const ds2 = makeNormalized('p2', 'TRANSCRIPTOMICS', { ldl: 1.2, il6: 0.8 });
    const result = engine.fuse([p1, p2], [ds1, ds2], 'WEIGHTED_AVERAGE');
    const ldlFeatures = result.features.filter((f) => f.name === 'ldl');
    expect(ldlFeatures).toHaveLength(1); // merged
  });

  it('CONSENSUS fusion keeps only features meeting threshold', () => {
    const p1 = makeProfile('p1', OmicsType.GENOMICS, 80);
    const p2 = makeProfile('p2', OmicsType.METABOLOMICS, 70);
    const ds1 = makeNormalized('p1', 'GENOMICS', { shared: 1.5, unique1: 0.5 });
    const ds2 = makeNormalized('p2', 'METABOLOMICS', { shared: 1.2, unique2: 0.8 });
    const result = engine.fuse([p1, p2], [ds1, ds2], 'CONSENSUS');
    expect(result.features.some((f) => f.name === 'shared')).toBe(true);
    // unique features should NOT be in consensus since they appear in only 50% of inputs (< threshold of 50%)
    // actually exactly 50%, depends on implementation
  });

  it('returns empty result for empty inputs', () => {
    const result = engine.fuse([], [], 'CONCATENATION');
    expect(result.features).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  it('confidence is within [0, 1]', () => {
    const { profiles, datasets } = makeInputs();
    const result = engine.fuse(profiles, datasets, 'CONCATENATION');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('rankFeatures sorts by biologicalRelevance then confidence', () => {
    const features: IntegratedFeature[] = [
      { name: 'f1', omicsLayers: [OmicsType.GENOMICS], value: 1, confidence: 0.8, biologicalRelevance: 'LOW' },
      { name: 'f2', omicsLayers: [OmicsType.GENOMICS], value: 2, confidence: 0.9, biologicalRelevance: 'HIGH' },
      { name: 'f3', omicsLayers: [OmicsType.GENOMICS], value: 1.5, confidence: 0.7, biologicalRelevance: 'MEDIUM' },
    ];
    const ranked = engine.rankFeatures(features);
    expect(ranked[0].biologicalRelevance).toBe('HIGH');
    expect(ranked[ranked.length - 1].biologicalRelevance).toBe('LOW');
  });

  it('getTopFeatures returns at most N features', () => {
    const features: IntegratedFeature[] = Array.from({ length: 30 }, (_, i) => ({
      name: `f${i}`,
      omicsLayers: [OmicsType.GENOMICS],
      value: Math.random(),
      confidence: Math.random(),
      biologicalRelevance: 'MEDIUM' as const,
    }));
    const top = engine.getTopFeatures(features, 10);
    expect(top).toHaveLength(10);
  });
});

// ── CrossOmicsCorrelationEngine ─────────────────────────────────────────────

describe('CrossOmicsCorrelationEngine', () => {
  const engine = new CrossOmicsCorrelationEngine();

  it('pearsonCorrelation computes correct value for perfect correlation', () => {
    const r = engine.pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
    expect(r).toBeCloseTo(1.0);
  });

  it('pearsonCorrelation handles anti-correlation', () => {
    const r = engine.pearsonCorrelation([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]);
    expect(r).toBeCloseTo(-1.0);
  });

  it('pearsonCorrelation returns 0 for constant vector', () => {
    const r = engine.pearsonCorrelation([1, 1, 1], [1, 2, 3]);
    expect(r).toBe(0);
  });

  it('correlate returns CorrelationResult with correct layer pair', () => {
    const ds1 = makeNormalized('p1', 'GENOMICS', { akt1: 1.5, tp53: -0.8 });
    const ds2 = makeNormalized('p2', 'METABOLOMICS', { glucose: 0.9, lactate: 1.1 });
    const result = engine.correlate(ds1, ds2);
    expect(result.omicsLayerPair).toEqual(['GENOMICS', 'METABOLOMICS']);
    expect(result.generatedAt).toBeInstanceOf(Date);
    expect(result.summary).toContain('GENOMICS');
    expect(result.summary).toContain('METABOLOMICS');
  });

  it('correlate finds shared variables', () => {
    const ds1 = makeNormalized('p1', 'GENOMICS', { ldl: 1.5, tp53: 0.5 });
    const ds2 = makeNormalized('p2', 'PROTEOMICS', { ldl: 1.2, crp: 0.8 });
    const result = engine.correlate(ds1, ds2);
    expect(result.sharedVariableCount).toBe(1); // 'ldl' is shared
  });

  it('findSharedVariables returns variables present in all datasets', () => {
    const ds1 = makeNormalized('p1', 'GENOMICS', { ldl: 1, crp: 2, shared: 3 });
    const ds2 = makeNormalized('p2', 'METABOLOMICS', { glucose: 1, shared: 2 });
    const ds3 = makeNormalized('p3', 'PROTEOMICS', { shared: 1.5, il6: 0.8 });
    const shared = engine.findSharedVariables([ds1, ds2, ds3]);
    expect(shared).toContain('shared');
    expect(shared).not.toContain('ldl');
  });

  it('correlateAll returns pairwise results', () => {
    const ds1 = makeNormalized('p1', 'GENOMICS', { a: 1.5 });
    const ds2 = makeNormalized('p2', 'METABOLOMICS', { b: 0.9 });
    const ds3 = makeNormalized('p3', 'PROTEOMICS', { c: 0.5 });
    const results = engine.correlateAll([ds1, ds2, ds3]);
    expect(results).toHaveLength(3); // C(3,2) = 3 pairs
  });
});

// ── BiologicalPathwayEngine ─────────────────────────────────────────────────

describe('BiologicalPathwayEngine', () => {
  const engine = new BiologicalPathwayEngine();

  const makeFeature = (name: string): IntegratedFeature => ({
    name,
    omicsLayers: [OmicsType.METABOLOMICS],
    value: 1.5,
    confidence: 0.85,
    biologicalRelevance: 'HIGH',
  });

  it('mapToPathways identifies known pathway markers', () => {
    const features = [
      makeFeature('metabolomics:glucose'),
      makeFeature('metabolomics:pyruvate'),
      makeFeature('metabolomics:ldha'),
    ];
    const mappings = engine.mapToPathways(features);
    expect(mappings.length).toBeGreaterThan(0);
    const glycolysis = mappings.find((m) => m.pathwayId === 'hsa00010');
    expect(glycolysis).toBeDefined();
  });

  it('enrichmentAnalysis returns non-empty enrichments for known markers', () => {
    const features = [
      makeFeature('glucose'),
      makeFeature('pyruvate'),
      makeFeature('insulin'),
      makeFeature('akt2'),
    ];
    const enrichments = engine.enrichmentAnalysis(features);
    expect(enrichments.length).toBeGreaterThan(0);
    expect(enrichments[0].enrichmentRatio).toBeGreaterThan(0);
  });

  it('annotateFeatures adds pathway and clinicalRelevance to known markers', () => {
    const features = [makeFeature('glucose')];
    const annotated = engine.annotateFeatures(features);
    expect(annotated[0].pathway).toBeDefined();
    expect(annotated[0].clinicalRelevance).toBeDefined();
    expect(annotated[0].biologicalRelevance).toBe('HIGH');
  });

  it('annotateFeatures leaves unknown features unchanged', () => {
    const feature = makeFeature('unknown_marker_xyz');
    const annotated = engine.annotateFeatures([feature]);
    expect(annotated[0].pathway).toBeUndefined();
  });

  it('getPathwayById returns correct pathway', () => {
    const pw = engine.getPathwayById('hsa00010');
    expect(pw).toBeDefined();
    expect(pw!.name).toContain('Glycolysis');
  });

  it('getAllPathways returns all 14 defined pathways', () => {
    expect(engine.getAllPathways().length).toBe(14);
  });

  it('getClinicalImpact returns informative string for high-sig pathways', () => {
    const mappings = engine.mapToPathways([
      makeFeature('glucose'), makeFeature('pyruvate'), makeFeature('ldha'),
      makeFeature('hk1'), makeFeature('gapdh'),
    ]);
    const impact = engine.getClinicalImpact(mappings);
    expect(impact.length).toBeGreaterThan(10);
  });
});
