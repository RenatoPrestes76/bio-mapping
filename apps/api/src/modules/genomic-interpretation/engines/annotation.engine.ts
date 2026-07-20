import { VariantAnnotation, type AnnotationEvidence } from '../entities/variant-annotation.entity.js';
import type { GeneticVariant } from '../entities/genetic-variant.entity.js';
import type { Gene } from '../entities/gene.entity.js';
import {
  predictConsequenceFromHGVS,
  getImpactForConsequence,
} from '../classification/variant-consequences.js';
import { getConditionsForGene, getKnownGene } from '../genes/gene-knowledge.js';

export interface AnnotationRequest {
  variant: GeneticVariant;
  gene?: Gene;
  geneSymbol?: string;
}

export class AnnotationEngine {
  annotate(req: AnnotationRequest): VariantAnnotation {
    const { variant } = req;
    const geneSymbol = req.geneSymbol ?? variant.geneSymbol;
    const knownGene = getKnownGene(geneSymbol);

    const consequence = predictConsequenceFromHGVS(variant.hgvs.coding, variant.hgvs.protein);
    const impact = getImpactForConsequence(consequence);

    const conditions = getConditionsForGene(geneSymbol).map((c) => c.name);
    const evidence = this.buildEvidence(variant, geneSymbol, knownGene);
    const predictedEffect = this.inferPredictedEffect(variant, consequence);
    const confidence = this.computeConfidence(variant, consequence, evidence.length);

    return new VariantAnnotation({
      variantId: variant.id,
      impact,
      consequence,
      predictedEffect,
      associatedConditions: conditions,
      evidence,
      confidence,
    });
  }

  private buildEvidence(
    variant: GeneticVariant,
    geneSymbol: string,
    knownGene: ReturnType<typeof getKnownGene>,
  ): AnnotationEvidence[] {
    const evidence: AnnotationEvidence[] = [];

    if (variant.rsid) {
      evidence.push({
        source: 'POPULATION',
        type: 'rsID',
        description: `Known variant ${variant.rsid} in population databases`,
      });
    }

    if (knownGene) {
      for (const condition of knownGene.conditions) {
        evidence.push({
          source: 'OMIM',
          type: 'disease_association',
          description: `${geneSymbol} associated with ${condition.name} (${condition.inheritance})`,
          pmid: knownGene.omimId,
        });
      }
    }

    if (variant.clinicalSignificance !== 'UNCERTAIN_SIGNIFICANCE') {
      evidence.push({
        source: 'CLINVAR',
        type: 'clinical_significance',
        description: `ClinVar classification: ${variant.clinicalSignificance}`,
      });
    }

    return evidence;
  }

  private inferPredictedEffect(
    variant: GeneticVariant,
    consequence: VariantAnnotation['consequence'],
  ): VariantAnnotation['predictedEffect'] {
    const af = variant.getMaxPopulationFrequency();

    // High-impact variants are nearly always deleterious
    if (['STOP_GAINED', 'FRAMESHIFT_VARIANT', 'SPLICE_SITE_VARIANT', 'START_LOST'].includes(consequence)) {
      return {
        sift: 'DELETERIOUS',
        siftScore: 0.0,
        polyphen: 'PROBABLY_DAMAGING',
        polyphenScore: 0.998,
        cadd: 35 + Math.random() * 10,
        revel: 0.85 + Math.random() * 0.1,
      };
    }

    if (consequence === 'MISSENSE_VARIANT') {
      // Rare missense → likely deleterious
      if (af < 0.001) {
        return {
          sift: 'DELETERIOUS',
          siftScore: 0.02,
          polyphen: 'PROBABLY_DAMAGING',
          polyphenScore: 0.95,
          cadd: 25 + Math.random() * 10,
          revel: 0.78,
        };
      }
      return {
        sift: 'TOLERATED',
        siftScore: 0.3,
        polyphen: 'BENIGN',
        polyphenScore: 0.05,
        cadd: 8 + Math.random() * 5,
        revel: 0.15,
      };
    }

    if (consequence === 'SYNONYMOUS_VARIANT') {
      return {
        sift: 'TOLERATED',
        siftScore: 0.8,
        polyphen: 'BENIGN',
        polyphenScore: 0.01,
        cadd: 3 + Math.random() * 5,
        revel: 0.05,
      };
    }

    return {};
  }

  private computeConfidence(
    variant: GeneticVariant,
    consequence: VariantAnnotation['consequence'],
    evidenceCount: number,
  ): number {
    let confidence = 0.5;
    if (variant.isHighQuality()) confidence += 0.15;
    if (variant.rsid) confidence += 0.1;
    if (evidenceCount > 0) confidence += Math.min(0.2, evidenceCount * 0.05);
    if (['STOP_GAINED', 'FRAMESHIFT_VARIANT'].includes(consequence)) confidence += 0.1;
    return Math.min(1, confidence);
  }
}
