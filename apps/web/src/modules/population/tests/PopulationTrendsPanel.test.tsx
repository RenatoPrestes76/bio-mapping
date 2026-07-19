import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PopulationTrendsPanel } from '../components/PopulationTrendsPanel';
import type { ComputedTrend } from '../types/population.types';

const makeTrend = (key: string, direction: 'INCREASING' | 'DECREASING' | 'STABLE'): ComputedTrend => ({
  key,
  trend: {
    direction,
    slope: direction === 'INCREASING' ? 0.05 : direction === 'DECREASING' ? -0.03 : 0.001,
    changePercent: direction === 'INCREASING' ? 12 : direction === 'DECREASING' ? -8 : 1,
    isSignificant: direction !== 'STABLE',
    confidence: 0.95,
    firstValue: 10,
    lastValue: direction === 'INCREASING' ? 11.2 : direction === 'DECREASING' ? 9.2 : 10.1,
  },
});

describe('PopulationTrendsPanel', () => {
  it('shows loading state', () => {
    render(<PopulationTrendsPanel trends={[]} loading={true} />);
    expect(screen.getByTestId('trends-loading')).toBeTruthy();
  });

  it('shows empty state when no trends', () => {
    render(<PopulationTrendsPanel trends={[]} />);
    expect(screen.getByTestId('trends-empty')).toBeTruthy();
  });

  it('renders trend rows', () => {
    render(<PopulationTrendsPanel trends={[makeTrend('bmi', 'INCREASING'), makeTrend('glucose', 'DECREASING')]} />);
    expect(screen.getAllByTestId('trend-row').length).toBe(2);
  });

  it('shows direction label for INCREASING', () => {
    render(<PopulationTrendsPanel trends={[makeTrend('bmi', 'INCREASING')]} />);
    expect(screen.getByTestId('trend-direction-bmi').textContent).toContain('Crescente');
  });

  it('shows direction label for DECREASING', () => {
    render(<PopulationTrendsPanel trends={[makeTrend('glucose', 'DECREASING')]} />);
    expect(screen.getByTestId('trend-direction-glucose').textContent).toContain('Decrescente');
  });

  it('shows direction label for STABLE', () => {
    render(<PopulationTrendsPanel trends={[makeTrend('weight', 'STABLE')]} />);
    expect(screen.getByTestId('trend-direction-weight').textContent).toContain('Estável');
  });

  it('shows + sign for positive change', () => {
    render(<PopulationTrendsPanel trends={[makeTrend('bmi', 'INCREASING')]} />);
    const row = screen.getAllByTestId('trend-row')[0];
    expect(row.textContent).toContain('+12.0%');
  });

  it('data-direction attribute is set', () => {
    render(<PopulationTrendsPanel trends={[makeTrend('bmi', 'INCREASING')]} />);
    const el = screen.getByTestId('trend-direction-bmi');
    expect(el.getAttribute('data-direction')).toBe('INCREASING');
  });

  it('renders panel wrapper', () => {
    render(<PopulationTrendsPanel trends={[makeTrend('bmi', 'INCREASING')]} />);
    expect(screen.getByTestId('population-trends-panel')).toBeTruthy();
  });
});
