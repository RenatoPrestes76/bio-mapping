import { PhenotypeInterpreter } from '../interpreters/phenotype.interpreter.js';
import { RecommendationInterpreter } from '../interpreters/recommendation.interpreter.js';
import { EvidenceInterpreter } from '../interpreters/evidence.interpreter.js';
import type { MetabolicPhenotype } from '../entities/drug-gene-interaction.entity.js';

describe('PhenotypeInterpreter', () => {
  const interpreter = new PhenotypeInterpreter();

  it('returns UNKNOWN for unsupported gene', () => {
    const result = interpreter.interpret({ gene: 'BRCA1', haplotype1: '*1', haplotype2: '*2' });
    expect(result.phenotype).toBe('UNKNOWN');
    expect(result.method).toBe('UNKNOWN');
    expect(result.confidence).toBe('LOW');
  });

  it('looks up CYP2C19 *2/*2 as POOR_METABOLIZER', () => {
    const result = interpreter.interpret({ gene: 'CYP2C19', haplotype1: '*2', haplotype2: '*2' });
    expect(result.phenotype).toBe('POOR_METABOLIZER');
    expect(result.method).toBe('HAPLOTYPE_LOOKUP');
    expect(result.confidence).toBe('HIGH');
  });

  it('looks up CYP2C19 *1/*17 as RAPID_METABOLIZER', () => {
    const result = interpreter.interpret({ gene: 'CYP2C19', haplotype1: '*1', haplotype2: '*17' });
    expect(result.phenotype).toBe('RAPID_METABOLIZER');
  });

  it('looks up CYP2C19 *17/*17 as ULTRA_RAPID_METABOLIZER', () => {
    const result = interpreter.interpret({ gene: 'CYP2C19', haplotype1: '*17', haplotype2: '*17' });
    expect(result.phenotype).toBe('ULTRA_RAPID_METABOLIZER');
  });

  it('looks up CYP2C9 *2/*3 as POOR_METABOLIZER', () => {
    const result = interpreter.interpret({ gene: 'CYP2C9', haplotype1: '*2', haplotype2: '*3' });
    expect(result.phenotype).toBe('POOR_METABOLIZER');
  });

  it('looks up TPMT *3A/*3A as POOR_METABOLIZER', () => {
    const result = interpreter.interpret({ gene: 'TPMT', haplotype1: '*3A', haplotype2: '*3A' });
    expect(result.phenotype).toBe('POOR_METABOLIZER');
  });

  it('uses activity score when haplotype not found and score provided', () => {
    const result = interpreter.interpret({ gene: 'CYP2D6', haplotype1: '*NOVEL', activityScore: 0 });
    expect(result.phenotype).toBe('POOR_METABOLIZER');
    expect(result.method).toBe('ACTIVITY_SCORE');
  });

  it('interprets activity score 2.0 as NORMAL_METABOLIZER', () => {
    const result = interpreter.interpret({ gene: 'CYP2D6', haplotype1: '*NOVEL', activityScore: 2.0 });
    expect(result.phenotype).toBe('NORMAL_METABOLIZER');
  });

  it('interprets activity score > 2.5 as ULTRA_RAPID_METABOLIZER', () => {
    const result = interpreter.interpret({ gene: 'CYP2D6', haplotype1: '*NOVEL', activityScore: 3.0 });
    expect(result.phenotype).toBe('ULTRA_RAPID_METABOLIZER');
  });

  it('interpretAll maps all genotypes', () => {
    const results = interpreter.interpretAll([
      { gene: 'CYP2C19', haplotype1: '*1', haplotype2: '*1' },
      { gene: 'CYP2D6', haplotype1: '*4', haplotype2: '*4' },
    ]);
    expect(results).toHaveLength(2);
  });

  it('toPhenotypeMap creates gene→phenotype map', () => {
    const results = interpreter.interpretAll([
      { gene: 'CYP2C19', haplotype1: '*2', haplotype2: '*2' },
    ]);
    const map = interpreter.toPhenotypeMap(results);
    expect(map.get('CYP2C19')).toBe('POOR_METABOLIZER');
  });
});

