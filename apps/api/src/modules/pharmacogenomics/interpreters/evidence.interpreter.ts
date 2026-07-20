import type { PGxEvidenceLevel } from '../entities/drug-gene-interaction.entity.js';
import type { ExplainableDecision } from '../entities/medication-recommendation.entity.js';
import type { EvidenceSummary } from '../entities/medication-recommendation.entity.js';
import type { DrugGeneRule } from '../guidelines/pgx-knowledge-base.js';

export type GradeStrength = 'STRONG' | 'MODERATE' | 'WEAK' | 'INSUFFICIENT';

function evidenceLevelToGrade(level: PGxEvidenceLevel): GradeStrength {
  switch (level) {
    case 'A': return 'STRONG';
    case 'B': return 'MODERATE';
    case 'C': return 'WEAK';
    case 'D': return 'INSUFFICIENT';
  }
}

function buildDecisionPath(rule: DrugGeneRule): string[] {
  const path: string[] = [];
  path.push(`Gene analysed: ${rule.gene}`);
  path.push(`Metabolic phenotype determined: ${rule.phenotype}`);
  path.push(`Drug-gene interaction rule matched: ${rule.drug.toUpperCase()} × ${rule.gene}`);
  path.push(`Guideline source: ${rule.guidelineSource} (Evidence ${rule.evidenceLevel})`);
  path.push(`Recommendation severity: ${rule.severity}`);
  if (rule.doseAdjustmentFactor !== undefined) {
    const pct = Math.round((1 - rule.doseAdjustmentFactor) * 100);
    if (rule.doseAdjustmentFactor < 1) {
      path.push(`Dose adjustment: reduce by ~${pct}% (factor ${rule.doseAdjustmentFactor})`);
    } else {
      const incPct = Math.round((rule.doseAdjustmentFactor - 1) * 100);
      path.push(`Dose adjustment: increase by ~${incPct}% (factor ${rule.doseAdjustmentFactor})`);
    }
  }
  return path;
}

export class EvidenceInterpreter {
  buildEvidence(rule: DrugGeneRule): EvidenceSummary {
    return {
      level: rule.evidenceLevel,
      source: rule.guidelineSource,
      gradeStrength: evidenceLevelToGrade(rule.evidenceLevel),
      confidence: this.levelToConfidence(rule.evidenceLevel),
      lastUpdated: this.getLastReviewDate(rule.guidelineSource),
    };
  }

  buildExplanation(rule: DrugGeneRule, phenotypeDescription: string, genotypeDescription: string): ExplainableDecision {
    return {
      genotypeDescription,
      phenotypeDescription,
      guidelineUsed: rule.guidelineSource,
      clinicalRationale: rule.clinicalRationale,
      decisionPath: buildDecisionPath(rule),
      gradeStrength: evidenceLevelToGrade(rule.evidenceLevel),
    };
  }

  private levelToConfidence(level: PGxEvidenceLevel): number {
    switch (level) {
      case 'A': return 0.95;
      case 'B': return 0.75;
      case 'C': return 0.50;
      case 'D': return 0.25;
    }
  }

  private getLastReviewDate(source: string): string {
    const yearMatch = source.match(/\d{4}/);
    return yearMatch ? `${yearMatch[0]}-01-01` : '2022-01-01';
  }
}
