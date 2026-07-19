import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PopulationAlertList } from '../components/PopulationAlertList';
import type { PopulationAlert } from '../types/population.types';

const makeAlert = (overrides?: Partial<PopulationAlert>): PopulationAlert => ({
  id: 'alert-1',
  alertType: 'RISK_INCREASE',
  severity: 'HIGH',
  title: 'Aumento de risco detectado',
  description: 'O risco médio aumentou 15% no último período.',
  isActive: true,
  currentValue: 0.55,
  previousValue: 0.40,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('PopulationAlertList', () => {
  it('shows loading state', () => {
    render(<PopulationAlertList alerts={[]} loading={true} />);
    expect(screen.getByTestId('alerts-loading')).toBeTruthy();
  });

  it('shows empty state when no active alerts', () => {
    render(<PopulationAlertList alerts={[]} />);
    expect(screen.getByTestId('alerts-empty')).toBeTruthy();
  });

  it('renders alert items', () => {
    render(<PopulationAlertList alerts={[makeAlert(), makeAlert({ id: 'alert-2', severity: 'CRITICAL' })]} />);
    expect(screen.getAllByTestId('alert-item').length).toBe(2);
  });

  it('shows alert title', () => {
    render(<PopulationAlertList alerts={[makeAlert()]} />);
    expect(screen.getByTestId('alert-title').textContent).toContain('Aumento de risco');
  });

  it('shows alert description', () => {
    render(<PopulationAlertList alerts={[makeAlert()]} />);
    expect(screen.getByTestId('alert-description').textContent).toContain('risco médio');
  });

  it('shows severity badge', () => {
    render(<PopulationAlertList alerts={[makeAlert()]} />);
    expect(screen.getByTestId('alert-severity-badge').textContent).toContain('Alto');
  });

  it('data-severity attribute is set', () => {
    render(<PopulationAlertList alerts={[makeAlert()]} />);
    expect(screen.getByTestId('alert-item').getAttribute('data-severity')).toBe('HIGH');
  });

  it('renders acknowledge button when handler provided', () => {
    render(<PopulationAlertList alerts={[makeAlert()]} onAcknowledge={vi.fn()} />);
    expect(screen.getByTestId('acknowledge-btn')).toBeTruthy();
  });

  it('calls onAcknowledge with correct id', () => {
    const onAck = vi.fn();
    render(<PopulationAlertList alerts={[makeAlert()]} onAcknowledge={onAck} />);
    fireEvent.click(screen.getByTestId('acknowledge-btn'));
    expect(onAck).toHaveBeenCalledWith('alert-1');
  });

  it('filters out inactive alerts', () => {
    const inactive = makeAlert({ isActive: false });
    render(<PopulationAlertList alerts={[inactive]} />);
    expect(screen.getByTestId('alerts-empty')).toBeTruthy();
  });

  it('CRITICAL severity badge shows Crítico', () => {
    render(<PopulationAlertList alerts={[makeAlert({ severity: 'CRITICAL' })]} />);
    expect(screen.getByTestId('alert-severity-badge').textContent).toContain('Crítico');
  });
});
