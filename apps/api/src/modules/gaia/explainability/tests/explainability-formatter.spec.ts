import { ExplainabilityFormatter } from '../explainability-formatter';
import { DecisionTrace, Explainability } from '../../contracts';

describe('ExplainabilityFormatter', () => {
  let formatter: ExplainabilityFormatter;

  beforeEach(() => {
    formatter = new ExplainabilityFormatter();
  });

  describe('toSummary', () => {
    const baseExplainability: Explainability = {
      decisionId: 'decision-1',
      confidence: { score: 0.82, level: 'HIGH', factors: [], missingInformation: [], dataQuality: null, completeness: 0.94 },
      reasoning: 'sono caiu 20% nas últimas 2 semanas',
      evidence: [],
      sourceProvider: 'aegis-wellness',
      generatedAt: new Date(),
      guidelineReferences: [],
      limitations: [],
      warnings: [],
      metadata: {},
    };

    it('includes provider, reasoning, confidence percentage and level', () => {
      const summary = formatter.toSummary(baseExplainability);

      expect(summary).toContain('aegis-wellness');
      expect(summary).toContain('sono caiu 20% nas últimas 2 semanas');
      expect(summary).toContain('82%');
      expect(summary).toContain('HIGH');
    });

    it('appends warnings when present', () => {
      const summary = formatter.toSummary({ ...baseExplainability, warnings: ['dado parcial'] });
      expect(summary).toContain('avisos: dado parcial');
    });

    it('omits the warnings segment when there are none', () => {
      const summary = formatter.toSummary(baseExplainability);
      expect(summary).not.toContain('avisos:');
    });
  });

  describe('toAuditLine', () => {
    it('renders traceId, patientId and each step in order', () => {
      const trace: DecisionTrace = {
        traceId: 'trace-1',
        patientId: 'patient-1',
        steps: [
          { stage: 'CLINICAL_CONTEXT', startedAt: new Date(), finishedAt: new Date(), durationMs: 10, status: 'SUCCESS' },
          { stage: 'PROVIDER', startedAt: new Date(), finishedAt: new Date(), durationMs: 25, status: 'PARTIAL' },
        ],
      };

      const line = formatter.toAuditLine(trace);

      expect(line).toBe(
        'trace=trace-1 patient=patient-1 CLINICAL_CONTEXT=SUCCESS(10ms) → PROVIDER=PARTIAL(25ms)',
      );
    });

    it('handles a trace with no steps', () => {
      const trace: DecisionTrace = { traceId: 'trace-1', patientId: 'patient-1', steps: [] };
      expect(formatter.toAuditLine(trace)).toBe('trace=trace-1 patient=patient-1 ');
    });
  });
});
