import { PharmacogenomicsProvider } from '../providers/pharmacogenomics.provider.js';

describe('PharmacogenomicsProvider', () => {
  let provider: PharmacogenomicsProvider;

  beforeEach(() => {
    provider = new PharmacogenomicsProvider();
  });

  it('analyzePatient returns a PharmacogenomicProfile', () => {
    const profile = provider.analyzePatient(
      'p-001',
      [{ gene: 'CYP2C19', haplotype1: '*2', haplotype2: '*2' }],
      ['clopidogrel'],
    );
    expect(profile.patientId).toBe('p-001');
    expect(profile.id).toMatch(/^pgx-/);
  });

  it('analyzePatient stores profile and indexes by patientId', () => {
    provider.analyzePatient(
      'p-001',
      [{ gene: 'CYP2C19', haplotype1: '*2', haplotype2: '*2' }],
      ['clopidogrel'],
    );
    const byPatient = provider.getProfileByPatient('p-001');
    expect(byPatient).toBeDefined();
  });

  it('getProfile returns undefined for unknown id', () => {
    expect(provider.getProfile('does-not-exist')).toBeUndefined();
  });

  it('getProfileByPatient returns undefined for unanalysed patient', () => {
    expect(provider.getProfileByPatient('no-patient')).toBeUndefined();
  });

  it('getRecommendations returns recommendations for patient', () => {
    provider.analyzePatient(
      'p-002',
      [{ gene: 'CYP2C19', haplotype1: '*2', haplotype2: '*2' }],
      ['clopidogrel'],
    );
    const recs = provider.getRecommendations('p-002');
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].drug).toBe('clopidogrel');
  });

  it('getRecommendations returns empty array for unknown patient', () => {
    expect(provider.getRecommendations('nobody')).toHaveLength(0);
  });

  it('getOptimizationScores returns scores for patient', () => {
    provider.analyzePatient(
      'p-003',
      [{ gene: 'TPMT', haplotype1: '*3A', haplotype2: '*3A' }],
      ['azathioprine'],
    );
    const scores = provider.getOptimizationScores('p-003');
    expect(scores.length).toBeGreaterThan(0);
    expect(scores[0].drug).toBe('azathioprine');
  });

  it('analyzeInteractions works with stored patient phenotypes', () => {
    provider.analyzePatient(
      'p-004',
      [{ gene: 'CYP2D6', haplotype1: '*4', haplotype2: '*4' }],
      ['codeine'],
    );
    const analysis = provider.analyzeInteractions(['codeine', 'tramadol'], 'p-004');
    expect(analysis).toBeDefined();
    expect(Array.isArray(analysis.interactions)).toBe(true);
  });

  it('analyzeInteractions without patientId uses empty phenotypes', () => {
    const analysis = provider.analyzeInteractions(['codeine', 'tramadol']);
    expect(analysis).toBeDefined();
  });

  it('profileCount tracks stored profiles', () => {
    expect(provider.profileCount()).toBe(0);
    provider.analyzePatient('p-005', [], []);
    expect(provider.profileCount()).toBe(1);
    provider.analyzePatient('p-006', [], []);
    expect(provider.profileCount()).toBe(2);
  });

  it('listProfiles returns only real profiles, not patient index entries', () => {
    provider.analyzePatient('p-007', [], []);
    const list = provider.listProfiles();
    expect(list.every((p) => !p.id.startsWith('patient:'))).toBe(true);
  });

  it('includeAlternatives=false strips alternatives from recommendations', () => {
    const profile = provider.analyzePatient(
      'p-008',
      [{ gene: 'CYP2C19', haplotype1: '*2', haplotype2: '*2' }],
      ['clopidogrel'],
      false,
    );
    const rec = profile.recommendations.find((r) => r.drug === 'clopidogrel');
    if (rec) {
      expect(rec.alternativeMedications).toHaveLength(0);
    }
  });
});
