import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LongitudinalChart } from '../components/LongitudinalChart';
import type { LongitudinalSummary } from '../types/precision.types';

const makeSummary = (overrides: Partial<LongitudinalSummary> = {}): LongitudinalSummary => ({
  metricName: 'glucose',
  min: 75,
  max: 120,
  latest: 110,
  trend: { direction: 'WORSENING', slope: 3.5, dataPoints: 8, percentChange: 12.5 },
  significantChange: false,
  ...overrides,
});

describe('LongitudinalChart', () => {
  it('renders with data-testid="longitudinal-chart"', () => {
    render(<LongitudinalChart summaries={[]} />);
    expect(screen.getByTestId('longitudinal-chart')).toBeTruthy();
  });

  it('renders empty state message when no summaries', () => {
    render(<LongitudinalChart summaries={[]} />);
    expect(screen.getByText(/Nenhuma métrica longitudinal/)).toBeTruthy();
  });

  it('renders metric rows', () => {
    render(<LongitudinalChart summaries={[makeSummary(), makeSummary({ metricName: 'hba1c' })]} />);
    const rows = screen.getAllByTestId('longitudinal-metric-row');
    expect(rows.length).toBe(2);
  });

  it('each row has data-metric attribute', () => {
    const { container } = render(<LongitudinalChart summaries={[makeSummary()]} />);
    expect(container.querySelector('[data-metric="glucose"]')).toBeTruthy();
  });

  it('each row has data-direction attribute', () => {
    const { container } = render(<LongitudinalChart summaries={[makeSummary()]} />);
    expect(container.querySelector('[data-direction="WORSENING"]')).toBeTruthy();
  });

  it('renders WORSENING direction label', () => {
    render(<LongitudinalChart summaries={[makeSummary({ trend: { direction: 'WORSENING', slope: 2, dataPoints: 5, percentChange: 8 } })]} />);
    expect(screen.getByText('Piorando')).toBeTruthy();
  });

  it('renders IMPROVING direction label', () => {
    render(<LongitudinalChart summaries={[makeSummary({ trend: { direction: 'IMPROVING', slope: -2, dataPoints: 5, percentChange: -8 } })]} />);
    expect(screen.getByText('Melhorando')).toBeTruthy();
  });

  it('renders STABLE direction label', () => {
    render(<LongitudinalChart summaries={[makeSummary({ trend: { direction: 'STABLE', slope: 0, dataPoints: 5, percentChange: 0 } })]} />);
    expect(screen.getByText('Estável')).toBeTruthy();
  });

  it('shows significant change badge when flagged', () => {
    render(<LongitudinalChart summaries={[makeSummary({ significantChange: true })]} />);
    expect(screen.getByText('Mudança significativa')).toBeTruthy();
  });

  it('does not show significant change badge when false', () => {
    render(<LongitudinalChart summaries={[makeSummary({ significantChange: false })]} />);
    expect(screen.queryByText('Mudança significativa')).toBeNull();
  });

  it('renders metric name', () => {
    render(<LongitudinalChart summaries={[makeSummary()]} />);
    expect(screen.getByText('glucose')).toBeTruthy();
  });

  it('renders min, max, and latest values', () => {
    render(<LongitudinalChart summaries={[makeSummary()]} />);
    expect(screen.getByText(/Mín:/)).toBeTruthy();
    expect(screen.getByText(/Máx:/)).toBeTruthy();
    expect(screen.getByText(/Atual:/)).toBeTruthy();
  });
});
