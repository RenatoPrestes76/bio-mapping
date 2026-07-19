import { MultiOmicsProvider } from '../providers/multi-omics.provider.js';
import { OmicsType } from '../entities/omics-profile.entity.js';
import { OmicsProfile } from '../entities/omics-profile.entity.js';
import { OmicsIntegration } from '../entities/omics-integration.entity.js';
import { NotFoundException } from '@nestjs/common';
import { ImportProfileDto, IntegrateProfilesDto, NormalizeProfileDto } from '../dto/omics.dto.js';

const makeImportDto = (
  patientId = 'p-provider',
  omicsType = OmicsType.METABOLOMICS,
): ImportProfileDto => ({
  patientId,
  omicsType,
  source: 'Agilent LC-MS',
  datasetType: 'METABOLOMICS_PANEL',
  measurements: {
    ldl: 165,
    glucose: 110,
    crp: 1.8,
    il6: 3.2,
    insulin: 12,
    hba1c: 6.5,
    triglycerides: 145,
    hdl: 48,
    total_cholesterol: 220,
    homocysteine: 14,
    vitamin_d: 22,
    ferritin: 80,
    uric_acid: 7.2,
    creatinine: 0.9,
    egfr: 85,
    alt: 28,
    ast: 24,
    ggt: 35,
    bilirubin: 0.8,
    albumin: 4.1,
    tsh: 2.4,
    ft4: 1.2,
    cortisol: 18,
    testosterone: 500,
    estradiol: 45,
    progesterone: 0.5,
    dhea: 180,
    igf1: 165,
    leptin: 12,
    adiponectin: 8,
  },
});

describe('MultiOmicsProvider', () => {
  let provider: MultiOmicsProvider;

  beforeEach(() => {
    provider = new MultiOmicsProvider();
  });

  it('createProfile stores profile and dataset, runs quality assessment', () => {
    const { profile, dataset } = provider.createProfile(makeImportDto());
    expect(profile).toBeInstanceOf(OmicsProfile);
    expect(profile.omicsType).toBe(OmicsType.METABOLOMICS);
    expect(profile.qualityScore).toBeGreaterThan(0);
    expect(dataset.profileId).toBe(profile.id);
    expect(dataset.getVariableCount()).toBeGreaterThan(20);
  });

  it('getProfile retrieves stored profile', () => {
    const { profile } = provider.createProfile(makeImportDto());
    const retrieved = provider.getProfile(profile.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(profile.id);
  });

  it('getProfile returns undefined for unknown id', () => {
    expect(provider.getProfile('nonexistent')).toBeUndefined();
  });

  it('normalize returns NormalizedDataset for existing profile', () => {
    const { profile } = provider.createProfile(makeImportDto());
    const normalized = provider.normalize({ profileId: profile.id });
    expect(normalized.profileId).toBe(profile.id);
    expect(Object.keys(normalized.normalizedValues).length).toBeGreaterThan(20);
    expect(normalized.method).toBeTruthy();
  });

  it('normalize uses recommended method when none specified', () => {
    const { profile } = provider.createProfile(makeImportDto('p', OmicsType.TRANSCRIPTOMICS));
    const normalized = provider.normalize({ profileId: profile.id });
    expect(normalized.method).toBe('LOG2');
  });

  it('normalize throws NotFoundException for unknown profileId', () => {
    expect(() => provider.normalize({ profileId: 'bad' })).toThrow(NotFoundException);
  });

  it('integrate builds OmicsIntegration from multiple profiles', () => {
    const { profile: p1 } = provider.createProfile(makeImportDto('p-001', OmicsType.GENOMICS));
    const { profile: p2 } = provider.createProfile(makeImportDto('p-001', OmicsType.METABOLOMICS));

    const integration = provider.integrate({
      patientId: 'p-001',
      profileIds: [p1.id, p2.id],
      fusionMethod: 'CONCATENATION',
    });

    expect(integration).toBeInstanceOf(OmicsIntegration);
    expect(integration.patientId).toBe('p-001');
    expect(integration.integratedFeatures.length).toBeGreaterThan(0);
  });

  it('integrate throws NotFoundException for unknown profileId', () => {
    expect(() =>
      provider.integrate({
        patientId: 'p',
        profileIds: ['bad-profile-id'],
      }),
    ).toThrow(NotFoundException);
  });

  it('calculateQuality runs assessment and updates profile quality', () => {
    const { profile } = provider.createProfile(makeImportDto());
    const report = provider.calculateQuality(profile.id);
    expect(report.profileId).toBe(profile.id);
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.passesThreshold).toBeDefined();
  });

  it('calculateQuality throws NotFoundException for unknown profileId', () => {
    expect(() => provider.calculateQuality('bad')).toThrow(NotFoundException);
  });

  it('correlate returns correlation results for integrated profiles', () => {
    const { profile: p1 } = provider.createProfile(makeImportDto('pat', OmicsType.GENOMICS));
    const { profile: p2 } = provider.createProfile(makeImportDto('pat', OmicsType.METABOLOMICS));
    const integration = provider.integrate({
      patientId: 'pat',
      profileIds: [p1.id, p2.id],
    });

    const results = provider.correlate(integration.id);
    expect(Array.isArray(results)).toBe(true);
  });

  it('correlate returns empty array when fewer than 2 normalized datasets', () => {
    const { profile } = provider.createProfile(makeImportDto());
    const integration = provider.integrate({
      patientId: 'p',
      profileIds: [profile.id],
    });
    const results = provider.correlate(integration.id);
    expect(results).toHaveLength(0);
  });

  it('generateFeatures returns latest integration features for patient', () => {
    const { profile: p1 } = provider.createProfile(makeImportDto('p-feat', OmicsType.METABOLOMICS));
    provider.integrate({ patientId: 'p-feat', profileIds: [p1.id] });
    const features = provider.generateFeatures('p-feat');
    expect(features.length).toBeGreaterThan(0);
  });

  it('generateFeatures returns empty array for unknown patient', () => {
    expect(provider.generateFeatures('unknown')).toEqual([]);
  });

  it('profileCount increments correctly', () => {
    expect(provider.profileCount()).toBe(0);
    provider.createProfile(makeImportDto('p1'));
    expect(provider.profileCount()).toBe(1);
    provider.createProfile(makeImportDto('p2'));
    expect(provider.profileCount()).toBe(2);
  });

  it('integrationCount increments correctly', () => {
    expect(provider.integrationCount()).toBe(0);
    const { profile } = provider.createProfile(makeImportDto());
    provider.integrate({ patientId: 'p', profileIds: [profile.id] });
    expect(provider.integrationCount()).toBe(1);
  });

  it('getNormalizedDataset returns stored normalized dataset', () => {
    const { profile } = provider.createProfile(makeImportDto());
    provider.normalize({ profileId: profile.id });
    const normalized = provider.getNormalizedDataset(profile.id);
    expect(normalized).toBeDefined();
  });

  it('getQualityReport returns stored report', () => {
    const { profile } = provider.createProfile(makeImportDto());
    const report = provider.getQualityReport(profile.id);
    expect(report).toBeDefined();
    expect(report!.profileId).toBe(profile.id);
  });
});
