import { Gene } from '../entities/gene.entity.js';
import { GeneticVariant, type ClinicalSignificance } from '../entities/genetic-variant.entity.js';
import { VariantAnnotation } from '../entities/variant-annotation.entity.js';

describe('Gene entity', () => {
  it('creates with auto-id and uppercases symbol', () => {
    const g = new Gene({ symbol: 'brca1', name: 'BRCA DNA Repair Associated', chromosome: '17' });
    expect(g.id).toMatch(/^gene-/);
    expect(g.symbol).toBe('BRCA1');
    expect(g.chromosome).toBe('17');
    expect(g.transcripts).toEqual([]);
    expect(g.aliases).toEqual([]);
    expect(g.function).toBe('');
    expect(g.createdAt).toBeInstanceOf(Date);
  });

  it('strips chr prefix from chromosome', () => {
    const g = new Gene({ symbol: 'TP53', name: 'Tumor Protein P53', chromosome: 'chr17' });
    expect(g.chromosome).toBe('17');
  });

  it('accepts explicit id', () => {
    const g = new Gene({ id: 'gene-explicit', symbol: 'LDLR', name: 'Low Density Lipoprotein Receptor', chromosome: '19' });
    expect(g.id).toBe('gene-explicit');
  });

  it('hasAlias returns true case-insensitively', () => {
    const g = new Gene({ symbol: 'BRCA1', name: 'BRCA1', chromosome: '17', aliases: ['RNF53', 'BRCC1'] });
    expect(g.hasAlias('rnf53')).toBe(true);
    expect(g.hasAlias('BRCC1')).toBe(true);
    expect(g.hasAlias('PTEN')).toBe(false);
  });

  it('getTranscriptCount returns correct count', () => {
    const g = new Gene({ symbol: 'BRCA2', name: 'BRCA2', chromosome: '13', transcripts: ['ENST00000380152', 'ENST00000544455'] });
    expect(g.getTranscriptCount()).toBe(2);
    const g2 = new Gene({ symbol: 'TP53', name: 'TP53', chromosome: '17' });
    expect(g2.getTranscriptCount()).toBe(0);
  });

  it('isOnChromosome handles chr prefix', () => {
    const g = new Gene({ symbol: 'BRCA1', name: 'BRCA1', chromosome: '17' });
    expect(g.isOnChromosome('17')).toBe(true);
    expect(g.isOnChromosome('chr17')).toBe(true);
    expect(g.isOnChromosome('13')).toBe(false);
  });

  it('getGeneLengthBp computes absolute difference', () => {
    const g = new Gene({
      symbol: 'CFTR', name: 'CFTR', chromosome: '7',
      location: { start: 117480025, end: 117668665, strand: '+' },
    });
    expect(g.getGeneLengthBp()).toBe(188640);
  });

  it('matchesSymbol is case-insensitive', () => {
    const g = new Gene({ symbol: 'brca1', name: 'BRCA1', chromosome: '17' });
    expect(g.matchesSymbol('brca1')).toBe(true);
    expect(g.matchesSymbol('BRCA1')).toBe(true);
    expect(g.matchesSymbol('TP53')).toBe(false);
  });
});

