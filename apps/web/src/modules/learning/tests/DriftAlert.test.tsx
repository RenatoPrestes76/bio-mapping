import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DriftAlert } from '../components/DriftAlert';
import type { ModelDriftEvent } from '../types/learning.types';

const BASE_EVENT: ModelDriftEvent = {
  id: 'dr1',
  modelName: 'clinical-decision-engine',
  driftType: 'CONCEPT_DRIFT',
  driftScore: 0.25,
  threshold: 0.15,
  features: null,
  severity: 'MODERATE',
  resolved: false,
  createdAt: new Date('2026-07-18T12:00:00.000Z').toISOString(),
};

describe('DriftAlert', () => {
  it('renders with role="alert"', () => {
    render(<DriftAlert event={BASE_EVENT} />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('has data-testid="drift-alert"', () => {
    render(<DriftAlert event={BASE_EVENT} />);
    expect(screen.getByTestId('drift-alert')).toBeTruthy();
  });

  it('has data-severity attribute', () => {
    const { container } = render(<DriftAlert event={BASE_EVENT} />);
    expect(container.querySelector('[data-severity="MODERATE"]')).toBeTruthy();
  });

  it('has data-drift-type attribute', () => {
    const { container } = render(<DriftAlert event={BASE_EVENT} />);
    expect(container.querySelector('[data-drift-type="CONCEPT_DRIFT"]')).toBeTruthy();
  });

  it('renders drift type label in Portuguese', () => {
    render(<DriftAlert event={BASE_EVENT} />);
    expect(screen.getByText('Concept Drift')).toBeTruthy();
  });

  it('renders DATA_DRIFT label', () => {
    render(<DriftAlert event={{ ...BASE_EVENT, driftType: 'DATA_DRIFT' }} />);
    expect(screen.getByText('Data Drift')).toBeTruthy();
  });

  it('renders FEATURE_DRIFT label', () => {
    render(<DriftAlert event={{ ...BASE_EVENT, driftType: 'FEATURE_DRIFT' }} />);
    expect(screen.getByText('Feature Drift')).toBeTruthy();
  });

  it('renders POPULATION_DRIFT label', () => {
    render(<DriftAlert event={{ ...BASE_EVENT, driftType: 'POPULATION_DRIFT' }} />);
    expect(screen.getByText('Population Drift')).toBeTruthy();
  });

  it('renders model name', () => {
    render(<DriftAlert event={BASE_EVENT} />);
    expect(screen.getByText('clinical-decision-engine')).toBeTruthy();
  });

  it('renders drift score', () => {
    render(<DriftAlert event={BASE_EVENT} />);
    expect(screen.getByText(/0\.2500/)).toBeTruthy();
  });

  it('renders CRITICAL severity with different styling', () => {
    const { container } = render(<DriftAlert event={{ ...BASE_EVENT, severity: 'CRITICAL' }} />);
    const el = container.querySelector('[data-severity="CRITICAL"]');
    expect(el?.className).toContain('red');
  });

  it('renders affected features when provided', () => {
    render(<DriftAlert event={{ ...BASE_EVENT, features: ['bmi', 'hba1c'] }} />);
    expect(screen.getByText('bmi')).toBeTruthy();
    expect(screen.getByText('hba1c')).toBeTruthy();
  });

  it('does not render features section when null', () => {
    render(<DriftAlert event={BASE_EVENT} />);
    expect(screen.queryByText('bmi')).toBeNull();
  });
});
