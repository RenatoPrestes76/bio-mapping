import { DrugGeneInteraction } from '../entities/drug-gene-interaction.entity.js';
import { MedicationRecommendation } from '../entities/medication-recommendation.entity.js';
import { PharmacogenomicProfile } from '../entities/pharmacogenomic-profile.entity.js';

const makeInteraction = (overrides: Partial<ConstructorParameters<typeof DrugGeneInteraction>[0]> = {}) =>
  new DrugGeneInteraction({
    drugName: 'Warfarin',
    gene: 'cyp2c9',
    phenotype: 'POOR_METABOLIZER',
    severity: 'DOSE_REDUCTION',
    recommendation: 'Reduce dose by 50%',
    alternativeMedications: ['apixaban'],
    evidenceLevel: 'A',
    source: 'CPIC',
    clinicalRationale: 'Poor metabolizers have higher exposure',
    ...overrides,
  });

const makeRecommendation = (overrides: Partial<ConstructorParameters<typeof MedicationRecommendation>[0]> = {}) =>
  new MedicationRecommendation({
    drug: 'Warfarin',
    gene: 'cyp2c9',
    phenotype: 'POOR_METABOLIZER',
    severity: 'DOSE_REDUCTION',
    recommendation: 'Reduce dose',
    explanation: {
      genotypeDescription: 'CYP2C9 *2/*3',
      phenotypeDescription: 'Poor Metabolizer',
      guidelineUsed: 'CPIC 2017',
      clinicalRationale: 'Higher exposure risk',
      decisionPath: ['Step 1', 'Step 2'],
      gradeStrength: 'STRONG',
    },
    evidence: {
      level: 'A',
      source: 'CPIC',
      gradeStrength: 'STRONG',
      confidence: 0.95,
    },
    ...overrides,
  });

describe('DrugGeneInteraction', () => {
  it('normalizes drug name to lowercase and gene to uppercase', () => {
    const i = makeInteraction();
    expect(i.drugName).toBe('warfarin');
    expect(i.gene).toBe('CYP2C9');
  });

  it('isHighEvidence returns true for A and B levels', () => {
    expect(makeInteraction({ evidenceLevel: 'A' }).isHighEvidence()).toBe(true);
    expect(makeInteraction({ evidenceLevel: 'B' }).isHighEvidence()).toBe(true);
    expect(makeInteraction({ evidenceLevel: 'C' }).isHighEvidence()).toBe(false);
    expect(makeInteraction({ evidenceLevel: 'D' }).isHighEvidence()).toBe(false);
  });

  it('isContraindicated returns true only for CONTRAINDICATED', () => {
    expect(makeInteraction({ severity: 'CONTRAINDICATED' }).isContraindicated()).toBe(true);
    expect(makeInteraction({ severity: 'AVOID' }).isContraindicated()).toBe(false);
  });

  it('requiresDoseAdjustment returns true for DOSE_REDUCTION and DOSE_INCREASE', () => {
    expect(makeInteraction({ severity: 'DOSE_REDUCTION' }).requiresDoseAdjustment()).toBe(true);
    expect(makeInteraction({ severity: 'DOSE_INCREASE' }).requiresDoseAdjustment()).toBe(true);
    expect(makeInteraction({ severity: 'MONITOR' }).requiresDoseAdjustment()).toBe(false);
  });

  it('requiresClinicalAction returns false for NO_ACTION_NEEDED and MONITOR', () => {
    expect(makeInteraction({ severity: 'NO_ACTION_NEEDED' }).requiresClinicalAction()).toBe(false);
    expect(makeInteraction({ severity: 'MONITOR' }).requiresClinicalAction()).toBe(false);
    expect(makeInteraction({ severity: 'CONTRAINDICATED' }).requiresClinicalAction()).toBe(true);
    expect(makeInteraction({ severity: 'AVOID' }).requiresClinicalAction()).toBe(true);
  });

  it('assigns a unique id', () => {
    const a = makeInteraction();
    const b = makeInteraction();
    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(/^dgi-/);
  });
});

