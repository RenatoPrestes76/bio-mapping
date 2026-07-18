import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExplanationPanel } from '../components/ExplanationPanel';
import type { CdsExplanation, CdsEvaluation } from '../types/cds.types';

const EVAL: CdsEvaluation = {
  id: 'e1', patientId: 'p1', priority: 'HIGH', confidence: 0.82,
  recommendation: 'Avaliação médica recomendada.',
  reasons: ['HbA1c elevada', 'IMC elevado'],
  evidenceLevel: 'A', requiresMedicalReview: true,
  createdAt: new Date('2026-07-18T12:00:00.000Z').toISOString(),
};

const EXPLANATION: CdsExplanation = {
  evaluation: EVAL,
  reasons: ['HbA1c elevada', 'IMC elevado'],
  variables: { hba1c: 7.2, bmi: 33 },
  weights: { 'Suspeita de Diabetes Tipo 2': 2.0 },
  rulesTriggered: [{ id: 'builtin-001', name: 'Suspeita de Diabetes Tipo 2', priority: 'HIGH' }],
  modelsUsed: ['rule-engine', 'priority-calculator'],
  confidenceInterpretation: 'Alta',
  slaHours: 48,
  priorityColor: '#f97316',
};

describe('ExplanationPanel', () => {
  it('renders with data-testid', () => {
    render(<ExplanationPanel explanation={EXPLANATION} />);
    expect(screen.getByTestId('explanation-panel')).toBeTruthy();
  });

  it('renders recommendation', () => {
    render(<ExplanationPanel explanation={EXPLANATION} />);
    expect(screen.getByText('Avaliação médica recomendada.')).toBeTruthy();
  });

  it('renders confidence with interpretation', () => {
    render(<ExplanationPanel explanation={EXPLANATION} />);
    expect(screen.getByText(/82%/)).toBeTruthy();
    expect(screen.getByText(/Alta/)).toBeTruthy();
  });

  it('renders SLA hours', () => {
    render(<ExplanationPanel explanation={EXPLANATION} />);
    expect(screen.getByText(/48h/)).toBeTruthy();
  });

  it('renders reasons list', () => {
    render(<ExplanationPanel explanation={EXPLANATION} />);
    expect(screen.getByText('HbA1c elevada')).toBeTruthy();
    expect(screen.getByText('IMC elevado')).toBeTruthy();
  });

  it('renders triggered rules', () => {
    render(<ExplanationPanel explanation={EXPLANATION} />);
    expect(screen.getByText('Suspeita de Diabetes Tipo 2')).toBeTruthy();
  });

  it('renders clinical variables', () => {
    render(<ExplanationPanel explanation={EXPLANATION} />);
    expect(screen.getByText('hba1c')).toBeTruthy();
    expect(screen.getByText('7.2')).toBeTruthy();
  });

  it('renders models used', () => {
    render(<ExplanationPanel explanation={EXPLANATION} />);
    expect(screen.getByText('rule-engine')).toBeTruthy();
    expect(screen.getByText('priority-calculator')).toBeTruthy();
  });

  it('renders medical review badge when required', () => {
    render(<ExplanationPanel explanation={EXPLANATION} />);
    expect(screen.getByText(/Revisão médica necessária/)).toBeTruthy();
  });

  it('renders evidence level description', () => {
    render(<ExplanationPanel explanation={EXPLANATION} />);
    expect(screen.getByText(/Grau A/)).toBeTruthy();
  });
});
