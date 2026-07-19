import { Test, TestingModule } from '@nestjs/testing';
import { MultiOmicsController } from '../multi-omics.controller.js';
import { MultiOmicsService } from '../multi-omics.service.js';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { OmicsProfile, OmicsType } from '../entities/omics-profile.entity.js';
import { OmicsIntegration, IntegratedFeature } from '../entities/omics-integration.entity.js';

const makeProfile = (): OmicsProfile =>
  new OmicsProfile({
    id: 'profile-ctrl-001',
    patientId: 'p-ctrl',
    omicsType: OmicsType.METABOLOMICS,
    source: 'LC-MS',
    qualityScore: 78,
  });

const makeIntegration = (): OmicsIntegration =>
  new OmicsIntegration({
    id: 'integration-ctrl-001',
    patientId: 'p-ctrl',
    profiles: ['profile-ctrl-001'],
    integratedFeatures: [
      {
        name: 'metabolomics:glucose',
        omicsLayers: [OmicsType.METABOLOMICS],
        value: 0.9,
        confidence: 0.85,
        biologicalRelevance: 'HIGH',
        pathway: 'Glycolysis / Gluconeogenesis',
        clinicalRelevance: 'Diabetes, Cancer',
      },
    ],
    confidence: 0.82,
    fusionMethod: 'CONCATENATION',
  });

describe('MultiOmicsController', () => {
  let controller: MultiOmicsController;
  let service: jest.Mocked<MultiOmicsService>;

  beforeEach(async () => {
    service = {
      importProfile: jest.fn(),
      normalizeProfile: jest.fn(),
      integrateProfiles: jest.fn(),
      analyzeCorrelations: jest.fn(),
      calculateQuality: jest.fn(),
      getIntegratedFeatures: jest.fn(),
      getProfile: jest.fn(),
      getIntegration: jest.fn(),
      getNormalizedDataset: jest.fn(),
    } as unknown as jest.Mocked<MultiOmicsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MultiOmicsController],
      providers: [{ provide: MultiOmicsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(MultiOmicsController);
  });

  it('POST profile calls importProfile and returns result', () => {
    const profile = makeProfile();
    service.importProfile.mockReturnValue({ profile, qualityReport: undefined });

    const result = controller.importProfile(
      { patientId: 'p-ctrl', omicsType: OmicsType.METABOLOMICS, source: 'LC-MS', measurements: {} },
      { sub: 'u1' },
    );

    expect(service.importProfile).toHaveBeenCalledTimes(1);
    expect(result.profile.id).toBe('profile-ctrl-001');
  });

  it('POST integrate calls integrateProfiles and returns summary', () => {
    const integration = makeIntegration();
    service.integrateProfiles.mockReturnValue({
      integration,
      topFeatures: integration.integratedFeatures,
      pathwayMappings: [],
      clinicalImpact: 'High-significance pathways detected',
    });

    const result = controller.integrateProfiles(
      { patientId: 'p-ctrl', profileIds: ['profile-ctrl-001'] },
      { sub: 'u1' },
    );

    expect(service.integrateProfiles).toHaveBeenCalledTimes(1);
    expect(result.integration.id).toBe('integration-ctrl-001');
    expect(result.topFeatures).toHaveLength(1);
  });

  it('POST normalize calls normalizeProfile and returns NormalizedDataset', () => {
    service.normalizeProfile.mockReturnValue({
      id: 'norm-001',
      datasetId: 'ds-001',
      profileId: 'profile-ctrl-001',
      omicsType: 'METABOLOMICS',
      method: 'LOG2',
      normalizedValues: { ldl: 0.75, glucose: 0.82 },
      originalStats: { mean: 120, std: 40, min: 20, max: 300, count: 30 },
      normalizedAt: new Date(),
    });

    const result = controller.normalizeProfile(
      { profileId: 'profile-ctrl-001' },
      { sub: 'u1' },
    );

    expect(service.normalizeProfile).toHaveBeenCalledWith({ profileId: 'profile-ctrl-001' });
    expect(result.method).toBe('LOG2');
  });

  it('GET profile/:id calls getProfile and returns profile', () => {
    service.getProfile.mockReturnValue(makeProfile());
    const result = controller.getProfile('profile-ctrl-001', { sub: 'u1' });
    expect(service.getProfile).toHaveBeenCalledWith('profile-ctrl-001');
    expect(result.id).toBe('profile-ctrl-001');
  });

  it('GET integration/:id calls getIntegration and returns integration', () => {
    service.getIntegration.mockReturnValue(makeIntegration());
    const result = controller.getIntegration('integration-ctrl-001', { sub: 'u1' });
    expect(service.getIntegration).toHaveBeenCalledWith('integration-ctrl-001');
    expect(result.id).toBe('integration-ctrl-001');
    expect(result.confidence).toBe(0.82);
  });

  it('GET features/:patientId calls getIntegratedFeatures and returns data', () => {
    service.getIntegratedFeatures.mockReturnValue({
      features: makeIntegration().integratedFeatures,
      enrichment: [],
      summary: '1 integrated features across 1 omics layer(s)',
    });

    const result = controller.getIntegratedFeatures('p-ctrl', { sub: 'u1' });

    expect(service.getIntegratedFeatures).toHaveBeenCalledWith('p-ctrl');
    expect(result.features).toHaveLength(1);
    expect(result.features[0].biologicalRelevance).toBe('HIGH');
    expect(result.summary).toContain('1 integrated features');
  });
});
