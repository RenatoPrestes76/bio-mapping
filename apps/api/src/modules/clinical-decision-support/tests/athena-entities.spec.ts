import { DecisionContext } from '../entities/decision-context.entity.js';
import { ClinicalAlert } from '../entities/clinical-alert.entity.js';
import { Contraindication } from '../entities/contraindication.entity.js';
import { DecisionEvidence } from '../entities/decision-evidence.entity.js';

const baseContext = () =>
  new DecisionContext({
    patientId: 'p1',
    demographics: { age: 55, sex: 'MALE', bmi: 27 },
    conditions: ['diabetes', 'hypertension'],
    biomarkers: [
      { marker: 'HbA1c', value: 8.5, unit: '%' },
      { marker: 'bp_systolic', value: 155, unit: 'mmHg' },
    ],
    medications: [
      { name: 'metformin', isCurrent: true },
      { name: 'lisinopril', isCurrent: true },
      { name: 'aspirin', isCurrent: false },
    ],
    allergies: ['penicillin'],
    geneticProfile: {
      variants: [{ gene: 'CYP2D6', haplotype: '*4/*4', phenotype: 'POOR_METABOLIZER' }],
    },
  });

describe('DecisionContext', () => {
  it('generates a unique id', () => {
    const ctx = baseContext();
    expect(ctx.id).toMatch(/^ctx-p1-/);
  });

  it('getBiomarker is case-insensitive', () => {
    const ctx = baseContext();
    expect(ctx.getBiomarkerValue('hba1c')).toBe(8.5);
    expect(ctx.getBiomarkerValue('HBA1C')).toBe(8.5);
  });

  it('getBiomarkerValue returns undefined for unknown marker', () => {
    expect(baseContext().getBiomarkerValue('ldl')).toBeUndefined();
  });

  it('hasCondition is case-insensitive and partial match', () => {
    const ctx = baseContext();
    expect(ctx.hasCondition('diabetes')).toBe(true);
    expect(ctx.hasCondition('HYPERTENSION')).toBe(true);
    expect(ctx.hasCondition('cancer')).toBe(false);
  });

  it('hasAllergy', () => {
    const ctx = baseContext();
    expect(ctx.hasAllergy('penicillin')).toBe(true);
    expect(ctx.hasAllergy('aspirin')).toBe(false);
  });

  it('getCurrentMedications filters isCurrent=true', () => {
    const ctx = baseContext();
    const current = ctx.getCurrentMedications();
    expect(current).toHaveLength(2);
    expect(current.map((m) => m.name)).not.toContain('aspirin');
  });

  it('hasMedication only checks current meds', () => {
    const ctx = baseContext();
    expect(ctx.hasMedication('metformin')).toBe(true);
    expect(ctx.hasMedication('aspirin')).toBe(false); // not current
  });
});

