import { Test, TestingModule } from '@nestjs/testing';
import { ClinicalRiskProvider } from '../clinical-risk.provider';
import { ClinicalRiskRegistry } from '../clinical-risk.registry';
import { ClinicalRiskEngine } from '../clinical-risk-engine';
import { ClinicalRiskAssessment, ClinicalRiskModel } from '../clinical-risk.types';
import { ClinicalContext, Confidence, DecisionTrace, Explainability } from '../../../gaia/contracts';

describe('ClinicalRiskProvider', () => {
  let provider: ClinicalRiskProvider;
  let registry: { listEnabled: jest.Mock };
  let engine: { assess: jest.Mock };

  const context = { patientId: 'patient-1' } as ClinicalContext;
  const fakeModel = { category: 'METABOLIC' } as ClinicalRiskModel;

  const confidence: Confidence = {
    score: 0.5,
    level: 'MODERATE',
    factors: [],
    missingInformation: [],
    dataQuality: null,
    completeness: 0.5,
  };
  const explainability: Explainability = {
    decisionId: 'decision-1',
    confidence,
    reasoning: 'metabolic-risk: score 67% (Risco Moderado)',
    evidence: [],
    sourceProvider: 'clinical-risk',
    generatedAt: new Date(),
    guidelineReferences: [],
    limitations: [],
    warnings: [],
    metadata: {},
  };
  const trace: DecisionTrace = Object.freeze({ traceId: 'trace-1', patientId: 'patient-1', steps: Object.freeze([]) });

  const assessment: ClinicalRiskAssessment = {
    riskId: 'risk-1',
    riskCategory: 'METABOLIC' as ClinicalRiskAssessment['riskCategory'],
    riskScore: 67,
    riskLevel: 'MODERATE',
    confidence,
    explainability,
    decisionTrace: trace,
    recommendations: ['Aumentar a atividade física', 'Melhorar a qualidade do sono'],
    modelVersion: '0.1.0',
    metadata: {},
  };

  beforeEach(async () => {
    registry = { listEnabled: jest.fn().mockReturnValue([fakeModel]) };
    engine = { assess: jest.fn().mockReturnValue(assessment) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalRiskProvider,
        { provide: ClinicalRiskRegistry, useValue: registry },
        { provide: ClinicalRiskEngine, useValue: engine },
      ],
    }).compile();

    provider = module.get(ClinicalRiskProvider);
  });

  it('declares itself as the clinical domain provider', () => {
    expect(provider.name).toBe('clinical-risk');
    expect(provider.domain).toBe('CLINICAL');
    expect(provider.version).toBe('1.0.0');
  });

  it('supports() is always true', () => {
    expect(provider.supports()).toBe(true);
  });

  describe('generateInsights', () => {
    it('assesses every enabled model and maps each assessment to an InsightSignal', async () => {
      const result = await provider.generateInsights(context);

      expect(engine.assess).toHaveBeenCalledWith(fakeModel, context);
      expect(result).toEqual([
        {
          insightId: 'risk-1',
          provider: 'clinical-risk',
          domain: 'CLINICAL',
          category: 'METABOLIC',
          priority: 'ATENCAO',
          title: 'Risco METABOLIC: MODERATE',
          message: explainability.reasoning,
          explainability,
        },
      ]);
    });

    it.each([
      ['CRITICAL', 'ALTA_PRIORIDADE'],
      ['HIGH', 'IMPORTANTE'],
      ['MODERATE', 'ATENCAO'],
      ['LOW', 'INFORMATIVO'],
    ] as const)('maps risk level %s to priority %s', async (riskLevel, expectedPriority) => {
      engine.assess.mockReturnValue({ ...assessment, riskLevel });

      const result = await provider.generateInsights(context);

      expect(result[0].priority).toBe(expectedPriority);
    });
  });

  describe('generateRecommendations', () => {
    it('maps each assessment to a RecommendationCandidate carrying the model actions', async () => {
      const result = await provider.generateRecommendations(context, []);

      expect(result).toEqual([
        {
          recommendationId: expect.any(String),
          provider: 'clinical-risk',
          priority: 'ATENCAO',
          category: 'METABOLIC',
          title: 'Recomendações — METABOLIC',
          description: 'Baseado no risco MODERATE (67%)',
          rationale: explainability.reasoning,
          actions: ['Aumentar a atividade física', 'Melhorar a qualidade do sono'],
          explainability,
        },
      ]);
    });

    it('reuses the same explainability instance for insight and recommendation from the same assessment', async () => {
      const [insight] = await provider.generateInsights(context);
      const [recommendation] = await provider.generateRecommendations(context, []);

      expect(insight.explainability).toBe(recommendation.explainability);
    });
  });

  describe('generatePredictions', () => {
    it('returns an empty array — predictions are Sprint 14.5', async () => {
      await expect(provider.generatePredictions()).resolves.toEqual([]);
      expect(engine.assess).not.toHaveBeenCalled();
    });
  });
});
