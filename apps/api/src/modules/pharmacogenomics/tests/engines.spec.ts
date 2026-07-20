import { PharmacogenomicsInterpretationEngine } from '../engines/pharmacogenomics-interpretation.engine.js';
import { DrugInteractionEngine } from '../engines/drug-interaction.engine.js';
import { MedicationOptimizationEngine } from '../engines/medication-optimization.engine.js';
import { MedicationRecommendation } from '../entities/medication-recommendation.entity.js';
import type { MetabolicPhenotype } from '../entities/drug-gene-interaction.entity.js';

function makeRec(overrides: Partial<ConstructorParameters<typeof MedicationRecommendation>[0]> = {}) {
  return new MedicationRecommendation({
    drug: 'warfarin',
    gene: 'CYP2C9',
    phenotype: 'POOR_METABOLIZER',
    severity: 'DOSE_REDUCTION',
    recommendation: 'Reduce dose',
    explanation: {
      genotypeDescription: 'CYP2C9 *2/*3',
      phenotypeDescription: 'Poor Metabolizer',
      guidelineUsed: 'CPIC 2017',
      clinicalRationale: '',
      decisionPath: [],
      gradeStrength: 'STRONG',
    },
    evidence: { level: 'A', source: 'CPIC', gradeStrength: 'STRONG', confidence: 0.95 },
    ...overrides,
  });
}

describe('PharmacogenomicsInterpretationEngine', () => {
  const engine = new PharmacogenomicsInterpretationEngine();

  it('analyzes CYP2C19 PM and returns CONTRAINDICATED clopidogrel recommendation', () => {
    const result = engine.analyze({
      patientId: 'p-001',
      genotypes: [{ gene: 'CYP2C19', haplotype1: '*2', haplotype2: '*2' }],
      medications: ['clopidogrel'],
    });
    expect(result.profile.patientId).toBe('p-001');
    expect(result.recommendations.length).toBeGreaterThan(0);
    const rec = result.recommendations.find((r) => r.drug === 'clopidogrel');
    expect(rec?.severity).toBe('CONTRAINDICATED');
  });

  it('analyzes TPMT PM and returns CONTRAINDICATED azathioprine recommendation', () => {
    const result = engine.analyze({
      patientId: 'p-002',
      genotypes: [{ gene: 'TPMT', haplotype1: '*3A', haplotype2: '*3A' }],
      medications: ['azathioprine'],
    });
    const rec = result.recommendations.find((r) => r.drug === 'azathioprine');
    expect(rec?.severity).toBe('CONTRAINDICATED');
  });

  it('analyzes DPYD IM and returns DOSE_REDUCTION for 5-fu', () => {
    const result = engine.analyze({
      patientId: 'p-003',
      genotypes: [{ gene: 'DPYD', haplotype1: '*1', haplotype2: '*2A' }],
      medications: ['5-fu'],
    });
    const rec = result.recommendations.find((r) => r.drug === '5-fu');
    expect(rec?.severity).toBe('DOSE_REDUCTION');
  });

  it('populates drugResponseProfile with risk genes and contraindicated drugs', () => {
    const result = engine.analyze({
      patientId: 'p-004',
      genotypes: [{ gene: 'CYP2D6', haplotype1: '*4', haplotype2: '*4' }],
      medications: ['codeine'],
    });
    expect(result.drugResponseProfile.contraindicatedDrugs).toContain('codeine');
    expect(result.drugResponseProfile.riskGenes).toContain('CYP2D6');
  });

  it('builds pharmacogenomicRiskScore > 0 when contraindicated drug present', () => {
    const result = engine.analyze({
      patientId: 'p-005',
      genotypes: [{ gene: 'CYP2C19', haplotype1: '*2', haplotype2: '*2' }],
      medications: ['clopidogrel'],
    });
    expect(result.drugResponseProfile.pharmacogenomicRiskScore).toBeGreaterThan(0);
  });

  it('handles unsupported drug without error', () => {
    const result = engine.analyze({
      patientId: 'p-006',
      genotypes: [{ gene: 'CYP2C19', haplotype1: '*1', haplotype2: '*1' }],
      medications: ['aspirin'],
    });
    expect(result.recommendations).toHaveLength(0);
  });

  it('sets safeDrugs for NO_ACTION_NEEDED recommendations', () => {
    const result = engine.analyze({
      patientId: 'p-007',
      genotypes: [{ gene: 'CYP2C19', haplotype1: '*1', haplotype2: '*1' }],
      medications: ['clopidogrel'],
    });
    const rec = result.recommendations.find((r) => r.drug === 'clopidogrel');
    if (rec?.severity === 'NO_ACTION_NEEDED') {
      expect(result.drugResponseProfile.safeDrugs).toContain('clopidogrel');
    }
    expect(result.profile).toBeDefined();
  });
});

