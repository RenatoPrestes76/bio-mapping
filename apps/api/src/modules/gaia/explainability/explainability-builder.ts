import { randomUUID } from 'node:crypto';
import { ClinicalContext, DataPointRef, Explainability } from '../contracts';
import { ExplainabilityEngine } from './explainability-engine';
import { ConfidenceHints } from './explainability.types';

/**
 * Única fábrica autorizada para objetos Explainability (Sprint 14.2, T7).
 * Nenhum provider deve montar `{ ... }` manualmente — sempre passar por
 * aqui. Uma instância nova por decisão (não é singleton/injetável).
 */
export class ExplainabilityBuilder {
  private reasoningText = '';
  private evidencePoints: DataPointRef[] = [];
  private confidenceScore: number | null = null;
  private confidenceHints: ConfidenceHints = {};
  private warningList: string[] = [];
  private limitationList: string[] = [];
  private guidelineReferenceList: string[] = [];
  private metadataMap: Record<string, unknown> = {};

  constructor(
    private readonly engine: ExplainabilityEngine,
    private readonly sourceProvider: string,
    private readonly context: ClinicalContext,
  ) {}

  withReasoning(reasoning: string): this {
    this.reasoningText = reasoning;
    return this;
  }

  withEvidence(evidence: DataPointRef[]): this {
    this.evidencePoints = evidence;
    return this;
  }

  withConfidenceScore(score: number | null, hints: ConfidenceHints = {}): this {
    this.confidenceScore = score;
    this.confidenceHints = hints;
    return this;
  }

  withWarning(warning: string): this {
    this.warningList.push(warning);
    return this;
  }

  withLimitation(limitation: string): this {
    this.limitationList.push(limitation);
    return this;
  }

  withGuidelineReference(reference: string): this {
    this.guidelineReferenceList.push(reference);
    return this;
  }

  withMetadata(key: string, value: unknown): this {
    this.metadataMap[key] = value;
    return this;
  }

  build(): Explainability {
    return {
      decisionId: randomUUID(),
      confidence: this.engine.computeConfidence(this.confidenceScore, this.context, this.confidenceHints),
      reasoning: this.reasoningText,
      evidence: this.evidencePoints,
      sourceProvider: this.sourceProvider,
      generatedAt: new Date(),
      guidelineReferences: this.guidelineReferenceList,
      limitations: this.limitationList,
      warnings: this.warningList,
      metadata: this.metadataMap,
    };
  }
}
