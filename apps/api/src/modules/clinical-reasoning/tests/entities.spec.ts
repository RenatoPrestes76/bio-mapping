import { ClinicalCase, Sex } from '../entities/clinical-case.entity.js';
import { ClinicalHypothesis, HypothesisPriority } from '../entities/clinical-hypothesis.entity.js';
import { ReasoningStep } from '../entities/reasoning-step.entity.js';
import { InferenceResult, AlertSeverity } from '../entities/inference-result.entity.js';

describe('ClinicalCase', () => {
  it('generates id if not provided', () => {
    const c = new ClinicalCase({ age: 40, sex: Sex.MALE });
    expect(c.id).toMatch(/^case-/);
  });

  it('uses provided id', () => {
    const c = new ClinicalCase({ id: 'my-id', age: 30, sex: Sex.FEMALE });
    expect(c.id).toBe('my-id');
  });

  it('hasCondition is case-insensitive', () => {
    const c = new ClinicalCase({ age: 50, sex: Sex.MALE, conditions: ['Diabetes Mellitus'] });
    expect(c.hasCondition('diabetes')).toBe(true);
    expect(c.hasCondition('DIABETES')).toBe(true);
    expect(c.hasCondition('cancer')).toBe(false);
  });

  it('hasSymptom is case-insensitive', () => {
    const c = new ClinicalCase({ age: 40, sex: Sex.FEMALE, symptoms: ['Fadiga'] });
    expect(c.hasSymptom('fadiga')).toBe(true);
    expect(c.hasSymptom('FADIGA')).toBe(true);
  });

  it('getBiomarker returns match case-insensitively', () => {
    const c = new ClinicalCase({
      age: 45,
      sex: Sex.MALE,
      biomarkers: [{ name: 'HbA1c', value: 7.2 }],
    });
    expect(c.getBiomarker('hba1c')?.value).toBe(7.2);
    expect(c.getBiomarker('HBA1C')?.value).toBe(7.2);
    expect(c.getBiomarker('ldl')).toBeUndefined();
  });

  it('isElderly returns true for age >= 65', () => {
    expect(new ClinicalCase({ age: 65, sex: Sex.OTHER }).isElderly()).toBe(true);
    expect(new ClinicalCase({ age: 64, sex: Sex.OTHER }).isElderly()).toBe(false);
  });

  it('isSedentary when SEDENTARY or not set', () => {
    const sedentary = new ClinicalCase({ age: 40, sex: Sex.MALE, lifestyle: { physicalActivity: 'SEDENTARY' } });
    const notSet = new ClinicalCase({ age: 40, sex: Sex.MALE });
    const active = new ClinicalCase({ age: 40, sex: Sex.MALE, lifestyle: { physicalActivity: 'ACTIVE' } });
    expect(sedentary.isSedentary()).toBe(true);
    expect(notSet.isSedentary()).toBe(true);
    expect(active.isSedentary()).toBe(false);
  });

  it('isSmoker returns true when lifestyle.smoking === true', () => {
    const smoker = new ClinicalCase({ age: 40, sex: Sex.MALE, lifestyle: { smoking: true } });
    const nonSmoker = new ClinicalCase({ age: 40, sex: Sex.MALE, lifestyle: { smoking: false } });
    expect(smoker.isSmoker()).toBe(true);
    expect(nonSmoker.isSmoker()).toBe(false);
  });

  it('hasFamilyHistory is case-insensitive', () => {
    const c = new ClinicalCase({ age: 50, sex: Sex.MALE, familyHistory: ['Infarto'] });
    expect(c.hasFamilyHistory('infarto')).toBe(true);
    expect(c.hasFamilyHistory('cancer')).toBe(false);
  });

  it('arrays default to empty', () => {
    const c = new ClinicalCase({ age: 30, sex: Sex.FEMALE });
    expect(c.conditions).toEqual([]);
    expect(c.symptoms).toEqual([]);
    expect(c.biomarkers).toEqual([]);
    expect(c.medications).toEqual([]);
    expect(c.familyHistory).toEqual([]);
  });
});

