import { METABOLIC_RISK_MODEL } from '../models/metabolic-risk.model';
import { ClinicalContext } from '../../../gaia/contracts';
import type { ScoringResult } from '../../scoring/engines/scoring-engine.interface';

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

describe('METABOLIC_RISK_MODEL', () => {
  it('declares itself as a pilot with version 0.1.0', () => {
    expect(METABOLIC_RISK_MODEL.category).toBe('METABOLIC');
    expect(METABOLIC_RISK_MODEL.name).toBe('metabolic-risk');
    expect(METABOLIC_RISK_MODEL.version).toBe('0.1.0');
    expect(METABOLIC_RISK_MODEL.scoringEngineName).toBe('risk-classification');
  });

  describe('buildScoringInput', () => {
    it('scores a healthy BMI, high activity and good sleep as 10/10/10', () => {
      const context = buildContext({
        vitals: { available: true, items: [{ id: 'v1', recordedAt: new Date(), bmi: 22 } as never] },
        wearables: {
          available: true,
          items: [
            { metricType: 'STEPS', value: 9000 } as never,
            { metricType: 'SLEEP', value: 450 } as never,
          ],
        },
      });

      const input = METABOLIC_RISK_MODEL.buildScoringInput(context);

      expect(input.answers).toEqual([
        { fieldId: 'bmi', value: '22', score: 10 },
        { fieldId: 'activity', value: '9000', score: 10 },
        { fieldId: 'sleep', value: '450', score: 10 },
      ]);
    });

    it('scores obesity, low activity and poor sleep as 2/2/2', () => {
      const context = buildContext({
        vitals: { available: true, items: [{ id: 'v1', recordedAt: new Date(), bmi: 33 } as never] },
        wearables: {
          available: true,
          items: [
            { metricType: 'STEPS', value: 2000 } as never,
            { metricType: 'SLEEP', value: 300 } as never,
          ],
        },
      });

      const input = METABOLIC_RISK_MODEL.buildScoringInput(context);

      expect(input.answers).toEqual([
        { fieldId: 'bmi', value: '33', score: 2 },
        { fieldId: 'activity', value: '2000', score: 2 },
        { fieldId: 'sleep', value: '300', score: 2 },
      ]);
    });

    it('scores borderline values (overweight / moderate activity / borderline sleep) as 6/6/6', () => {
      const context = buildContext({
        vitals: { available: true, items: [{ id: 'v1', recordedAt: new Date(), bmi: 27 } as never] },
        wearables: {
          available: true,
          items: [
            { metricType: 'STEPS', value: 6000 } as never,
            { metricType: 'SLEEP', value: 380 } as never,
          ],
        },
      });

      const input = METABOLIC_RISK_MODEL.buildScoringInput(context);

      expect(input.answers).toEqual([
        { fieldId: 'bmi', value: '27', score: 6 },
        { fieldId: 'activity', value: '6000', score: 6 },
        { fieldId: 'sleep', value: '380', score: 6 },
      ]);
    });

    it('uses a neutral score (5) — not penalizing or rewarding — when a signal is missing', () => {
      const input = METABOLIC_RISK_MODEL.buildScoringInput(buildContext());

      expect(input.answers).toEqual([
        { fieldId: 'bmi', value: null, score: 5 },
        { fieldId: 'activity', value: null, score: 5 },
        { fieldId: 'sleep', value: null, score: 5 },
      ]);
    });

    it('uses the most recent vitals record for BMI when there are several', () => {
      const older = { id: 'v1', recordedAt: new Date('2026-01-01'), bmi: 30 } as never;
      const newer = { id: 'v2', recordedAt: new Date('2026-06-01'), bmi: 22 } as never;
      const context = buildContext({ vitals: { available: true, items: [older, newer] } });

      const input = METABOLIC_RISK_MODEL.buildScoringInput(context);

      expect(input.answers[0]).toEqual({ fieldId: 'bmi', value: '22', score: 10 });
    });

    it('averages multiple wearable readings of the same metric', () => {
      const context = buildContext({
        wearables: {
          available: true,
          items: [
            { metricType: 'STEPS', value: 8000 } as never,
            { metricType: 'STEPS', value: 6000 } as never,
          ],
        },
      });

      const input = METABOLIC_RISK_MODEL.buildScoringInput(context);

      expect(input.answers[1]).toEqual({ fieldId: 'activity', value: '7000', score: 6 });
    });

    it('produces exactly one section with three fields, all optional', () => {
      const input = METABOLIC_RISK_MODEL.buildScoringInput(buildContext());

      expect(input.sections).toHaveLength(1);
      expect(input.fields).toHaveLength(3);
      expect(input.fields.every((f) => f.required === false)).toBe(true);
    });
  });

  describe('buildRecommendations', () => {
    const baseResult: ScoringResult = {
      totalScore: 0,
      maxScore: 30,
      percentage: 0,
      classification: '',
      riskLevel: 'LOW',
      sectionScores: [],
    };

    it('recommends professional follow-up for HIGH/CRITICAL risk — general wellness framing, not prescriptive', () => {
      const high = METABOLIC_RISK_MODEL.buildRecommendations({ ...baseResult, riskLevel: 'HIGH' }, buildContext());
      const critical = METABOLIC_RISK_MODEL.buildRecommendations(
        { ...baseResult, riskLevel: 'CRITICAL' },
        buildContext(),
      );

      expect(high).toEqual([
        'Conversar com um profissional de saúde',
        'Aumentar a atividade física gradualmente',
        'Buscar acompanhamento nutricional',
      ]);
      expect(critical).toEqual(high);
    });

    it('recommends lighter adjustments for MODERATE risk', () => {
      const recs = METABOLIC_RISK_MODEL.buildRecommendations({ ...baseResult, riskLevel: 'MODERATE' }, buildContext());
      expect(recs).toEqual(['Aumentar a atividade física', 'Melhorar a qualidade do sono']);
    });

    it('recommends maintenance for LOW risk', () => {
      const recs = METABOLIC_RISK_MODEL.buildRecommendations({ ...baseResult, riskLevel: 'LOW' }, buildContext());
      expect(recs).toEqual(['Manter os hábitos atuais', 'Reavaliação periódica recomendada']);
    });

    it('never suggests a specific medication, dosage or diagnosis', () => {
      const allRecommendations = (['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const).flatMap((riskLevel) =>
        METABOLIC_RISK_MODEL.buildRecommendations({ ...baseResult, riskLevel }, buildContext()),
      );

      const prescriptiveWords = /mg|dosagem|diagnóstico|prescrev|medicamento/i;
      expect(allRecommendations.some((r) => prescriptiveWords.test(r))).toBe(false);
    });
  });
});
