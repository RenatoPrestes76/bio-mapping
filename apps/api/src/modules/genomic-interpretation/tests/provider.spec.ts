import { GenomicInterpretationProvider } from '../providers/genomic-interpretation.provider.js';
import { GeneticVariant } from '../entities/genetic-variant.entity.js';
import { Gene } from '../entities/gene.entity.js';
import { NotFoundException } from '@nestjs/common';

const makeDto = (symbol = 'BRCA1', af = 0) => ({
  geneSymbol: symbol,
  reference: 'A',
  alternate: 'T',
  hgvs: { coding: 'c.5266dupC', protein: 'p.Gln1756ProfsTer25' },
  zygosity: 'HETEROZYGOUS' as const,
  populationFrequency: { gnomadAF: af },
  qualityScore: 85,
});

describe('GenomicInterpretationProvider', () => {
  let provider: GenomicInterpretationProvider;

  beforeEach(() => {
    provider = new GenomicInterpretationProvider();
  });

  it('seeds known genes on construction', () => {
    expect(provider.geneCount()).toBeGreaterThanOrEqual(20);
    expect(provider.getGene('BRCA1')).toBeDefined();
    expect(provider.getGene('TP53')).toBeDefined();
    expect(provider.getGene('CFTR')).toBeDefined();
  });

  it('createVariant stores variant and returns it', () => {
    const dto = makeDto();
    const variant = provider.createVariant(dto);
    expect(variant).toBeInstanceOf(GeneticVariant);
    expect(variant.geneSymbol).toBe('BRCA1');
    expect(provider.getVariant(variant.id)).toBeDefined();
    expect(provider.variantCount()).toBe(1);
  });

  it('createVariant associates variant with patientId', () => {
    const dto = makeDto();
    const variant = provider.createVariant(dto, 'patient-001');
    const patientVariants = provider.getVariantsByPatient('patient-001');
    expect(patientVariants).toHaveLength(1);
    expect(patientVariants[0].id).toBe(variant.id);
  });

  it('annotateVariant creates and stores annotation', () => {
    const variant = provider.createVariant(makeDto());
    const annotation = provider.annotateVariant({ variantId: variant.id });
    expect(annotation.variantId).toBe(variant.id);
    expect(provider.getAnnotation(variant.id)).toBeDefined();
  });

  it('annotateVariant throws NotFoundException for unknown variant', () => {
    expect(() => provider.annotateVariant({ variantId: 'bad-id' })).toThrow(NotFoundException);
  });

  it('classifyVariant creates and stores classification', () => {
    const variant = provider.createVariant(makeDto('BRCA1', 0));
    const result = provider.classifyVariant({ variantId: variant.id });
    expect(result.variantId).toBe(variant.id);
    expect(result.geneSymbol).toBe('BRCA1');
    expect(result.acmgResult.classification).toBeTruthy();
    expect(provider.getClassification(variant.id)).toBeDefined();
  });

  it('classifyVariant auto-annotates if annotation missing', () => {
    const variant = provider.createVariant(makeDto());
    expect(provider.getAnnotation(variant.id)).toBeUndefined();
    const result = provider.classifyVariant({ variantId: variant.id });
    expect(result.variantId).toBe(variant.id);
    expect(provider.getAnnotation(variant.id)).toBeDefined(); // auto-created
  });

  it('classifyVariant throws NotFoundException for unknown variant', () => {
    expect(() => provider.classifyVariant({ variantId: 'bad' })).toThrow(NotFoundException);
  });

  it('analyzeGene returns impact summary for BRCA1', () => {
    const variant = provider.createVariant(makeDto('BRCA1'));
    provider.annotateVariant({ variantId: variant.id });
    const summary = provider.analyzeGene('BRCA1');
    expect(summary.geneSymbol).toBe('BRCA1');
    expect(summary.totalVariants).toBe(1);
    expect(summary.analysedAt).toBeInstanceOf(Date);
  });

  it('analyzeGene throws NotFoundException for unknown gene', () => {
    expect(() => provider.analyzeGene('UNKNOWN_GENE_XYZ')).toThrow(NotFoundException);
  });

  it('associatePhenotypes returns result for known gene', () => {
    const result = provider.associatePhenotypes('BRCA1');
    expect(result.geneSymbol).toBe('BRCA1');
    expect(result.associatedPhenotypes.length).toBeGreaterThan(0);
  });

  it('generateClinicalSummary returns empty summary for unknown patient', () => {
    const summary = provider.generateClinicalSummary('unknown-patient');
    expect(summary.totalVariantsAnalyzed).toBe(0);
    expect(summary.overallRiskLevel).toBe('LOW');
  });

  it('generateClinicalSummary analyzes all patient variants', () => {
    provider.createVariant(makeDto('BRCA1', 0), 'p-001');
    provider.createVariant(makeDto('TP53', 0), 'p-001');
    const summary = provider.generateClinicalSummary('p-001');
    expect(summary.totalVariantsAnalyzed).toBe(2);
    expect(summary.patientId).toBe('p-001');
  });

  it('getGene returns undefined for unknown gene', () => {
    expect(provider.getGene('UNKNOWN_XYZ')).toBeUndefined();
  });

  it('getVariant returns undefined for unknown id', () => {
    expect(provider.getVariant('bad-id')).toBeUndefined();
  });

  it('variantCount increments correctly', () => {
    expect(provider.variantCount()).toBe(0);
    provider.createVariant(makeDto('BRCA1'));
    expect(provider.variantCount()).toBe(1);
    provider.createVariant(makeDto('TP53'));
    expect(provider.variantCount()).toBe(2);
  });

  it('getVariantsByPatient returns empty array for unknown patient', () => {
    expect(provider.getVariantsByPatient('ghost-patient')).toEqual([]);
  });
});
