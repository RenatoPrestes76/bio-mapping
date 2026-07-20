import type { MetabolicPhenotype } from '../entities/drug-gene-interaction.entity.js';
import type { GenotypeInput } from '../entities/pharmacogenomic-profile.entity.js';
import { lookupPhenotype, isSupportedGene } from '../guidelines/haplotype-phenotype-map.js';

export interface PhenotypeInterpretationResult {
  gene: string;
  haplotype1: string;
  haplotype2: string | undefined;
  phenotype: MetabolicPhenotype;
  activityScore: number | undefined;
  confidence: 'HIGH' | 'MODERATE' | 'LOW';
  method: 'HAPLOTYPE_LOOKUP' | 'ACTIVITY_SCORE' | 'UNKNOWN';
  reasoning: string;
}

function phenotypeFromActivityScore(score: number): MetabolicPhenotype {
  if (score === 0) return 'POOR_METABOLIZER';
  if (score <= 0.5) return 'POOR_METABOLIZER';
  if (score <= 1.0) return 'INTERMEDIATE_METABOLIZER';
  if (score <= 2.0) return 'NORMAL_METABOLIZER';
  if (score <= 2.5) return 'RAPID_METABOLIZER';
  return 'ULTRA_RAPID_METABOLIZER';
}

export class PhenotypeInterpreter {
  interpret(genotype: GenotypeInput): PhenotypeInterpretationResult {
    const gene = genotype.gene.toUpperCase();

    if (!isSupportedGene(gene)) {
      return {
        gene,
        haplotype1: genotype.haplotype1,
        haplotype2: genotype.haplotype2,
        phenotype: 'UNKNOWN',
        activityScore: genotype.activityScore,
        confidence: 'LOW',
        method: 'UNKNOWN',
        reasoning: `Gene ${gene} is not in the supported pharmacogenomics panel.`,
      };
    }

    // Activity score override when provided and no haplotype map result
    if (genotype.activityScore !== undefined) {
      const lookupResult = lookupPhenotype(gene, genotype.haplotype1, genotype.haplotype2);
      if (lookupResult !== 'UNKNOWN') {
        return {
          gene,
          haplotype1: genotype.haplotype1,
          haplotype2: genotype.haplotype2,
          phenotype: lookupResult,
          activityScore: genotype.activityScore,
          confidence: 'HIGH',
          method: 'HAPLOTYPE_LOOKUP',
          reasoning: `Phenotype determined by haplotype lookup: ${genotype.haplotype1}/${genotype.haplotype2 ?? genotype.haplotype1} → ${lookupResult}.`,
        };
      }

      const phenotype = phenotypeFromActivityScore(genotype.activityScore);
      return {
        gene,
        haplotype1: genotype.haplotype1,
        haplotype2: genotype.haplotype2,
        phenotype,
        activityScore: genotype.activityScore,
        confidence: 'MODERATE',
        method: 'ACTIVITY_SCORE',
        reasoning: `Haplotype combination not found in lookup table. Phenotype derived from activity score ${genotype.activityScore}: ${phenotype}.`,
      };
    }

    const phenotype = lookupPhenotype(gene, genotype.haplotype1, genotype.haplotype2);
    const found = phenotype !== 'UNKNOWN';

    return {
      gene,
      haplotype1: genotype.haplotype1,
      haplotype2: genotype.haplotype2,
      phenotype,
      activityScore: genotype.activityScore,
      confidence: found ? 'HIGH' : 'LOW',
      method: found ? 'HAPLOTYPE_LOOKUP' : 'UNKNOWN',
      reasoning: found
        ? `Phenotype determined by CPIC haplotype table: ${genotype.haplotype1}/${genotype.haplotype2 ?? genotype.haplotype1} → ${phenotype}.`
        : `Haplotype combination ${genotype.haplotype1}/${genotype.haplotype2 ?? genotype.haplotype1} not found in ${gene} lookup table. Manual review required.`,
    };
  }

  interpretAll(genotypes: GenotypeInput[]): PhenotypeInterpretationResult[] {
    return genotypes.map((g) => this.interpret(g));
  }

  toPhenotypeMap(results: PhenotypeInterpretationResult[]): Map<string, MetabolicPhenotype> {
    const map = new Map<string, MetabolicPhenotype>();
    for (const r of results) {
      map.set(r.gene, r.phenotype);
    }
    return map;
  }
}
