import type { Gene } from '../entities/gene.entity.js';
import type { GeneticVariant } from '../entities/genetic-variant.entity.js';
import type { VariantAnnotation } from '../entities/variant-annotation.entity.js';
import { getKnownGene } from '../genes/gene-knowledge.js';

export interface GeneImpactSummary {
  geneSymbol: string;
  totalVariants: number;
  pathogenicCount: number;
  likelyPathogenicCount: number;
  highImpactCount: number;
  moderateImpactCount: number;
  dominantRisk: boolean;
  recessiveRisk: boolean;
  overallRiskScore: number;
  topConditions: string[];
  recommendations: string[];
  analysedAt: Date;
}

export class GeneImpactEngine {
  analyzeGene(
    gene: Gene | string,
    variants: GeneticVariant[],
    annotations: VariantAnnotation[],
  ): GeneImpactSummary {
    const symbol = typeof gene === 'string' ? gene : gene.symbol;
    const knownGene = getKnownGene(symbol);

    const annotationMap = new Map(annotations.map((a) => [a.variantId, a]));

    const pathogenicCount = variants.filter((v) => v.isPathogenic()).length;
    const likelyPathogenicCount = variants.filter((v) => v.isLikelyPathogenic()).length;
    const highImpactCount = annotations.filter((a) => a.isHighImpact()).length;
    const moderateImpactCount = annotations.filter((a) => a.impact === 'MODERATE').length;

    const dominantRisk = knownGene?.conditions.some(
      (c) => c.inheritance === 'AUTOSOMAL_DOMINANT' || c.inheritance === 'X_LINKED_DOMINANT',
    ) ?? false;

    const recessiveRisk = knownGene?.conditions.some(
      (c) => c.inheritance === 'AUTOSOMAL_RECESSIVE' || c.inheritance === 'X_LINKED_RECESSIVE',
    ) ?? false;

    const overallRiskScore = this.computeRiskScore(variants, annotations, dominantRisk);
    const topConditions = knownGene?.conditions.map((c) => c.name).slice(0, 3) ?? [];
    const recommendations = this.buildRecommendations(overallRiskScore, topConditions, dominantRisk, recessiveRisk);

    return {
      geneSymbol: symbol,
      totalVariants: variants.length,
      pathogenicCount,
      likelyPathogenicCount,
      highImpactCount,
      moderateImpactCount,
      dominantRisk,
      recessiveRisk,
      overallRiskScore,
      topConditions,
      recommendations,
      analysedAt: new Date(),
    };
  }

  private computeRiskScore(
    variants: GeneticVariant[],
    annotations: VariantAnnotation[],
    dominantPattern: boolean,
  ): number {
    let score = 0;

    for (const v of variants) {
      if (v.isPathogenic()) score += dominantPattern ? 40 : 20;
      else if (v.isLikelyPathogenic()) score += dominantPattern ? 25 : 12;
    }

    for (const a of annotations) {
      if (a.isHighImpact()) score += 15;
      else if (a.impact === 'MODERATE') score += 5;
      if (a.isLikelyDeleterious()) score += 5;
    }

    return Math.min(100, score);
  }

  private buildRecommendations(
    riskScore: number,
    conditions: string[],
    dominant: boolean,
    recessive: boolean,
  ): string[] {
    const recs: string[] = [];

    if (riskScore >= 60) {
      recs.push('Genetic counseling recommended');
      recs.push('Consider clinical confirmation with next-generation sequencing');
    }
    if (riskScore >= 40 && conditions.length > 0) {
      recs.push(`Monitor for ${conditions[0]}`);
    }
    if (dominant && riskScore >= 30) {
      recs.push('First-degree family members may benefit from genetic testing');
    }
    if (recessive && riskScore >= 20) {
      recs.push('Consider cascade testing in siblings if both parents are carriers');
    }
    if (riskScore < 20) {
      recs.push('Current variant burden does not indicate elevated genetic risk');
    }

    return recs;
  }

  hasDominantEffect(variants: GeneticVariant[], geneSymbol: string): boolean {
    const knownGene = getKnownGene(geneSymbol);
    if (!knownGene) return false;
    const isDominant = knownGene.conditions.some(
      (c) => c.inheritance === 'AUTOSOMAL_DOMINANT' || c.inheritance === 'X_LINKED_DOMINANT',
    );
    return isDominant && variants.some((v) => v.isLikelyClinicallySignificant());
  }

  hasRecessiveEffect(variants: GeneticVariant[], geneSymbol: string): boolean {
    const knownGene = getKnownGene(geneSymbol);
    if (!knownGene) return false;
    const isRecessive = knownGene.conditions.some(
      (c) => c.inheritance === 'AUTOSOMAL_RECESSIVE' || c.inheritance === 'X_LINKED_RECESSIVE',
    );
    const pathogenicVariants = variants.filter((v) => v.isLikelyClinicallySignificant());
    const hasHomozygous = pathogenicVariants.some((v) => v.zygosity === 'HOMOZYGOUS');
    const hasBiallelic = pathogenicVariants.length >= 2;
    return isRecessive && (hasHomozygous || hasBiallelic);
  }
}
