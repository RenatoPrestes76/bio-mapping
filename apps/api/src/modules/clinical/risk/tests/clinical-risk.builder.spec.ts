import { ClinicalRiskBuilder } from '../clinical-risk.builder';
import { ExplainabilityEngine } from '../../../gaia/explainability';
import { ClinicalRiskModel } from '../clinical-risk.types';
import { ClinicalContext, Confidence, DecisionTrace } from '../../../gaia/contracts';
import type { ScoringResult } from '../../scoring/engines/scoring-engine.interface';

describe('ClinicalRiskBuilder', () => {
  let engine: { computeConfidence: jest.Mock };
  const fakeConfidence: Confidence = {
    score: 0.5,
    level: 'MODERATE',
    factors: [],
    missingInformation: [],
    dataQuality: null,
    completeness: 0.5,
  };
  const context = { patientId: 'patient-1' } as ClinicalContext;
  const trace: DecisionTrace = Object.freeze({ traceId: 'trace-1', patientId: 'patient-1', steps: Object.freeze([]) });
  const model: ClinicalRiskModel = {
    category: 'METABOLIC' as ClinicalRiskModel['category'],
    name: 'metabolic-risk',
    version: '0.1.0',
    scoringEngineName: 'risk-classification',
    requiredCapabilities: [],
    buildScoringInput: jest.fn(),
    buildRecommendations: jest.fn(),
  };
  const result: ScoringResult = {
    totalScore: 20,
    maxScore: 30,
    percentage: 67,
    classification: 'Risco Moderado',
    riskLevel: 'MODERATE',
    sectionScores: [],
  };

  beforeEach(() => {
    engine = { computeConfidence: jest.fn().mockReturnValue(fakeConfidence) };
  });

  it('builds a ClinicalRiskAssessment from a ScoringResult', () => {
    const builder = new ClinicalRiskBuilder(engine as unknown as ExplainabilityEngine, model, context);

    const assessment = builder.build(result, ['rec-1', 'rec-2'], 0.5, trace);

    expect(assessment.riskCategory).toBe('METABOLIC');
    expect(assessment.riskScore).toBe(67);
    expect(assessment.riskLevel).toBe('MODERATE');
    expect(assessment.recommendations).toEqual(['rec-1', 'rec-2']);
    expect(assessment.modelVersion).toBe('0.1.0');
    expect(assessment.decisionTrace).toBe(trace);
    expect(assessment.riskId).toEqual(expect.any(String));
  });

  it('embeds the same Confidence reference in confidence and explainability.confidence', () => {
    const builder = new ClinicalRiskBuilder(engine as unknown as ExplainabilityEngine, model, context);
    const assessment = builder.build(result, [], 0.5, trace);

    expect(assessment.confidence).toBe(assessment.explainability.confidence);
    expect(assessment.confidence).toBe(fakeConfidence);
  });

  it('tags the recommendation as GENERAL_WELLNESS, never a clinical prescription', () => {
    const builder = new ClinicalRiskBuilder(engine as unknown as ExplainabilityEngine, model, context);
    const assessment = builder.build(result, [], 0.5, trace);

    expect(assessment.explainability.metadata.recommendationType).toBe('GENERAL_WELLNESS');
  });

  it('flags the pilot model as a limitation in the explainability', () => {
    const builder = new ClinicalRiskBuilder(engine as unknown as ExplainabilityEngine, model, context);
    const assessment = builder.build(result, [], 0.5, trace);

    expect(assessment.explainability.limitations).toEqual(
      expect.arrayContaining([expect.stringContaining('piloto')]),
    );
  });

  it('passes the confidence score and context through to the engine unchanged', () => {
    const builder = new ClinicalRiskBuilder(engine as unknown as ExplainabilityEngine, model, context);
    builder.build(result, [], 0.83, trace);

    expect(engine.computeConfidence).toHaveBeenCalledWith(0.83, context, {});
  });

  it('stores classification and sectionScores in metadata', () => {
    const builder = new ClinicalRiskBuilder(engine as unknown as ExplainabilityEngine, model, context);
    const assessment = builder.build(result, [], 0.5, trace);

    expect(assessment.metadata).toEqual({ classification: 'Risco Moderado', sectionScores: [] });
  });
});
