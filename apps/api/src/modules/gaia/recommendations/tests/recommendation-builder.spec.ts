import { RecommendationBuilder } from '../recommendation-builder';
import { ExplainabilityEngine } from '../../explainability';
import { ClinicalContext } from '../../contracts';
import { MergedRecommendation, RecommendationSetStatistics } from '../recommendation.types';

function buildContext(): ClinicalContext {
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
  };
}

describe('RecommendationBuilder', () => {
  const context = buildContext();
  const statistics: RecommendationSetStatistics = {
    candidatesReceived: 3,
    duplicatesRemoved: 1,
    highestPriority: 'IMPORTANTE',
    priorityBreakdown: { IMPORTANTE: 1, ATENCAO: 1 },
  };
  const recommendations: MergedRecommendation[] = [];

  it('builds a RecommendationSet carrying through the statistics and providerCount', () => {
    const builder = new RecommendationBuilder(new ExplainabilityEngine(), context);

    const set = builder.build(recommendations, statistics, 2);

    expect(set.recommendations).toBe(recommendations);
    expect(set.statistics).toBe(statistics);
    expect(set.providerCount).toBe(2);
    expect(set.generatedAt).toBeInstanceOf(Date);
  });

  it('produces a summary mentioning the count, provider count and highest priority', () => {
    const builder = new RecommendationBuilder(new ExplainabilityEngine(), context);
    const set = builder.build(recommendations, statistics, 2);

    expect(set.summary).toContain('2 provider');
    expect(set.summary).toContain('IMPORTANTE');
  });

  it('builds explainability via ExplainabilityBuilder with confidence fixed at 1 (deterministic aggregation)', () => {
    const builder = new RecommendationBuilder(new ExplainabilityEngine(), context);
    const set = builder.build(recommendations, statistics, 2);

    expect(set.explainability.confidence.score).toBe(1);
    expect(set.explainability.sourceProvider).toBe('recommendation-engine');
    expect(set.explainability.metadata).toEqual({ candidatesReceived: 3, duplicatesRemoved: 1 });
  });

  it('does not derive missingInformation from the ClinicalContext for this step', () => {
    const builder = new RecommendationBuilder(new ExplainabilityEngine(), context);
    const set = builder.build(recommendations, statistics, 2);

    expect(set.explainability.confidence.missingInformation).toEqual([]);
  });
});
