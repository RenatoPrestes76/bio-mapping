import { NotFoundException } from '@nestjs/common';
import { PharmacogenomicsService } from '../pharmacogenomics.service.js';
import { PharmacogenomicsProvider } from '../providers/pharmacogenomics.provider.js';

describe('PharmacogenomicsService', () => {
  let service: PharmacogenomicsService;
  let provider: PharmacogenomicsProvider;

  beforeEach(() => {
    provider = new PharmacogenomicsProvider();
    service = new PharmacogenomicsService(provider);
  });

  it('analyze returns a PharmacogenomicProfile', () => {
    const profile = service.analyze(
      'p-001',
      [{ gene: 'CYP2C19', haplotype1: '*2', haplotype2: '*2' }],
      ['clopidogrel'],
    );
    expect(profile.patientId).toBe('p-001');
    expect(profile.recommendations.length).toBeGreaterThan(0);
  });

  it('getProfile returns the stored profile by id', () => {
    const created = service.analyze('p-002', [], []);
    const fetched = service.getProfile(created.id);
    expect(fetched.id).toBe(created.id);
  });

  it('getProfile throws NotFoundException for unknown id', () => {
    expect(() => service.getProfile('nonexistent')).toThrow(NotFoundException);
  });

  it('getRecommendations returns recommendations for patient', () => {
    service.analyze(
      'p-003',
      [{ gene: 'CYP2D6', haplotype1: '*4', haplotype2: '*4' }],
      ['codeine'],
    );
    const recs = service.getRecommendations('p-003');
    expect(recs.length).toBeGreaterThan(0);
  });

  it('getRecommendations throws NotFoundException for unknown patient', () => {
    expect(() => service.getRecommendations('nobody')).toThrow(NotFoundException);
  });

  it('getProfileByPatient returns the latest profile for patient', () => {
    service.analyze('p-004', [], []);
    const profile = service.getProfileByPatient('p-004');
    expect(profile.patientId).toBe('p-004');
  });

  it('getProfileByPatient throws NotFoundException for unknown patient', () => {
    expect(() => service.getProfileByPatient('nobody')).toThrow(NotFoundException);
  });

  it('multiple analyze calls for same patient overwrite patient index', () => {
    service.analyze('p-005', [{ gene: 'CYP2C19', haplotype1: '*1', haplotype2: '*1' }], ['omeprazole']);
    const second = service.analyze('p-005', [{ gene: 'CYP2C19', haplotype1: '*2', haplotype2: '*2' }], ['clopidogrel']);
    const profile = service.getProfileByPatient('p-005');
    expect(profile.id).toBe(second.id);
  });

  it('analyze with includeAlternatives=false removes alternatives', () => {
    const profile = service.analyze(
      'p-006',
      [{ gene: 'TPMT', haplotype1: '*3A', haplotype2: '*3A' }],
      ['azathioprine'],
      false,
    );
    const rec = profile.recommendations.find((r) => r.drug === 'azathioprine');
    if (rec) {
      expect(rec.alternativeMedications).toHaveLength(0);
    }
  });
});
