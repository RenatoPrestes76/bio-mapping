import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScenarioComparison } from '../components/ScenarioComparison';
import type { SimulationComparison } from '../types/simulation.types';

const comparison: SimulationComparison = {
  entries: [
    {
      runId: 'r1',
      scenarioLabel: 'Cessação do tabagismo',
      timeHorizonLabel: '1 ano',
      baselineRiskScore: 0.55,
      simulatedRiskScore: 0.40,
      expectedRiskVariation: -15.0,
      expectedRiskVariationPercent: -27.3,
      confidence: 0.82,
      riskTrend: 'REDUCTION',
      baselineRiskLevel: 'HIGH',
      simulatedRiskLevel: 'MODERATE',
    },
    {
      runId: 'r2',
      scenarioLabel: 'Ganho de peso',
      timeHorizonLabel: '1 ano',
      baselineRiskScore: 0.55,
      simulatedRiskScore: 0.65,
      expectedRiskVariation: 10.0,
      expectedRiskVariationPercent: 18.2,
      confidence: 0.78,
      riskTrend: 'INCREASE',
      baselineRiskLevel: 'HIGH',
      simulatedRiskLevel: 'VERY_HIGH',
    },
  ],
  bestScenario: 'Cessação do tabagismo',
  worstScenario: 'Ganho de peso',
  averageVariation: -2.5,
  summary: '1 cenário(s) com redução estimada de risco; 1 cenário(s) com aumento estimado de risco.',
};

const emptyComparison: SimulationComparison = {
  entries: [],
  bestScenario: null,
  worstScenario: null,
  averageVariation: 0,
  summary: 'Nenhuma simulação para comparar.',
};

describe('ScenarioComparison', () => {
  it('renders the comparison card', () => {
    render(<ScenarioComparison comparison={comparison} />);
    expect(screen.getByTestId('scenario-comparison')).toBeTruthy();
  });

  it('shows summary text', () => {
    render(<ScenarioComparison comparison={comparison} />);
    expect(screen.getByTestId('comparison-summary').textContent).toBeTruthy();
  });

  it('shows best scenario', () => {
    render(<ScenarioComparison comparison={comparison} />);
    expect(screen.getByTestId('best-scenario').textContent).toContain('Cessação do tabagismo');
  });

  it('shows worst scenario', () => {
    render(<ScenarioComparison comparison={comparison} />);
    expect(screen.getByTestId('worst-scenario').textContent).toContain('Ganho de peso');
  });

  it('shows average variation', () => {
    render(<ScenarioComparison comparison={comparison} />);
    expect(screen.getByTestId('average-variation').textContent).toBeTruthy();
  });

  it('renders one row per entry', () => {
    render(<ScenarioComparison comparison={comparison} />);
    expect(screen.getAllByTestId('comparison-row')).toHaveLength(2);
  });

  it('row has correct data-trend attribute', () => {
    render(<ScenarioComparison comparison={comparison} />);
    const rows = screen.getAllByTestId('comparison-row');
    const trends = rows.map((r) => r.getAttribute('data-trend'));
    expect(trends).toContain('REDUCTION');
    expect(trends).toContain('INCREASE');
  });

  it('shows em-dash for null bestScenario in empty comparison', () => {
    render(<ScenarioComparison comparison={emptyComparison} />);
    expect(screen.getByTestId('best-scenario').textContent).toContain('—');
  });

  it('renders empty table for no entries', () => {
    render(<ScenarioComparison comparison={emptyComparison} />);
    expect(screen.queryAllByTestId('comparison-row')).toHaveLength(0);
  });
});
