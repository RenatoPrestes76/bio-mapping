import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricsPanel } from '../components/MetricsPanel';
import type { ModelMetrics } from '../types/learning.types';

const METRICS: ModelMetrics = {
  id: 'm1',
  modelName: 'clinical-decision-engine',
  modelVersion: '1.0',
  accuracy: 0.82,
  precision: 0.79,
  recall: 0.85,
  specificity: 0.78,
  sensitivity: 0.85,
  f1Score: 0.82,
  rocAuc: 0.88,
  calibration: 0.9,
  sampleSize: 150,
  computedAt: new Date('2026-07-18T12:00:00.000Z').toISOString(),
};

describe('MetricsPanel', () => {
  it('renders with data-testid', () => {
    render(<MetricsPanel metrics={METRICS} />);
    expect(screen.getByTestId('metrics-panel')).toBeTruthy();
  });

  it('renders model name', () => {
    render(<MetricsPanel metrics={METRICS} />);
    expect(screen.getByText('clinical-decision-engine')).toBeTruthy();
  });

  it('renders model version', () => {
    render(<MetricsPanel metrics={METRICS} />);
    expect(screen.getByText(/v1\.0/)).toBeTruthy();
  });

  it('renders sample size', () => {
    render(<MetricsPanel metrics={METRICS} />);
    expect(screen.getByText(/150/)).toBeTruthy();
  });

  it('renders accuracy percentage', () => {
    render(<MetricsPanel metrics={METRICS} />);
    expect(screen.getAllByText('82%').length).toBeGreaterThan(0);
  });

  it('renders F1 Score label', () => {
    render(<MetricsPanel metrics={METRICS} />);
    expect(screen.getByText('F1 Score')).toBeTruthy();
  });

  it('renders ROC AUC label', () => {
    render(<MetricsPanel metrics={METRICS} />);
    expect(screen.getByText('ROC AUC')).toBeTruthy();
  });

  it('renders Calibração label', () => {
    render(<MetricsPanel metrics={METRICS} />);
    expect(screen.getByText('Calibração')).toBeTruthy();
  });

  it('renders 8 metric rows', () => {
    render(<MetricsPanel metrics={METRICS} />);
    expect(screen.getAllByTestId('metric-row')).toHaveLength(8);
  });

  it('shows dash for null metric', () => {
    render(<MetricsPanel metrics={{ ...METRICS, rocAuc: null }} />);
    expect(screen.getByText('—')).toBeTruthy();
  });
});
