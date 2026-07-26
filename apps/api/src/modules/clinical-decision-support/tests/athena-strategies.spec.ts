import { DecisionContext } from '../entities/decision-context.entity.js';
import {
  PreventiveStrategy,
  DiagnosticStrategy,
  TherapeuticStrategy,
  MonitoringStrategy,
  LifestyleStrategy,
  EmergencyStrategy,
} from '../strategies/athena-strategies.js';
import { DecisionStrategyRegistry } from '../registry/decision-strategy.registry.js';
import { AlertRegistry } from '../registry/alert.registry.js';
import { EvidenceRegistry } from '../registry/evidence.registry.js';
import { ClinicalAlert } from '../entities/clinical-alert.entity.js';
import { DecisionEvidence } from '../entities/decision-evidence.entity.js';

const makeCtx = (overrides: Partial<ConstructorParameters<typeof DecisionContext>[0]> = {}) =>
  new DecisionContext({
    patientId: 'p1',
    demographics: { age: 55, sex: 'MALE', bmi: 26 },
    conditions: [],
    biomarkers: [],
    medications: [],
    allergies: [],
    ...overrides,
  });

describe('PreventiveStrategy', () => {
  const strategy = new PreventiveStrategy();

  it('type is PREVENTIVE', () => {
    expect(strategy.type).toBe('PREVENTIVE');
  });

  it('recommends colorectal screening for age >= 50', () => {
    const ctx = makeCtx({ demographics: { age: 55, sex: 'MALE' } });
    const recs = strategy.evaluate(ctx);
    expect(recs.some((r) => r.action.toLowerCase().includes('colorectal'))).toBe(true);
  });

  it('no colorectal screening for age < 50', () => {
    const ctx = makeCtx({ demographics: { age: 35, sex: 'FEMALE' } });
    const recs = strategy.evaluate(ctx);
    expect(recs.some((r) => r.action.toLowerCase().includes('colorectal'))).toBe(false);
  });

  it('recommends weight management for BMI >= 25', () => {
    const ctx = makeCtx({ demographics: { age: 40, sex: 'MALE', bmi: 28 } });
    const recs = strategy.evaluate(ctx);
    expect(recs.some((r) => r.action.toLowerCase().includes('weight'))).toBe(true);
  });
});

describe('DiagnosticStrategy', () => {
  const strategy = new DiagnosticStrategy();

  it('recommends HbA1c when diabetes present and no HbA1c biomarker', () => {
    const ctx = makeCtx({ conditions: ['diabetes'] });
    const recs = strategy.evaluate(ctx);
    expect(recs.some((r) => r.action.toLowerCase().includes('hba1c'))).toBe(true);
  });

  it('no HbA1c recommendation when already measured', () => {
    const ctx = makeCtx({
      conditions: ['diabetes'],
      biomarkers: [{ marker: 'hba1c', value: 7.5, unit: '%' }],
    });
    const recs = strategy.evaluate(ctx);
    expect(recs.some((r) => r.action.toLowerCase().includes('hba1c'))).toBe(false);
  });

  it('recommends lipid panel for dyslipidemia without LDL', () => {
    const ctx = makeCtx({ conditions: ['dyslipidemia'] });
    const recs = strategy.evaluate(ctx);
    expect(recs.some((r) => r.action.toLowerCase().includes('lipid'))).toBe(true);
  });
});

describe('TherapeuticStrategy', () => {
  const strategy = new TherapeuticStrategy();

  it('recommends intensifying glycemic management for HbA1c > 9', () => {
    const ctx = makeCtx({
      conditions: ['diabetes'],
      biomarkers: [{ marker: 'hba1c', value: 9.5, unit: '%' }],
    });
    const recs = strategy.evaluate(ctx);
    expect(recs.some((r) => r.action.toLowerCase().includes('glycemic'))).toBe(true);
    expect(recs[0].urgency).toBe('SHORT_TERM');
  });

  it('recommends IMMEDIATE action for systolic BP >= 180', () => {
    const ctx = makeCtx({
      conditions: ['hypertension'],
      biomarkers: [{ marker: 'bp_systolic', value: 185, unit: 'mmHg' }],
    });
    const recs = strategy.evaluate(ctx);
    expect(recs.some((r) => r.urgency === 'IMMEDIATE')).toBe(true);
  });

  it('recommends statin for LDL > 160 with dyslipidemia', () => {
    const ctx = makeCtx({
      conditions: ['dyslipidemia'],
      biomarkers: [{ marker: 'ldl', value: 180, unit: 'mg/dL' }],
    });
    const recs = strategy.evaluate(ctx);
    expect(recs.some((r) => r.action.toLowerCase().includes('statin'))).toBe(true);
  });

  it('returns empty for healthy patient', () => {
    const recs = strategy.evaluate(makeCtx());
    expect(recs).toHaveLength(0);
  });
});

describe('MonitoringStrategy', () => {
  const strategy = new MonitoringStrategy();

  it('recommends quarterly HbA1c for diabetes', () => {
    const ctx = makeCtx({ conditions: ['diabetes'] });
    const recs = strategy.evaluate(ctx);
    expect(recs.some((r) => r.action.toLowerCase().includes('hba1c'))).toBe(true);
  });

  it('recommends eGFR monitoring for CKD', () => {
    const ctx = makeCtx({ conditions: ['ckd'] });
    const recs = strategy.evaluate(ctx);
    expect(recs.some((r) => r.action.toLowerCase().includes('egfr'))).toBe(true);
  });

  it('recommends liver enzymes for statin patient', () => {
    const ctx = makeCtx({ medications: [{ name: 'atorvastatin', isCurrent: true }] });
    const recs = strategy.evaluate(ctx);
    expect(recs.some((r) => r.action.toLowerCase().includes('liver'))).toBe(true);
  });
});

