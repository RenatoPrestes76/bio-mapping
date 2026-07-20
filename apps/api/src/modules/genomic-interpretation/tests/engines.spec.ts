import { Gene } from '../entities/gene.entity.js';
import { GeneticVariant } from '../entities/genetic-variant.entity.js';
import { VariantAnnotation } from '../entities/variant-annotation.entity.js';
import { AnnotationEngine } from '../engines/annotation.engine.js';
import { VariantClassificationEngine } from '../engines/variant-classification.engine.js';
import { GeneImpactEngine } from '../engines/gene-impact.engine.js';
import { PhenotypeAssociationEngine } from '../engines/phenotype-association.engine.js';
import { ClinicalGenomicsEngine } from '../engines/clinical-genomics.engine.js';
import { classifyByACMG } from '../classification/acmg-criteria.js';
import {
  predictConsequenceFromHGVS,
  getImpactForConsequence,
  isLossOfFunctionConsequence,
  CONSEQUENCE_SO_TERM,
} from '../classification/variant-consequences.js';
import { isSameAminoAcidChange, formatHGVSNotation } from '../classification/clinical-nomenclature.js';
import { getKnownGene, isKnownDiseaseGene, getConditionsForGene, searchGenesByChromosome } from '../genes/gene-knowledge.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

const makeVariant = (opts: {
  symbol?: string;
  reference?: string;
  alternate?: string;
  coding?: string;
  protein?: string;
  af?: number;
  sig?: GeneticVariant['clinicalSignificance'];
  zygosity?: GeneticVariant['zygosity'];
  quality?: number;
}): GeneticVariant =>
  new GeneticVariant({
    geneId: 'g-test',
    geneSymbol: opts.symbol ?? 'BRCA1',
    reference: opts.reference ?? 'A',
    alternate: opts.alternate ?? 'T',
    hgvs: { coding: opts.coding, protein: opts.protein },
    zygosity: opts.zygosity ?? 'HETEROZYGOUS',
    clinicalSignificance: opts.sig ?? 'UNCERTAIN_SIGNIFICANCE',
    populationFrequency: { gnomadAF: opts.af ?? 0 },
    qualityScore: opts.quality ?? 85,
  });

const makeAnnotation = (
  variantId: string,
  impact: VariantAnnotation['impact'] = 'HIGH',
  consequence: VariantAnnotation['consequence'] = 'FRAMESHIFT_VARIANT',
): VariantAnnotation =>
  new VariantAnnotation({
    variantId,
    impact,
    consequence,
    predictedEffect: impact === 'HIGH'
      ? { sift: 'DELETERIOUS', siftScore: 0.0, polyphen: 'PROBABLY_DAMAGING', polyphenScore: 0.99, cadd: 38 }
      : { sift: 'TOLERATED', polyphen: 'BENIGN', cadd: 5 },
    confidence: 0.9,
    evidence: [{ source: 'CLINVAR', type: 'classification', description: 'Pathogenic in ClinVar' }],
    associatedConditions: ['Hereditary breast and ovarian cancer'],
  });

// ── ACMG criteria ────────────────────────────────────────────────────────────

