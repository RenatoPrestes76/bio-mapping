import type { MetabolicPhenotype } from '../entities/drug-gene-interaction.entity.js';
import { MedicationRecommendation } from '../entities/medication-recommendation.entity.js';
import { getRule, getRulesForDrug, isSupportedDrug } from '../guidelines/pgx-knowledge-base.js';
import { EvidenceInterpreter } from './evidence.interpreter.js';

const evidenceInterpreter = new EvidenceInterpreter();

function buildGenotypeDescription(gene: string, haplotype1: string, haplotype2?: string): string {
  const h2 = haplotype2 ?? haplotype1;
  return `${gene} ${haplotype1}/${h2}`;
}

function buildPhenotypeDescription(gene: string, phenotype: MetabolicPhenotype): string {
  const label = phenotype.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return `${gene} ${label}`;
}

export class RecommendationInterpreter {
  interpretForDrug(
    drug: string,
    phenotypes: Map<string, MetabolicPhenotype>,
    genotypes: Array<{ gene: string; haplotype1: string; haplotype2?: string }>,
    includeAlternatives = true,
  ): MedicationRecommendation | null {
    if (!isSupportedDrug(drug)) return null;

    const rules = getRulesForDrug(drug);

    let matched: ReturnType<typeof getRule> | undefined;
    let matchedGene = '';

    for (const rule of rules) {
      const phenotype = phenotypes.get(rule.gene);
      if (phenotype && phenotype !== 'UNKNOWN' && rule.phenotype === phenotype) {
        matched = rule;
        matchedGene = rule.gene;
        break;
      }
    }

    if (!matched) return null;

    const genotypeForGene = genotypes.find((g) => g.gene.toUpperCase() === matchedGene);
    const genotypeDesc = genotypeForGene
      ? buildGenotypeDescription(matchedGene, genotypeForGene.haplotype1, genotypeForGene.haplotype2)
      : matchedGene;
    const phenotypeDesc = buildPhenotypeDescription(matchedGene, matched.phenotype);

    const evidence = evidenceInterpreter.buildEvidence(matched);
    const explanation = evidenceInterpreter.buildExplanation(matched, phenotypeDesc, genotypeDesc);

    return new MedicationRecommendation({
      drug: matched.drug,
      gene: matched.gene,
      phenotype: matched.phenotype,
      severity: matched.severity,
      recommendation: matched.recommendation,
      alternativeMedications: includeAlternatives ? matched.alternativeMedications : [],
      explanation,
      evidence,
    });
  }

  interpretAll(
    medications: string[],
    phenotypes: Map<string, MetabolicPhenotype>,
    genotypes: Array<{ gene: string; haplotype1: string; haplotype2?: string }>,
    includeAlternatives = true,
  ): MedicationRecommendation[] {
    const results: MedicationRecommendation[] = [];
    for (const drug of medications) {
      const rec = this.interpretForDrug(drug, phenotypes, genotypes, includeAlternatives);
      if (rec) results.push(rec);
    }
    return results;
  }

  getNoRuleRecommendation(drug: string): MedicationRecommendation | null {
    if (!isSupportedDrug(drug)) return null;

    return new MedicationRecommendation({
      drug: drug.toLowerCase(),
      gene: 'UNKNOWN',
      phenotype: 'UNKNOWN',
      severity: 'NO_ACTION_NEEDED',
      recommendation: `No pharmacogenomic interaction identified for ${drug} with the tested gene panel. Use at standard dose.`,
      alternativeMedications: [],
      explanation: {
        genotypeDescription: 'No relevant genotype tested',
        phenotypeDescription: 'Phenotype unknown',
        guidelineUsed: 'N/A',
        clinicalRationale: 'No CPIC/DPWG guidelines apply for this drug with the tested genes.',
        decisionPath: ['No pharmacogenomic gene-drug interaction found in knowledge base'],
        gradeStrength: 'INSUFFICIENT',
      },
      evidence: {
        level: 'D',
        source: 'N/A',
        gradeStrength: 'INSUFFICIENT',
        confidence: 0,
        lastUpdated: '2022-01-01',
      },
    });
  }
}