describe('MedicationRecommendation', () => {
  it('normalizes drug and gene', () => {
    const r = makeRecommendation();
    expect(r.drug).toBe('warfarin');
    expect(r.gene).toBe('CYP2C9');
  });

  it('isActionable returns false for NO_ACTION_NEEDED', () => {
    expect(makeRecommendation({ severity: 'NO_ACTION_NEEDED' }).isActionable()).toBe(false);
    expect(makeRecommendation({ severity: 'DOSE_REDUCTION' }).isActionable()).toBe(true);
  });

  it('isContraindicated matches severity', () => {
    expect(makeRecommendation({ severity: 'CONTRAINDICATED' }).isContraindicated()).toBe(true);
    expect(makeRecommendation({ severity: 'AVOID' }).isContraindicated()).toBe(false);
  });

  it('needsAlternative returns true when AVOID/CONTRAINDICATED with alternatives', () => {
    const r = makeRecommendation({ severity: 'CONTRAINDICATED', alternativeMedications: ['apixaban'] });
    expect(r.needsAlternative()).toBe(true);
  });

  it('needsAlternative returns false when alternatives are empty', () => {
    const r = makeRecommendation({ severity: 'CONTRAINDICATED', alternativeMedications: [] });
    expect(r.needsAlternative()).toBe(false);
  });

  it('getDecisionSummary returns a non-empty string', () => {
    expect(makeRecommendation().getDecisionSummary()).toBeTruthy();
  });
});

describe('PharmacogenomicProfile', () => {
  const makeProfile = () =>
    new PharmacogenomicProfile({
      patientId: 'p-001',
      genotypes: [{ gene: 'CYP2C9', haplotype1: '*2', haplotype2: '*3' }],
      phenotypes: new Map([['CYP2C9', 'POOR_METABOLIZER'], ['CYP2D6', 'ULTRA_RAPID_METABOLIZER']]),
      recommendations: [
        makeRecommendation({ severity: 'CONTRAINDICATED' }),
        makeRecommendation({ drug: 'simvastatin', severity: 'AVOID' }),
      ],
    });

  it('generates a unique id', () => {
    const a = makeProfile();
    const b = makeProfile();
    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(/^pgx-/);
  });

  it('getPhenotypeForGene returns correct phenotype', () => {
    const p = makeProfile();
    expect(p.getPhenotypeForGene('CYP2C9')).toBe('POOR_METABOLIZER');
    expect(p.getPhenotypeForGene('CYP2D6')).toBe('ULTRA_RAPID_METABOLIZER');
    expect(p.getPhenotypeForGene('UNKNOWN')).toBeUndefined();
  });

  it('getRecommendationsForDrug filters by drug', () => {
    const p = makeProfile();
    expect(p.getRecommendationsForDrug('warfarin')).toHaveLength(1);
    expect(p.getRecommendationsForDrug('simvastatin')).toHaveLength(1);
    expect(p.getRecommendationsForDrug('codeine')).toHaveLength(0);
  });

  it('hasContraindications detects CONTRAINDICATED', () => {
    expect(makeProfile().hasContraindications()).toBe(true);
  });

  it('getContraindicatedDrugs returns unique list', () => {
    const p = makeProfile();
    expect(p.getContraindicatedDrugs()).toContain('warfarin');
  });

  it('getActionableRecommendations excludes NO_ACTION_NEEDED', () => {
    const p = new PharmacogenomicProfile({
      patientId: 'p-002',
      genotypes: [],
      recommendations: [
        makeRecommendation({ severity: 'NO_ACTION_NEEDED' }),
        makeRecommendation({ severity: 'DOSE_REDUCTION' }),
      ],
    });
    expect(p.getActionableRecommendations()).toHaveLength(1);
  });

  it('hasPoorMetabolizerStatus checks phenotypes map', () => {
    expect(makeProfile().hasPoorMetabolizerStatus()).toBe(true);
  });

  it('hasUltraRapidMetabolizerStatus checks phenotypes map', () => {
    expect(makeProfile().hasUltraRapidMetabolizerStatus()).toBe(true);
  });

  it('getGenesAnalysed returns uppercased genes from genotypes', () => {
    const p = makeProfile();
    expect(p.getGenesAnalysed()).toContain('CYP2C9');
  });
});
