import { PatientProfile } from '../entities/patient-profile.entity.js';
import { PersonalizationRule, RuleCategory, EvidenceLevel } from '../entities/personalization-rule.entity.js';
import { PersonalizedPlan } from '../entities/personalized-plan.entity.js';

describe('PatientProfile', () => {
  const makeProfile = (overrides = {}) =>
    new PatientProfile({
      patientId: 'p1',
      demographics: { age: 45, sex: 'MALE' },
      ...overrides,
    });

  it('generates id when not provided', () => {
    const p = makeProfile();
    expect(p.id).toMatch(/^profile-/);
  });

  it('uses provided id', () => {
    const p = makeProfile({ id: 'my-id' });
    expect(p.id).toBe('my-id');
  });

  it('defaults arrays and objects to empty', () => {
    const p = makeProfile();
    expect(p.clinicalHistory).toEqual([]);
    expect(p.familyHistory).toEqual([]);
    expect(p.biomarkers).toEqual([]);
    expect(p.medications).toEqual([]);
    expect(p.allergies).toEqual([]);
  });

  it('getBiomarker returns match by exact name (case-insensitive)', () => {
    const p = makeProfile({ biomarkers: [{ name: 'HbA1c', value: 7.2 }] });
    expect(p.getBiomarker('hba1c')?.value).toBe(7.2);
    expect(p.getBiomarker('HBA1C')?.value).toBe(7.2);
    expect(p.getBiomarker('ldl')).toBeUndefined();
  });

  it('isAbnormal returns true when value outside reference range', () => {
    const p = makeProfile({
      biomarkers: [{ name: 'glucose', value: 130, referenceMin: 70, referenceMax: 99 }],
    });
    expect(p.isAbnormal('glucose')).toBe(true);
  });

  it('isAbnormal returns false when within range', () => {
    const p = makeProfile({
      biomarkers: [{ name: 'glucose', value: 85, referenceMin: 70, referenceMax: 99 }],
    });
    expect(p.isAbnormal('glucose')).toBe(false);
  });

  it('isAbnormal returns false for unknown biomarker', () => {
    const p = makeProfile();
    expect(p.isAbnormal('unknown')).toBe(false);
  });

  it('hasCondition is case-insensitive', () => {
    const p = makeProfile({ clinicalHistory: ['Diabetes Mellitus tipo 2'] });
    expect(p.hasCondition('diabetes')).toBe(true);
    expect(p.hasCondition('cancer')).toBe(false);
  });

  it('hasFamilyHistory is case-insensitive', () => {
    const p = makeProfile({ familyHistory: ['Infarto do miocárdio'] });
    expect(p.hasFamilyHistory('infarto')).toBe(true);
    expect(p.hasFamilyHistory('cancer')).toBe(false);
  });

  it('isSmoker returns true when lifestyle.smoking === true', () => {
    const smoker = makeProfile({ lifestyle: { smoking: true } });
    const nonSmoker = makeProfile({ lifestyle: { smoking: false } });
    expect(smoker.isSmoker()).toBe(true);
    expect(nonSmoker.isSmoker()).toBe(false);
  });

  it('isSedentary returns true when physicalActivity not set', () => {
    const p = makeProfile({ lifestyle: {} });
    expect(p.isSedentary()).toBe(true);
  });

  it('isSedentary returns false for VIGOROUS', () => {
    const p = makeProfile({ lifestyle: { physicalActivity: 'VIGOROUS' } });
    expect(p.isSedentary()).toBe(false);
  });

  it('isElderly returns true for age >= 65', () => {
    expect(makeProfile({ demographics: { age: 65, sex: 'MALE' } }).isElderly()).toBe(true);
    expect(makeProfile({ demographics: { age: 64, sex: 'MALE' } }).isElderly()).toBe(false);
  });

  it('computeBMI uses demographics.bmi if provided', () => {
    const p = makeProfile({ demographics: { age: 40, sex: 'MALE', bmi: 28.5 } });
    expect(p.computeBMI()).toBe(28.5);
  });

  it('computeBMI computes from weight and height', () => {
    const p = makeProfile({ demographics: { age: 40, sex: 'MALE', weight: 90, height: 175 } });
    const bmi = p.computeBMI();
    expect(bmi).toBeCloseTo(29.4, 0);
  });

  it('computeBMI returns undefined when neither bmi nor weight/height provided', () => {
    const p = makeProfile();
    expect(p.computeBMI()).toBeUndefined();
  });
});

