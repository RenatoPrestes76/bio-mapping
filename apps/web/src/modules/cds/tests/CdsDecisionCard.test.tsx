import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CdsDecisionCard } from '../components/CdsDecisionCard';
import type { CdsEvaluation } from '../types/cds.types';

const EVALUATION: CdsEvaluation = {
  id: 'eval-1', patientId: 'p1', priority: 'HIGH', confidence: 0.82,
  recommendation: 'Encaminhar para avaliação médica.',
  reasons: ['Suspeita de Diabetes Tipo 2', 'IMC elevado', 'HbA1c elevada'],
  evidenceLevel: 'A', requiresMedicalReview: true,
  processingTimeMs: 45, version: '1.0',
  createdAt: new Date('2026-07-18T12:00:00.000Z').toISOString(),
};

describe('CdsDecisionCard', () => {
  it('renders with data-testid', () => {
    render(<CdsDecisionCard evaluation={EVALUATION} />);
    expect(screen.getByTestId('cds-decision-card')).toBeTruthy();
  });

  it('renders priority badge', () => {
    render(<CdsDecisionCard evaluation={EVALUATION} />);
    expect(screen.getByTestId('priority-badge')).toBeTruthy();
    expect(screen.getByText('Alto')).toBeTruthy();
  });

  it('renders recommendation text', () => {
    render(<CdsDecisionCard evaluation={EVALUATION} />);
    expect(screen.getByText('Encaminhar para avaliação médica.')).toBeTruthy();
  });

  it('renders confidence percentage', () => {
    render(<CdsDecisionCard evaluation={EVALUATION} />);
    expect(screen.getByText(/82%/)).toBeTruthy();
  });

  it('renders up to 3 reasons', () => {
    render(<CdsDecisionCard evaluation={EVALUATION} />);
    expect(screen.getByText('Suspeita de Diabetes Tipo 2')).toBeTruthy();
    expect(screen.getByText('IMC elevado')).toBeTruthy();
  });

  it('shows medical review notice when required', () => {
    render(<CdsDecisionCard evaluation={EVALUATION} />);
    expect(screen.getByText(/Revisão médica necessária/)).toBeTruthy();
  });

  it('does not show medical review notice when not required', () => {
    render(<CdsDecisionCard evaluation={{ ...EVALUATION, requiresMedicalReview: false }} />);
    expect(screen.queryByText(/Revisão médica necessária/)).toBeNull();
  });

  it('calls onViewExplanation when button clicked', async () => {
    const onView = vi.fn();
    render(<CdsDecisionCard evaluation={EVALUATION} onViewExplanation={onView} />);
    await userEvent.click(screen.getByText('Ver explicação'));
    expect(onView).toHaveBeenCalledWith('eval-1');
  });

  it('calls onRecalculate when button clicked', async () => {
    const onRecalc = vi.fn();
    render(<CdsDecisionCard evaluation={EVALUATION} onRecalculate={onRecalc} />);
    await userEvent.click(screen.getByText('Recalcular'));
    expect(onRecalc).toHaveBeenCalledWith('eval-1');
  });

  it('renders evidence level', () => {
    render(<CdsDecisionCard evaluation={EVALUATION} />);
    expect(screen.getByText(/Evidência: A/)).toBeTruthy();
  });
});