describe('LifestyleStrategy', () => {
  const strategy = new LifestyleStrategy();

  it('always includes smoking cessation', () => {
    const recs = strategy.evaluate(makeCtx());
    expect(recs.some((r) => r.action.toLowerCase().includes('smoking'))).toBe(true);
  });

  it('recommends dietary intervention for diabetes', () => {
    const ctx = makeCtx({ conditions: ['diabetes'] });
    const recs = strategy.evaluate(ctx);
    expect(recs.some((r) => r.action.toLowerCase().includes('diet'))).toBe(true);
  });

  it('recommends exercise for hypertension', () => {
    const ctx = makeCtx({ conditions: ['hypertension'] });
    const recs = strategy.evaluate(ctx);
    expect(recs.some((r) => r.action.toLowerCase().includes('exercise'))).toBe(true);
  });
});

describe('EmergencyStrategy', () => {
  const strategy = new EmergencyStrategy();

  it('generates IMMEDIATE recommendation for severe hypoglycemia (glucose < 50)', () => {
    const ctx = makeCtx({
      biomarkers: [{ marker: 'glucose', value: 35, unit: 'mg/dL' }],
    });
    const recs = strategy.evaluate(ctx);
    expect(recs.some((r) => r.urgency === 'IMMEDIATE' && r.action.toLowerCase().includes('glucose'))).toBe(true);
  });

  it('generates IMMEDIATE recommendation for hypertensive crisis (BP >= 180)', () => {
    const ctx = makeCtx({
      biomarkers: [{ marker: 'bp_systolic', value: 195, unit: 'mmHg' }],
    });
    const recs = strategy.evaluate(ctx);
    expect(recs.some((r) => r.urgency === 'IMMEDIATE')).toBe(true);
  });

  it('returns empty for normal values', () => {
    const recs = strategy.evaluate(makeCtx());
    expect(recs).toHaveLength(0);
  });
});

describe('DecisionStrategyRegistry', () => {
  const registry = new DecisionStrategyRegistry();

  it('has all 6 strategies registered', () => {
    expect(registry.types()).toHaveLength(6);
  });

  it('get returns correct strategy', () => {
    expect(registry.get('EMERGENCY')).toBeDefined();
    expect(registry.get('PREVENTIVE')).toBeDefined();
  });

  it('getAll returns strategies sorted by priority', () => {
    const strategies = registry.getAll();
    for (let i = 1; i < strategies.length; i++) {
      expect(strategies[i].priority).toBeGreaterThanOrEqual(strategies[i - 1].priority);
    }
  });

  it('custom strategy can be registered', () => {
    const custom = { type: 'CUSTOM', priority: 99, evaluate: () => [] };
    registry.register(custom);
    expect(registry.has('CUSTOM')).toBe(true);
  });
});

describe('AlertRegistry', () => {
  const registry = new AlertRegistry();

  const makeAlert = (patientId = 'p1') =>
    new ClinicalAlert({
      patientId,
      alertType: 'CRITICAL_BIOMARKER',
      severity: 'CRITICAL',
      title: 'Test',
      message: 'Test message',
      triggeredBy: 'test',
    });

  it('register and retrieve by patient', () => {
    registry.register(makeAlert());
    expect(registry.getByPatient('p1').length).toBeGreaterThan(0);
  });

  it('getCriticalByPatient returns only CRITICAL active alerts', () => {
    const reg2 = new AlertRegistry();
    reg2.register(makeAlert('p2'));
    const criticals = reg2.getCriticalByPatient('p2');
    expect(criticals.every((a) => a.isCritical())).toBe(true);
  });

  it('deduplicates identical alert types', () => {
    const reg3 = new AlertRegistry();
    const alert = makeAlert('p3');
    reg3.register(alert);
    reg3.register(alert); // same type/title
    expect(reg3.countByPatient('p3')).toBe(1);
  });

  it('returns empty array for unknown patient', () => {
    expect(registry.getByPatient('unknown')).toHaveLength(0);
  });
});

describe('EvidenceRegistry', () => {
  const registry = new EvidenceRegistry();

  const makeEvidence = (topic: string, guidelineId?: string) =>
    new DecisionEvidence({
      topic,
      sourceType: 'GUIDELINE',
      gradeLevel: 'A',
      title: `${topic} Guideline`,
      summary: `${topic} evidence`,
      guidelineId,
    });

  it('findByTopic returns attached evidence', () => {
    registry.attach(makeEvidence('diabetes', 'ADA-2024'));
    expect(registry.findByTopic('diabetes').length).toBeGreaterThan(0);
  });

  it('findByGrade returns correct grade', () => {
    const reg2 = new EvidenceRegistry();
    reg2.attach(makeEvidence('diabetes', 'ADA-2024'));
    expect(reg2.findByGrade('A').length).toBeGreaterThan(0);
    expect(reg2.findByGrade('D')).toHaveLength(0);
  });

  it('prevents duplicate guidelineId entries', () => {
    const reg3 = new EvidenceRegistry();
    reg3.attach(makeEvidence('diabetes', 'ADA-2024'));
    reg3.attach(makeEvidence('diabetes', 'ADA-2024'));
    expect(reg3.totalCount()).toBe(1);
  });

  it('getHighQuality filters correctly', () => {
    const reg4 = new EvidenceRegistry();
    reg4.attach(makeEvidence('diabetes', 'G1'));
    reg4.attach(new DecisionEvidence({ topic: 'other', sourceType: 'PUBMED', gradeLevel: 'D', title: 'test', summary: 'test' }));
    expect(reg4.getHighQuality().every((e) => e.isHighQuality())).toBe(true);
  });
});
