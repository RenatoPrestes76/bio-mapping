import { ExplainabilityEngine, DecisionTraceBuilder } from '../explainability-engine';
import { ClinicalContext } from '../../contracts';

function buildContext(overrides: Partial<ClinicalContext> = {}): ClinicalContext {
  const empty = { available: false, items: [] as unknown[] };
  return {
    patientId: 'patient-1',
    metadata: { generatedAt: new Date(), window: { from: new Date(), to: new Date() }, sourcesQueried: [] },
    patient: null,
    vitals: empty,
    laboratory: empty,
    lifestyle: empty,
    nutrition: empty,
    medication: empty,
    conditions: empty,
    assessments: empty,
    wearables: empty,
    familyHistory: empty,
    genomics: empty,
    imaging: empty,
    fhirResources: empty,
    ...overrides,
  };
}

describe('ExplainabilityEngine', () => {
  let engine: ExplainabilityEngine;

  beforeEach(() => {
    engine = new ExplainabilityEngine();
  });

  describe('computeConfidence', () => {
    it.each([
      [0.1, 'LOW'],
      [0.39, 'LOW'],
      [0.4, 'MODERATE'],
      [0.69, 'MODERATE'],
      [0.7, 'HIGH'],
      [0.89, 'HIGH'],
      [0.9, 'VERY_HIGH'],
      [1, 'VERY_HIGH'],
    ])('bands score %f into level %s', (score, level) => {
      const confidence = engine.computeConfidence(score, buildContext());
      expect(confidence.level).toBe(level);
      expect(confidence.score).toBe(score);
    });

    it('normalizes a null score to 0 (LOW)', () => {
      const confidence = engine.computeConfidence(null, buildContext());
      expect(confidence.score).toBe(0);
      expect(confidence.level).toBe('LOW');
    });

    it('computes completeness as the fraction of capability sections with data', () => {
      const context = buildContext({
        vitals: { available: true, items: [{ id: 'v1' }] },
        laboratory: { available: true, items: [{ id: 'b1' }] },
      });

      const confidence = engine.computeConfidence(0.8, context);

      // 2 of 12 sections have data
      expect(confidence.completeness).toBeCloseTo(2 / 12, 5);
    });

    it('derives missingInformation from empty capability sections', () => {
      const confidence = engine.computeConfidence(0.5, buildContext());

      expect(confidence.missingInformation).toEqual(
        expect.arrayContaining(['Missing Labs', 'Missing Wearable Data', 'Missing Medication History']),
      );
    });

    it('does not flag missing labs/wearables/medication when those sections have data', () => {
      const context = buildContext({
        laboratory: { available: true, items: [{ id: 'b1' }] },
        wearables: { available: true, items: [{ id: 'w1' }] },
        medication: { available: true, items: [{ id: 'm1' }] },
      });

      const confidence = engine.computeConfidence(0.5, context);

      expect(confidence.missingInformation).toEqual([]);
    });

    it('honors explicit hints over derived factors/missingInformation', () => {
      const confidence = engine.computeConfidence(0.5, buildContext(), {
        factors: ['custom factor'],
        missingInformation: ['custom gap'],
      });

      expect(confidence.factors).toEqual(['custom factor']);
      expect(confidence.missingInformation).toEqual(['custom gap']);
    });

    it('leaves dataQuality unset (null) — no clinical judgement made', () => {
      const confidence = engine.computeConfidence(0.8, buildContext());
      expect(confidence.dataQuality).toBeNull();
    });
  });

  describe('buildProvenance', () => {
    it('returns a Provenance object with all fields passed through', () => {
      const provenance = engine.buildProvenance({
        providerName: 'aegis-wellness',
        providerVersion: '1.0.0',
        correlationId: 'trace-1',
        executionId: 'trace-1:aegis-wellness',
        executionTimeMs: 42,
        executionStatus: 'SUCCESS',
      });

      expect(provenance).toEqual({
        providerName: 'aegis-wellness',
        providerVersion: '1.0.0',
        correlationId: 'trace-1',
        executionId: 'trace-1:aegis-wellness',
        executionTimeMs: 42,
        executionStatus: 'SUCCESS',
      });
    });
  });

  describe('startTrace', () => {
    it('returns a DecisionTraceBuilder scoped to the given patient', () => {
      const traceBuilder = engine.startTrace('patient-1');
      expect(traceBuilder).toBeInstanceOf(DecisionTraceBuilder);
    });
  });
});

describe('DecisionTraceBuilder', () => {
  it('builds an immutable DecisionTrace with recorded steps in order', () => {
    const builder = new DecisionTraceBuilder('patient-1');
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-01T00:00:00.100Z');

    builder.recordStep('CLINICAL_CONTEXT', start, end, 'SUCCESS');
    builder.recordStep('PROVIDER', start, end, 'SUCCESS', 'aegis-wellness');

    const trace = builder.build();

    expect(trace.patientId).toBe('patient-1');
    expect(trace.traceId).toBe(builder.getTraceId());
    expect(trace.steps).toHaveLength(2);
    expect(trace.steps[0]).toMatchObject({ stage: 'CLINICAL_CONTEXT', status: 'SUCCESS', durationMs: 100 });
    expect(trace.steps[1]).toMatchObject({ stage: 'PROVIDER', status: 'SUCCESS', detail: 'aegis-wellness' });
  });

  it('freezes the trace and its steps so they cannot be mutated after build()', () => {
    const builder = new DecisionTraceBuilder('patient-1');
    builder.recordStep('DECISION_ENGINE', new Date(), new Date(), 'SUCCESS');

    const trace = builder.build();

    expect(Object.isFrozen(trace)).toBe(true);
    expect(Object.isFrozen(trace.steps)).toBe(true);
    expect(Object.isFrozen(trace.steps[0])).toBe(true);
  });

  it('gives each trace a distinct traceId', () => {
    const traceA = new DecisionTraceBuilder('patient-1').build();
    const traceB = new DecisionTraceBuilder('patient-1').build();
    expect(traceA.traceId).not.toBe(traceB.traceId);
  });
});
