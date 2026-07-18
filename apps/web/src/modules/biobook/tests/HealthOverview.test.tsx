import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthOverview } from '../components/HealthOverview';
import type { HealthSummary } from '../types/biobook.types';

const HEALTH_CLEAR: HealthSummary = {
  openDecisions: 0,
  criticalDecisions: 0,
  activePathways: 2,
  pendingRecommendations: 1,
  recentTrends: [
    { metric: 'blood_pressure', trendType: 'STABLE', direction: 'STABLE', summary: 'BP estável' },
    { metric: 'bmi', trendType: 'IMPROVING', direction: 'DECREASING', summary: 'IMC caindo' },
  ],
};

const HEALTH_WITH_ALERTS: HealthSummary = {
  openDecisions: 3,
  criticalDecisions: 1,
  activePathways: 0,
  pendingRecommendations: 0,
  recentTrends: [],
};

describe('HealthOverview', () => {
  it('renders stat labels', () => {
    render(<HealthOverview health={HEALTH_CLEAR} />);
    expect(screen.getByText('Decisões em aberto')).toBeTruthy();
    expect(screen.getByText('Protocolos ativos')).toBeTruthy();
    expect(screen.getByText('Recomendações pendentes')).toBeTruthy();
  });

  it('renders stat values', () => {
    render(<HealthOverview health={HEALTH_CLEAR} />);
    // 0, 0, 2, 1 values
    const twos = screen.getAllByText('2');
    expect(twos.length).toBeGreaterThan(0);
  });

  it('shows trend metrics when present', () => {
    render(<HealthOverview health={HEALTH_CLEAR} />);
    expect(screen.getByText('blood_pressure')).toBeTruthy();
    expect(screen.getByText('bmi')).toBeTruthy();
    expect(screen.getByText('Estável')).toBeTruthy();
    expect(screen.getByText('Melhorando')).toBeTruthy();
  });

  it('hides trends section when recentTrends is empty', () => {
    render(<HealthOverview health={HEALTH_WITH_ALERTS} />);
    expect(screen.queryByText('Tendências recentes')).toBeNull();
  });

  it('renders critical count', () => {
    render(<HealthOverview health={HEALTH_WITH_ALERTS} />);
    // 3 and 1
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });
});
