import { Test, TestingModule } from '@nestjs/testing';
import { PersonalizedMedicineController } from '../personalized-medicine.controller.js';
import { PersonalizedMedicineService } from '../personalized-medicine.service.js';
import { PatientProfile } from '../entities/patient-profile.entity.js';
import { PersonalizedPlan } from '../entities/personalized-plan.entity.js';

const makeProfile = () =>
  new PatientProfile({ patientId: 'p1', demographics: { age: 45, sex: 'MALE' } });

const makePlan = () =>
  new PersonalizedPlan({
    patientId: 'p1',
    goals: [],
    recommendations: [],
    monitoringPlan: { biomarkersToMonitor: [], checkupFrequencyWeeks: 12, selfMonitoringItems: [] },
    followUp: { nextCheckupWeeks: 12, specialistReferrals: [], examsRequired: [] },
    riskFactors: [],
    expectedOutcomes: [],
    confidence: 0.8,
  });

const makeAnalysis = () => ({
  profile: makeProfile(),
  scores: { metabolicScore: 10, cardiovascularScore: 15, lifestyleScore: 40, inflammatoryScore: 20, overallRiskScore: 15, overallHealthScore: 65 },
  adjustedRisk: { cardiovascularRisk: 'LOW' as const, metabolicRisk: 'LOW' as const, diabetesRisk: 'VERY_LOW' as const, hypertensionRisk: 'LOW' as const, overallRisk: 'LOW' as const, riskFactors: [], protectiveFactors: [] },
  recommendations: [],
});

describe('PersonalizedMedicineController', () => {
  let controller: PersonalizedMedicineController;
  let service: jest.Mocked<PersonalizedMedicineService>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<PersonalizedMedicineService>> = {
      analyzeProfile: jest.fn(),
      generatePlan: jest.fn(),
      compareProfiles: jest.fn(),
      getProfile: jest.fn(),
      getPlan: jest.fn(),
      updateProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonalizedMedicineController],
      providers: [{ provide: PersonalizedMedicineService, useValue: mockService }],
    })
      .overrideGuard(require('../../identity/auth/guards/jwt-auth.guard.js').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PersonalizedMedicineController>(PersonalizedMedicineController);
    service = module.get(PersonalizedMedicineService);
  });

  it('POST profile calls service.analyzeProfile', () => {
    const analysis = makeAnalysis();
    service.analyzeProfile.mockReturnValue(analysis);
    const dto = { patientId: 'p1', demographics: { age: 45, sex: 'MALE' as const } };
    expect(controller.createProfile(dto)).toBe(analysis);
    expect(service.analyzeProfile).toHaveBeenCalledWith(dto);
  });

  it('POST plan calls service.generatePlan', () => {
    const plan = makePlan();
    service.generatePlan.mockReturnValue(plan);
    const dto = { profileId: 'pid-1' };
    expect(controller.generatePlan(dto)).toBe(plan);
    expect(service.generatePlan).toHaveBeenCalledWith(dto);
  });

  it('POST compare calls service.compareProfiles', () => {
    const comparison = {
      profile1Id: 'p1', profile2Id: 'p2',
      scores1: {} as never, scores2: {} as never,
      delta: { metabolicScore: 0, cardiovascularScore: 0, lifestyleScore: 0, overallRiskScore: 0 },
      betterProfileId: 'p2', insights: [],
    };
    service.compareProfiles.mockReturnValue(comparison);
    const dto = { profileId1: 'p1', profileId2: 'p2' };
    expect(controller.compareProfiles(dto)).toBe(comparison);
    expect(service.compareProfiles).toHaveBeenCalledWith(dto);
  });

  it('GET profile/:id calls service.getProfile', () => {
    const profile = makeProfile();
    service.getProfile.mockReturnValue(profile);
    expect(controller.getProfile('p-id')).toBe(profile);
    expect(service.getProfile).toHaveBeenCalledWith('p-id');
  });

  it('GET plan/:id calls service.getPlan', () => {
    const plan = makePlan();
    service.getPlan.mockReturnValue(plan);
    expect(controller.getPlan('plan-id')).toBe(plan);
    expect(service.getPlan).toHaveBeenCalledWith('plan-id');
  });

  it('PUT profile/:id calls service.updateProfile', () => {
    const analysis = makeAnalysis();
    service.updateProfile.mockReturnValue(analysis);
    const dto = { clinicalHistory: ['Hipertensão'] };
    expect(controller.updateProfile('p-id', dto)).toBe(analysis);
    expect(service.updateProfile).toHaveBeenCalledWith('p-id', dto);
  });
});
