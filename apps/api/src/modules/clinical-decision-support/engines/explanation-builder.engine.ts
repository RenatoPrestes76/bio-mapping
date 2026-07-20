import type { DecisionExplanation, ClinicalRecommendationItem, EvidenceContribution, ConflictRecord } from '../entities/clinical-decision.entity.js';

export interface ExplanationInput {
  recommendations: ClinicalRecommendationItem[];
  evidence: EvidenceContribution[];
  conflicts: ConflictRecord[];
  modulesQueried: string[];
  modulesWithData: string[];
  confidence: number;
  patientId: string;
}

export class ExplanationBuilderEngine {
  build(input: ExplanationInput): DecisionExplanation {
    const keyFindings = this.extractKeyFindings(input);
    const reasoningChain = this.buildReasoningChain(input);
    const limitations = this.identifyLimitations(input);
    const dataCompleteness = input.modulesWithData.length / Math.max(input.modulesQueried.length, 1);

    return {
      summary: this.buildSummary(input),
      contributingModules: [...new Set(input.recommendations.map((r) => r.sourceModule))],
      keyFindings,
      conflictsResolved: input.conflicts.length,
      reasoningChain,
      limitations,
      dataCompleteness: Math.round(dataCompleteness * 100),
      modulesQueried: input.modulesQueried,
      modulesWithData: input.modulesWithData,
    };
  }

  private buildSummary(input: ExplanationInput): string {
    const recCount = input.recommendations.length;
    const moduleCount = input.modulesWithData.length;
    const conflictText = input.conflicts.length > 0
      ? ` ${input.conflicts.length} conflict(s) were identified and resolved.`
      : '';

    return (
      `Clinical decision generated from ${moduleCount} data source(s) with ${recCount} recommendation(s). ` +
      `Overall confidence: ${input.confidence}%.${conflictText}`
    );
  }

  private extractKeyFindings(input: ExplanationInput): string[] {
    const findings: string[] = [];

    for (const rec of input.recommendations) {
      if (rec.urgency === 'IMMEDIATE') {
        findings.push(`[${rec.sourceModule.toUpperCase()}] IMMEDIATE: ${rec.action}`);
      } else if (rec.urgency === 'SHORT_TERM' && findings.length < 5) {
        findings.push(`[${rec.sourceModule.toUpperCase()}] ${rec.action}`);
      }
    }

    for (const e of input.evidence) {
      if (e.confidenceWeight >= 0.7 && findings.length < 8) {
        findings.push(`[${e.sourceModule.toUpperCase()}] ${e.summary}`);
      }
    }

    if (findings.length === 0) {
      findings.push('No high-urgency findings identified. Routine monitoring recommended.');
    }

    return findings;
  }

  private buildReasoningChain(input: ExplanationInput): string[] {
    const chain: string[] = [];
    chain.push(`Patient ${input.patientId} clinical decision analysis initiated`);

    if (input.modulesWithData.length > 0) {
      chain.push(`Data retrieved from ${input.modulesWithData.length}/${input.modulesQueried.length} queried modules: ${input.modulesWithData.join(', ')}`);
    }

    if (input.evidence.length > 0) {
      chain.push(`Evidence synthesized from ${input.evidence.length} source(s)`);
    }

    const immediate = input.recommendations.filter((r) => r.urgency === 'IMMEDIATE');
    if (immediate.length > 0) {
      chain.push(`${immediate.length} immediate action(s) identified — elevated priority`);
    }

    if (input.conflicts.length > 0) {
      chain.push(`${input.conflicts.length} conflict(s) detected and resolved via ${[...new Set(input.conflicts.map((c) => c.resolutionStrategy))].join(', ')}`);
    }

    chain.push(`Final confidence score computed: ${input.confidence}%`);
    chain.push(`${input.recommendations.length} recommendation(s) consolidated into clinical decision`);

    return chain;
  }

  private identifyLimitations(input: ExplanationInput): string[] {
    const limitations: string[] = [];
    const missingModules = input.modulesQueried.filter((m) => !input.modulesWithData.includes(m));

    if (missingModules.length > 0) {
      limitations.push(`No data available from: ${missingModules.join(', ')}`);
    }

    if (input.confidence < 50) {
      limitations.push('Low overall confidence — additional data submission recommended before clinical action');
    }

    if (input.conflicts.length > 0) {
      limitations.push(`${input.conflicts.length} conflict(s) required automated resolution — manual clinical review advised`);
    }

    if (input.recommendations.length === 0) {
      limitations.push('No actionable recommendations generated — insufficient clinical data');
    }

    if (limitations.length === 0) {
      limitations.push('None identified — decision based on adequate multi-source data');
    }

    return limitations;
  }
}
