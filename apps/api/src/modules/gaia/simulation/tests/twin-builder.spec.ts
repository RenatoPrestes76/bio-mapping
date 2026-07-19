import { describe, it, expect } from '@jest/globals';
import { buildDigitalTwin, extractBaselineRiskScore, mergeTwinUpdate, type PatientTwinData } from '../engine/twin-builder.js';

const fullData: PatientTwinData = {
  patientId: 'p1',
  tenantId: 't1',
  age: 45,
  sex: 'MALE',
  occupation: 'Engineer',
  bmi: 27.5,
  weight: 84,
  height: 1.75,
  smoking: true,
  alcohol: 'MODERATE',
  lifestyle: 'SEDENTARY',
  pregnant: false,
  menopausal: false,
  familyHistory: ['diabetes', 'hypertension'],
  conditions: ['obesity'],
  medications: ['metformin'],
  baseRiskScore: 0.55,
  currentRiskLevel: 'HIGH',
};

describe('twin-builder', () => {
  describe('buildDigitalTwin', () => {
    it('returns a twin with correct patientId', () => {
      const twin = buildDigitalTwin(fullData);
      expect(twin.patientId).toBe('p1');
    });

    it('includes all demographic fields', () => {
      const twin = buildDigitalTwin(fullData);
      expect((twin.demographics as any).age).toBe(45);
      expect((twin.demographics as any).sex).toBe('MALE');
      expect((twin.demographics as any).occupation).toBe('Engineer');
    });

    it('includes clinical history fields', () => {
      const twin = buildDigitalTwin(fullData);
      expect((twin.clinicalHistory as any).bmi).toBe(27.5);
      expect((twin.clinicalHistory as any).weight).toBe(84);
      expect((twin.clinicalHistory as any).baseRiskScore).toBe(0.55);
    });

    it('includes lifestyle fields', () => {
      const twin = buildDigitalTwin(fullData);
      expect((twin.lifestyle as any).smoking).toBe(true);
      expect((twin.lifestyle as any).alcohol).toBe('MODERATE');
      expect((twin.lifestyle as any).activityLevel).toBe('SEDENTARY');
    });

    it('sets riskFactors from familyHistory', () => {
      const twin = buildDigitalTwin(fullData);
      expect(twin.riskFactors).toContain('diabetes');
      expect(twin.riskFactors).toContain('hypertension');
    });

    it('computes dataCompleteness between 0 and 1', () => {
      const twin = buildDigitalTwin(fullData);
      expect(twin.dataCompleteness).toBeGreaterThan(0);
      expect(twin.dataCompleteness).toBeLessThanOrEqual(1);
    });

    it('has high data completeness for full data', () => {
      const twin = buildDigitalTwin(fullData);
      expect(twin.dataCompleteness).toBeGreaterThan(0.6);
    });

    it('has lower dataCompleteness when critical fields missing', () => {
      const sparse: PatientTwinData = { ...fullData, age: undefined, sex: undefined, lifestyle: undefined };
      const twin = buildDigitalTwin(sparse);
      expect(twin.dataCompleteness).toBeLessThan(buildDigitalTwin(fullData).dataCompleteness);
    });

    it('populates missingFields for absent data', () => {
      const sparse: PatientTwinData = { ...fullData, age: undefined, lifestyle: undefined };
      const twin = buildDigitalTwin(sparse);
      expect(twin.missingFields).toContain('age');
      expect(twin.missingFields).toContain('lifestyle');
    });

    it('has empty missingFields for complete data', () => {
      const twin = buildDigitalTwin(fullData);
      expect(twin.missingFields).not.toContain('age');
      expect(twin.missingFields).not.toContain('bmi');
      expect(twin.missingFields).not.toContain('lifestyle');
    });

    it('uses default baseRiskScore of 0.3 when not provided', () => {
      const twin = buildDigitalTwin({ ...fullData, baseRiskScore: undefined });
      expect((twin.clinicalHistory as any).baseRiskScore).toBe(0.3);
    });

    it('sets twinVersion to 1.0', () => {
      expect(buildDigitalTwin(fullData).twinVersion).toBe('1.0');
    });

    it('initializes empty longitudinalData metrics when none provided', () => {
      const twin = buildDigitalTwin({ ...fullData, longitudinalMetrics: undefined });
      expect((twin.longitudinalData as any).metrics).toHaveLength(0);
    });

    it('includes longitudinalMetrics when provided', () => {
      const twin = buildDigitalTwin({ ...fullData, longitudinalMetrics: [{ metricName: 'glucose', value: 95, recordedAt: new Date() }] });
      expect((twin.longitudinalData as any).metrics).toHaveLength(1);
    });

    it('sets builtAt as a Date', () => {
      expect(buildDigitalTwin(fullData).builtAt).toBeInstanceOf(Date);
    });
  });

  describe('extractBaselineRiskScore', () => {
    it('returns stored baseRiskScore', () => {
      const twin = buildDigitalTwin(fullData);
      expect(extractBaselineRiskScore(twin)).toBe(0.55);
    });

    it('returns 0.3 when no risk score stored', () => {
      const twin = buildDigitalTwin({ ...fullData, baseRiskScore: undefined });
      expect(extractBaselineRiskScore(twin)).toBe(0.3);
    });

    it('clamps negative score to 0', () => {
      const twin = buildDigitalTwin({ ...fullData, baseRiskScore: -0.5 });
      expect(extractBaselineRiskScore(twin)).toBe(0);
    });

    it('clamps score above 1 to 1', () => {
      const twin = buildDigitalTwin({ ...fullData, baseRiskScore: 1.5 });
      expect(extractBaselineRiskScore(twin)).toBe(1);
    });
  });

  describe('mergeTwinUpdate', () => {
    it('overrides age from update', () => {
      const twin = buildDigitalTwin(fullData);
      const merged = mergeTwinUpdate(twin, { age: 50 });
      expect(merged.age).toBe(50);
    });

    it('retains existing values when not overridden', () => {
      const twin = buildDigitalTwin(fullData);
      const merged = mergeTwinUpdate(twin, {});
      expect(merged.age).toBe(45);
      expect(merged.sex).toBe('MALE');
    });

    it('overrides lifestyle from update', () => {
      const twin = buildDigitalTwin(fullData);
      const merged = mergeTwinUpdate(twin, { lifestyle: 'VERY_ACTIVE' });
      expect(merged.lifestyle).toBe('VERY_ACTIVE');
    });

    it('overrides familyHistory from update', () => {
      const twin = buildDigitalTwin(fullData);
      const merged = mergeTwinUpdate(twin, { familyHistory: ['cancer'] });
      expect(merged.familyHistory).toEqual(['cancer']);
    });
  });
});
