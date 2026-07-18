import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskStratificationCard } from '../components/RiskStratificationCard';
import type { PersonalizedRisk } from '../types/precision.types';

const makeRisk = (overrides: Partial<PersonalizedRisk> = {}): PersonalizedRisk => ({
  id: 'ri1',
  patientId: 'p1',
  profileId: 'pr1',
  baseRiskScore: 0.3,
  familyHistoryAdj: 0.08,
  lifestyleAdj: 0.15,
  trendAdj: 0,
  finalRiskScore: 0.53,
  riskLevel: 'HIGH',
  factors: ['Tabagismo (+12%)', 'Histórico familiar (+8%)'],
  createdAt: new Date('2026-07-18T10:00:00.000Z').toISOString(),
  ...overrides,
});

describe('RiskStratificationCard', () => {
  it('renders with data-testid="risk-stratification-card"', () => {
    render(<RiskStratificationCard risk={makeRisk()} />);
    expect(screen.getByTestId('risk-stratification-card')).toBeTruthy();
  });

  it('has data-risk-level attribute', () => {
    const { container } = render(<RiskStratificationCard risk={makeRisk()} />);
    expect(container.querySelector('[data-risk-level="HIGH"]')).toBeTruthy();
  });

  it('renders risk level badge', () => {
    render(<RiskStratificationCard risk={makeRisk()} />);
    expect(screen.getByTestId('risk-level-badge')).toBeTruthy();
  });

  it('renders Portuguese risk level label for HIGH', () => {
    render(<RiskStratificationCard risk={makeRisk()} />);
    expect(screen.getByText('Alto')).toBeTruthy();
  });

  it('renders Portuguese label for VERY_HIGH', () => {
    render(<RiskStratificationCard risk={makeRisk({ riskLevel: 'VERY_HIGH', finalRiskScore: 0.85 })} />);
    expect(screen.getByText('Muito Alto')).toBeTruthy();
  });

  it('renders Portuguese label for MODERATE', () => {
    render(<RiskStratificationCard risk={makeRisk({ riskLevel: 'MODERATE', finalRiskScore: 0.4 })} />);
    expect(screen.getByText('Moderado')).toBeTruthy();
  });

  it('renders Portuguese label for LOW', () => {
    render(<RiskStratificationCard risk={makeRisk({ riskLevel: 'LOW', finalRiskScore: 0.15 })} />);
    expect(screen.getByText('Baixo')).toBeTruthy();
  });

  it('renders Portuguese label for VERY_LOW', () => {
    render(<RiskStratificationCard risk={makeRisk({ riskLevel: 'VERY_LOW', finalRiskScore: 0.05 })} />);
    expect(screen.getByText('Muito Baixo')).toBeTruthy();
  });

  it('renders score percentage', () => {
    render(<RiskStratificationCard risk={makeRisk({ finalRiskScore: 0.53 })} />);
    expect(screen.getByTestId('risk-score').textContent).toBe('53%');
  });

  it('renders risk factors when present', () => {
    render(<RiskStratificationCard risk={makeRisk()} />);
    const factors = screen.getAllByTestId('risk-factor');
    expect(factors.length).toBe(2);
  });

  it('does not render factors section when empty', () => {
    render(<RiskStratificationCard risk={makeRisk({ factors: [] })} />);
    expect(screen.queryByTestId('risk-factor')).toBeNull();
  });

  it('renders breakdown components section', () => {
    render(<RiskStratificationCard risk={makeRisk()} />);
    expect(screen.getByText('Base')).toBeTruthy();
    expect(screen.getByText('Histórico familiar')).toBeTruthy();
    expect(screen.getByText('Estilo de vida')).toBeTruthy();
  });
});
