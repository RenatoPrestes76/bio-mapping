import { Injectable, NotFoundException } from '@nestjs/common';
import { GenomicInterpretationProvider } from './providers/genomic-interpretation.provider.js';
import type { GeneticVariant } from './entities/genetic-variant.entity.js';
import type { Gene } from './entities/gene.entity.js';
import type { VariantAnnotation } from './entities/variant-annotation.entity.js';
import type { ClassificationResult } from './engines/variant-classification.engine.js';
import type { ClinicalGenomicsSummary } from './engines/clinical-genomics.engine.js';
import type { AnalyzeVariantDto, AnnotateVariantDto, ClassifyVariantDto } from './dto/genomics.dto.js';
import { getConditionsForGene } from './genes/gene-knowledge.js';
import { getConditionsForGene as getPhenotypeConditions } from './phenotypes/phenotype-associations.js';

export interface AnalyzeVariantResult {
  variant: GeneticVariant;
  annotation: VariantAnnotation;
  classification: ClassificationResult;
}

export interface AssociatedCondition {
  name: string;
  source: string;
}

export interface GenomicReport {
  patientId: string;
  summary: ClinicalGenomicsSummary;
  variantCount: number;
  clinicallySignificantCount: number;
  generatedAt: Date;
}

@Injectable()
export class GenomicInterpretationService {
  constructor(private readonly provider: GenomicInterpretationProvider) {}

  analyzeVariant(dto: AnalyzeVariantDto, patientId?: string): AnalyzeVariantResult {
    const variant = this.provider.createVariant(dto, patientId);

    const annotation = this.provider.annotateVariant({ variantId: variant.id, geneSymbol: dto.geneSymbol });
    const classification = this.provider.classifyVariant({ variantId: variant.id });

    return { variant, annotation, classification };
  }

  annotate(dto: AnnotateVariantDto): VariantAnnotation {
    return this.provider.annotateVariant(dto);
  }

  classify(dto: ClassifyVariantDto): ClassificationResult {
    return this.provider.classifyVariant(dto);
  }

  findGene(symbol: string): Gene {
    const gene = this.provider.getGene(symbol);
    if (!gene) throw new NotFoundException(`Gene ${symbol} not found in knowledge base`);
    return gene;
  }

  findAssociatedConditions(geneSymbol: string): AssociatedCondition[] {
    const geneConditions = getConditionsForGene(geneSymbol).map((c) => ({
      name: c.name,
      source: 'OMIM',
    }));

    const phenoConditions = getPhenotypeConditions(geneSymbol).map((name) => ({
      name,
      source: 'HPO',
    }));

    const seen = new Set<string>();
    const merged: AssociatedCondition[] = [];
    for (const c of [...geneConditions, ...phenoConditions]) {
      if (!seen.has(c.name)) {
        seen.add(c.name);
        merged.push(c);
      }
    }
    return merged;
  }

  generateReport(patientId: string): GenomicReport {
    const summary = this.provider.generateClinicalSummary(patientId);
    return {
      patientId,
      summary,
      variantCount: summary.totalVariantsAnalyzed,
      clinicallySignificantCount: summary.clinicallySignificantCount,
      generatedAt: new Date(),
    };
  }

  getVariant(id: string): GeneticVariant {
    const variant = this.provider.getVariant(id);
    if (!variant) throw new NotFoundException(`Variant ${id} not found`);
    return variant;
  }

  getVariantsByPatient(patientId: string): GeneticVariant[] {
    return this.provider.getVariantsByPatient(patientId);
  }
}
