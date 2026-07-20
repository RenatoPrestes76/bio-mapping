import { Test, TestingModule } from '@nestjs/testing';
import { GenomicInterpretationController } from '../genomic-interpretation.controller.js';
import { GenomicInterpretationService } from '../genomic-interpretation.service.js';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { Gene } from '../entities/gene.entity.js';
import { GeneticVariant } from '../entities/genetic-variant.entity.js';
import { VariantAnnotation } from '../entities/variant-annotation.entity.js';

const makeVariant = () =>
  new GeneticVariant({
    id: 'variant-ctrl-001',
    geneId: 'gene-brca1',
    geneSymbol: 'BRCA1',
    reference: 'A',
    alternate: 'T',
    hgvs: { coding: 'c.5266dupC', protein: 'p.Gln1756ProfsTer25' },
    zygosity: 'HETEROZYGOUS',
    clinicalSignificance: 'PATHOGENIC',
    populationFrequency: { gnomadAF: 0 },
    qualityScore: 90,
  });

const makeAnnotation = () =>
  new VariantAnnotation({
    id: 'annotation-ctrl-001',
    variantId: 'variant-ctrl-001',
    impact: 'HIGH',
    consequence: 'FRAMESHIFT_VARIANT',
    predictedEffect: { sift: 'DELETERIOUS', polyphen: 'PROBABLY_DAMAGING', cadd: 38 },
    confidence: 0.95,
    associatedConditions: ['Hereditary breast and ovarian cancer'],
  });

const makeClassification = () => ({
  variantId: 'variant-ctrl-001',
  geneSymbol: 'BRCA1',
  acmgResult: {
    pathogenicCriteria: ['PVS1', 'PM2'],
    benignCriteria: [],
    classification: 'PATHOGENIC' as const,
    pathogenicScore: 10,
    benignScore: 0,
    rationale: 'PVS1 + PM2',
  },
  appliedCriteria: ['PVS1', 'PM2'],
  timestamp: new Date(),
  classifierVersion: '1.0.0',
});

const makeGene = () =>
  new Gene({ id: 'gene-brca1', symbol: 'BRCA1', name: 'BRCA DNA Repair Associated', chromosome: '17' });

describe('GenomicInterpretationController', () => {
  let controller: GenomicInterpretationController;
  let service: jest.Mocked<GenomicInterpretationService>;

  beforeEach(async () => {
    service = {
      analyzeVariant: jest.fn(),
      annotate: jest.fn(),
      classify: jest.fn(),
      findGene: jest.fn(),
      findAssociatedConditions: jest.fn(),
      generateReport: jest.fn(),
      getVariant: jest.fn(),
      getVariantsByPatient: jest.fn(),
    } as unknown as jest.Mocked<GenomicInterpretationService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenomicInterpretationController],
      providers: [{ provide: GenomicInterpretationService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(GenomicInterpretationController);
  });

  it('POST /genomics/variant calls analyzeVariant and returns result', () => {
    const variant = makeVariant();
    const annotation = makeAnnotation();
    const classification = makeClassification();
    service.analyzeVariant.mockReturnValue({ variant, annotation, classification });

    const result = controller.analyzeVariant(
      { geneSymbol: 'BRCA1', reference: 'A', alternate: 'T' },
      { sub: 'user-001' },
    );

    expect(service.analyzeVariant).toHaveBeenCalledTimes(1);
    expect(result.variant.geneSymbol).toBe('BRCA1');
    expect(result.classification.acmgResult.classification).toBe('PATHOGENIC');
  });

  it('POST /genomics/annotate calls annotate and returns annotation', () => {
    const annotation = makeAnnotation();
    service.annotate.mockReturnValue(annotation);

    const result = controller.annotate({ variantId: 'variant-ctrl-001' }, { sub: 'user-001' });

    expect(service.annotate).toHaveBeenCalledWith({ variantId: 'variant-ctrl-001' });
    expect(result.variantId).toBe('variant-ctrl-001');
    expect(result.impact).toBe('HIGH');
  });

  it('POST /genomics/classify calls classify and returns ClassificationResult', () => {
    const classification = makeClassification();
    service.classify.mockReturnValue(classification);

    const result = controller.classify({ variantId: 'variant-ctrl-001' }, { sub: 'user-001' });

    expect(service.classify).toHaveBeenCalledWith({ variantId: 'variant-ctrl-001' });
    expect(result.geneSymbol).toBe('BRCA1');
    expect(result.appliedCriteria).toContain('PVS1');
  });

  it('GET /genomics/gene/:symbol calls findGene and findAssociatedConditions', () => {
    const gene = makeGene();
    service.findGene.mockReturnValue(gene);
    service.findAssociatedConditions.mockReturnValue([
      { name: 'Hereditary breast and ovarian cancer', source: 'OMIM' },
    ]);

    const result = controller.getGene('BRCA1', { sub: 'user-001' });

    expect(service.findGene).toHaveBeenCalledWith('BRCA1');
    expect(service.findAssociatedConditions).toHaveBeenCalledWith('BRCA1');
    expect(result.gene.symbol).toBe('BRCA1');
    expect(result.associatedConditions).toHaveLength(1);
  });

  it('GET /genomics/variant/:id calls getVariant and returns it', () => {
    const variant = makeVariant();
    service.getVariant.mockReturnValue(variant);

    const result = controller.getVariant('variant-ctrl-001', { sub: 'user-001' });

    expect(service.getVariant).toHaveBeenCalledWith('variant-ctrl-001');
    expect(result.id).toBe('variant-ctrl-001');
  });

  it('GET /genomics/report/:patientId calls generateReport and returns it', () => {
    const mockReport = {
      patientId: 'patient-ctrl',
      summary: {} as any,
      variantCount: 2,
      clinicallySignificantCount: 1,
      generatedAt: new Date(),
    };
    service.generateReport.mockReturnValue(mockReport);

    const result = controller.getReport('patient-ctrl', { sub: 'user-001' });

    expect(service.generateReport).toHaveBeenCalledWith('patient-ctrl');
    expect(result.variantCount).toBe(2);
    expect(result.clinicallySignificantCount).toBe(1);
  });
});
