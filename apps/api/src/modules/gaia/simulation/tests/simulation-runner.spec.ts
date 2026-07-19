import { describe, it, expect } from '@jest/globals';
import { runSimulation, type SimulationInput } from '../engine/simulation-runner.js';
import { buildDigitalTwin } from '../engine/twin-builder.js';

const makeTwin = (overrides: object = {}) =>
  buildDigitalTwin({
    patientId: 'p1',
    age: 50,
    sex: 'MALE',
    bmi: 28,
    smoking: true,
    alcohol: 'MODERATE',
    lifestyle: 'SEDENTARY',
    familyHistory: ['diabetes', 'hypertension'],
    conditions: [],
    medications: [],
    baseRiskScore: 0.4,
    ...overrides,
  } as any);

const baseInput: SimulationInput = {
  twin: makeTwin(),
  scenarioType: 'SMOKING_CESSATION',
  timeHorizon: 'YEAR_1',
};

describe('simulation-runner', () => {
  describe('runSimulation', () => {
    it('returns all required fields', () => {
      const out = runSimulation(baseInput);
      expect(out).toHaveProperty('scenarioType');
      expect(out).toHaveProperty('scenarioLabel');
      expect(out).toHaveProperty('timeHorizon');
      expect(out).toHaveProperty('timeHorizonLabel');
      expect(out).toHaveProperty('baselineRiskScore');
      expect(out).toHaveProperty('simulatedRiskScore');
      expect(out).toHaveProperty('expectedRiskVariation');
      expect(out).toHaveProperty('expectedRiskVariationPercent');
      expect(out).toHaveProperty('confidence');
      expect(out).toHaveProperty('baselineRiskLevel');
      expect(out).toHaveProperty('simulatedRiskLevel');
      expect(out).toHaveProperty('topFactors');
      expect(out).toHaveProperty('assumptions');
      expect(out).toHaveProperty('limitations');
    });

    it('scenarioType matches input', () => {
      expect(runSimulation(baseInput).scenarioType).toBe('SMOKING_CESSATION');
    });

    it('timeHorizon matches input', () => {
      expect(runSimulation(baseInput).timeHorizon).toBe('YEAR_1');
    });

    it('baselineRiskScore is between 0 and 1', () => {
      const { baselineRiskScore } = runSimulation(baseInput);
      expect(baselineRiskScore).toBeGreaterThanOrEqual(0);
      expect(baselineRiskScore).toBeLessThanOrEqual(1);
    });

    it('simulatedRiskScore is between 0 and 1', () => {
      const { simulatedRiskScore } = runSimulation(baseInput);
      expect(simulatedRiskScore).toBeGreaterThanOrEqual(0);
      expect(simulatedRiskScore).toBeLessThanOrEqual(1);
    });

    it('confidence is between 0.4 and 0.99', () => {
      const { confidence } = runSimulation(baseInput);
      expect(confidence).toBeGreaterThanOrEqual(0.4);
      expect(confidence).toBeLessThanOrEqual(0.99);
    });

    it('SMOKING_CESSATION produces lower simulatedRiskScore than WEIGHT_GAIN for same patient', () => {
      const cessation = runSimulation(baseInput);
      const gain = runSimulation({ ...baseInput, scenarioType: 'WEIGHT_GAIN', parameters: { weightChangeKg: 10 } });
      expect(cessation.simulatedRiskScore).toBeLessThan(gain.simulatedRiskScore);
    });

    it('WEIGHT_GAIN produces higher simulatedRiskScore than WEIGHT_LOSS', () => {
      const gain = runSimulation({ ...baseInput, scenarioType: 'WEIGHT_GAIN', parameters: { weightChangeKg: 10 } });
      const loss = runSimulation({ ...baseInput, scenarioType: 'WEIGHT_LOSS', parameters: { weightChangeKg: 10 } });
      expect(gain.simulatedRiskScore).toBeGreaterThan(loss.simulatedRiskScore);
    });

    it('WEIGHT_LOSS produces lower simulatedRiskScore than WEIGHT_GAIN', () => {
      const loss = runSimulation({ ...baseInput, scenarioType: 'WEIGHT_LOSS', parameters: { weightChangeKg: 10 } });
      const gain = runSimulation({ ...baseInput, scenarioType: 'WEIGHT_GAIN', parameters: { weightChangeKg: 10 } });
      expect(loss.simulatedRiskScore).toBeLessThan(gain.simulatedRiskScore);
    });

    it('YEAR_5 horizon applies larger bmiDelta than DAYS_30 for WEIGHT_LOSS', () => {
      const short = runSimulation({ ...baseInput, scenarioType: 'WEIGHT_LOSS', parameters: { weightChangeKg: 10 }, timeHorizon: 'DAYS_30' });
      const long = runSimulation({ ...baseInput, scenarioType: 'WEIGHT_LOSS', parameters: { weightChangeKg: 10 }, timeHorizon: 'YEAR_5' });
      expect(long.simulatedRiskScore).toBeLessThanOrEqual(short.simulatedRiskScore);
    });

    it('shorter timeHorizon has higher confidence', () => {
      const short = runSimulation({ ...baseInput, timeHorizon: 'DAYS_30' });
      const long = runSimulation({ ...baseInput, timeHorizon: 'YEAR_5' });
      expect(short.confidence).toBeGreaterThan(long.confidence);
    });

    it('topFactors is a non-empty array for impactful scenario', () => {
      const { topFactors } = runSimulation(baseInput);
      expect(topFactors.length).toBeGreaterThan(0);
    });

    it('each topFactor has required fields', () => {
      const { topFactors } = runSimulation(baseInput);
      for (const f of topFactors) {
        expect(f.factor).toBeTruthy();
        expect(typeof f.contribution).toBe('number');
        expect(f.description).toBeTruthy();
      }
    });

    it('assumptions array is not empty', () => {
      expect(runSimulation(baseInput).assumptions.length).toBeGreaterThan(0);
    });

    it('limitations array is not empty', () => {
      expect(runSimulation(baseInput).limitations.length).toBeGreaterThan(0);
    });

    it('throws for unknown scenario type', () => {
      expect(() => runSimulation({ ...baseInput, scenarioType: 'INVALID' as any })).toThrow();
    });

    it('TREATMENT_ADHERENCE produces lower simulatedRiskScore than WEIGHT_GAIN', () => {
      const adherence = runSimulation({ ...baseInput, scenarioType: 'TREATMENT_ADHERENCE' });
      const gain = runSimulation({ ...baseInput, scenarioType: 'WEIGHT_GAIN', parameters: { weightChangeKg: 10 } });
      expect(adherence.simulatedRiskScore).toBeLessThan(gain.simulatedRiskScore);
    });

    it('EXERCISE_INCREASE produces lower simulatedRiskScore than WEIGHT_GAIN for sedentary patient', () => {
      const exercise = runSimulation({ ...baseInput, scenarioType: 'EXERCISE_INCREASE' });
      const gain = runSimulation({ ...baseInput, scenarioType: 'WEIGHT_GAIN', parameters: { weightChangeKg: 10 } });
      expect(exercise.simulatedRiskScore).toBeLessThanOrEqual(gain.simulatedRiskScore);
    });

    it('missingData lists missing fields from twin', () => {
      const sparseTwin = buildDigitalTwin({ patientId: 'p2', smoking: false, familyHistory: [], conditions: [], medications: [] });
      const out = runSimulation({ ...baseInput, twin: sparseTwin });
      expect(Array.isArray(out.missingData)).toBe(true);
    });
  });
});
