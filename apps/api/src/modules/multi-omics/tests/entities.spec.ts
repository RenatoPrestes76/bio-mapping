import { OmicsProfile, OmicsType } from '../entities/omics-profile.entity.js';
import { OmicsDataset } from '../entities/omics-dataset.entity.js';
import { OmicsIntegration, IntegratedFeature } from '../entities/omics-integration.entity.js';

describe('OmicsProfile entity', () => {
  it('creates with auto-id and defaults', () => {
    const p = new OmicsProfile({
      patientId: 'p-001',
      omicsType: OmicsType.GENOMICS,
      source: 'Illumina WGS',
    });

    expect(p.id).toMatch(/^profile-/);
    expect(p.patientId).toBe('p-001');
    expect(p.omicsType).toBe(OmicsType.GENOMICS);
    expect(p.version).toBe('1.0.0');
    expect(p.qualityScore).toBe(0);
    expect(p.metadata).toEqual({});
    expect(p.createdAt).toBeInstanceOf(Date);
  });

  it('accepts explicit id and custom values', () => {
    const p = new OmicsProfile({
      id: 'profile-explicit',
      patientId: 'p-002',
      omicsType: OmicsType.TRANSCRIPTOMICS,
      source: 'RNA-seq',
      qualityScore: 85,
      version: '2.0.0',
    });
    expect(p.id).toBe('profile-explicit');
    expect(p.qualityScore).toBe(85);
  });

  it('clamps qualityScore to [0, 100]', () => {
    const high = new OmicsProfile({ patientId: 'p', omicsType: OmicsType.GENOMICS, source: 'x', qualityScore: 200 });
    expect(high.qualityScore).toBe(100);
    const low = new OmicsProfile({ patientId: 'p', omicsType: OmicsType.GENOMICS, source: 'x', qualityScore: -50 });
    expect(low.qualityScore).toBe(0);
  });

  it('isHighQuality returns true when score >= 80', () => {
    const p = new OmicsProfile({ patientId: 'p', omicsType: OmicsType.GENOMICS, source: 'x', qualityScore: 80 });
    expect(p.isHighQuality()).toBe(true);
    const p2 = new OmicsProfile({ patientId: 'p', omicsType: OmicsType.GENOMICS, source: 'x', qualityScore: 79 });
    expect(p2.isHighQuality()).toBe(false);
  });

  it('isUsableQuality returns true when score >= 60', () => {
    const p = new OmicsProfile({ patientId: 'p', omicsType: OmicsType.GENOMICS, source: 'x', qualityScore: 60 });
    expect(p.isUsableQuality()).toBe(true);
    const p2 = new OmicsProfile({ patientId: 'p', omicsType: OmicsType.GENOMICS, source: 'x', qualityScore: 59 });
    expect(p2.isUsableQuality()).toBe(false);
  });

  it('withQualityScore returns new profile with updated score', () => {
    const p = new OmicsProfile({ patientId: 'p', omicsType: OmicsType.GENOMICS, source: 'x', qualityScore: 50 });
    const updated = p.withQualityScore(90);
    expect(updated.qualityScore).toBe(90);
    expect(p.qualityScore).toBe(50); // immutable
    expect(updated.id).toBe(p.id);
  });

  it('all 8 OmicsType enum values are defined', () => {
    const types = Object.values(OmicsType);
    expect(types).toContain('GENOMICS');
    expect(types).toContain('TRANSCRIPTOMICS');
    expect(types).toContain('PROTEOMICS');
    expect(types).toContain('METABOLOMICS');
    expect(types).toContain('MICROBIOME');
    expect(types).toContain('EPIGENOMICS');
    expect(types).toContain('LIPIDOMICS');
    expect(types).toContain('GLYCOMICS');
    expect(types).toHaveLength(8);
  });
});

describe('OmicsDataset entity', () => {
  const makeMeasurements = () => ({
    ldl: 165,
    glucose: 110,
    insulin: 12,
    crp: 1.8,
    il6: 3.2,
  });

  it('creates with auto-id and derives variables from measurements', () => {
    const ds = new OmicsDataset({
      profileId: 'profile-001',
      measurements: makeMeasurements(),
    });

    expect(ds.id).toMatch(/^dataset-/);
    expect(ds.profileId).toBe('profile-001');
    expect(ds.variables).toContain('ldl');
    expect(ds.variables).toContain('glucose');
    expect(ds.getVariableCount()).toBe(5);
    expect(ds.datasetType).toBe('GENERIC');
    expect(ds.processingMethod).toBe('RAW');
  });

  it('accepts custom variables list', () => {
    const ds = new OmicsDataset({
      profileId: 'p',
      measurements: { a: 1, b: 2 },
      variables: ['a', 'b', 'c_extra'],
    });
    expect(ds.variables).toContain('c_extra');
    expect(ds.getVariableCount()).toBe(3);
  });

  it('getMeasurement finds value case-insensitively', () => {
    const ds = new OmicsDataset({
      profileId: 'p',
      measurements: { LDL: 165, Glucose: 110 },
    });
    expect(ds.getMeasurement('ldl')).toBe(165);
    expect(ds.getMeasurement('GLUCOSE')).toBe(110);
    expect(ds.getMeasurement('crp')).toBeUndefined();
  });

  it('hasVariable returns true case-insensitively', () => {
    const ds = new OmicsDataset({ profileId: 'p', measurements: { ldl: 165 } });
    expect(ds.hasVariable('LDL')).toBe(true);
    expect(ds.hasVariable('crp')).toBe(false);
  });

  it('getMeasurementValues returns all values', () => {
    const ds = new OmicsDataset({ profileId: 'p', measurements: { a: 1, b: 2, c: 3 } });
    expect(ds.getMeasurementValues()).toEqual([1, 2, 3]);
  });

  it('getNonZeroCount excludes zeros and NaN', () => {
    const ds = new OmicsDataset({
      profileId: 'p',
      measurements: { a: 1, b: 0, c: 2, d: NaN },
    });
    expect(ds.getNonZeroCount()).toBe(2);
  });
});