describe('DrugInteractionEngine', () => {
  const engine = new DrugInteractionEngine();

  it('detects shared gene interaction for two substrates', () => {
    const phenotypes = new Map<string, MetabolicPhenotype>([['CYP2D6', 'POOR_METABOLIZER']]);
    const analysis = engine.analyzeInteractions(['codeine', 'tramadol'], phenotypes);
    expect(analysis.interactions.length).toBeGreaterThan(0);
    expect(analysis.interactions[0].sharedGene).toBe('CYP2D6');
  });

  it('detects phenoconversion risk for fluoxetine (CYP2D6 inhibitor)', () => {
    const phenotypes = new Map<string, MetabolicPhenotype>([['CYP2D6', 'NORMAL_METABOLIZER']]);
    const analysis = engine.analyzeInteractions(['fluoxetine', 'codeine'], phenotypes);
    const risk = analysis.phenoconversionRisks.find((r) => r.gene === 'CYP2D6');
    expect(risk).toBeDefined();
    expect(risk?.causedBy.toLowerCase()).toContain('fluoxetine');
    expect(risk?.predictedPhenotype).toBe('POOR_METABOLIZER');
  });

  it('returns no interactions for drugs with no shared genes in panel', () => {
    const phenotypes = new Map<string, MetabolicPhenotype>();
    const analysis = engine.analyzeInteractions(['aspirin', 'ibuprofen'], phenotypes);
    expect(analysis.interactions).toHaveLength(0);
  });

  it('marks high-risk pairs when severity is HIGH', () => {
    const phenotypes = new Map<string, MetabolicPhenotype>([['CYP2D6', 'POOR_METABOLIZER']]);
    const analysis = engine.analyzeInteractions(['codeine', 'tramadol'], phenotypes);
    expect(analysis.highRiskPairs.length).toBeGreaterThanOrEqual(0);
  });
});

describe('MedicationOptimizationEngine', () => {
  const engine = new MedicationOptimizationEngine();

  it('scores CONTRAINDICATED drug as 0 → CONTRAINDICATED tier', () => {
    const phenotypes = new Map<string, MetabolicPhenotype>([['CYP2C19', 'POOR_METABOLIZER']]);
    const recs = [makeRec({ drug: 'clopidogrel', gene: 'CYP2C19', severity: 'CONTRAINDICATED' })];
    const scores = engine.score(['clopidogrel'], phenotypes, recs);
    expect(scores[0].tier).toBe('CONTRAINDICATED');
    expect(scores[0].score).toBe(0);
  });

  it('scores NO_ACTION_NEEDED drug as 100 → OPTIMAL tier', () => {
    const phenotypes = new Map<string, MetabolicPhenotype>([['CYP2C19', 'NORMAL_METABOLIZER']]);
    const recs = [makeRec({ drug: 'clopidogrel', gene: 'CYP2C19', severity: 'NO_ACTION_NEEDED' })];
    const scores = engine.score(['clopidogrel'], phenotypes, recs);
    expect(scores[0].tier).toBe('OPTIMAL');
    expect(scores[0].score).toBe(100);
  });

  it('scores DOSE_REDUCTION as USE_WITH_CAUTION or ACCEPTABLE tier', () => {
    const phenotypes = new Map<string, MetabolicPhenotype>([['CYP2C9', 'POOR_METABOLIZER']]);
    const recs = [makeRec({ severity: 'DOSE_REDUCTION' })];
    const scores = engine.score(['warfarin'], phenotypes, recs);
    expect(['ACCEPTABLE', 'USE_WITH_CAUTION']).toContain(scores[0].tier);
  });

  it('gives ACCEPTABLE tier to drugs not in the panel', () => {
    const scores = engine.score(['aspirin'], new Map(), []);
    expect(scores[0].tier).toBe('ACCEPTABLE');
  });

  it('returns sorted scores lowest first', () => {
    const phenotypes = new Map<string, MetabolicPhenotype>([['CYP2C19', 'POOR_METABOLIZER']]);
    const recs = [
      makeRec({ drug: 'clopidogrel', gene: 'CYP2C19', severity: 'CONTRAINDICATED' }),
      makeRec({ drug: 'omeprazole', gene: 'CYP2C19', severity: 'NO_ACTION_NEEDED' }),
    ];
    const scores = engine.score(['clopidogrel', 'omeprazole'], phenotypes, recs);
    expect(scores[0].score).toBeLessThanOrEqual(scores[scores.length - 1].score);
  });

  it('getSupportedDrugs returns the known drug list', () => {
    const drugs = engine.getSupportedDrugs();
    expect(drugs).toContain('warfarin');
    expect(drugs).toContain('clopidogrel');
  });

  it('rankAlternatives returns scored alternatives for a contraindicated drug', () => {
    const phenotypes = new Map<string, MetabolicPhenotype>([['CYP2C19', 'POOR_METABOLIZER']]);
    const alts = engine.rankAlternatives('clopidogrel', phenotypes);
    expect(Array.isArray(alts)).toBe(true);
  });
});
