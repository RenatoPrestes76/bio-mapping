import { NotFoundException } from '@nestjs/common';
import { MultiOmicsService } from '../multi-omics.service.js';
import { MultiOmicsProvider } from '../providers/multi-omics.provider.js';
import { OmicsType } from '../entities/omics-profile.entity.js';
import { OmicsProfile } from '../entities/omics-profile.entity.js';
import { OmicsIntegration } from '../entities/omics-integration.entity.js';
import { ImportProfileDto, IntegrateProfilesDto, NormalizeProfileDto } from '../dto/omics.dto.js';

const makeImportDto = (
  patientId = 'p-service',
  omicsType = OmicsType.METABOLOMICS,
): ImportProfileDto => ({
  patientId,
  omicsType,
  source: 'LC-MS Platform',
  measurements: {
    ldl: 165, glucose: 110, crp: 1.8, il6: 3.2, insulin: 12, hba1c: 6.5,
    triglycerides: 145, hdl: 48, total_cholesterol: 220, homocysteine: 14,
    vitamin_d: 22, ferritin: 80, uric_acid: 7.2, creatinine: 0.9, egfr: 85,
    alt: 28, ast: 24, ggt: 35, bilirubin: 0.8, albumin: 4.1,
    tsh: 2.4, ft4: 1.2, cortisol: 18, testosterone: 500, estradiol: 45,
    progesterone: 0.5, dhea: 180, igf1: 165, leptin: 12, adiponectin: 8,
  },
});

describe('MultiOmicsService', () => {
  let service: MultiOmicsService;
  let provider: MultiOmicsProvider;

  beforeEach(() => {
    provider = new MultiOmicsProvider();
    service = new MultiOmicsService(provider);
  });

  it('importProfile creates profile and returns quality report', () => {
    const result = service.importProfile(makeImportDto());
    expect(result.profile).toBeInstanceOf(OmicsProfile);
    expect(result.profile.omicsType).toBe(OmicsType.METABOLOMICS);
    expect(result.qualityReport).toBeDefined();
    expect(result.qualityReport!.overallScore).toBeGreaterThanOrEqual(0);
  });

  it('normalizeProfile normalizes successfully', () => {
    const { profile } = service.importProfile(makeImportDto());
    const dto: NormalizeProfileDto = { profileId: profile.id };
    const normalized = service.normalizeProfile(dto);
    expect(normalized.profileId).toBe(profile.id);
    expect(Object.keys(normalized.normalizedValues).length).toBeGreaterThan(0);
  });

  it('normalizeProfile throws NotFoundException for unknown profileId', () => {
    expect(() => service.normalizeProfile({ profileId: 'bad' })).toThrow(NotFoundException);
  });

  it('integrateProfiles creates integration with features and pathway mappings', () => {
    const { profile: p1 } = service.importProfile(makeImportDto('p-001', OmicsType.GENOMICS));
    const { profile: p2 } = service.importProfile(makeImportDto('p-001', OmicsType.METABOLOMICS));
    const dto: IntegrateProfilesDto = {
      patientId: 'p-001',
      profileIds: [p1.id, p2.id],
      fusionMethod: 'CONCATENATION',
    };

    const result = service.integrateProfiles(dto);
    expect(result.integration).toBeInstanceOf(OmicsIntegration);
    expect(result.topFeatures.length).toBeGreaterThan(0);
    expect(typeof result.clinicalImpact).toBe('string');
    expect(Array.isArray(result.pathwayMappings)).toBe(true);
  });

  it('integrateProfiles throws NotFoundException for empty profileIds', () => {
    expect(() =>
      service.integrateProfiles({ patientId: 'p', profileIds: [] }),
    ).toThrow(NotFoundException);
  });

  it('analyzeCorrelations returns results for valid integration', () => {
    const { profile: p1 } = service.importProfile(makeImportDto('p-corr', OmicsType.GENOMICS));
    const { profile: p2 } = service.importProfile(makeImportDto('p-corr', OmicsType.METABOLOMICS));
    const { integration } = service.integrateProfiles({
      patientId: 'p-corr',
      profileIds: [p1.id, p2.id],
    });

    const results = service.analyzeCorrelations(integration.id);
    expect(Array.isArray(results)).toBe(true);
  });

  it('analyzeCorrelations throws NotFoundException for unknown integrationId', () => {
    expect(() => service.analyzeCorrelations('bad-id')).toThrow(NotFoundException);
  });

  it('calculateQuality returns QualityReport', () => {
    const { profile } = service.importProfile(makeImportDto());
    const report = service.calculateQuality(profile.id);
    expect(report.profileId).toBe(profile.id);
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(report.assessedAt).toBeInstanceOf(Date);
  });

  it('calculateQuality throws NotFoundException for unknown profileId', () => {
    expect(() => service.calculateQuality('bad')).toThrow(NotFoundException);
  });

  it('getIntegratedFeatures returns features and enrichment for known patient', () => {
    const { profile } = service.importProfile(makeImportDto('p-feat'));
    service.integrateProfiles({ patientId: 'p-feat', profileIds: [profile.id] });
    const result = service.getIntegratedFeatures('p-feat');
    expect(result.features.length).toBeGreaterThan(0);
    expect(Array.isArray(result.enrichment)).toBe(true);
    expect(result.summary).toContain('integrated features');
  });

  it('getIntegratedFeatures returns empty for unknown patient', () => {
    const result = service.getIntegratedFeatures('unknown');
    expect(result.features).toHaveLength(0);
    expect(result.summary).toContain('No integrated features');
  });

  it('getProfile retrieves existing profile', () => {
    const { profile } = service.importProfile(makeImportDto());
    const found = service.getProfile(profile.id);
    expect(found.id).toBe(profile.id);
  });

  it('getProfile throws NotFoundException for unknown id', () => {
    expect(() => service.getProfile('bad')).toThrow(NotFoundException);
  });

  it('getIntegration retrieves existing integration', () => {
    const { profile } = service.importProfile(makeImportDto());
    const { integration } = service.integrateProfiles({
      patientId: 'p-service',
      profileIds: [profile.id],
    });
    const found = service.getIntegration(integration.id);
    expect(found.id).toBe(integration.id);
  });

  it('getIntegration throws NotFoundException for unknown id', () => {
    expect(() => service.getIntegration('bad')).toThrow(NotFoundException);
  });

  it('getNormalizedDataset throws before normalization', () => {
    const { profile } = service.importProfile(makeImportDto());
    expect(() => service.getNormalizedDataset(profile.id)).toThrow(NotFoundException);
  });

  it('getNormalizedDataset returns dataset after normalization', () => {
    const { profile } = service.importProfile(makeImportDto());
    service.normalizeProfile({ profileId: profile.id });
    const normalized = service.getNormalizedDataset(profile.id);
    expect(normalized.profileId).toBe(profile.id);
  });
});