describe('ClinicalAlert', () => {
  const makeAlert = (severity: ClinicalAlert['severity']) =>
    new ClinicalAlert({
      patientId: 'p1',
      alertType: 'CRITICAL_BIOMARKER',
      severity,
      title: 'Test alert',
      message: 'Test message',
      triggeredBy: 'test',
    });

  it('generates a unique id', () => {
    const a1 = makeAlert('CRITICAL');
    const a2 = makeAlert('CRITICAL');
    expect(a1.id).toMatch(/^alert-/);
    expect(a1.id).not.toBe(a2.id);
  });

  it('isCritical returns true only for CRITICAL severity', () => {
    expect(makeAlert('CRITICAL').isCritical()).toBe(true);
    expect(makeAlert('HIGH').isCritical()).toBe(false);
  });

  it('isActive defaults to true', () => {
    expect(makeAlert('HIGH').isActive()).toBe(true);
  });

  it('actionRequired is true for CRITICAL and HIGH by default', () => {
    expect(makeAlert('CRITICAL').actionRequired).toBe(true);
    expect(makeAlert('HIGH').actionRequired).toBe(true);
    expect(makeAlert('INFORMATIONAL').actionRequired).toBe(false);
  });

  it('isExpired returns false when no expiresAt', () => {
    expect(makeAlert('CRITICAL').isExpired()).toBe(false);
  });

  it('isExpired returns true when expiresAt is in the past', () => {
    const a = new ClinicalAlert({
      patientId: 'p1',
      alertType: 'MONITORING_OVERDUE',
      severity: 'LOW',
      title: 'x',
      message: 'x',
      triggeredBy: 'test',
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(a.isExpired()).toBe(true);
  });

  it('requiresImmediateAction is false when expired', () => {
    const a = new ClinicalAlert({
      patientId: 'p1',
      alertType: 'CRITICAL_BIOMARKER',
      severity: 'CRITICAL',
      title: 'x',
      message: 'x',
      triggeredBy: 'test',
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(a.requiresImmediateAction()).toBe(false);
  });

  it('toSummary returns correct shape', () => {
    const s = makeAlert('HIGH').toSummary();
    expect(s).toHaveProperty('id');
    expect(s).toHaveProperty('severity', 'HIGH');
    expect(s.actionRequired).toBe(true);
  });
});

describe('Contraindication', () => {
  const makeCI = (severity: Contraindication['severity']) =>
    new Contraindication({
      patientId: 'p1',
      medication: 'codeine',
      contraindicationType: 'GENETIC',
      severity,
      reason: 'CYP2D6 Poor Metabolizer',
      evidenceSummary: 'CPIC guideline',
      evidenceLevel: 'A',
      geneVariant: 'CYP2D6:*4/*4',
      guideline: 'CPIC',
    });

  it('isAbsolute returns true only for CONTRAINDICATED severity', () => {
    expect(makeCI('CONTRAINDICATED').isAbsolute()).toBe(true);
    expect(makeCI('SEVERE').isAbsolute()).toBe(false);
  });

  it('requiresAlternative for CONTRAINDICATED and SEVERE', () => {
    expect(makeCI('CONTRAINDICATED').requiresAlternative()).toBe(true);
    expect(makeCI('SEVERE').requiresAlternative()).toBe(true);
    expect(makeCI('MODERATE').requiresAlternative()).toBe(false);
  });

  it('toSummary shape is correct', () => {
    const s = makeCI('CONTRAINDICATED').toSummary();
    expect(s.medication).toBe('codeine');
    expect(s.severity).toBe('CONTRAINDICATED');
    expect(s.hasAlternative).toBe(false);
  });

  it('defaults evidenceLevel to B when not provided', () => {
    const ci = new Contraindication({
      patientId: 'p1',
      medication: 'test',
      contraindicationType: 'ALLERGY',
      severity: 'MODERATE',
      reason: 'test',
      evidenceSummary: 'test',
    });
    expect(ci.evidenceLevel).toBe('B');
  });
});

describe('DecisionEvidence', () => {
  const makeEvidence = (grade: 'A' | 'B' | 'C' | 'D') =>
    new DecisionEvidence({
      topic: 'diabetes',
      sourceType: 'GUIDELINE',
      gradeLevel: grade,
      gradeStrength: grade === 'A' ? 'STRONG' : 'MODERATE',
      title: 'ADA Guidelines 2024',
      summary: 'HbA1c target <7%',
      guidelineId: 'ADA-2024',
      relevanceScore: 90,
    });

  it('isHighQuality for Grade A', () => {
    expect(makeEvidence('A').isHighQuality()).toBe(true);
    expect(makeEvidence('C').isHighQuality()).toBe(false);
  });

  it('isHighlyRelevant when relevanceScore >= 75', () => {
    expect(makeEvidence('A').isHighlyRelevant()).toBe(true);
  });

  it('relevanceScore clamped to [0, 100]', () => {
    const e = new DecisionEvidence({
      topic: 'test',
      sourceType: 'PUBMED',
      gradeLevel: 'C',
      title: 'test',
      summary: 'test',
      relevanceScore: 150,
    });
    expect(e.relevanceScore).toBe(100);
  });

  it('getCitationLabel includes grade and source', () => {
    const label = makeEvidence('A').getCitationLabel();
    expect(label).toContain('[A]');
    expect(label).toContain('ADA-2024');
  });

  it('linkedRecommendationIds defaults to empty array', () => {
    expect(makeEvidence('B').linkedRecommendationIds).toEqual([]);
  });
});
