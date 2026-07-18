import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  CapabilitySection,
  ClinicalContext,
  Confidence,
  ConfidenceLevel,
  DecisionStage,
  DecisionTrace,
  DecisionTraceStep,
  ExecutionStatus,
  Provenance,
} from '../contracts';
import { ConfidenceHints } from './explainability.types';

function levelFromScore(score: number): ConfidenceLevel {
  if (score < 0.4) return 'LOW';
  if (score < 0.7) return 'MODERATE';
  if (score < 0.9) return 'HIGH';
  return 'VERY_HIGH';
}

/**
 * Acumulador mutável interno; `.build()` devolve um DecisionTrace congelado
 * — depois de construído, o objeto de domínio nunca é mutado (Sprint 14.2,
 * T3/T6). Input→Processing→Provider→Output→Explainability é exatamente a
 * sequência de `recordStep` chamadas durante uma execução de pipeline.
 */
export class DecisionTraceBuilder {
  private readonly traceId = randomUUID();
  private readonly steps: DecisionTraceStep[] = [];

  constructor(private readonly patientId: string) {}

  getTraceId(): string {
    return this.traceId;
  }

  recordStep(
    stage: DecisionStage,
    startedAt: Date,
    finishedAt: Date,
    status: ExecutionStatus,
    detail?: string,
  ): void {
    this.steps.push(
      Object.freeze({
        stage,
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        status,
        detail,
      }),
    );
  }

  build(): DecisionTrace {
    return Object.freeze({
      traceId: this.traceId,
      patientId: this.patientId,
      steps: Object.freeze([...this.steps]),
    });
  }
}

/**
 * Lógica computacional do domínio explainability (Sprint 14.2, T4/T5/T6).
 * Puramente estrutural: banding de score em faixas fixas e contagem de
 * capabilities do ClinicalContext — nenhuma interpretação clínica dos
 * valores em si.
 */
@Injectable()
export class ExplainabilityEngine {
  computeConfidence(
    score: number | null,
    context: ClinicalContext,
    hints: ConfidenceHints = {},
  ): Confidence {
    const normalizedScore = score ?? 0;
    const completeness = this.computeCompleteness(context);

    return {
      score: normalizedScore,
      level: levelFromScore(normalizedScore),
      factors: hints.factors ?? [`completeness: ${Math.round(completeness * 100)}%`],
      missingInformation: hints.missingInformation ?? this.deriveMissingInformation(context),
      dataQuality: null,
      completeness,
    };
  }

  buildProvenance(params: {
    providerName: string;
    providerVersion: string;
    correlationId: string;
    executionId: string;
    executionTimeMs: number;
    executionStatus: ExecutionStatus;
  }): Provenance {
    return { ...params };
  }

  startTrace(patientId: string): DecisionTraceBuilder {
    return new DecisionTraceBuilder(patientId);
  }

  private computeCompleteness(context: ClinicalContext): number {
    const sections: Array<CapabilitySection<unknown>> = [
      context.vitals,
      context.laboratory,
      context.lifestyle,
      context.nutrition,
      context.medication,
      context.conditions,
      context.assessments,
      context.wearables,
      context.familyHistory,
      context.genomics,
      context.imaging,
      context.fhirResources,
    ];
    const withData = sections.filter((s) => s.available && s.items.length > 0).length;
    return sections.length > 0 ? withData / sections.length : 0;
  }

  private deriveMissingInformation(context: ClinicalContext): string[] {
    const missing: string[] = [];
    if (!context.laboratory.available || context.laboratory.items.length === 0) {
      missing.push('Missing Labs');
    }
    if (!context.wearables.available || context.wearables.items.length === 0) {
      missing.push('Missing Wearable Data');
    }
    if (!context.medication.available || context.medication.items.length === 0) {
      missing.push('Missing Medication History');
    }
    return missing;
  }
}