describe('classifyByACMG', () => {
  it('classifies PATHOGENIC for PVS1 + PS1', () => {
    const result = classifyByACMG(['PVS1', 'PS1']);
    expect(result.classification).toBe('PATHOGENIC');
  });

  it('classifies PATHOGENIC for 2 strong criteria', () => {
    const result = classifyByACMG(['PS1', 'PS2']);
    expect(result.classification).toBe('PATHOGENIC');
  });

  it('classifies LIKELY_PATHOGENIC for PVS1 + PM2', () => {
    const result = classifyByACMG(['PVS1', 'PM2']);
    expect(result.classification).toBe('LIKELY_PATHOGENIC');
  });

  it('classifies LIKELY_PATHOGENIC for PS1 + PM2', () => {
    const result = classifyByACMG(['PS1', 'PM2']);
    expect(result.classification).toBe('LIKELY_PATHOGENIC');
  });

  it('classifies BENIGN for BA1 (standalone)', () => {
    const result = classifyByACMG(['BA1']);
    expect(result.classification).toBe('BENIGN');
  });

  it('classifies BENIGN for 2 strong benign criteria', () => {
    const result = classifyByACMG(['BS1', 'BS2']);
    expect(result.classification).toBe('BENIGN');
  });

  it('classifies LIKELY_BENIGN for BS + BP', () => {
    const result = classifyByACMG(['BS1', 'BP4']);
    expect(result.classification).toBe('LIKELY_BENIGN');
  });

  it('classifies LIKELY_BENIGN for 2 supporting benign', () => {
    const result = classifyByACMG(['BP4', 'BP7']);
    expect(result.classification).toBe('LIKELY_BENIGN');
  });

  it('classifies UNCERTAIN_SIGNIFICANCE for no criteria', () => {
    const result = classifyByACMG([]);
    expect(result.classification).toBe('UNCERTAIN_SIGNIFICANCE');
  });

  it('BA1 overrides pathogenic criteria', () => {
    const result = classifyByACMG(['BA1', 'PP3']);
    expect(result.classification).toBe('BENIGN');
  });

  it('separates pathogenic and benign criteria lists', () => {
    const result = classifyByACMG(['PVS1', 'PM2', 'PP3', 'BA1']);
    expect(result.pathogenicCriteria).toContain('PVS1');
    expect(result.benignCriteria).toContain('BA1');
  });
});

// ── Variant consequences ──────────────────────────────────────────────────────

describe('predictConsequenceFromHGVS', () => {
  it('returns STOP_GAINED for Ter/stop in protein', () => {
    expect(predictConsequenceFromHGVS('c.1000C>T', 'p.Gln334Ter')).toBe('STOP_GAINED');
    expect(predictConsequenceFromHGVS('c.1000C>T', 'p.Arg256*')).toBe('STOP_GAINED');
  });

  it('returns FRAMESHIFT_VARIANT for fs', () => {
    expect(predictConsequenceFromHGVS('c.5266dupC', 'p.Gln1756ProfsTer25')).toBe('FRAMESHIFT_VARIANT');
  });

  it('returns SYNONYMOUS_VARIANT for synonymous protein', () => {
    expect(predictConsequenceFromHGVS('c.123A>G', 'p.Glu41=')).toBe('SYNONYMOUS_VARIANT');
  });

  it('returns MISSENSE_VARIANT as default', () => {
    expect(predictConsequenceFromHGVS('c.185A>G', 'p.Lys62Arg')).toBe('MISSENSE_VARIANT');
  });

  it('returns MISSENSE_VARIANT when no HGVS provided', () => {
    expect(predictConsequenceFromHGVS(undefined, undefined)).toBe('MISSENSE_VARIANT');
  });
});

describe('getImpactForConsequence', () => {
  it('HIGH for STOP_GAINED and FRAMESHIFT_VARIANT', () => {
    expect(getImpactForConsequence('STOP_GAINED')).toBe('HIGH');
    expect(getImpactForConsequence('FRAMESHIFT_VARIANT')).toBe('HIGH');
    expect(getImpactForConsequence('SPLICE_SITE_VARIANT')).toBe('HIGH');
  });

  it('MODERATE for MISSENSE_VARIANT', () => {
    expect(getImpactForConsequence('MISSENSE_VARIANT')).toBe('MODERATE');
  });

  it('MODIFIER for INTRONIC_VARIANT', () => {
    expect(getImpactForConsequence('INTRONIC_VARIANT')).toBe('MODIFIER');
  });
});

describe('isLossOfFunctionConsequence', () => {
  it('returns true for LOF consequences', () => {
    expect(isLossOfFunctionConsequence('STOP_GAINED')).toBe(true);
    expect(isLossOfFunctionConsequence('FRAMESHIFT_VARIANT')).toBe(true);
    expect(isLossOfFunctionConsequence('SPLICE_SITE_VARIANT')).toBe(true);
  });

  it('returns false for missense and synonymous', () => {
    expect(isLossOfFunctionConsequence('MISSENSE_VARIANT')).toBe(false);
    expect(isLossOfFunctionConsequence('SYNONYMOUS_VARIANT')).toBe(false);
  });
});