describe('GeneticVariant entity', () => {
  const makeVariant = (sig: ClinicalSignificance = 'UNCERTAIN_SIGNIFICANCE', af = 0) =>
    new GeneticVariant({
      geneId: 'gene-brca1',
      geneSymbol: 'BRCA1',
      reference: 'A',
      alternate: 'T',
      hgvs: { coding: 'c.5266dupC', protein: 'p.Gln1756ProfsTer25' },
      zygosity: 'HETEROZYGOUS',
      clinicalSignificance: sig,
      populationFrequency: { gnomadAF: af },
      qualityScore: 85,
    });

  it('creates with auto-id and uppercases geneSymbol', () => {
    const v = new GeneticVariant({ geneId: 'g', geneSymbol: 'brca1', reference: 'A', alternate: 'T' });
    expect(v.id).toMatch(/^variant-/);
    expect(v.geneSymbol).toBe('BRCA1');
    expect(v.zygosity).toBe('UNKNOWN');
    expect(v.clinicalSignificance).toBe('UNCERTAIN_SIGNIFICANCE');
  });

  it('clamps qualityScore to [0, 100]', () => {
    const high = new GeneticVariant({ geneId: 'g', geneSymbol: 'BRCA1', reference: 'A', alternate: 'T', qualityScore: 200 });
    expect(high.qualityScore).toBe(100);
    const low = new GeneticVariant({ geneId: 'g', geneSymbol: 'BRCA1', reference: 'A', alternate: 'T', qualityScore: -5 });
    expect(low.qualityScore).toBe(0);
  });

  it('isPathogenic returns true only for PATHOGENIC', () => {
    expect(makeVariant('PATHOGENIC').isPathogenic()).toBe(true);
    expect(makeVariant('LIKELY_PATHOGENIC').isPathogenic()).toBe(false);
    expect(makeVariant('BENIGN').isPathogenic()).toBe(false);
  });

  it('isLikelyPathogenic returns true only for LIKELY_PATHOGENIC', () => {
    expect(makeVariant('LIKELY_PATHOGENIC').isLikelyPathogenic()).toBe(true);
    expect(makeVariant('PATHOGENIC').isLikelyPathogenic()).toBe(false);
  });

  it('isLikelyClinicallySignificant covers PATHOGENIC and LIKELY_PATHOGENIC', () => {
    expect(makeVariant('PATHOGENIC').isLikelyClinicallySignificant()).toBe(true);
    expect(makeVariant('LIKELY_PATHOGENIC').isLikelyClinicallySignificant()).toBe(true);
    expect(makeVariant('UNCERTAIN_SIGNIFICANCE').isLikelyClinicallySignificant()).toBe(false);
  });

  it('isRare returns true for AF < 0.01', () => {
    expect(makeVariant('UNCERTAIN_SIGNIFICANCE', 0.001).isRare()).toBe(true);
    expect(makeVariant('UNCERTAIN_SIGNIFICANCE', 0.01).isRare()).toBe(false);
    expect(makeVariant('UNCERTAIN_SIGNIFICANCE', 0.05).isRare()).toBe(false);
  });

  it('isVeryRare returns true for AF < 0.001', () => {
    expect(makeVariant('UNCERTAIN_SIGNIFICANCE', 0.0001).isVeryRare()).toBe(true);
    expect(makeVariant('UNCERTAIN_SIGNIFICANCE', 0.001).isVeryRare()).toBe(false);
  });

  it('isHighQuality returns true for qualityScore >= 80', () => {
    expect(makeVariant().isHighQuality()).toBe(true);
    const low = new GeneticVariant({ geneId: 'g', geneSymbol: 'TP53', reference: 'G', alternate: 'A', qualityScore: 79 });
    expect(low.isHighQuality()).toBe(false);
  });

  it('getMaxPopulationFrequency returns max across sources', () => {
    const v = new GeneticVariant({
      geneId: 'g', geneSymbol: 'CFTR', reference: 'A', alternate: 'T',
      populationFrequency: { gnomadAF: 0.001, thousandGenomesAF: 0.003, clinvarAF: 0.0005 },
    });
    expect(v.getMaxPopulationFrequency()).toBe(0.003);
  });

  it('getMaxPopulationFrequency returns 0 for empty frequency', () => {
    const v = new GeneticVariant({ geneId: 'g', geneSymbol: 'BRCA2', reference: 'C', alternate: 'T' });
    expect(v.getMaxPopulationFrequency()).toBe(0);
  });

  it('withClinicalSignificance returns immutable copy', () => {
    const v = makeVariant('UNCERTAIN_SIGNIFICANCE');
    const updated = v.withClinicalSignificance('PATHOGENIC');
    expect(updated.clinicalSignificance).toBe('PATHOGENIC');
    expect(v.clinicalSignificance).toBe('UNCERTAIN_SIGNIFICANCE');
    expect(updated.id).toBe(v.id);
  });

  it('isSnv and isIndel classify correctly', () => {
    const snv = new GeneticVariant({ geneId: 'g', geneSymbol: 'TP53', reference: 'A', alternate: 'T' });
    expect(snv.isSnv()).toBe(true);
    expect(snv.isIndel()).toBe(false);

    const indel = new GeneticVariant({ geneId: 'g', geneSymbol: 'BRCA1', reference: 'A', alternate: 'AT' });
    expect(indel.isSnv()).toBe(false);
    expect(indel.isIndel()).toBe(true);
  });
});