describe('PersonalizationRule', () => {
  const makeRule = (overrides = {}) =>
    new PersonalizationRule({
      id: 'r1',
      category: RuleCategory.NUTRITION,
      condition: 'diabetes',
      priority: 8,
      weight: 0.9,
      recommendation: 'Test recommendation',
      evidenceLevel: EvidenceLevel.A,
      ...overrides,
    });

  it('clamps priority to [1,10]', () => {
    expect(makeRule({ priority: 15 }).priority).toBe(10);
    expect(makeRule({ priority: 0 }).priority).toBe(1);
    expect(makeRule({ priority: -5 }).priority).toBe(1);
  });

  it('clamps weight to [0,1]', () => {
    expect(makeRule({ weight: 2 }).weight).toBe(1);
    expect(makeRule({ weight: -1 }).weight).toBe(0);
  });

  it('defaults enabled to true', () => {
    expect(makeRule().enabled).toBe(true);
  });

  it('respects explicit enabled=false', () => {
    expect(makeRule({ enabled: false }).enabled).toBe(false);
  });

  it('isHighPriority returns true for priority >= 8', () => {
    expect(makeRule({ priority: 8 }).isHighPriority()).toBe(true);
    expect(makeRule({ priority: 7 }).isHighPriority()).toBe(false);
  });

  it('isHighEvidence returns true for A and B', () => {
    expect(makeRule({ evidenceLevel: EvidenceLevel.A }).isHighEvidence()).toBe(true);
    expect(makeRule({ evidenceLevel: EvidenceLevel.B }).isHighEvidence()).toBe(true);
    expect(makeRule({ evidenceLevel: EvidenceLevel.C }).isHighEvidence()).toBe(false);
  });
});

describe('PersonalizedPlan', () => {
  const makePlan = (overrides = {}) =>
    new PersonalizedPlan({
      patientId: 'p1',
      goals: [],
      recommendations: [],
      monitoringPlan: { biomarkersToMonitor: [], checkupFrequencyWeeks: 12, selfMonitoringItems: [] },
      followUp: { nextCheckupWeeks: 12, specialistReferrals: [], examsRequired: [] },
      riskFactors: [],
      expectedOutcomes: [],
      confidence: 0.8,
      ...overrides,
    });

  it('generates id when not provided', () => {
    expect(makePlan().id).toMatch(/^plan-/);
  });

  it('clamps confidence to [0,1]', () => {
    expect(makePlan({ confidence: 2 }).confidence).toBe(1);
    expect(makePlan({ confidence: -1 }).confidence).toBe(0);
  });

  it('defaults version to 1.0.0', () => {
    expect(makePlan().version).toBe('1.0.0');
  });

  it('hasCriticalGoals returns true when CRITICAL goal present', () => {
    const plan = makePlan({ goals: [{ id: 'g1', category: 'CARDIAC', description: 'test', timeframeWeeks: 12, priority: 'CRITICAL' }] });
    expect(plan.hasCriticalGoals()).toBe(true);
  });

  it('getCriticalGoals returns only CRITICAL goals', () => {
    const plan = makePlan({
      goals: [
        { id: 'g1', category: 'CARDIAC', description: 'test', timeframeWeeks: 12, priority: 'CRITICAL' },
        { id: 'g2', category: 'LIFESTYLE', description: 'test2', timeframeWeeks: 24, priority: 'HIGH' },
      ],
    });
    expect(plan.getCriticalGoals()).toHaveLength(1);
    expect(plan.getCriticalGoals()[0].id).toBe('g1');
  });

  it('getHighPriorityGoals includes CRITICAL and HIGH', () => {
    const plan = makePlan({
      goals: [
        { id: 'g1', category: 'A', description: 'x', timeframeWeeks: 12, priority: 'CRITICAL' },
        { id: 'g2', category: 'B', description: 'y', timeframeWeeks: 12, priority: 'HIGH' },
        { id: 'g3', category: 'C', description: 'z', timeframeWeeks: 12, priority: 'MEDIUM' },
      ],
    });
    expect(plan.getHighPriorityGoals()).toHaveLength(2);
  });
});
