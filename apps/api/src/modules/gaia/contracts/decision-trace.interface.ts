import { ExecutionStatus } from './provenance.interface';

export type DecisionStage =
  | 'CLINICAL_CONTEXT'
  | 'DECISION_ENGINE'
  | 'PROVIDER'
  | 'RECOMMENDATION'
  | 'EXPLAINABILITY';

export interface DecisionTraceStep {
  readonly stage: DecisionStage;
  readonly startedAt: Date;
  readonly finishedAt: Date;
  readonly durationMs: number;
  readonly status: ExecutionStatus;
  readonly detail?: string;
}

/**
 * Objeto de domínio imutável (Sprint 14.2, T3/T6) — uma vez construído por
 * ExplainabilityEngine.buildTrace(), nunca é mutado. Cada etapa do pipeline
 * (ClinicalContext → Decision Engine → Provider → Recommendation →
 * Explainability) vira um DecisionTraceStep auditável.
 */
export interface DecisionTrace {
  readonly traceId: string;
  readonly patientId: string;
  readonly steps: readonly DecisionTraceStep[];
}
