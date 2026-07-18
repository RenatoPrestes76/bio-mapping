import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PersonalizedRecommendationList } from '../components/PersonalizedRecommendationList';
import type { PersonalizedRecommendation } from '../types/precision.types';

const makeRec = (overrides: Partial<PersonalizedRecommendation> = {}): PersonalizedRecommendation => ({
  id: 'rec1',
  patientId: 'p1',
  category: 'EXERCISE',
  priority: 'HIGH',
  title: 'Exercício aeróbico',
  description: 'Praticar 150 min/semana de atividade moderada',
  reason: 'Estilo de vida sedentário identificado no perfil',
  expectedBenefit: 'Redução de risco cardiovascular',
  personalized: true,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('PersonalizedRecommendationList', () => {
  it('renders with data-testid="recommendation-list"', () => {
    render(<PersonalizedRecommendationList recommendations={[]} />);
    expect(screen.getByTestId('recommendation-list')).toBeTruthy();
  });

  it('renders empty state when no recommendations', () => {
    render(<PersonalizedRecommendationList recommendations={[]} />);
    expect(screen.getByText(/Nenhuma recomendação/)).toBeTruthy();
  });

  it('renders recommendation items', () => {
    render(<PersonalizedRecommendationList recommendations={[makeRec(), makeRec({ id: 'rec2', category: 'NUTRITION' })]} />);
    const items = screen.getAllByTestId('recommendation-item');
    expect(items.length).toBe(2);
  });

  it('each item has data-category attribute', () => {
    const { container } = render(<PersonalizedRecommendationList recommendations={[makeRec()]} />);
    expect(container.querySelector('[data-category="EXERCISE"]')).toBeTruthy();
  });

  it('each item has data-priority attribute', () => {
    const { container } = render(<PersonalizedRecommendationList recommendations={[makeRec()]} />);
    expect(container.querySelector('[data-priority="HIGH"]')).toBeTruthy();
  });

  it('renders recommendation title', () => {
    render(<PersonalizedRecommendationList recommendations={[makeRec()]} />);
    expect(screen.getByText('Exercício aeróbico')).toBeTruthy();
  });

  it('renders recommendation description', () => {
    render(<PersonalizedRecommendationList recommendations={[makeRec()]} />);
    expect(screen.getByText('Praticar 150 min/semana de atividade moderada')).toBeTruthy();
  });

  it('renders category label in Portuguese', () => {
    render(<PersonalizedRecommendationList recommendations={[makeRec({ category: 'NUTRITION' })]} />);
    expect(screen.getByText('Nutrição')).toBeTruthy();
  });

  it('renders SPECIALIST_REFERRAL category label', () => {
    render(<PersonalizedRecommendationList recommendations={[makeRec({ category: 'SPECIALIST_REFERRAL' })]} />);
    expect(screen.getByText('Encaminhamento')).toBeTruthy();
  });

  it('renders URGENT priority label', () => {
    render(<PersonalizedRecommendationList recommendations={[makeRec({ priority: 'URGENT' })]} />);
    expect(screen.getByText('Urgente')).toBeTruthy();
  });

  it('renders expectedBenefit when present', () => {
    render(<PersonalizedRecommendationList recommendations={[makeRec()]} />);
    expect(screen.getByText(/Redução de risco cardiovascular/)).toBeTruthy();
  });

  it('does not render expectedBenefit when null', () => {
    render(<PersonalizedRecommendationList recommendations={[makeRec({ expectedBenefit: null })]} />);
    expect(screen.queryByText(/Benefício esperado:/)).toBeNull();
  });
});
