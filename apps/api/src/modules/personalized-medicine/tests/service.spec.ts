import { NotFoundException } from '@nestjs/common';
import { PersonalizedMedicineService } from '../personalized-medicine.service.js';
import { PersonalizedMedicineProvider } from '../providers/personalized-medicine.provider.js';
import { PatientProfile } from '../entities/patient-profile.entity.js';
import { PersonalizedPlan } from '../entities/personalized-plan.entity.js';

const makeDto = (overrides = {}) => ({
  patientId: 'p1',
  demographics: { age: 45, sex: 'MALE' as const },
  ...overrides,
});

describe('PersonalizedMedicineService', () => {
  let service: PersonalizedMedicineService;

  beforeEach(() => {
    service = new PersonalizedMedicineService(new PersonalizedMedicineProvider());
  });

  it('analyzeProfile returns profile, scores, adjustedRisk, recommendations', () => {
    const result = service.analyzeProfile(makeDto());
    expect(result.profile).toBeInstanceOf(PatientProfile);
    expect(typeof result.scores.overallRiskScore).toBe('number');
    expect(typeof result.adjustedRisk.overallRisk).toBe('string');
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it('generatePlan throws NotFoundException for unknown profileId', () => {
    expect(() => service.generatePlan({ profileId: 'unknown' })).toThrow(NotFoundException);
    expect(() => service.generatePlan({ profileId: 'unknown' })).toThrow("Profile 'unknown' not found");
  });

  it('generatePlan returns PersonalizedPlan for known profile', () => {
    const { profile } = service.analyzeProfile(makeDto());
    const plan = service.generatePlan({ profileId: profile.id });
    expect(plan).toBeInstanceOf(PersonalizedPlan);
    expect(plan.patientId).toBe(profile.patientId);
  });

  it('getProfile throws NotFoundException for unknown id', () => {
    expect(() => service.getProfile('nope')).toThrow(NotFoundException);
  });

  it('getProfile returns stored profile', () => {
    const { profile } = service.analyzeProfile(makeDto());
    const fetched = service.getProfile(profile.id);
    expect(fetched.id).toBe(profile.id);
  });

  it('getPlan throws NotFoundException for unknown plan id', () => {
    expect(() => service.getPlan('nope')).toThrow(NotFoundException);
    expect(() => service.getPlan('nope')).toThrow("Plan 'nope' not found");
  });

  it('getPlan returns stored plan', () => {
    const { profile } = service.analyzeProfile(makeDto());
    const plan = service.generatePlan({ profileId: profile.id });
    const fetched = service.getPlan(plan.id);
    expect(fetched.id).toBe(plan.id);
  });

  it('updateProfile throws NotFoundException for unknown id', () => {
    expect(() => service.updateProfile('nope', {})).toThrow(NotFoundException);
  });

  it('updateProfile returns updated AnalysisResult', () => {
    const { profile } = service.analyzeProfile(makeDto());
    const result = service.updateProfile(profile.id, { clinicalHistory: ['Hipertensão'] });
    expect(result.profile.clinicalHistory).toContain('Hipertensão');
    expect(typeof result.scores.overallRiskScore).toBe('number');
  });

  it('calculateRisk throws NotFoundException for unknown profileId', () => {
    expect(() => service.calculateRisk('nope')).toThrow(NotFoundException);
  });

  it('calculateRisk returns AdjustedRisk for known profile', () => {
    const { profile } = service.analyzeProfile(makeDto());
    const risk = service.calculateRisk(profile.id);
    expect(typeof risk.overallRisk).toBe('string');
    expect(Array.isArray(risk.riskFactors)).toBe(true);
  });

  it('optimizeRecommendations throws NotFoundException for unknown profile', () => {
    expect(() => service.optimizeRecommendations('nope')).toThrow(NotFoundException);
  });

  it('optimizeRecommendations returns recommendations array', () => {
    const { profile } = service.analyzeProfile(makeDto({ lifestyle: { smoking: true } }));
    const recs = service.optimizeRecommendations(profile.id);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
  });

  it('compareProfiles throws NotFoundException when profile1 not found', () => {
    expect(() => service.compareProfiles({ profileId1: 'nope1', profileId2: 'nope2' })).toThrow(NotFoundException);
  });

  it('compareProfiles returns comparison with delta and insights', () => {
    const { profile: p1 } = service.analyzeProfile(makeDto({ lifestyle: { smoking: true } }));
    const { profile: p2 } = service.analyzeProfile(makeDto({ lifestyle: { smoking: false, physicalActivity: 'VIGOROUS' }, physicalActivity: { weeklyMinutes: 300 } }));
    const comparison = service.compareProfiles({ profileId1: p1.id, profileId2: p2.id });
    expect(comparison.profile1Id).toBe(p1.id);
    expect(comparison.profile2Id).toBe(p2.id);
    expect(typeof comparison.delta.overallRiskScore).toBe('number');
    expect(Array.isArray(comparison.insights)).toBe(true);
    expect(typeof comparison.betterProfileId).toBe('string');
  });

  it('compareProfiles identifies the profile with higher health score as better', () => {
    const { profile: p1 } = service.analyzeProfile(makeDto({ lifestyle: { smoking: true } }));
    const { profile: p2 } = service.analyzeProfile(makeDto({
      lifestyle: { smoking: false, physicalActivity: 'VIGOROUS' },
      physicalActivity: { weeklyMinutes: 300 },
      sleep: { averageHours: 8 },
      stress: { level: 'LOW' },
      nutrition: { dietType: 'MEDITERRANEAN' },
    }));
    const comparison = service.compareProfiles({ profileId1: p1.id, profileId2: p2.id });
    expect(comparison.betterProfileId).toBe(p2.id);
  });
});
