import { Test, TestingModule } from '@nestjs/testing';
import { PharmacogenomicsController } from '../pharmacogenomics.controller.js';
import { PharmacogenomicsService } from '../pharmacogenomics.service.js';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { PharmacogenomicProfile } from '../entities/pharmacogenomic-profile.entity.js';
import { MedicationRecommendation } from '../entities/medication-recommendation.entity.js';

const makeProfile = () =>
  new PharmacogenomicProfile({
    id: 'pgx-ctrl-001',
    patientId: 'p-ctrl',
    genotypes: [{ gene: 'CYP2C19', haplotype1: '*2', haplotype2: '*2' }],
    recommendations: [],
  });

const makeRecommendation = () =>
  new MedicationRecommendation({
    drug: 'clopidogrel',
    gene: 'CYP2C19',
    phenotype: 'POOR_METABOLIZER',
    severity: 'CONTRAINDICATED',
    recommendation: 'Avoid clopidogrel',
    alternativeMedications: ['prasugrel'],
    explanation: {
      genotypeDescription: 'CYP2C19 *2/*2',
      phenotypeDescription: 'Poor Metabolizer',
      guidelineUsed: 'CPIC 2022',
      clinicalRationale: 'Cannot convert to active metabolite',
      decisionPath: ['Step 1'],
      gradeStrength: 'STRONG',
    },
    evidence: {
      level: 'A',
      source: 'CPIC',
      gradeStrength: 'STRONG',
      confidence: 0.95,
    },
  });

describe('PharmacogenomicsController', () => {
  let controller: PharmacogenomicsController;
  let service: jest.Mocked<PharmacogenomicsService>;

  beforeEach(async () => {
    service = {
      analyze: jest.fn(),
      getProfile: jest.fn(),
      getRecommendations: jest.fn(),
      getProfileByPatient: jest.fn(),
    } as unknown as jest.Mocked<PharmacogenomicsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PharmacogenomicsController],
      providers: [{ provide: PharmacogenomicsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PharmacogenomicsController);
  });

  it('POST /pharmacogenomics/analyze calls service.analyze and returns profile', () => {
    const profile = makeProfile();
    service.analyze.mockReturnValue(profile);

    const result = controller.analyze(
      {
        patientId: 'p-ctrl',
        genotypes: [{ gene: 'CYP2C19', haplotype1: '*2', haplotype2: '*2' }],
        medications: ['clopidogrel'],
        includeAlternatives: true,
      },
      { sub: 'user-001' },
    );

    expect(service.analyze).toHaveBeenCalledWith('p-ctrl', expect.any(Array), ['clopidogrel'], true);
    expect(result.patientId).toBe('p-ctrl');
  });

  it('POST /pharmacogenomics/analyze defaults includeAlternatives to true when undefined', () => {
    const profile = makeProfile();
    service.analyze.mockReturnValue(profile);

    controller.analyze(
      { patientId: 'p-ctrl', genotypes: [], medications: [] },
      { sub: 'user-001' },
    );

    expect(service.analyze).toHaveBeenCalledWith('p-ctrl', [], [], true);
  });

  it('GET /pharmacogenomics/profile/:id calls service.getProfile', () => {
    const profile = makeProfile();
    service.getProfile.mockReturnValue(profile);

    const result = controller.getProfile('pgx-ctrl-001', { sub: 'user-001' });

    expect(service.getProfile).toHaveBeenCalledWith('pgx-ctrl-001');
    expect(result.id).toBe('pgx-ctrl-001');
  });

  it('GET /pharmacogenomics/recommendations/:patientId calls service.getRecommendations', () => {
    const rec = makeRecommendation();
    service.getRecommendations.mockReturnValue([rec]);

    const result = controller.getRecommendations('p-ctrl', { sub: 'user-001' });

    expect(service.getRecommendations).toHaveBeenCalledWith('p-ctrl');
    expect(result).toHaveLength(1);
    expect(result[0].drug).toBe('clopidogrel');
    expect(result[0].severity).toBe('CONTRAINDICATED');
  });
});
