import { PatientProfile } from '../entities/patient-profile.entity.js';
import { ProfileScoringEngine } from '../scoring/profile-scoring.engine.js';
import { RiskAdjustmentEngine } from '../scoring/risk-adjustment.engine.js';
import { RecommendationPersonalizer } from '../recommendations/recommendation-personalizer.js';
import { GoalPrioritizationEngine } from '../recommendations/goal-prioritization.engine.js';
import { LifestyleOptimizationEngine } from '../engine/lifestyle-optimization.engine.js';

const makeProfile = (overrides: Record<string, unknown> = {}) =>
  new PatientProfile({
    patientId: 'p1',
    demographics: { age: 45, sex: 'MALE' as const },
    ...overrides,
  });

describe('ProfileScoringEngine', () => {
  const engine = new ProfileScoringEngine();

  it('returns 0 metabolicScore for healthy profile', () => {
    const scores = engine.score(makeProfile({ lifestyle: { physicalActivity: 'VIGOROUS', smoking: false } }));
    expect(scores.metabolicScore).toBe(0);
  });

  it('increases metabolicScore for elevated glucose', () => {
    const scores = engine.score(makeProfile({ biomarkers: [{ name: 'fasting_glucose', value: 140 }] }));
    expect(scores.metabolicScore).toBeGreaterThan(0);
  });

  it('increases metabolicScore for elevated HbA1c', () => {
    const scores = engine.score(makeProfile({ biomarkers: [{ name: 'hba1c', value: 7.5 }] }));
    expect(scores.metabolicScore).toBeGreaterThan(0);
  });

  it('increases cardiovascularScore for smoking', () => {
    const s1 = engine.score(makeProfile({ lifestyle: { smoking: false } }));
    const s2 = engine.score(makeProfile({ lifestyle: { smoking: true } }));
    expect(s2.cardiovascularScore).toBeGreaterThan(s1.cardiovascularScore);
  });

  it('increases cardiovascularScore for high SBP', () => {
    const scores = engine.score(makeProfile({ biomarkers: [{ name: 'systolic_bp', value: 165 }] }));
    expect(scores.cardiovascularScore).toBeGreaterThan(10);
  });

  it('decreases lifestyleScore for sedentary profile', () => {
    const active = engine.score(makeProfile({ physicalActivity: { weeklyMinutes: 200 }, lifestyle: { smoking: false } }));
    const sedentary = engine.score(makeProfile({ lifestyle: { smoking: false } }));
    expect(active.lifestyleScore).toBeGreaterThan(sedentary.lifestyleScore);
  });

  it('awards lifestyleScore for good sleep', () => {
    const scores = engine.score(makeProfile({ sleep: { averageHours: 8 }, lifestyle: { smoking: false } }));
    expect(scores.lifestyleScore).toBeGreaterThan(0);
  });

  it('increases inflammatoryScore for elevated CRP', () => {
    const scores = engine.score(makeProfile({ biomarkers: [{ name: 'crp', value: 5 }] }));
    expect(scores.inflammatoryScore).toBeGreaterThan(0);
  });

  it('increases inflammatoryScore for sedentary + obese', () => {
    const scores = engine.score(makeProfile({ demographics: { age: 50, sex: 'MALE' as const, bmi: 35 } }));
    expect(scores.inflammatoryScore).toBeGreaterThan(20);
  });

  it('all scores are clamped to [0,100]', () => {
    const terrible = makeProfile({
      demographics: { age: 70, sex: 'MALE' as const, bmi: 40 },
      lifestyle: { smoking: true },
      biomarkers: [
        { name: 'fasting_glucose', value: 300 },
        { name: 'hba1c', value: 11 },
        { name: 'systolic_bp', value: 200 },
        { name: 'ldl', value: 300 },
        { name: 'crp', value: 15 },
      ],
    });
    const scores = engine.score(terrible);
    for (const [, v] of Object.entries(scores)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('overallHealthScore is higher for healthy profile', () => {
    const healthy = engine.score(makeProfile({
      physicalActivity: { weeklyMinutes: 300 },
      sleep: { averageHours: 8 },
      stress: { level: 'LOW' },
      lifestyle: { smoking: false, physicalActivity: 'VIGOROUS' },
      nutrition: { dietType: 'MEDITERRANEAN' },
    }));
    const unhealthy = engine.score(makeProfile({
      demographics: { age: 65, sex: 'MALE' as const, bmi: 35 },
      lifestyle: { smoking: true },
      biomarkers: [{ name: 'fasting_glucose', value: 180 }, { name: 'systolic_bp', value: 170 }],
    }));
    expect(healthy.overallHealthScore).toBeGreaterThan(unhealthy.overallHealthScore);
  });
});

describe('RiskAdjustmentEngine', () => {
  const scoring = new ProfileScoringEngine();
  const engine = new RiskAdjustmentEngine();

  it('returns VERY_LOW cardiovascular risk for young healthy profile', () => {
    const p = makeProfile({ demographics: { age: 30, sex: 'FEMALE' as const }, lifestyle: { smoking: false } });
    const scores = scoring.score(p);
    const risk = engine.adjustRisk(p, scores);
    expect(['VERY_LOW', 'LOW']).toContain(risk.cardiovascularRisk);
  });

  it('identifies smoking as risk factor', () => {
    const p = makeProfile({ lifestyle: { smoking: true } });
    const scores = scoring.score(p);
    const risk = engine.adjustRisk(p, scores);
    expect(risk.riskFactors.some((f) => f.toLowerCase().includes('tabagi'))).toBe(true);
  });

  it('identifies non-smoker as protective factor', () => {
    const p = makeProfile({ lifestyle: { smoking: false } });
    const scores = scoring.score(p);
    const risk = engine.adjustRisk(p, scores);
    expect(risk.protectiveFactors.some((f) => f.toLowerCase().includes('tabagista'))).toBe(true);
  });

  it('identifies sedentary as risk factor', () => {
    const p = makeProfile();
    const scores = scoring.score(p);
    const risk = engine.adjustRisk(p, scores);
    expect(risk.riskFactors.some((f) => f.toLowerCase().includes('sedent'))).toBe(true);
  });

  it('returns MODERATE or above overall risk for multi-risk profile', () => {
    const p = makeProfile({
      demographics: { age: 65, sex: 'MALE' as const, bmi: 35 },
      lifestyle: { smoking: true },
      biomarkers: [{ name: 'systolic_bp', value: 170 }, { name: 'ldl', value: 220 }],
    });
    const scores = scoring.score(p);
    const risk = engine.adjustRisk(p, scores);
    expect(['MODERATE', 'HIGH', 'VERY_HIGH']).toContain(risk.overallRisk);
  });

  it('identifies HDL as protective factor when >= 60', () => {
    const p = makeProfile({ biomarkers: [{ name: 'hdl', value: 65 }] });
    const scores = scoring.score(p);
    const risk = engine.adjustRisk(p, scores);
    expect(risk.protectiveFactors.some((f) => f.includes('HDL'))).toBe(true);
  });
});

describe('RecommendationPersonalizer', () => {
  const personalizer = new RecommendationPersonalizer();

  it('returns smoking cessation rule for smoker', () => {
    const p = makeProfile({ lifestyle: { smoking: true } });
    const recs = personalizer.personalize(p);
    expect(recs.some((r) => r.ruleId === 'pr-smoking-cessation')).toBe(true);
  });

  it('returns activity increase rule for sedentary', () => {
    const p = makeProfile();
    const recs = personalizer.personalize(p);
    expect(recs.some((r) => r.ruleId === 'pr-increase-activity')).toBe(true);
  });

  it('returns glucose monitoring rule for diabetic', () => {
    const p = makeProfile({ biomarkers: [{ name: 'hba1c', value: 7.5 }] });
    const recs = personalizer.personalize(p);
    expect(recs.some((r) => r.ruleId === 'pr-glucose-monitoring')).toBe(true);
  });

  it('recommendations are sorted by applicabilityScore descending', () => {
    const p = makeProfile({ lifestyle: { smoking: true } });
    const recs = personalizer.personalize(p);
    for (let i = 0; i < recs.length - 1; i++) {
      expect(recs[i].applicabilityScore).toBeGreaterThanOrEqual(recs[i + 1].applicabilityScore - 0.01);
    }
  });

  it('returns empty for no applicable rules (active, non-smoker, no risks)', () => {
    const p = makeProfile({
      lifestyle: { smoking: false, physicalActivity: 'VIGOROUS' },
      physicalActivity: { weeklyMinutes: 300 },
      stress: { level: 'LOW' },
      sleep: { averageHours: 8 },
    });
    const recs = personalizer.personalize(p);
    expect(recs).toHaveLength(0);
  });

  it('all applicabilityScore values are between 0 and 1', () => {
    const p = makeProfile({
      lifestyle: { smoking: true },
      biomarkers: [{ name: 'fasting_glucose', value: 130 }, { name: 'systolic_bp', value: 150 }],
    });
    const recs = personalizer.personalize(p);
    for (const r of recs) {
      expect(r.applicabilityScore).toBeGreaterThan(0);
      expect(r.applicabilityScore).toBeLessThanOrEqual(1);
    }
  });
});

describe('GoalPrioritizationEngine', () => {
  const scoring = new ProfileScoringEngine();
  const engine = new GoalPrioritizationEngine();

  it('generates CRITICAL goal for smoker', () => {
    const p = makeProfile({ lifestyle: { smoking: true } });
    const scores = scoring.score(p);
    const goals = engine.prioritize(p, scores);
    expect(goals.some((g) => g.priority === 'CRITICAL' && g.description.toLowerCase().includes('tabagi'))).toBe(true);
  });

  it('generates HIGH goal for sedentary', () => {
    const p = makeProfile();
    const scores = scoring.score(p);
    const goals = engine.prioritize(p, scores);
    expect(goals.some((g) => g.priority === 'HIGH' && g.category === 'PHYSICAL_ACTIVITY')).toBe(true);
  });

  it('generates at least one goal for any profile', () => {
    const p = makeProfile();
    const scores = scoring.score(p);
    const goals = engine.prioritize(p, scores);
    expect(goals.length).toBeGreaterThan(0);
  });

  it('generates PREVENTIVE LOW goal for healthy profile', () => {
    const p = makeProfile({
      lifestyle: { smoking: false, physicalActivity: 'VIGOROUS' },
      physicalActivity: { weeklyMinutes: 300 },
      sleep: { averageHours: 8 },
      stress: { level: 'LOW' },
    });
    const scores = scoring.score(p);
    const goals = engine.prioritize(p, scores);
    expect(goals.some((g) => g.priority === 'LOW')).toBe(true);
  });

  it('generates weight goal for obese patient', () => {
    const p = makeProfile({ demographics: { age: 45, sex: 'MALE' as const, bmi: 32 } });
    const scores = scoring.score(p);
    const goals = engine.prioritize(p, scores);
    expect(goals.some((g) => g.category === 'WEIGHT')).toBe(true);
  });
});

describe('LifestyleOptimizationEngine', () => {
  const scoring = new ProfileScoringEngine();
  const engine = new LifestyleOptimizationEngine();

  it('returns lifestyle recommendations', () => {
    const p = makeProfile();
    const scores = scoring.score(p);
    const recs = engine.optimize(p, scores);
    expect(recs.length).toBeGreaterThan(0);
  });

  it('includes exercise recommendation for sedentary', () => {
    const p = makeProfile();
    const scores = scoring.score(p);
    const recs = engine.optimize(p, scores);
    expect(recs.some((r) => r.domain === 'EXERCISE')).toBe(true);
  });

  it('includes stress recommendation for high stress', () => {
    const p = makeProfile({ stress: { level: 'HIGH' } });
    const scores = scoring.score(p);
    const recs = engine.optimize(p, scores);
    expect(recs.some((r) => r.domain === 'STRESS')).toBe(true);
  });

  it('generateMonitoringPlan includes glucose monitoring for diabetic', () => {
    const p = makeProfile({ biomarkers: [{ name: 'hba1c', value: 7.5 }] });
    const scores = scoring.score(p);
    const plan = engine.generateMonitoringPlan(p, scores);
    expect(plan.biomarkersToMonitor.some((b) => b.toLowerCase().includes('hba1c') || b.toLowerCase().includes('glicemia'))).toBe(true);
  });

  it('generateFollowUp includes cardiologist referral for high CV risk', () => {
    const p = makeProfile({
      demographics: { age: 65, sex: 'MALE' as const },
      lifestyle: { smoking: true },
      biomarkers: [{ name: 'systolic_bp', value: 180 }, { name: 'ldl', value: 250 }],
    });
    const scores = scoring.score(p);
    const followUp = engine.generateFollowUp(p, scores);
    expect(followUp.specialistReferrals.some((r) => r.toLowerCase().includes('cardio'))).toBe(true);
  });

  it('generateMonitoringPlan returns shorter interval for high risk', () => {
    const highRisk = makeProfile({
      demographics: { age: 65, sex: 'MALE' as const, bmi: 35 },
      lifestyle: { smoking: true },
      biomarkers: [
        { name: 'fasting_glucose', value: 180 },
        { name: 'systolic_bp', value: 165 },
        { name: 'ldl', value: 220 },
      ],
    });
    const lowRisk = makeProfile({ lifestyle: { smoking: false, physicalActivity: 'VIGOROUS' } });
    const highScores = scoring.score(highRisk);
    const lowScores = scoring.score(lowRisk);
    const highPlan = engine.generateMonitoringPlan(highRisk, highScores);
    const lowPlan = engine.generateMonitoringPlan(lowRisk, lowScores);
    expect(highPlan.checkupFrequencyWeeks).toBeLessThanOrEqual(lowPlan.checkupFrequencyWeeks);
  });
});
