import { Injectable, NotFoundException } from '@nestjs/common';
import { Gene } from '../entities/gene.entity.js';
import { GeneticVariant } from '../entities/genetic-variant.entity.js';
import { VariantAnnotation } from '../entities/variant-annotation.entity.js';
import { AnnotationEngine } from '../engines/annotation.engine.js';
import { VariantClassificationEngine, type ClassificationResult } from '../engines/variant-classification.engine.js';
import { GeneImpactEngine, type GeneImpactSummary } from '../engines/gene-impact.engine.js';
import { PhenotypeAssociationEngine, type PhenotypeAssociationResult } from '../engines/phenotype-association.engine.js';
import { ClinicalGenomicsEngine, type ClinicalGenomicsSummary } from '../engines/clinical-genomics.engine.js';
import { getKnownGene, KNOWN_GENES } from '../genes/gene-knowledge.js';
import type { AnalyzeVariantDto, AnnotateVariantDto, ClassifyVariantDto } from '../dto/genomics.dto.js';

@Injectable()
export class GenomicInterpretationProvider {
  private readonly geneStore = new Map<string, Gene>();
  private readonly variantStore = new Map<string, GeneticVariant>();
  private readonly annotationStore = new Map<string, VariantAnnotation>();
  private readonly classificationStore = new Map<string, ClassificationResult>();
  private readonly variantsByPatient = new Map<string, string[]>();

  private readonly annotationEngine = new AnnotationEngine();
  private readonly classificationEngine = new VariantClassificationEngine();
  private readonly geneImpactEngine = new GeneImpactEngine();
  private readonly phenotypeEngine = new PhenotypeAssociationEngine();
  private readonly clinicalEngine = new ClinicalGenomicsEngine();

  constructor() {
    this.seedKnownGenes();
  }

  private seedKnownGenes(): void {
    for (const info of Object.values(KNOWN_GENES)) {
      const gene = new Gene({
        symbol: info.symbol,
        name: info.name,
        chromosome: info.chromosome,
        location: info.location,
        transcripts: info.transcripts,
        aliases: info.aliases,
        function: info.function,
      });
      this.geneStore.set(info.symbol, gene);
    }
  }

  createVariant(dto: AnalyzeVariantDto, patientId?: string): GeneticVariant {
    const variant = new GeneticVariant({
      geneId: this.geneStore.get(dto.geneSymbol.toUpperCase())?.id ?? `gene-${dto.geneSymbol}`,
      geneSymbol: dto.geneSymbol,
      reference: dto.reference,
      alternate: dto.alternate,
      hgvs: dto.hgvs ?? {},
      rsid: dto.rsid,
      zygosity: dto.zygosity ?? 'UNKNOWN',
      populationFrequency: dto.populationFrequency ?? {},
      qualityScore: dto.qualityScore ?? 80,
      metadata: dto.metadata ?? {},
    });

    this.variantStore.set(variant.id, variant);

    if (patientId) {
      const ids = this.variantsByPatient.get(patientId) ?? [];
      ids.push(variant.id);
      this.variantsByPatient.set(patientId, ids);
    }

    return variant;
  }

  annotateVariant(dto: AnnotateVariantDto): VariantAnnotation {
    const variant = this.variantStore.get(dto.variantId);
    if (!variant) throw new NotFoundException(`Variant ${dto.variantId} not found`);

    const annotation = this.annotationEngine.annotate({ variant, geneSymbol: dto.geneSymbol ?? variant.geneSymbol });
    this.annotationStore.set(variant.id, annotation);
    return annotation;
  }

  classifyVariant(dto: ClassifyVariantDto): ClassificationResult {
    const variant = this.variantStore.get(dto.variantId);
    if (!variant) throw new NotFoundException(`Variant ${dto.variantId} not found`);

    let annotation = this.annotationStore.get(dto.variantId);
    if (!annotation) {
      annotation = this.annotationEngine.annotate({ variant });
      this.annotationStore.set(dto.variantId, annotation);
    }

    const result = this.classificationEngine.classify(variant, annotation);
    this.classificationStore.set(dto.variantId, result);
    return result;
  }

  analyzeGene(symbol: string): GeneImpactSummary {
    const gene = this.geneStore.get(symbol.toUpperCase());
    if (!gene) throw new NotFoundException(`Gene ${symbol} not found`);

    const variants = [...this.variantStore.values()].filter(
      (v) => v.geneSymbol === symbol.toUpperCase(),
    );
    const annotations = variants
      .map((v) => this.annotationStore.get(v.id))
      .filter((a): a is VariantAnnotation => a !== undefined);

    return this.geneImpactEngine.analyzeGene(gene, variants, annotations);
  }

  associatePhenotypes(geneSymbol: string): PhenotypeAssociationResult {
    const symbol = geneSymbol.toUpperCase();
    const variants = [...this.variantStore.values()].filter((v) => v.geneSymbol === symbol);
    const annotations = variants
      .map((v) => this.annotationStore.get(v.id))
      .filter((a): a is VariantAnnotation => a !== undefined);

    return this.phenotypeEngine.associate(symbol, variants, annotations);
  }

  generateClinicalSummary(patientId: string): ClinicalGenomicsSummary {
    const variantIds = this.variantsByPatient.get(patientId) ?? [];
    const variants = variantIds
      .map((id) => this.variantStore.get(id))
      .filter((v): v is GeneticVariant => v !== undefined);

    const groups = variants.map((variant) => {
      let annotation = this.annotationStore.get(variant.id);
      if (!annotation) {
        annotation = this.annotationEngine.annotate({ variant });
        this.annotationStore.set(variant.id, annotation);
      }

      let classification = this.classificationStore.get(variant.id);
      if (!classification) {
        classification = this.classificationEngine.classify(variant, annotation);
        this.classificationStore.set(variant.id, classification);
      }

      const phenotypeResult = this.phenotypeEngine.associate(variant.geneSymbol, [variant], [annotation]);
      const geneImpact = this.geneImpactEngine.analyzeGene(variant.geneSymbol, [variant], [annotation]);

      return { variant, annotation, classification, phenotypeResult, geneImpact };
    });

    return this.clinicalEngine.generateSummary(patientId, groups);
  }

  getVariant(id: string): GeneticVariant | undefined {
    return this.variantStore.get(id);
  }

  getGene(symbol: string): Gene | undefined {
    return this.geneStore.get(symbol.toUpperCase());
  }

  getAnnotation(variantId: string): VariantAnnotation | undefined {
    return this.annotationStore.get(variantId);
  }

  getClassification(variantId: string): ClassificationResult | undefined {
    return this.classificationStore.get(variantId);
  }

  variantCount(): number {
    return this.variantStore.size;
  }

  geneCount(): number {
    return this.geneStore.size;
  }

  getVariantsByPatient(patientId: string): GeneticVariant[] {
    const ids = this.variantsByPatient.get(patientId) ?? [];
    return ids.map((id) => this.variantStore.get(id)).filter((v): v is GeneticVariant => v !== undefined);
  }
}
