import { PersonalizedMedicineProvider } from '../providers/personalized-medicine.provider.js';
import { PatientProfile } from '../entities/patient-profile.entity.js';
import { PersonalizedPlan } from '../entities/personalized-plan.entity.js';
import { CreateProfileDto, UpdateProfileDto, GeneratePlanDto } from '../dto/profile.dto.js';

const makeDto = (overrides: Partial<CreateProfileDto> = {}): CreateProfileDto => ({
  patientId: 'p1',
  demographics: { age: 45, sex: 'MALE' },
  ...overrides,
});

describe('PersonalizedMedicineProvider', () => {
  let provider: PersonalizedMedicineProvider;

  beforeEach(() => {
    provider = new PersonalizedMedicineProvider();
  });

  it('buildProfile returns a PatientProfile and stores it', () => {
    const profile = provider.buildProfile(makeDto());
    expect(profile).toBeInstanceOf(PatientProfile);
    expect(provider.getProfile(profile.id)).toBe(profile);
  });

  it('profileCount increments on buildProfile', () => {
    expect(provider.profileCount()).toBe(0);
    provider.buildProfile(makeDto());
    expect(provider.profileCount()).toBe(1);
    provider.buildProfile(makeDto({ patientId: 'p2' }));
    expect(provider.profileCount()).toBe(2);
  });

  it('getProfile returns undefined for unknown id', () => {
    expect(provider.getProfile('nonexistent')).toBeUndefined();
  });

  it('updateProfile updates stored profile', () => {
    const profile = provider.buildProfile(makeDto());
    const updates: UpdateProfileDto = { clinicalHistory: ['Hipertensão'] };
    const updated = provider.updateProfile(profile.id, updates);
    expect(updated?.clinicalHistory).toContain('Hipertensão');
  });

  it('updateProfile returns undefined for unknown id', () => {
    expect(provider.updateProfile('unknown', {})).toBeUndefined();
  });

  it('calculateScores returns ProfileScores object', () => {
    const profile = provider.buildProfile(makeDto());
    const scores = provider.calculateScores(profile);
    expect(typeof scores.metabolicScore).toBe('number');
    expect(typeof scores.cardiovascularScore).toBe('number');
    expect(typeof scores.lifestyleScore).toBe('number');
    expect(typeof scores.overallRiskScore).toBe('number');
    expect(typeof scores.overallHealthScore).toBe('number');
  });

  it('adjustRisk returns AdjustedRisk with riskFactors array', () => {
    const profile = provider.buildProfile(makeDto());
    const scores = provider.calculateScores(profile);
    const risk = provider.adjustRisk(profile, scores);
    expect(Array.isArray(risk.riskFactors)).toBe(true);
    expect(Array.isArray(risk.protectiveFactors)).toBe(true);
    expect(typeof risk.overallRisk).toBe('string');
  });

  it('personalizeRecommendations returns array', () => {
    const profile = provider.buildProfile(makeDto({ lifestyle: { smoking: true } }));
    const recs = provider.personalizeRecommendations(profile);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
  });

  it('generateCarePlan returns PersonalizedPlan and stores it', () => {
    const profile = provider.buildProfile(makeDto());
    const plan = provider.generateCarePlan(profile);
    expect(plan).toBeInstanceOf(PersonalizedPlan);
    expect(provider.getPlan(plan.id)).toBe(plan);
    expect(provider.planCount()).toBe(1);
  });

  it('generateCarePlan includes riskFactors', () => {
    const profile = provider.buildProfile(makeDto({ lifestyle: { smoking: true } }));
    const plan = provider.generateCarePlan(profile);
    expect(Array.isArray(plan.riskFactors)).toBe(true);
  });

  it('generateCarePlan confidence is between 0.5 and 1', () => {
    const profile = provider.buildProfile(makeDto());
    const plan = provider.generateCarePlan(profile);
    expect(plan.confidence).toBeGreaterThanOrEqual(0.5);
    expect(plan.confidence).toBeLessThanOrEqual(1);
  });

  it('generateCarePlan includes expectedOutcomes', () => {
    const profile = provider.buildProfile(makeDto());
    const plan = provider.generateCarePlan(profile);
    expect(plan.expectedOutcomes.length).toBeGreaterThan(0);
  });

  it('generateCarePlan applies targetConditions filter', () => {
    const profile = provider.buildProfile(makeDto({
      biomarkers: [{ name: 'fasting_glucose', value: 130 }],
    }));
    const dto: GeneratePlanDto = { profileId: profile.id, targetConditions: ['METABOLIC'] };
    const plan = provider.generateCarePlan(profile, dto);
    expect(plan.goals.length).toBeGreaterThan(0);
  });

  it('generateFollowUp returns FollowUpSchedule', () => {
    const profile = provider.buildProfile(makeDto());
    const followUp = provider.generateFollowUp(profile);
    expect(typeof followUp.nextCheckupWeeks).toBe('number');
    expect(Array.isArray(followUp.examsRequired)).toBe(true);
  });
});