describe('EvidenceInterpreter', () => {
  const interpreter = new EvidenceInterpreter();

  it('buildEvidence maps level A to HIGH confidence and STRONG grade', () => {
    const evidence = interpreter.buildEvidence({
      drug: 'warfarin', gene: 'CYP2C9', phenotype: 'POOR_METABOLIZER',
      severity: 'DOSE_REDUCTION', recommendation: 'Reduce dose', alternativeMedications: [],
      guidelineSource: 'CPIC 2017', evidenceLevel: 'A', clinicalRationale: 'Rationale',
    });
    expect(evidence.level).toBe('A');
    expect(evidence.gradeStrength).toBe('STRONG');
    expect(evidence.confidence).toBe(0.95);
    expect(evidence.source).toBe('CPIC 2017');
  });

  it('buildEvidence maps level D to INSUFFICIENT grade', () => {
    const evidence = interpreter.buildEvidence({
      drug: 'test', gene: 'CYP2D6', phenotype: 'NORMAL_METABOLIZER',
      severity: 'NO_ACTION_NEEDED', recommendation: 'None', alternativeMedications: [],
      guidelineSource: 'DPWG 2019', evidenceLevel: 'D', clinicalRationale: '',
    });
    expect(evidence.gradeStrength).toBe('INSUFFICIENT');
    expect(evidence.confidence).toBe(0.25);
  });

  it('buildExplanation includes decision path', () => {
    const explanation = interpreter.buildExplanation(
      {
        drug: 'clopidogrel', gene: 'CYP2C19', phenotype: 'POOR_METABOLIZER',
        severity: 'CONTRAINDICATED', recommendation: 'Avoid', alternativeMedications: [],
        guidelineSource: 'CPIC 2022', evidenceLevel: 'A', clinicalRationale: 'Cannot convert to active form',
      },
      'CYP2C19 Poor Metabolizer',
      'CYP2C19 *2/*2',
    );
    expect(explanation.decisionPath.length).toBeGreaterThan(0);
    expect(explanation.gradeStrength).toBe('STRONG');
    expect(explanation.guidelineUsed).toBe('CPIC 2022');
  });
});

describe('RecommendationInterpreter', () => {
  const interpreter = new RecommendationInterpreter();

  it('returns null for unsupported drug', () => {
    const result = interpreter.interpretForDrug(
      'unknown-drug',
      new Map<string, MetabolicPhenotype>([['CYP2C19', 'POOR_METABOLIZER']]),
      [],
    );
    expect(result).toBeNull();
  });

  it('returns null when no phenotype matches a rule', () => {
    const result = interpreter.interpretForDrug(
      'clopidogrel',
      new Map<string, MetabolicPhenotype>([['CYP2D6', 'POOR_METABOLIZER']]),
      [],
    );
    expect(result).toBeNull();
  });

  it('returns CONTRAINDICATED recommendation for CYP2C19 PM + clopidogrel', () => {
    const rec = interpreter.interpretForDrug(
      'clopidogrel',
      new Map<string, MetabolicPhenotype>([['CYP2C19', 'POOR_METABOLIZER']]),
      [{ gene: 'CYP2C19', haplotype1: '*2', haplotype2: '*2' }],
    );
    expect(rec).not.toBeNull();
    expect(rec!.severity).toBe('CONTRAINDICATED');
    expect(rec!.drug).toBe('clopidogrel');
    expect(rec!.gene).toBe('CYP2C19');
    expect(rec!.alternativeMedications).toContain('prasugrel');
  });

  it('returns DOSE_REDUCTION for CYP2C9 PM + warfarin', () => {
    const rec = interpreter.interpretForDrug(
      'warfarin',
      new Map<string, MetabolicPhenotype>([['CYP2C9', 'POOR_METABOLIZER']]),
      [{ gene: 'CYP2C9', haplotype1: '*3', haplotype2: '*3' }],
    );
    expect(rec).not.toBeNull();
    expect(rec!.severity).toBe('DOSE_REDUCTION');
  });

  it('returns CONTRAINDICATED for DPYD PM + 5-fu', () => {
    const rec = interpreter.interpretForDrug(
      '5-fu',
      new Map<string, MetabolicPhenotype>([['DPYD', 'POOR_METABOLIZER']]),
      [{ gene: 'DPYD', haplotype1: '*2A', haplotype2: '*2A' }],
    );
    expect(rec).not.toBeNull();
    expect(rec!.severity).toBe('CONTRAINDICATED');
  });

  it('interpretAll returns recommendations for multiple matched drugs', () => {
    const phenotypes = new Map<string, MetabolicPhenotype>([
      ['CYP2C19', 'POOR_METABOLIZER'],
      ['CYP2D6', 'POOR_METABOLIZER'],
    ]);
    const recs = interpreter.interpretAll(
      ['clopidogrel', 'codeine'],
      phenotypes,
      [
        { gene: 'CYP2C19', haplotype1: '*2', haplotype2: '*2' },
        { gene: 'CYP2D6', haplotype1: '*4', haplotype2: '*4' },
      ],
    );
    expect(recs.length).toBe(2);
  });

  it('getNoRuleRecommendation returns NO_ACTION_NEEDED recommendation', () => {
    const rec = interpreter.getNoRuleRecommendation('warfarin');
    expect(rec).not.toBeNull();
    expect(rec!.severity).toBe('NO_ACTION_NEEDED');
  });

  it('getNoRuleRecommendation returns null for unknown drug', () => {
    expect(interpreter.getNoRuleRecommendation('unknown-drug')).toBeNull();
  });
});