describe('OmicsIntegration entity', () => {
  const makeFeature = (name: string, relevance: IntegratedFeature['biologicalRelevance'] = 'MEDIUM'): IntegratedFeature => ({
    name,
    omicsLayers: [OmicsType.GENOMICS],
    value: 1.2,
    confidence: 0.8,
    biologicalRelevance: relevance,
  });

  it('creates with defaults', () => {
    const integration = new OmicsIntegration({
      patientId: 'p-001',
      profiles: ['profile-1', 'profile-2'],
    });

    expect(integration.id).toMatch(/^integration-/);
    expect(integration.patientId).toBe('p-001');
    expect(integration.profiles).toHaveLength(2);
    expect(integration.integratedFeatures).toEqual([]);
    expect(integration.fusionMethod).toBe('CONCATENATION');
    expect(integration.version).toBe('1.0.0');
  });

  it('clamps confidence to [0, 1]', () => {
    const hi = new OmicsIntegration({ patientId: 'p', profiles: [], confidence: 2.5 });
    expect(hi.confidence).toBe(1);
    const lo = new OmicsIntegration({ patientId: 'p', profiles: [], confidence: -1 });
    expect(lo.confidence).toBe(0);
  });

  it('getFeatureByName finds feature case-insensitively', () => {
    const integration = new OmicsIntegration({
      patientId: 'p',
      profiles: [],
      integratedFeatures: [makeFeature('genomics:ldl')],
    });
    expect(integration.getFeatureByName('GENOMICS:LDL')).toBeDefined();
    expect(integration.getFeatureByName('proteomics:crp')).toBeUndefined();
  });

  it('getHighConfidenceFeatures filters by threshold', () => {
    const features: IntegratedFeature[] = [
      { ...makeFeature('f1'), confidence: 0.9 },
      { ...makeFeature('f2'), confidence: 0.5 },
      { ...makeFeature('f3'), confidence: 0.8 },
    ];
    const integration = new OmicsIntegration({ patientId: 'p', profiles: [], integratedFeatures: features });
    const high = integration.getHighConfidenceFeatures(0.75);
    expect(high).toHaveLength(2);
    expect(high.every((f) => f.confidence >= 0.75)).toBe(true);
  });

  it('getFeaturesByRelevance filters correctly', () => {
    const features: IntegratedFeature[] = [
      makeFeature('f1', 'HIGH'),
      makeFeature('f2', 'MEDIUM'),
      makeFeature('f3', 'HIGH'),
      makeFeature('f4', 'LOW'),
    ];
    const integration = new OmicsIntegration({ patientId: 'p', profiles: [], integratedFeatures: features });
    expect(integration.getFeaturesByRelevance('HIGH')).toHaveLength(2);
    expect(integration.getFeaturesByRelevance('MEDIUM')).toHaveLength(1);
    expect(integration.getFeaturesByRelevance('LOW')).toHaveLength(1);
  });

  it('getFeaturesByOmicsType filters by layer', () => {
    const features: IntegratedFeature[] = [
      { ...makeFeature('f1'), omicsLayers: [OmicsType.GENOMICS] },
      { ...makeFeature('f2'), omicsLayers: [OmicsType.METABOLOMICS] },
      { ...makeFeature('f3'), omicsLayers: [OmicsType.GENOMICS, OmicsType.TRANSCRIPTOMICS] },
    ];
    const integration = new OmicsIntegration({ patientId: 'p', profiles: [], integratedFeatures: features });
    expect(integration.getFeaturesByOmicsType(OmicsType.GENOMICS)).toHaveLength(2);
    expect(integration.getFeaturesByOmicsType(OmicsType.METABOLOMICS)).toHaveLength(1);
  });

  it('getLayerCount returns distinct layer count', () => {
    const features: IntegratedFeature[] = [
      { ...makeFeature('f1'), omicsLayers: [OmicsType.GENOMICS] },
      { ...makeFeature('f2'), omicsLayers: [OmicsType.METABOLOMICS] },
      { ...makeFeature('f3'), omicsLayers: [OmicsType.TRANSCRIPTOMICS] },
    ];
    const integration = new OmicsIntegration({ patientId: 'p', profiles: [], integratedFeatures: features });
    expect(integration.getLayerCount()).toBe(3);
  });
});
