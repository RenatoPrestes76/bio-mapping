import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskDistributionChart } from '../components/RiskDistributionChart';
import type { RiskDistribution } from '../types/population.types';

const makeDistribution = (overrides?: Partial<RiskDistribution>): RiskDistribution => ({
  counts: { LOW: 50, MODERATE: 30, HIGH: 10, VERY_HIGH: 7, CRITICAL: 3 },
  percentages: { LOW: 50, MODERATE: 30, HIGH: 10, VERY_HIGH: 7, CRITICAL: 3 },
  total: 100,
  meanRisk: 0.32,
  ...overrides,
});

describe('RiskDistributionChart', () => {
  it('renders the chart', () => {
    render(<RiskDistributionChart distribution={makeDistribution()} />);
    expect(screen.getByTestId('risk-distribution-chart')).toBeTruthy();
  });

  it('shows total patients', () => {
    render(<RiskDistributionChart distribution={makeDistribution()} />);
    expect(screen.getByTestId('total-patients').textContent).toBe('100');
  });

  it('shows mean risk as percentage', () => {
    render(<RiskDistributionChart distribution={makeDistribution()} />);
    expect(screen.getByTestId('mean-risk').textContent).toContain('32.0');
  });

  it('renders risk bar', () => {
    render(<RiskDistributionChart distribution={makeDistribution()} />);
    expect(screen.getByTestId('risk-bar')).toBeTruthy();
  });

  it('renders LOW segment', () => {
    render(<RiskDistributionChart distribution={makeDistribution()} />);
    expect(screen.getByTestId('risk-segment-low')).toBeTruthy();
  });

  it('renders CRITICAL legend', () => {
    render(<RiskDistributionChart distribution={makeDistribution()} />);
    expect(screen.getByTestId('risk-legend-critical')).toBeTruthy();
  });

  it('legend shows count and percentage', () => {
    render(<RiskDistributionChart distribution={makeDistribution()} />);
    const legend = screen.getByTestId('risk-legend-low');
    expect(legend.textContent).toContain('50');
    expect(legend.textContent).toContain('50.0%');
  });

  it('skips zero-percentage segments in bar', () => {
    const dist = makeDistribution({
      percentages: { LOW: 100, MODERATE: 0, HIGH: 0, VERY_HIGH: 0, CRITICAL: 0 },
      counts: { LOW: 100, MODERATE: 0, HIGH: 0, VERY_HIGH: 0, CRITICAL: 0 },
    });
    render(<RiskDistributionChart distribution={dist} />);
    expect(screen.queryByTestId('risk-segment-moderate')).toBeNull();
  });
});