describe('ClinicalHypothesis', () => {
  it('clamps probability and confidence to [0,1]', () => {
    const h = new ClinicalHypothesis({ id: 'h1', condition: 'Test', probability: 2, confidence: -1 });
    expect(h.probability).toBe(1);
    expect(h.confidence).toBe(0);
  });

  it('derives priority HIGH for probability >= 0.7', () => {
    const h = new ClinicalHypothesis({ id: 'h1', condition: 'T', probability: 0.75, confidence: 0.8 });
    expect(h.priority).toBe(HypothesisPriority.HIGH);
    expect(h.isHighPriority()).toBe(true);
  });

  it('derives priority MEDIUM for 0.4 <= probability < 0.7', () => {
    const h = new ClinicalHypothesis({ id: 'h1', condition: 'T', probability: 0.50, confidence: 0.7 });
    expect(h.priority).toBe(HypothesisPriority.MEDIUM);
  });

  it('derives priority LOW for probability < 0.4', () => {
    const h = new ClinicalHypothesis({ id: 'h1', condition: 'T', probability: 0.30, confidence: 0.6 });
    expect(h.priority).toBe(HypothesisPriority.LOW);
  });

  it('overallScore returns average of probability and confidence', () => {
    const h = new ClinicalHypothesis({ id: 'h1', condition: 'T', probability: 0.8, confidence: 0.6 });
    expect(h.overallScore()).toBeCloseTo(0.7);
  });
});

describe('ReasoningStep', () => {
  it('clamps confidence to [0,1]', () => {
    const s = new ReasoningStep({ id: 's1', strategyName: 'TEST', description: 'd', confidence: 5, duration: 10 });
    expect(s.confidence).toBe(1);
  });

  it('clamps duration to >= 0', () => {
    const s = new ReasoningStep({ id: 's1', strategyName: 'TEST', description: 'd', confidence: 0.5, duration: -5 });
    expect(s.duration).toBe(0);
  });

  it('sets createdAt to a Date if not provided', () => {
    const s = new ReasoningStep({ id: 's1', strategyName: 'TEST', description: 'd', confidence: 0.5, duration: 10 });
    expect(s.createdAt).toBeInstanceOf(Date);
  });
});

describe('InferenceResult', () => {
  const makeHypothesis = (prob: number, conf: number) =>
    new ClinicalHypothesis({ id: `h-${prob}`, condition: `C${prob}`, probability: prob, confidence: conf });

  const makeAlert = (severity: AlertSeverity) => ({
    id: `a-${severity}`,
    severity,
    condition: 'test',
    message: 'msg',
    action: 'act',
  });

  it('clamps confidence to [0,1]', () => {
    const r = new InferenceResult({ id: 'r1', patientId: 'p1', hypotheses: [], recommendations: [], alerts: [], steps: [], confidence: 3 });
    expect(r.confidence).toBe(1);
  });

  it('getTopHypotheses returns n sorted by overallScore desc', () => {
    const h1 = makeHypothesis(0.8, 0.9);
    const h2 = makeHypothesis(0.5, 0.6);
    const h3 = makeHypothesis(0.9, 0.7);
    const r = new InferenceResult({ id: 'r1', patientId: 'p1', hypotheses: [h1, h2, h3], recommendations: [], alerts: [], steps: [], confidence: 0.8 });
    const top = r.getTopHypotheses(2);
    expect(top).toHaveLength(2);
    expect(top[0].overallScore()).toBeGreaterThanOrEqual(top[1].overallScore());
  });

  it('hasCriticalAlerts returns true when CRITICAL alert present', () => {
    const r = new InferenceResult({ id: 'r1', patientId: 'p1', hypotheses: [], recommendations: [], alerts: [makeAlert(AlertSeverity.CRITICAL)], steps: [], confidence: 0.8 });
    expect(r.hasCriticalAlerts()).toBe(true);
  });

  it('hasHighPriorityAlerts returns true for CRITICAL or HIGH', () => {
    const r = new InferenceResult({ id: 'r1', patientId: 'p1', hypotheses: [], recommendations: [], alerts: [makeAlert(AlertSeverity.HIGH)], steps: [], confidence: 0.8 });
    expect(r.hasHighPriorityAlerts()).toBe(true);
    expect(r.hasCriticalAlerts()).toBe(false);
  });

  it('getExplanation returns a non-empty string', () => {
    const h = makeHypothesis(0.8, 0.9);
    const r = new InferenceResult({ id: 'r1', patientId: 'p1', hypotheses: [h], recommendations: ['rec1'], alerts: [], steps: [], confidence: 0.8 });
    expect(r.getExplanation()).toBeTruthy();
    expect(typeof r.getExplanation()).toBe('string');
  });

  it('version defaults to 1.0.0', () => {
    const r = new InferenceResult({ id: 'r1', patientId: 'p1', hypotheses: [], recommendations: [], alerts: [], steps: [], confidence: 0.5 });
    expect(r.version).toBe('1.0.0');
  });

  it('steps defaults to []', () => {
    const r = new InferenceResult({ id: 'r1', patientId: 'p1', hypotheses: [], recommendations: [], alerts: [], steps: [], confidence: 0.5 });
    expect(r.steps).toEqual([]);
  });
});
