import { LIFESTYLE_TREND_MODEL } from '../models/lifestyle-trend.model';
import { ClinicalContext } from '../../../gaia/contracts';

function buildContext(overrides: Partial<ClinicalContext> = {}): ClinicalContext {
  const empty = { available: false, items: [] as unknown[] };
  return {
    patientId: 'patient-1',
    metadata: {
      generatedAt: new Date(),
      window: { from: new Date('2026-01-01'), to: new Date('2026-01-08') },
      sourcesQueried: [],
    },
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

function steps(values: number[]) {
  return values.map((value, i) => ({
    metricType: 'STEPS',
    value,
    recordedAt: new Date(2026, 0, 1 + i),
  }));
}

function sleepMinutes(values: number[]) {
  return values.map((value, i) => ({
    metricType: 'SLEEP',
    value,
    recordedAt: new Date(2026, 0, 1 + i),
  }));
}

function weights(values: number[]) {
  return values.map((value, i) => ({
    id: `v${i}`,
    recordedAt: new Date(2026, 0, 1 + i),
    weight: value,
  }));
}

describe('LIFESTYLE_TREND_MODEL', () => {
  it('declares itself as a pilot with version 0.1.0 and predictionType TREND', () => {
    expect(LIFESTYLE_TREND_MODEL.name).toBe('lifestyle-trend');
    expect(LIFESTYLE_TREND_MODEL.predictionType).toBe('TREND');
    expect(LIFESTYLE_TREND_MODEL.version).toBe('0.1.0');
    expect(LIFESTYLE_TREND_MODEL.requiredCapabilities).toEqual(['wearables', 'vitals']);
  });

  describe('computeStates', () => {
    it('scores a clearly increasing signal as IMPROVING (score 10)', () => {
      const context = buildContext({
        wearables: { available: true, items: steps([1000, 2000, 3000, 4000, 5000, 6000, 7000]) as never },
      });

      const result = LIFESTYLE_TREND_MODEL.computeStates(context);

      expect((result.current as never as { activity: { trend: string; score: number } }).activity).toEqual({
        trend: 'IMPROVING',
        score: 10,
      });
    });

    it('scores a clearly decreasing signal as DECLINING (score 0)', () => {
      const context = buildContext({
        wearables: { available: true, items: sleepMinutes([480, 440, 400, 360, 320, 280, 240]) as never },
      });

      const result = LIFESTYLE_TREND_MODEL.computeStates(context);

      expect((result.current as never as { sleep: { trend: string; score: number } }).sleep).toEqual({
        trend: 'DECLINING',
        score: 0,
      });
    });

    it('treats a single data point as no trend (null, neutral score 5) — never guesses without data', () => {
      const context = buildContext({
        wearables: { available: true, items: steps([5000]) as never },
      });

      const result = LIFESTYLE_TREND_MODEL.computeStates(context);

      expect((result.current as never as { activity: { trend: null; score: number } }).activity).toEqual({
        trend: null,
        score: 5,
      });
    });

    it('treats a flat signal as STABLE (score 5)', () => {
      const context = buildContext({
        vitals: { available: true, items: weights([70, 70, 70, 70]) as never },
      });

      const result = LIFESTYLE_TREND_MODEL.computeStates(context);

      expect((result.current as never as { weight: { trend: string; score: number } }).weight).toEqual({
        trend: 'STABLE',
        score: 5,
      });
    });

    it('predictedState nudges the score by 1 in the direction of the trend, clamped to 0-10', () => {
      const context = buildContext({
        wearables: { available: true, items: steps([1000, 2000, 3000, 4000, 5000, 6000, 7000]) as never },
      });

      const result = LIFESTYLE_TREND_MODEL.computeStates(context);

      // current activity score is already 10 (max) — nudging +1 must clamp, not overflow
      expect((result.predicted as never as { activity: { score: number } }).activity.score).toBe(10);
    });

    it('predictedState does not nudge when there is no trend', () => {
      const context = buildContext({
        vitals: { available: true, items: weights([70, 70, 70, 70]) as never },
      });

      const result = LIFESTYLE_TREND_MODEL.computeStates(context);

      expect((result.predicted as never as { weight: { score: number } }).weight.score).toBe(5);
    });

    it('aggregates currentScore/predictedScore as the average across the three signals', () => {
      const context = buildContext({
        wearables: {
          available: true,
          items: [...steps([1000, 2000, 3000, 4000, 5000, 6000, 7000]), ...sleepMinutes([480, 440, 400, 360, 320, 280, 240])] as never,
        },
        vitals: { available: true, items: weights([70, 70, 70, 70]) as never },
      });

      const result = LIFESTYLE_TREND_MODEL.computeStates(context);

      // activity=10 (IMPROVING), sleep=0 (DECLINING), weight=5 (STABLE) -> avg 5
      expect(result.currentScore).toBe(5);
    });
  });

  describe('buildPredictionWindow', () => {
    it('projects a future window of the same duration as the historical window, starting where it ends', () => {
      const context = buildContext({
        metadata: {
          generatedAt: new Date(),
          window: { from: new Date('2026-01-01T00:00:00Z'), to: new Date('2026-01-08T00:00:00Z') },
          sourcesQueried: [],
        },
      });

      const window = LIFESTYLE_TREND_MODEL.buildPredictionWindow(context);

      expect(window.start).toEqual(new Date('2026-01-08T00:00:00Z'));
      expect(window.end).toEqual(new Date('2026-01-15T00:00:00Z'));
      expect(window.duration).toBe(7);
      expect(window.unit).toBe('DAYS');
    });
  });

  describe('buildRecommendations', () => {
    it('reports a declining activity trend without a clinical conclusion (Diretriz 8)', () => {
      const context = buildContext({
        wearables: { available: true, items: steps([7000, 6000, 5000, 4000, 3000, 2000, 1000]) as never },
      });
      const result = LIFESTYLE_TREND_MODEL.computeStates(context);

      const recommendations = LIFESTYLE_TREND_MODEL.buildRecommendations(result);

      expect(recommendations).toContain('Tendência de redução na atividade física recente');
    });

    it('falls back to a neutral message when no signal shows a trend', () => {
      const result = LIFESTYLE_TREND_MODEL.computeStates(buildContext());

      const recommendations = LIFESTYLE_TREND_MODEL.buildRecommendations(result);

      expect(recommendations).toEqual([
        'Nenhuma tendência significativa identificada no período — reavaliação periódica recomendada',
      ]);
    });

    it('never states a diagnosis, disease conclusion or prescription — only trend direction', () => {
      const declining = buildContext({
        wearables: {
          available: true,
          items: [
            ...steps([7000, 6000, 5000, 4000, 3000, 2000, 1000]),
            ...sleepMinutes([480, 440, 400, 360, 320, 280, 240]),
          ] as never,
        },
        vitals: { available: true, items: weights([65, 67, 69, 71, 73, 75, 77]) as never },
      });

      const recommendations = LIFESTYLE_TREND_MODEL.buildRecommendations(LIFESTYLE_TREND_MODEL.computeStates(declining));

      const diagnosticWords = /diagnóstic|doença|desenvolver|mg\b|dosagem|prescrev|paciente (vai|irá|desenvolverá)/i;
      expect(recommendations.some((r) => diagnosticWords.test(r))).toBe(false);
    });
  });
});
