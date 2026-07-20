import type { ClinicalSignificance, HGVSNotation, PopulationFrequency, Zygosity } from '../entities/genetic-variant.entity.js';

export class AnalyzeVariantDto {
  geneSymbol: string = '';
  reference: string = '';
  alternate: string = '';
  hgvs?: HGVSNotation;
  rsid?: string;
  zygosity?: Zygosity;
  populationFrequency?: PopulationFrequency;
  qualityScore?: number;
  metadata?: Record<string, unknown>;
}

export class AnnotateVariantDto {
  variantId: string = '';
  geneSymbol?: string;
  hgvs?: HGVSNotation;
  reference?: string;
  alternate?: string;
}

export class ClassifyVariantDto {
  variantId: string = '';
  additionalCriteria?: string[];
}
