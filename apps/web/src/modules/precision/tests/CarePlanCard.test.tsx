import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CarePlanCard } from '../components/CarePlanCard';
import type { CarePlan } from '../types/precision.types';

const makePlan = (overrides: Partial<CarePlan> = {}): CarePlan => ({
  id: 'cp1',
  patientId: 'p1',
  title: 'Plano de Cuidado — Julho 2026',
  description: null,
  status: 'ACTIVE',
  startDate: new Date('2026-07-18T10:00:00.000Z').toISOString(),
  followUpDays: 30,
  createdAt: new Date('2026-07-18T10:00:00.000Z').toISOString(),
  ...overrides,
});

describe('CarePlanCard', () => {
  it('renders with data-testid="care-plan-card"', () => {
    render(<CarePlanCard plan={makePlan()} />);
    expect(screen.getByTestId('care-plan-card')).toBeTruthy();
  });

  it('has data-status attribute', () => {
    const { container } = render(<CarePlanCard plan={makePlan()} />);
    expect(container.querySelector('[data-status="ACTIVE"]')).toBeTruthy();
  });

  it('renders plan title', () => {
    render(<CarePlanCard plan={makePlan()} />);
    expect(screen.getByText('Plano de Cuidado — Julho 2026')).toBeTruthy();
  });

  it('renders description when present', () => {
    render(<CarePlanCard plan={makePlan({ description: 'Foco em controle glicêmico' })} />);
    expect(screen.getByText('Foco em controle glicêmico')).toBeTruthy();
  });

  it('does not render description when null', () => {
    render(<CarePlanCard plan={makePlan({ description: null })} />);
    expect(screen.queryByText('Foco em controle glicêmico')).toBeNull();
  });

  it('renders status badge', () => {
    render(<CarePlanCard plan={makePlan()} />);
    expect(screen.getByTestId('care-plan-status-badge')).toBeTruthy();
  });

  it('renders Portuguese label for ACTIVE status', () => {
    render(<CarePlanCard plan={makePlan({ status: 'ACTIVE' })} />);
    expect(screen.getByText('Ativo')).toBeTruthy();
  });

  it('renders Portuguese label for COMPLETED status', () => {
    render(<CarePlanCard plan={makePlan({ status: 'COMPLETED' })} />);
    expect(screen.getByText('Concluído')).toBeTruthy();
  });

  it('renders Portuguese label for DRAFT status', () => {
    render(<CarePlanCard plan={makePlan({ status: 'DRAFT' })} />);
    expect(screen.getByText('Rascunho')).toBeTruthy();
  });

  it('renders followUpDays', () => {
    render(<CarePlanCard plan={makePlan({ followUpDays: 60 })} />);
    expect(screen.getByText(/60 dias/)).toBeTruthy();
  });

  it('renders start date in pt-BR format', () => {
    render(<CarePlanCard plan={makePlan()} />);
    expect(screen.getByText(/Início:/)).toBeTruthy();
  });
});