describe('CONSEQUENCE_SO_TERM', () => {
  it('returns correct SO term for MISSENSE_VARIANT', () => {
    expect(CONSEQUENCE_SO_TERM('MISSENSE_VARIANT')).toBe('SO:0001583');
  });
  it('returns correct SO term for STOP_GAINED', () => {
    expect(CONSEQUENCE_SO_TERM('STOP_GAINED')).toBe('SO:0001587');
  });
});

// ── Clinical nomenclature ─────────────────────────────────────────────────────

describe('formatHGVSNotation', () => {
  it('formats SNV correctly', () => {
    const hgvs = formatHGVSNotation({ reference: 'A', alternate: 'T', position: 185 });
    expect(hgvs.coding).toBe('c.185A>T');
    expect(hgvs.genomic).toBe('g.185A>T');
  });

  it('formats deletion correctly', () => {
    const hgvs = formatHGVSNotation({ reference: 'ATG', alternate: 'A', position: 100 });
    expect(hgvs.coding).toContain('del');
  });
});

describe('isSameAminoAcidChange', () => {
  it('returns true for same amino acid change', () => {
    expect(isSameAminoAcidChange('p.Val600Glu', 'p.Val600Glu')).toBe(true);
  });

  it('returns false for different changes', () => {
    expect(isSameAminoAcidChange('p.Val600Glu', 'p.Val600Lys')).toBe(false);
  });
});

// ── Gene knowledge ────────────────────────────────────────────────────────────

describe('Gene knowledge base', () => {
  it('getKnownGene returns known gene info', () => {
    const brca1 = getKnownGene('BRCA1');
    expect(brca1).toBeDefined();
    expect(brca1!.symbol).toBe('BRCA1');
    expect(brca1!.chromosome).toBe('17');
  });

  it('getKnownGene is case-insensitive', () => {
    expect(getKnownGene('brca1')).toBeDefined();
    expect(getKnownGene('Brca1')).toBeDefined();
  });

  it('getKnownGene returns undefined for unknown gene', () => {
    expect(getKnownGene('UNKNOWN_XYZ')).toBeUndefined();
  });

  it('isKnownDiseaseGene returns true for known genes', () => {
    expect(isKnownDiseaseGene('TP53')).toBe(true);
    expect(isKnownDiseaseGene('CFTR')).toBe(true);
    expect(isKnownDiseaseGene('UNKNOWN_GENE')).toBe(false);
  });

  it('getConditionsForGene returns non-empty conditions for known genes', () => {
    const conditions = getConditionsForGene('BRCA1');
    expect(conditions.length).toBeGreaterThan(0);
    expect(conditions[0].name).toBeTruthy();
    expect(conditions[0].inheritance).toBeTruthy();
  });

  it('getConditionsForGene returns empty for unknown gene', () => {
    expect(getConditionsForGene('UNKNOWN')).toEqual([]);
  });

  it('searchGenesByChromosome finds genes on chromosome 17', () => {
    const genes = searchGenesByChromosome('17');
    expect(genes.length).toBeGreaterThanOrEqual(2); // BRCA1, TP53
    expect(genes.some((g) => g.symbol === 'BRCA1')).toBe(true);
  });

  it('has at least 20 known genes in knowledge base', () => {
    const allGenes = searchGenesByChromosome('1');
    const total = Object.keys(require('../genes/gene-knowledge.js').KNOWN_GENES).length;
    expect(total).toBeGreaterThanOrEqual(20);
  });
});

// ── AnnotationEngine ──────────────────────────────────────────────────────────

