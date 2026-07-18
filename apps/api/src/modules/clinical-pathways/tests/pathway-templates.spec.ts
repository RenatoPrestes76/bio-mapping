import { StepActionType } from '@bio/database';
import { PATHWAY_TEMPLATES, findTemplate } from '../workflow/pathway-templates.js';

describe('PATHWAY_TEMPLATES', () => {
  it('has exactly 5 templates', () => {
    expect(PATHWAY_TEMPLATES).toHaveLength(5);
  });

  it('each template has a unique templateId', () => {
    const ids = PATHWAY_TEMPLATES.map((t) => t.templateId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each template links to an ICD code', () => {
    for (const t of PATHWAY_TEMPLATES) {
      expect(t.clinicalCode).toBeTruthy();
    }
  });

  it('each template has at least 5 ordered steps', () => {
    for (const t of PATHWAY_TEMPLATES) {
      expect(t.steps.length).toBeGreaterThanOrEqual(5);
      const sequences = t.steps.map((s) => s.sequence);
      for (let i = 0; i < sequences.length; i++) expect(sequences[i]).toBe(i + 1);
    }
  });

  it('hypertension template (I10) has ASSESSMENT as first step and FOLLOW_UP as last', () => {
    const t = findTemplate('HYPERTENSION_UNCONTROLLED')!;
    expect(t.clinicalCode).toBe('I10');
    expect(t.steps[0].actionType).toBe(StepActionType.ASSESSMENT);
    expect(t.steps[t.steps.length - 1].actionType).toBe(StepActionType.FOLLOW_UP);
  });

  it('diabetes template (E11) includes NUTRITION step', () => {
    const t = findTemplate('DIABETES_HIGH_RISK')!;
    expect(t.clinicalCode).toBe('E11');
    expect(t.steps.some((s) => s.actionType === StepActionType.NUTRITION)).toBe(true);
  });

  it('obesity template (E66) includes EXERCISE step', () => {
    const t = findTemplate('SEVERE_OBESITY')!;
    expect(t.clinicalCode).toBe('E66');
    expect(t.steps.some((s) => s.actionType === StepActionType.EXERCISE)).toBe(true);
  });

  it('dyslipidemia template (E78) has MEDICATION step with statins context', () => {
    const t = findTemplate('DYSLIPIDEMIA_SIGNIFICANT')!;
    expect(t.clinicalCode).toBe('E78');
    expect(t.steps.some((s) => s.actionType === StepActionType.MEDICATION)).toBe(true);
  });

  it('metabolic syndrome template (E88.8) has 6 steps', () => {
    const t = findTemplate('METABOLIC_SYNDROME')!;
    expect(t.clinicalCode).toBe('E88.8');
    expect(t.steps).toHaveLength(6);
  });

  it('each step has non-empty title and description', () => {
    for (const t of PATHWAY_TEMPLATES) {
      for (const s of t.steps) {
        expect(s.title.length).toBeGreaterThan(0);
        expect(s.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('dueDaysFromStart is non-negative and steps are ordered by increasing due days', () => {
    for (const t of PATHWAY_TEMPLATES) {
      const days = t.steps.map((s) => s.dueDaysFromStart);
      for (const d of days) expect(d).toBeGreaterThanOrEqual(0);
      for (let i = 1; i < days.length; i++) expect(days[i]).toBeGreaterThanOrEqual(days[i - 1]);
    }
  });
});

describe('findTemplate', () => {
  it('returns the template when found', () => {
    const t = findTemplate('HYPERTENSION_UNCONTROLLED');
    expect(t).toBeDefined();
    expect(t!.templateId).toBe('HYPERTENSION_UNCONTROLLED');
  });

  it('returns undefined for unknown templateId', () => {
    expect(findTemplate('UNKNOWN_TEMPLATE')).toBeUndefined();
  });
});
