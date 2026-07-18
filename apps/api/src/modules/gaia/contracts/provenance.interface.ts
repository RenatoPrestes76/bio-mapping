export type ExecutionStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';

/**
 * Proveniência de uma execução de provider (Sprint 14.2, T4). `correlationId`
 * é compartilhado por todos os providers de uma mesma chamada a runPipeline
 * (== DecisionTrace.traceId); `executionId` é único por provider dentro
 * dessa chamada.
 */
export interface Provenance {
  providerName: string;
  providerVersion: string;
  executionTimeMs: number;
  executionStatus: ExecutionStatus;
  executionId: string;
  correlationId: string;
}