describe('AnnotationEngine', () => {
  const engine = new AnnotationEngine();

  it('annotates frameshift variant with HIGH impact', () => {
    const variant = makeVariant({ coding: 'c.5266dupC', protein: 'p.Gln1756ProfsTer25' });
    const annotation = engine.annotate({ variant });
    expect(annotation.variantId).toBe(variant.id);
    expect(annotation.impact).toBe('HIGH');
    expect(annotation.consequence).toBe('FRAMESHIFT_VARIANT');
    expect(annotation.confidence).toBeGreaterThan(0);
  });

  it('annotates stop-gained variant', () => {
    const variant = makeVariant({ coding: 'c.1000C>T', protein: 'p.Arg334Ter' });
    const annotation = engine.annotate({ variant });
    expect(annotation.consequence).toBe('STOP_GAINED');
    expect(annotation.impact).toBe('HIGH');
  });

  it('annotates missense variant with MODERATE impact', () => {
    const variant = makeVariant({ coding: 'c.185A>G', protein: 'p.Lys62Arg', af: 0.0005 });
    const annotation = engine.annotate({ variant });
    expect(annotation.consequence).toBe('MISSENSE_VARIANT');
    expect(annotation.impact).toBe('MODERATE');
  });

  it('links known conditions for BRCA1 variants', () => {
    const variant = makeVariant({ symbol: 'BRCA1', coding: 'c.5266dupC' });
    const annotation = engine.annotate({ variant, geneSymbol: 'BRCA1' });
    expect(annotation.associatedConditions.length).toBeGreaterThan(0);
  });

  it('assigns OMIM evidence for known disease genes', () => {
    const variant = makeVariant({ symbol: 'TP53', coding: 'c.817C>T', protein: 'p.Arg273Cys' });
    const annotation = engine.annotate({ variant, geneSymbol: 'TP53' });
    expect(annotation.evidence.some((e) => e.source === 'OMIM')).toBe(true);
  });

  it('annotates synonymous variant with LOW impact', () => {
    const variant = makeVariant({ coding: 'c.300A>G', protein: 'p.Ser100=' });
    const annotation = engine.annotate({ variant });
    expect(annotation.consequence).toBe('SYNONYMOUS_VARIANT');
    expect(annotation.impact).toBe('LOW');
  });
});

// ── VariantClassificationEngine ───────────────────────────────────────────────

describe('VariantClassificationEngine', () => {
  const engine = new VariantClassificationEngine();

  it('classifies frameshift in BRCA1 as PATHOGENIC (PVS1)', () => {
    const variant = makeVariant({ symbol: 'BRCA1', af: 0.0001 });
    const annotation = makeAnnotation(variant.id, 'HIGH', 'FRAMESHIFT_VARIANT');
    const result = engine.classify(variant, annotation);
    expect(result.acmgResult.classification).toBe('PATHOGENIC');
    expect(result.appliedCriteria).toContain('PVS1');
    expect(result.geneSymbol).toBe('BRCA1');
  });

  it('classifies common variant as BENIGN (BA1)', () => {
    const variant = makeVariant({ symbol: 'LDLR', af: 0.06 });
    const annotation = makeAnnotation(variant.id, 'LOW', 'SYNONYMOUS_VARIANT');
    const result = engine.classify(variant, annotation);
    expect(result.acmgResult.classification).toBe('BENIGN');
    expect(result.appliedCriteria).toContain('BA1');
  });

  it('classifies synonymous variant with BP7', () => {
    const variant = makeVariant({ symbol: 'MTHFR', af: 0.0001 });
    const annotation = makeAnnotation(variant.id, 'LOW', 'SYNONYMOUS_VARIANT');
    const result = engine.classify(variant, annotation);
    expect(result.appliedCriteria).toContain('BP7');
  });

  it('applies PM2 for very rare variants', () => {
    const variant = makeVariant({ symbol: 'TP53', af: 0.0001 });
    const annotation = makeAnnotation(variant.id, 'MODERATE', 'MISSENSE_VARIANT');
    const result = engine.classify(variant, annotation);
    expect(result.appliedCriteria).toContain('PM2');
  });

  it('applies PP3 for likely deleterious variants', () => {
    const variant = makeVariant({ symbol: 'MLH1', af: 0 });
    const annotation = new VariantAnnotation({
      variantId: variant.id, impact: 'MODERATE', consequence: 'MISSENSE_VARIANT',
      predictedEffect: { sift: 'DELETERIOUS', polyphen: 'PROBABLY_DAMAGING', cadd: 30 },
      confidence: 0.8,
    });
    const result = engine.classify(variant, annotation);
    expect(result.appliedCriteria).toContain('PP3');
  });

  it('getClassificationSummary returns informative string', () => {
    const variant = makeVariant({ symbol: 'BRCA2', af: 0 });
    const annotation = makeAnnotation(variant.id, 'HIGH', 'FRAMESHIFT_VARIANT');
    const result = engine.classify(variant, annotation);
    const summary = engine.getClassificationSummary(result);
    expect(summary).toContain('PATHOGENIC');
    expect(summary).toContain('score:');
  });
});

