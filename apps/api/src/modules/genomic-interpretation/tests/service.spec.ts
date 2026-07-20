import { NotFoundException } from '@nestjs/common';
import { GenomicInterpretationService } from '../genomic-interpretation.service.js';
import { GenomicInterpretationProvider } from '../providers/genomic-interpretation.provider.js';
import { GeneticVariant } from '../entities/genetic-variant.entity.js';
import { Gene } from '../entities/gene.entity.js';

const makeDto = (symbol = 'BRCA1', af = 0, coding = 'c.5266dupC', protein = 'p.Gln1756ProfsTer25') => ({
  geneSymbol: symbol,
  reference: 'A',
  alternate: 'T',
  hgvs: { coding, protein },
  zygosity: 'HETEROZYGOUS' as const,
  populationFrequency: { gnomadAF: af },
  qualityScore: 85,
});

describe('GenomicInterpretationService', () => {
  let service: GenomicInterpretationService;
  let provider: GenomicInterpretationProvider;

  beforeEach(() => {
    provider = new GenomicInterpretationProvider();
    service = new GenomicInterpretationService(provider);
  });

  it('analyzeVariant returns variant, annotation and classification', () => {
    const dto = makeDto();
    const result = service.analyzeVariant(dto);

    expect(result.variant).toBeInstanceOf(GeneticVariant);
    expect(result.variant.geneSymbol).toBe('BRCA1');
    expect(result.annotation.variantId).toBe(result.variant.id);
    expect(result.classification.variantId).toBe(result.variant.id);
    expect(result.classification.acmgResult.classification).toBeTruthy();
  });

  it('analyzeVariant associates variant with patientId', () => {
    service.analyzeVariant(makeDto(), 'patient-service');
    const variants = service.getVariantsByPatient('patient-service');
    expect(variants).toHaveLength(1);
  });

  it('annotate returns VariantAnnotation for existing variant', () => {
    const { variant } = service.analyzeVariant(makeDto());
    const annotation = service.annotate({ variantId: variant.id });
    expect(annotation.variantId).toBe(variant.id);
  });

  it('annotate throws NotFoundException for unknown variantId', () => {
    expect(() => service.annotate({ variantId: 'bad' })).toThrow(NotFoundException);
  });

  it('classify returns ClassificationResult for existing variant', () => {
    const { variant } = service.analyzeVariant(makeDto('BRCA1', 0));
    const result = service.classify({ variantId: variant.id });
    expect(result.variantId).toBe(variant.id);
    expect(result.geneSymbol).toBe('BRCA1');
  });

  it('classify throws NotFoundException for unknown variantId', () => {
    expect(() => service.classify({ variantId: 'bad' })).toThrow(NotFoundException);
  });

  it('findGene returns Gene for known symbol', () => {
    const gene = service.findGene('BRCA1');
    expect(gene).toBeInstanceOf(Gene);
    expect(gene.symbol).toBe('BRCA1');
  });

  it('findGene is case-insensitive', () => {
    const gene = service.findGene('brca1');
    expect(gene.symbol).toBe('BRCA1');
  });

  it('findGene throws NotFoundException for unknown gene', () => {
    expect(() => service.findGene('UNKNOWN_GENE_XYZ')).toThrow(NotFoundException);
  });

  it('findAssociatedConditions merges OMIM and HPO conditions', () => {
    const conditions = service.findAssociatedConditions('BRCA1');
    expect(conditions.length).toBeGreaterThan(0);
    expect(conditions.some((c) => c.name.includes('breast'))).toBe(true);
    expect(conditions.every((c) => c.source === 'OMIM' || c.source === 'HPO')).toBe(true);
  });

  it('findAssociatedConditions deduplicates by name', () => {
    const conditions = service.findAssociatedConditions('BRCA1');
    const names = conditions.map((c) => c.name);
    const unique = new Set(names);
    expect(names.length).toBe(unique.size);
  });

  it('findAssociatedConditions returns empty for unknown gene', () => {
    const conditions = service.findAssociatedConditions('UNKNOWN_GENE');
    expect(conditions).toHaveLength(0);
  });

  it('generateReport returns report with summary', () => {
    service.analyzeVariant(makeDto('BRCA1'), 'patient-report');
    const report = service.generateReport('patient-report');
    expect(report.patientId).toBe('patient-report');
    expect(report.variantCount).toBe(1);
    expect(report.generatedAt).toBeInstanceOf(Date);
    expect(report.summary).toBeDefined();
  });

  it('generateReport for unknown patient returns zero count', () => {
    const report = service.generateReport('ghost');
    expect(report.variantCount).toBe(0);
    expect(report.clinicallySignificantCount).toBe(0);
  });

  it('getVariant retrieves known variant', () => {
    const { variant } = service.analyzeVariant(makeDto());
    const found = service.getVariant(variant.id);
    expect(found.id).toBe(variant.id);
  });

  it('getVariant throws NotFoundException for unknown id', () => {
    expect(() => service.getVariant('bad')).toThrow(NotFoundException);
  });

  it('getVariantsByPatient returns empty for unknown patient', () => {
    expect(service.getVariantsByPatient('nobody')).toEqual([]);
  });
});
