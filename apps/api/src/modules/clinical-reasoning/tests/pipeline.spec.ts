import { ReasoningPipeline } from '../pipeline/reasoning-pipeline.js';
import { ClinicalCase, Sex } from '../entities/clinical-case.entity.js';
import { AlertSeverity } from '../entities/inference-result.entity.js';

describe('ReasoningPipeline', () => {
  let pipeline: ReasoningPipeline;

  beforeEach(() => {
    pipeline = new ReasoningPipeline();
  });

  it('returns InferenceResult with an id', () => {
    const c = new ClinicalCase({ age: 45, sex: Sex.MALE });
    const result = pipeline.execute(c);
    expect(result.id).toMatch(/^inference-/);
  });

  it('generates hypotheses for a diabetic hypertensive case', () => {
    const c = new ClinicalCase({
      age: 55,
      sex: Sex.MALE,
      biomarkers: [
        { name: 'fasting_glucose', value: 140 },
        { name: 'systolic_bp', value: 145 },
        { name: 'hba1c', value: 7.0 },
      ],
      conditions: ['diabetes', 'hipertensão'],
    });
    const result = pipeline.execute(c);
    const conditions = result.hypotheses.map((h) => h.condition);
    expect(conditions.some((c) => c.includes('Diabetes'))).toBe(true);
    expect(conditions.some((c) => c.includes('Hipertensão'))).toBe(true);
  });

  it('produces recommendations from candidates', () => {
    const c = new ClinicalCase({
      age: 50,
      sex: Sex.FEMALE,
      biomarkers: [{ name: 'ldl', value: 190 }],
    });
    const result = pipeline.execute(c);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('generates CRITICAL alert for glucose >= 400', () => {
    const c = new ClinicalCase({
      age: 50,
      sex: Sex.MALE,
      biomarkers: [{ name: 'fasting_glucose', value: 450 }],
    });
    const result = pipeline.execute(c);
    expect(result.hasCriticalAlerts()).toBe(true);
  });

  it('generates HIGH alert for systolic_bp >= 180', () => {
    const c = new ClinicalCase({
      age: 60,
      sex: Sex.MALE,
      biomarkers: [{ name: 'systolic_bp', value: 185 }],
    });
    const result = pipeline.execute(c);
    expect(result.hasHighPriorityAlerts()).toBe(true);
  });

  it('overall confidence is clamped to [0,1]', () => {
    const c = new ClinicalCase({ age: 40, sex: Sex.FEMALE });
    const result = pipeline.execute(c);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('hypotheses are unique by condition after hybrid merge', () => {
    const c = new ClinicalCase({
      age: 55,
      sex: Sex.MALE,
      biomarkers: [
        { name: 'fasting_glucose', value: 130 },
        { name: 'triglycerides', value: 200 },
        { name: 'hdl', value: 35 },
        { name: 'systolic_bp', value: 145 },
        { name: 'bmi', value: 32 },
      ],
      lifestyle: { smoking: true, physicalActivity: 'SEDENTARY' },
    });
    const result = pipeline.execute(c);
    const conditions = result.hypotheses.map((h) => h.condition);
    const unique = new Set(conditions);
    expect(unique.size).toBe(conditions.length);
  });

  it('top hypotheses are sorted by overallScore descending', () => {
    const c = new ClinicalCase({
      age: 60,
      sex: Sex.MALE,
      biomarkers: [
        { name: 'fasting_glucose', value: 145 },
        { name: 'systolic_bp', value: 155 },
        { name: 'ldl', value: 185 },
      ],
    });
    const result = pipeline.execute(c);
    const top = result.getTopHypotheses(3);
    for (let i = 0; i < top.length - 1; i++) {
      expect(top[i].overallScore()).toBeGreaterThanOrEqual(top[i + 1].overallScore());
    }
  });

  it('sets patientId on result from case', () => {
    const c = new ClinicalCase({ age: 40, sex: Sex.MALE, patientId: 'patient-abc' });
    const result = pipeline.execute(c);
    expect(result.patientId).toBe('patient-abc');
  });

  it('getExplanation returns non-empty string', () => {
    const c = new ClinicalCase({ age: 50, sex: Sex.FEMALE, biomarkers: [{ name: 'bmi', value: 33 }] });
    const result = pipeline.execute(c);
    expect(result.getExplanation()).toBeTruthy();
  });
});
