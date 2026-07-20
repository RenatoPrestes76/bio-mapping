import type { MetabolicPhenotype, RecommendationSeverity } from '../entities/drug-gene-interaction.entity.js';
import type { MedicationOptimizationScore } from '../entities/pharmacogenomic-profile.entity.js';
import type { MedicationRecommendation } from '../entities/medication-recommendation.entity.js';
import { getRulesForDrug, isSupportedDrug, SUPPORTED_DRUGS } from '../guidelines/pgx-knowledge-base.js';

type OptimizationTier = MedicationOptimizationScore['tier'];

function severityToScore(severity: RecommendationSeverity): number {
  switch (severity) {
    case 'NO_ACTION_NEEDED': return 100;
    case 'MONITOR': return 80;
    case 'USE_WITH_CAUTION': return 60;
    case 'DOSE_REDUCTION': return 50;
    case 'DOSE_INCREASE': return 40;
    case 'AVOID': return 15;
    case 'CONTRAINDICATED': return 0;
  }
}

function scoreToTier(score: number): OptimizationTier {
  if (score >= 90) return 'OPTIMAL';
  if (score >= 65) return 'ACCEPTABLE';
  if (score >= 40) return 'USE_WITH_CAUTION';
  if (score >= 10) return 'AVOID';
  return 'CONTRAINDICATED';
}

function buildReasoning(drug: string, phenotype: MetabolicPhenotype | undefined, score: number): string {
  if (!phenotype || phenotype === 'UNKNOWN') {
    return `${drug}: No pharmacogenomic data available for assessment.`;
  }
  const tier = scoreToTier(score);
  const label = phenotype.replace(/_/g, ' ').toLowerCase();
  switch (tier) {
    case 'OPTIMAL':
      return `${drug}: Optimal choice given ${label} metabolizer status. No pharmacogenomic concerns identified.`;
    case 'ACCEPTABLE':
      return `${drug}: Acceptable with standard monitoring. ${label} metabolizer status does not significantly impact efficacy or safety.`;
    case 'USE_WITH_CAUTION':
      return `${drug}: Use with caution. ${label} status may affect drug levels. Enhanced monitoring recommended.`;
    case 'AVOID':
      return `${drug}: Avoid if possible. ${label} status significantly compromises safety or efficacy. Consider documented alternatives.`;
    case 'CONTRAINDICATED':
      return `${drug}: Contraindicated based on ${label} metabolizer status. Use of this drug poses unacceptable pharmacogenomic risk.`;
  }
}

export class MedicationOptimizationEngine {
  score(
    medications: string[],
    phenotypes: Map<string, MetabolicPhenotype>,
    recommendations: MedicationRecommendation[],
  ): MedicationOptimizationScore[] {
    const recMap = new Map<string, MedicationRecommendation>();
    for (const rec of recommendations) {
      recMap.set(rec.drug.toLowerCase(), rec);
    }

    const scores: MedicationOptimizationScore[] = [];

    for (const med of medications) {
      const drug = med.toLowerCase();
      const rec = recMap.get(drug);

      if (rec) {
        const numericScore = severityToScore(rec.severity);

        // Penalise if evidence is weak
        const evidence = rec.evidence;
        const adjustedScore = evidence.level === 'C' || evidence.level === 'D'
          ? Math.max(numericScore - 10, 0)
          : numericScore;

        const tier = scoreToTier(adjustedScore);
        const gene = rec.gene;
        const phenotype = phenotypes.get(gene);

        scores.push({
          drug,
          score: adjustedScore,
          tier,
          reasoning: buildReasoning(drug, phenotype, adjustedScore),
        });
      } else if (isSupportedDrug(drug)) {
        // Drug is supported but no matching phenotype available
        scores.push({
          drug,
          score: 70,
          tier: 'ACCEPTABLE',
          reasoning: `${drug}: Drug is in the PGx panel but no relevant genotype was tested. Assume standard dosing applies.`,
        });
      } else {
        // Drug not in panel
        scores.push({
          drug,
          score: 75,
          tier: 'ACCEPTABLE',
          reasoning: `${drug}: No pharmacogenomic guideline available. Use standard clinical judgement.`,
        });
      }
    }

    return scores.sort((a, b) => a.score - b.score);
  }

  rankAlternatives(
    drug: string,
    phenotypes: Map<string, MetabolicPhenotype>,
  ): Array<{ drug: string; score: number; tier: OptimizationTier; reason: string }> {
    const rules = getRulesForDrug(drug);
    const results: Array<{ drug: string; score: number; tier: OptimizationTier; reason: string }> = [];

    const alternativeSet = new Set<string>();
    for (const rule of rules) {
      const phenotype = phenotypes.get(rule.gene);
      if (phenotype === rule.phenotype) {
        rule.alternativeMedications.forEach((alt) => alternativeSet.add(alt.toLowerCase()));
      }
    }

    for (const alt of alternativeSet) {
      const altRules = getRulesForDrug(alt);
      let worstScore = 100;

      for (const altRule of altRules) {
        const phenotype = phenotypes.get(altRule.gene);
        if (phenotype && phenotype === altRule.phenotype) {
          worstScore = Math.min(worstScore, severityToScore(altRule.severity));
        }
      }

      const tier = scoreToTier(worstScore);
      results.push({
        drug: alt,
        score: worstScore,
        tier,
        reason: buildReasoning(alt, undefined, worstScore),
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  getSupportedDrugs(): string[] {
    return [...SUPPORTED_DRUGS];
  }
}