describe('VariantAnnotation entity', () => {
  it('creates with defaults and clamps confidence', () => {
    const a = new VariantAnnotation({
      variantId: 'v-001',
      impact: 'HIGH',
      consequence: 'STOP_GAINED',
      confidence: 2.5,
    });
    expect(a.id).toMatch(/^annotation-/);
    expect(a.confidence).toBe(1);
    expect(a.predictedEffect).toEqual({});
    expect(a.associatedConditions).toEqual([]);
    expect(a.evidence).toEqual([]);
    expect(a.annotatedAt).toBeInstanceOf(Date);
  });

  it('clamps confidence lower bound to 0', () => {
    const a = new VariantAnnotation({ variantId: 'v', impact: 'LOW', consequence: 'SYNONYMOUS_VARIANT', confidence: -1 });
    expect(a.confidence).toBe(0);
  });

  it('isHighImpact returns true only for HIGH', () => {
    const h = new VariantAnnotation({ variantId: 'v', impact: 'HIGH', consequence: 'STOP_GAINED' });
    expect(h.isHighImpact()).toBe(true);
    const m = new VariantAnnotation({ variantId: 'v', impact: 'MODERATE', consequence: 'MISSENSE_VARIANT' });
    expect(m.isHighImpact()).toBe(false);
  });

  it('isModeratePlusImpact covers HIGH and MODERATE', () => {
    expect(new VariantAnnotation({ variantId: 'v', impact: 'HIGH', consequence: 'STOP_GAINED' }).isModeratePlusImpact()).toBe(true);
    expect(new VariantAnnotation({ variantId: 'v', impact: 'MODERATE', consequence: 'MISSENSE_VARIANT' }).isModeratePlusImpact()).toBe(true);
    expect(new VariantAnnotation({ variantId: 'v', impact: 'LOW', consequence: 'SYNONYMOUS_VARIANT' }).isModeratePlusImpact()).toBe(false);
  });

  it('hasStrongEvidence returns true for CLINVAR or FUNCTIONAL sources', () => {
    const a = new VariantAnnotation({
      variantId: 'v', impact: 'HIGH', consequence: 'FRAMESHIFT_VARIANT',
      evidence: [{ source: 'CLINVAR', type: 'classification', description: 'Pathogenic' }],
    });
    expect(a.hasStrongEvidence()).toBe(true);
    const b = new VariantAnnotation({
      variantId: 'v', impact: 'HIGH', consequence: 'FRAMESHIFT_VARIANT',
      evidence: [{ source: 'POPULATION', type: 'af', description: 'Low AF' }],
    });
    expect(b.hasStrongEvidence()).toBe(false);
  });

  it('getDeleteriousPredictions returns SIFT and PolyPhen flags', () => {
    const a = new VariantAnnotation({
      variantId: 'v', impact: 'MODERATE', consequence: 'MISSENSE_VARIANT',
      predictedEffect: {
        sift: 'DELETERIOUS', siftScore: 0.0,
        polyphen: 'PROBABLY_DAMAGING', polyphenScore: 0.99,
        cadd: 30, revel: 0.85,
      },
    });
    const preds = a.getDeleteriousPredictions();
    expect(preds).toContain('SIFT:DELETERIOUS');
    expect(preds).toContain('PolyPhen:PROBABLY_DAMAGING');
    expect(preds.some((p) => p.startsWith('CADD:'))).toBe(true);
    expect(preds.some((p) => p.startsWith('REVEL:'))).toBe(true);
  });

  it('getDeleteriousPredictions returns empty for tolerated predictions', () => {
    const a = new VariantAnnotation({
      variantId: 'v', impact: 'LOW', consequence: 'SYNONYMOUS_VARIANT',
      predictedEffect: { sift: 'TOLERATED', polyphen: 'BENIGN', cadd: 5, revel: 0.1 },
    });
    expect(a.getDeleteriousPredictions()).toHaveLength(0);
  });

  it('isLikelyDeleterious requires >= 2 deleterious predictions', () => {
    const delet = new VariantAnnotation({
      variantId: 'v', impact: 'HIGH', consequence: 'STOP_GAINED',
      predictedEffect: { sift: 'DELETERIOUS', polyphen: 'PROBABLY_DAMAGING', cadd: 40 },
    });
    expect(delet.isLikelyDeleterious()).toBe(true);

    const one = new VariantAnnotation({
      variantId: 'v', impact: 'MODERATE', consequence: 'MISSENSE_VARIANT',
      predictedEffect: { sift: 'DELETERIOUS', polyphen: 'BENIGN', cadd: 5 },
    });
    expect(one.isLikelyDeleterious()).toBe(false);
  });
});
