import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SimulationHistoryList } from '../components/SimulationHistoryList';
import type { SimulationHistory } from '../types/simulation.types';

const history: SimulationHistory[] = [
  {
    id: 'h1',
    patientId: 'p1',
    runId: 'run-1',
    userId: 'u1',
    action: 'SIMULATION_RUN',
    summary: 'Cenário: Cessação do tabagismo | Horizonte: 1 ano | Variação: -15.0pp | Confiança: 82%',
    createdAt: new Date('2026-07-18T10:00:00Z').toISOString(),
  },
  {
    id: 'h2',
    patientId: 'p1',
    runId: 'run-2',
    userId: 'u1',
    action: 'SIMULATION_RUN',
    summary: 'Cenário: Perda de peso | Horizonte: 30 dias | Variação: -5.0pp | Confiança: 90%',
    createdAt: new Date('2026-07-17T10:00:00Z').toISOString(),
  },
];

describe('SimulationHistoryList', () => {
  it('renders the list container', () => {
    render(<SimulationHistoryList history={history} />);
    expect(screen.getByTestId('simulation-history-list')).toBeTruthy();
  });

  it('renders one item per history entry', () => {
    render(<SimulationHistoryList history={history} />);
    expect(screen.getAllByTestId('history-item')).toHaveLength(2);
  });

  it('shows summary text for each item', () => {
    render(<SimulationHistoryList history={history} />);
    expect(screen.getByText(/Cessação do tabagismo/)).toBeTruthy();
    expect(screen.getByText(/Perda de peso/)).toBeTruthy();
  });

  it('shows empty state when no history', () => {
    render(<SimulationHistoryList history={[]} />);
    expect(screen.getByTestId('simulation-history-list')).toBeTruthy();
    expect(screen.queryAllByTestId('history-item')).toHaveLength(0);
  });

  it('shows empty message when no items', () => {
    render(<SimulationHistoryList history={[]} />);
    expect(screen.getByText(/Nenhuma simulação/)).toBeTruthy();
  });

  it('shows action label', () => {
    render(<SimulationHistoryList history={history} />);
    expect(screen.getAllByText('SIMULATION_RUN')).toHaveLength(2);
  });
});