// ── GeneImpactEngine ─────────────────────────────────────────────────────────

describe('GeneImpactEngine', () => {
  const engine = new GeneImpactEngine();

  it('analyzeGene returns full summary for BRCA1', () => {
    const v1 = makeVariant({ symbol: 'BRCA1', sig: 'PATHOGENIC', af: 0 });
    const a1 = makeAnnotation(v1.id, 'HIGH', 'FRAMESHIFT_VARIANT');
    const report = engine.analyzeGene('BRCA1', [v1], [a1]);

    expect(report.geneSymbol).toBe('BRCA1');
    expect(report.totalVariants).toBe(1);
    expect(report.pathogenicCount).toBe(1);
    expect(report.highImpactCount).toBe(1);
    expect(report.dominantRisk).toBe(true);
    expect(report.overallRiskScore).toBeGreaterThan(0);
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.analysedAt).toBeInstanceOf(Date);
  });

  it('hasDominantEffect returns true for pathogenic variant in dominant gene', () => {
    const v = makeVariant({ symbol: 'BRCA1', sig: 'PATHOGENIC' });
    expect(engine.hasDominantEffect([v], 'BRCA1')).toBe(true);
  });

  it('hasRecessiveEffect returns true for homozygous pathogenic in recessive gene', () => {
    const v = makeVariant({ symbol: 'CFTR', sig: 'PATHOGENIC', zygosity: 'HOMOZYGOUS' });
    expect(engine.hasRecessiveEffect([v], 'CFTR')).toBe(true);
  });

  it('overallRiskScore is higher for multiple pathogenic variants', () => {
    const v1 = makeVariant({ symbol: 'TP53', sig: 'PATHOGENIC' });
    const v2 = makeVariant({ symbol: 'TP53', sig: 'LIKELY_PATHOGENIC' });
    const a1 = makeAnnotation(v1.id, 'HIGH', 'STOP_GAINED');
    const a2 = makeAnnotation(v2.id, 'HIGH', 'FRAMESHIFT_VARIANT');
    const report = engine.analyzeGene('TP53', [v1, v2], [a1, a2]);
    expect(report.overallRiskScore).toBeGreaterThan(50);
  });
});

// ── PhenotypeAssociationEngine ────────────────────────────────────────────────

describe('PhenotypeAssociationEngine', () => {
  const engine = new PhenotypeAssociationEngine();

  it('associates known phenotypes for BRCA1', () => {
    const v = makeVariant({ symbol: 'BRCA1', sig: 'PATHOGENIC' });
    const a = makeAnnotation(v.id, 'HIGH', 'FRAMESHIFT_VARIANT');
    const result = engine.associate('BRCA1', [v], [a]);

    expect(result.geneSymbol).toBe('BRCA1');
    expect(result.associatedPhenotypes.length).toBeGreaterThan(0);
    expect(result.associatedConditions).toContain('Hereditary breast and ovarian cancer');
    expect(result.clinicalPriority).toBe('URGENT');
    expect(result.actionableFindings.length).toBeGreaterThan(0);
  });

  it('returns NONE priority for benign variant', () => {
    const v = makeVariant({ symbol: 'MTHFR', sig: 'BENIGN', af: 0.1 });
    const a = makeAnnotation(v.id, 'LOW', 'SYNONYMOUS_VARIANT');
    const result = engine.associate('MTHFR', [v], [a]);
    expect(result.clinicalPriority).toBe('NONE');
  });

  it('flags pharmacogenomic relevance for CYP2D6', () => {
    const v = makeVariant({ symbol: 'CYP2D6', sig: 'PATHOGENIC' });
    const result = engine.associate('CYP2D6', [v], []);
    expect(result.pharmacogenomicRelevance).toBe(true);
    expect(result.actionableFindings.some((f) => f.toLowerCase().includes('pharmacogenomic'))).toBe(true);
  });

  it('returns empty result for unknown gene', () => {
    const result = engine.associate('UNKNOWN_XYZ', [], []);
    expect(result.associatedPhenotypes).toHaveLength(0);
    expect(result.clinicalPriority).toBe('NONE');
  });

  it('getObligatePhenotypes returns only OBLIGATE phenotypes', () => {
    const obligate = engine.getObligatePhenotypes('CFTR');
    expect(obligate.every((p) => p.frequency === 'OBLIGATE')).toBe(true);
    expect(obligate.length).toBeGreaterThan(0);
  });

  it('getFrequentPhenotypes includes OBLIGATE, VERY_FREQUENT, FREQUENT', () => {
    const frequent = engine.getFrequentPhenotypes('BRCA1');
    expect(frequent.every((p) => ['OBLIGATE', 'VERY_FREQUENT', 'FREQUENT'].includes(p.frequency))).toBe(true);
  });
});

