import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EvolutionCard } from '../components/EvolutionCard';
import type { EvolutionMetric } from '../types/biobook.types';

const METRICS: EvolutionMetric[] = [
  { label: 'Peso', value: 78.4, unit: 'kg', trend: 'down', change: '-1.2 kg' },
  { label: 'IMC', value: 24.6, unit: '', trend: 'stable' },
];

describe('EvolutionCard', () => {
  it('renders all metric labels', () => {
    render(<EvolutionCard metrics={METRICS} />);
    expect(screen.getByText('Peso')).toBeTruthy();
    expect(screen.getByText('IMC')).toBeTruthy();
  });

  it('renders metric values with units', () => {
    render(<EvolutionCard metrics={METRICS} />);
    expect(screen.getByText('78.4')).toBeTruthy();
    expect(screen.getByText('kg')).toBeTruthy();
  });

  it('renders change text', () => {
    render(<EvolutionCard metrics={METRICS} />);
    expect(screen.getByText('-1.2 kg')).toBeTruthy();
  });

  it('shows last assessment date when provided', () => {
    const lastAssessment = new Date('2025-06-01');
    render(<EvolutionCard metrics={METRICS} lastAssessment={lastAssessment} />);
    expect(screen.getByText(/Última avaliação/)).toBeTruthy();
  });

  it('hides assessment line when not provided', () => {
    render(<EvolutionCard metrics={METRICS} />);
    expect(screen.queryByText(/Última avaliação/)).toBeNull();
  });

  it('renders trend icons with accessible labels', () => {
    render(<EvolutionCard metrics={METRICS} />);
    expect(screen.getByLabelText('descendo')).toBeTruthy();
    expect(screen.getByLabelText('estável')).toBeTruthy();
  });
});
