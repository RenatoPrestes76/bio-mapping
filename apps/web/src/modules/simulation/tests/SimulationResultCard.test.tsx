import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SimulationResultCard } from '../components/SimulationResultCard';
import type { SimulationRun, SimulationResult, SimulationAssumption } from '../types/simulation.types';

const run: SimulationRun = {
  id: 'run-1',
  patientId: 'p1',
  twinId: 'twin-1',
  createdBy: 'u1',
  scenarioType: 'SMOKING_CESSATION',
  scenarioLabel: 'Cessação do tabagismo',
  timeHorizon: 'YEAR_1',
  status: 'COMPLETED',
  modelVersion: '1.0',
  createdAt: new Date().toISOString(),
};

const result: SimulationResult = {
  id: 'result-1',
  runId: 'run-1',
  baselineRiskScore: 0.55,
  simulatedRiskScore: 0.40,
  expectedRiskVariation: -15.0,
  confidence: 0.82,
  baselineRiskLevel: 'HIGH',
  simulatedRiskLevel: 'MODERATE',
  topFactors: [
    { factor: 'Cessação do tabagismo', contribution: -0.12, description: 'Eliminação do tabagismo' },
  ],
  createdAt: new Date().toISOString(),
};

const assumptions: SimulationAssumption[] = [
  { id: 'a1', runId: 'run-1', category: 'PREMISSA', description: 'Cessação completa e mantida' },
  { id: 'a2', runId: 'run-1', category: 'LIMITAÇÃO', description: 'Risco de recaída não modelado' },
];

describe('SimulationResultCard', () => {
  it('renders the card', () => {
    render(<SimulationResultCard run={run} result={result} />);
    expect(screen.getByTestId('simulation-result-card')).toBeTruthy();
  });

  it('shows scenario label', () => {
    render(<SimulationResultCard run={run} result={result} />);
    expect(screen.getAllByText('Cessação do tabagismo').length).toBeGreaterThan(0);
  });

  it('shows baseline risk section', () => {
    render(<SimulationResultCard run={run} result={result} />);
    expect(screen.getByTestId('baseline-risk')).toBeTruthy();
  });

  it('shows simulated risk section', () => {
    render(<SimulationResultCard run={run} result={result} />);
    expect(screen.getByTestId('simulated-risk')).toBeTruthy();
  });

  it('shows risk variation badge', () => {
    render(<SimulationResultCard run={run} result={result} />);
    expect(screen.getByTestId('risk-variation-badge')).toBeTruthy();
  });

  it('shows negative variation with pp unit', () => {
    render(<SimulationResultCard run={run} result={result} />);
    expect(screen.getByTestId('risk-variation-badge').textContent).toContain('pp');
  });

  it('shows confidence score bar', () => {
    render(<SimulationResultCard run={run} result={result} />);
    expect(screen.getByTestId('confidence-score')).toBeTruthy();
  });

  it('shows confidence percentage', () => {
    render(<SimulationResultCard run={run} result={result} />);
    expect(screen.getByTestId('confidence-score').textContent).toContain('82%');
  });

  it('shows top factors when provided', () => {
    render(<SimulationResultCard run={run} result={result} />);
    expect(screen.getAllByTestId('top-factor')).toHaveLength(1);
  });

  it('shows assumption items', () => {
    render(<SimulationResultCard run={run} result={result} assumptions={assumptions} />);
    expect(screen.getAllByTestId('assumption-item')).toHaveLength(1);
  });

  it('shows limitation items', () => {
    render(<SimulationResultCard run={run} result={result} assumptions={assumptions} />);
    expect(screen.getAllByTestId('limitation-item')).toHaveLength(1);
  });

  it('renders without assumptions', () => {
    render(<SimulationResultCard run={run} result={result} />);
    expect(screen.getByTestId('simulation-result-card')).toBeTruthy();
  });
});