// ── ClinicalGenomicsEngine ────────────────────────────────────────────────────

describe('ClinicalGenomicsEngine', () => {
  const engine = new ClinicalGenomicsEngine();
  const classificationEngine = new VariantClassificationEngine();
  const annotationEngine = new AnnotationEngine();
  const geneImpactEngine = new GeneImpactEngine();
  const phenotypeEngine = new PhenotypeAssociationEngine();

  const buildGroup = (symbol: string, sig: GeneticVariant['clinicalSignificance']) => {
    const isPathogenic = sig === 'PATHOGENIC' || sig === 'LIKELY_PATHOGENIC';
    const variant = makeVariant({
      symbol, sig,
      af: isPathogenic ? 0 : 0.02,
      coding: isPathogenic ? 'c.5266dupC' : 'c.300A>G',
      protein: isPathogenic ? 'p.Gln1756ProfsTer25' : 'p.Lys100=',
    });
    const annotation = annotationEngine.annotate({ variant });
    const classification = classificationEngine.classify(variant, annotation);
    const phenotypeResult = phenotypeEngine.associate(symbol, [variant], [annotation]);
    const geneImpact = geneImpactEngine.analyzeGene(symbol, [variant], [annotation]);
    return { variant, annotation, classification, phenotypeResult, geneImpact };
  };

  it('generateSummary produces correct counts', () => {
    const groups = [buildGroup('BRCA1', 'PATHOGENIC'), buildGroup('TP53', 'UNCERTAIN_SIGNIFICANCE')];
    const summary = engine.generateSummary('patient-001', groups);

    expect(summary.patientId).toBe('patient-001');
    expect(summary.totalVariantsAnalyzed).toBe(2);
    expect(summary.clinicallySignificantCount).toBeGreaterThanOrEqual(1);
    expect(summary.generatedAt).toBeInstanceOf(Date);
  });

  it('overallRiskLevel is HIGH for multiple pathogenic variants', () => {
    const groups = [
      buildGroup('BRCA1', 'PATHOGENIC'),
      buildGroup('TP53', 'PATHOGENIC'),
    ];
    const summary = engine.generateSummary('patient-002', groups);
    expect(summary.overallRiskLevel).toBe('HIGH');
  });

  it('overallRiskLevel is LOW for empty variant list', () => {
    const summary = engine.generateSummary('patient-003', []);
    expect(summary.overallRiskLevel).toBe('LOW');
  });

  it('generateReport returns TIER_1 for pathogenic variant', () => {
    const group = buildGroup('BRCA1', 'PATHOGENIC');
    const report = engine.generateReport('patient-004', group.variant, group.annotation, group.classification, group.phenotypeResult);
    expect(report.actionability.level).toBe('TIER_1');
    expect(report.geneticCounselingRecommended).toBe(true);
    expect(report.limitations.length).toBeGreaterThan(0);
  });

  it('generateReport returns TIER_4 for benign variant', () => {
    const group = buildGroup('MTHFR', 'BENIGN');
    const report = engine.generateReport('patient-005', group.variant, group.annotation, group.classification, group.phenotypeResult);
    expect(report.actionability.level).toBe('TIER_4');
    expect(report.geneticCounselingRecommended).toBe(false);
  });
});
