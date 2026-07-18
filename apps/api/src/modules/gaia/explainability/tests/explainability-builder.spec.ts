import { ExplainabilityBuilder } from '../explainability-builder';
import { ExplainabilityEngine } from '../explainability-engine';
import { ClinicalContext, Confidence } from '../../contracts';

describe('ExplainabilityBuilder', () => {
  let engine: { computeConfidence: jest.Mock };
  const fakeConfidence: Confidence = {
    score: 0.75,
    level: 'HIGH',
    factors: [],
    missingInformation: [],
    dataQuality: null,
    completeness: 0.5,
  };
  const context = { patientId: 'patient-1' } as ClinicalContext;

  beforeEach(() => {
    engine = { computeConfidence: jest.fn().mockReturnValue(fakeConfidence) };
  });

  it('builds an Explainability with everything set via fluent methods', () => {
    const evidence = [{ source: 'aegis', field: 'sleepMinutes', value: 420 }];
    const builder = new ExplainabilityBuilder(engine as unknown as ExplainabilityEngine, 'aegis-wellness', context)
      .withReasoning('sono em queda')
      .withEvidence(evidence)
      .withConfidenceScore(0.75)
      .withWarning('dado de 3 dias apenas')
      .withLimitation('sem exames laboratoriais')
      .withGuidelineReference('guideline-x')
      .withMetadata('algorithm', 'sleep-decline-v1');

    const explainability = builder.build();

    expect(explainability.reasoning).toBe('sono em queda');
    expect(explainability.evidence).toBe(evidence);
    expect(explainability.sourceProvider).toBe('aegis-wellness');
    expect(explainability.confidence).toBe(fakeConfidence);
    expect(explainability.warnings).toEqual(['dado de 3 dias apenas']);
    expect(explainability.limitations).toEqual(['sem exames laboratoriais']);
    expect(explainability.guidelineReferences).toEqual(['guideline-x']);
    expect(explainability.metadata).toEqual({ algorithm: 'sleep-decline-v1' });
    expect(explainability.generatedAt).toBeInstanceOf(Date);
  });

  it('produces sensible defaults when no fluent methods are called', () => {
    const explainability = new ExplainabilityBuilder(
      engine as unknown as ExplainabilityEngine,
      'aegis-wellness',
      context,
    ).build();

    expect(explainability.reasoning).toBe('');
    expect(explainability.evidence).toEqual([]);
    expect(explainability.warnings).toEqual([]);
    expect(explainability.limitations).toEqual([]);
    expect(explainability.guidelineReferences).toEqual([]);
    expect(explainability.metadata).toEqual({});
  });

  it('delegates confidence computation to the engine, passing the score and hints through', () => {
    new ExplainabilityBuilder(engine as unknown as ExplainabilityEngine, 'aegis-wellness', context)
      .withConfidenceScore(0.9, { factors: ['x'] })
      .build();

    expect(engine.computeConfidence).toHaveBeenCalledWith(0.9, context, { factors: ['x'] });
  });

  it('assigns a distinct decisionId to every built Explainability', () => {
    const builder = () =>
      new ExplainabilityBuilder(engine as unknown as ExplainabilityEngine, 'aegis-wellness', context).build();

    expect(builder().decisionId).not.toBe(builder().decisionId);
  });

  it('supports chaining withWarning/withLimitation/withMetadata multiple times', () => {
    const explainability = new ExplainabilityBuilder(
      engine as unknown as ExplainabilityEngine,
      'aegis-wellness',
      context,
    )
      .withWarning('w1')
      .withWarning('w2')
      .withMetadata('a', 1)
      .withMetadata('b', 2)
      .build();

    expect(explainability.warnings).toEqual(['w1', 'w2']);
    expect(explainability.metadata).toEqual({ a: 1, b: 2 });
  });
});
