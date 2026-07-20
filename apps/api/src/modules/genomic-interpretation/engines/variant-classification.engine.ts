import type { GeneticVariant } from '../entities/genetic-variant.entity.js';
import type { VariantAnnotation } from '../entities/variant-annotation.entity.js';
import {
  classifyByACMG,
  type ACMGCriterion,
  type ACMGClassificationResult,
} from '../classification/acmg-criteria.js';
import { isLofIntolerantGene } from '../genes/gene-knowledge.js';
import { isLossOfFunctionConsequence } from '../classification/variant-consequences.js';

export interface ClassificationResult {
  variantId: string;
  geneSymbol: string;
  acmgResult: ACMGClassificationResult;
  appliedCriteria: ACMGCriterion[];
  timestamp: Date;
  classifierVersion: string;
}

export class VariantClassificationEngine {
  private readonly VERSION = '1.0.0';

  classify(variant: GeneticVariant, annotation: VariantAnnotation): ClassificationResult {
    const criteria = this.deriveCriteria(variant, annotation);
    const acmgResult = classifyByACMG(criteria);

    return {
      variantId: variant.id,
      geneSymbol: variant.geneSymbol,
      acmgResult,
      appliedCriteria: criteria,
      timestamp: new Date(),
      classifierVersion: this.VERSION,
    };
  }

  deriveCriteria(variant: GeneticVariant, annotation: VariantAnnotation): ACMGCriterion[] {
    const criteria: ACMGCriterion[] = [];

    // PVS1: Null variant in LoF-intolerant gene
    if (isLossOfFunctionConsequence(annotation.consequence) && isLofIntolerantGene(variant.geneSymbol)) {
      criteria.push('PVS1');
    }

    // PM2: Very rare (AF < 0.001)
    if (variant.isVeryRare()) {
      criteria.push('PM2');
    }

    // BA1: Very common (AF > 0.05) — overrides everything
    if (variant.getMaxPopulationFrequency() > 0.05) {
      criteria.push('BA1');
    }

    // BS1: Allele frequency > 1% (common)
    if (variant.getMaxPopulationFrequency() > 0.01 && variant.getMaxPopulationFrequency() <= 0.05) {
      criteria.push('BS1');
    }

    // PP3: Computational evidence supports deleterious effect
    if (annotation.isLikelyDeleterious()) {
      criteria.push('PP3');
    }

    // BP4: Computational evidence suggests benign
    const deletPredictions = annotation.getDeleteriousPredictions();
    const { sift, polyphen } = annotation.predictedEffect;
    if (sift === 'TOLERATED' && polyphen === 'BENIGN') {
      criteria.push('BP4');
    }

    // PM4: Inframe insertions/deletions
    if (annotation.consequence === 'INFRAME_INSERTION' || annotation.consequence === 'INFRAME_DELETION') {
      criteria.push('PM4');
    }

    // PP2: Missense in gene with low benign missense rate (LoF-intolerant genes tend to have this)
    if (annotation.consequence === 'MISSENSE_VARIANT' && isLofIntolerantGene(variant.geneSymbol)) {
      criteria.push('PP2');
    }

    // BP1: Missense in gene where LoF is the mechanism
    if (annotation.consequence === 'MISSENSE_VARIANT' && isLofIntolerantGene(variant.geneSymbol) && !deletPredictions.length) {
      // Don't add BP1 if PP2 already included (contradictory)
    }

    // BP7: Synonymous with no splice impact prediction
    if (annotation.consequence === 'SYNONYMOUS_VARIANT') {
      criteria.push('BP7');
    }

    // PS3/BS3 from ClinVar/functional evidence
    if (annotation.hasStrongEvidence()) {
      criteria.push('PS3');
    }

    // High confidence annotation adds PP5
    if (annotation.confidence >= 0.9) {
      criteria.push('PP5');
    }

    return [...new Set(criteria)]; // deduplicate
  }

  getClassificationSummary(result: ClassificationResult): string {
    const { classification, pathogenicCriteria, benignCriteria } = result.acmgResult;
    const all = [...pathogenicCriteria, ...benignCriteria];
    return `${classification} — criteria: ${all.join(', ') || 'none'} (score: P${result.acmgResult.pathogenicScore}/B${result.acmgResult.benignScore})`;
  }
}
