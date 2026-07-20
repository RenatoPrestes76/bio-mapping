import type { GeneticVariant } from '../entities/genetic-variant.entity.js';
import type { VariantAnnotation } from '../entities/variant-annotation.entity.js';
import {
  getPhenotypeMap,
  getAllPhenotypesForGene,
  getConditionsForGene,
  hasKnownPhenotypes,
  type PhenotypeAssociation,
  type GenePhenotypeMap,
} from '../phenotypes/phenotype-associations.js';

export interface PhenotypeAssociationResult {
  geneSymbol: string;
  associatedPhenotypes: PhenotypeAssociation[];
  associatedConditions: string[];
  clinicalPriority: 'URGENT' | 'HIGH' | 'MODERATE' | 'LOW' | 'NONE';
  confidenceScore: number;
  pharmacogenomicRelevance: boolean;
  actionableFindings: string[];
  summary: string;
}

const PHARMACOGENOMIC_GENES = new Set(['CYP2C19', 'CYP2D6', 'CYP2C9', 'CYP3A4', 'CYP3A5', 'DPYD', 'TPMT', 'UGT1A1']);

export class PhenotypeAssociationEngine {
  associate(
    geneSymbol: string,
    variants: GeneticVariant[],
    annotations: VariantAnnotation[],
  ): PhenotypeAssociationResult {
    const symbol = geneSymbol.toUpperCase();
    const phenotypeMap = getPhenotypeMap(symbol);
    const phenotypes = getAllPhenotypesForGene(symbol);
    const conditions = getConditionsForGene(symbol);
    const isKnown = hasKnownPhenotypes(symbol);
    const isPGx = PHARMACOGENOMIC_GENES.has(symbol);

    const confidenceScore = this.computeConfidence(variants, annotations, isKnown, phenotypes.length);
    const clinicalPriority = this.determinePriority(variants, annotations, phenotypes, isPGx);
    const actionableFindings = this.findActionableFindings(variants, annotations, phenotypeMap, isPGx);
    const summary = this.buildSummary(symbol, phenotypes, conditions, confidenceScore, isPGx);

    return {
      geneSymbol: symbol,
      associatedPhenotypes: phenotypes,
      associatedConditions: conditions,
      clinicalPriority,
      confidenceScore,
      pharmacogenomicRelevance: isPGx,
      actionableFindings,
      summary,
    };
  }

  private computeConfidence(
    variants: GeneticVariant[],
    annotations: VariantAnnotation[],
    isKnown: boolean,
    phenotypeCount: number,
  ): number {
    let score = 0.3;
    if (isKnown) score += 0.3;
    if (phenotypeCount > 0) score += Math.min(0.2, phenotypeCount * 0.04);
    if (variants.some((v) => v.isLikelyClinicallySignificant())) score += 0.15;
    if (annotations.some((a) => a.isHighImpact())) score += 0.05;
    return Math.min(1, score);
  }

  private determinePriority(
    variants: GeneticVariant[],
    annotations: VariantAnnotation[],
    phenotypes: PhenotypeAssociation[],
    isPGx: boolean,
  ): PhenotypeAssociationResult['clinicalPriority'] {
    const hasPathogenic = variants.some((v) => v.isPathogenic());
    const hasLikelyPathogenic = variants.some((v) => v.isLikelyPathogenic());
    const hasHighImpact = annotations.some((a) => a.isHighImpact());
    const hasObligate = phenotypes.some((p) => p.frequency === 'OBLIGATE');

    if (hasPathogenic && (hasHighImpact || hasObligate)) return 'URGENT';
    if (hasPathogenic || (hasLikelyPathogenic && hasHighImpact)) return 'HIGH';
    if (hasLikelyPathogenic || (isPGx && variants.length > 0)) return 'MODERATE';
    if (variants.some((v) => v.clinicalSignificance === 'UNCERTAIN_SIGNIFICANCE')) return 'LOW';
    return 'NONE';
  }

  private findActionableFindings(
    variants: GeneticVariant[],
    annotations: VariantAnnotation[],
    phenotypeMap: GenePhenotypeMap | undefined,
    isPGx: boolean,
  ): string[] {
    const findings: string[] = [];

    if (variants.some((v) => v.isPathogenic())) {
      findings.push('Pathogenic variant detected — clinical confirmation recommended');
    }
    if (variants.some((v) => v.isLikelyPathogenic())) {
      findings.push('Likely pathogenic variant — consider clinical correlation');
    }
    if (annotations.some((a) => a.isHighImpact())) {
      findings.push('High-impact variant predicted — functional studies may be warranted');
    }
    if (isPGx) {
      findings.push('Pharmacogenomic gene — drug-gene interaction assessment recommended');
    }
    if (phenotypeMap?.conditions && phenotypeMap.conditions.length > 0) {
      findings.push(`Known disease gene — screen for ${phenotypeMap.conditions[0]}`);
    }

    return findings;
  }

  private buildSummary(
    symbol: string,
    phenotypes: PhenotypeAssociation[],
    conditions: string[],
    confidence: number,
    isPGx: boolean,
  ): string {
    if (phenotypes.length === 0) {
      return `No known phenotype associations for ${symbol}`;
    }
    const conditionStr = conditions.slice(0, 2).join(', ') || 'multiple conditions';
    const pgxNote = isPGx ? ' (pharmacogenomic relevance)' : '';
    return `${symbol} associated with ${phenotypes.length} phenotypes across ${conditionStr}${pgxNote}. Confidence: ${(confidence * 100).toFixed(0)}%`;
  }

  getObligatePhenotypes(geneSymbol: string): PhenotypeAssociation[] {
    return getAllPhenotypesForGene(geneSymbol).filter((p) => p.frequency === 'OBLIGATE');
  }

  getFrequentPhenotypes(geneSymbol: string): PhenotypeAssociation[] {
    return getAllPhenotypesForGene(geneSymbol).filter((p) =>
      p.frequency === 'OBLIGATE' || p.frequency === 'VERY_FREQUENT' || p.frequency === 'FREQUENT',
    );
  }
}
