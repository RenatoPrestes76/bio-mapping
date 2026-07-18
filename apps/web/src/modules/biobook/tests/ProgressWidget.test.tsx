import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressWidget } from '../components/ProgressWidget';
import type { ActiveGoal } from '../types/biobook.types';

const GOALS: ActiveGoal[] = [
  { id: 'g1', label: 'Perda de peso', progress: 60, nextMilestone: '-1 kg esta semana' },
  { id: 'g2', label: 'Corrida 5km', progress: 40 },
];

describe('ProgressWidget', () => {
  it('shows empty state when no goals', () => {
    render(<ProgressWidget goals={[]} />);
    expect(screen.getByText('Nenhuma meta ativa.')).toBeTruthy();
  });

  it('renders all goal labels', () => {
    render(<ProgressWidget goals={GOALS} />);
    expect(screen.getByText('Perda de peso')).toBeTruthy();
    expect(screen.getByText('Corrida 5km')).toBeTruthy();
  });

  it('renders progress bars with ARIA attributes', () => {
    render(<ProgressWidget goals={GOALS} />);
    const bars = screen.getAllByRole('progressbar');
    expect(bars).toHaveLength(2);
    expect(bars[0].getAttribute('aria-valuenow')).toBe('60');
    expect(bars[0].getAttribute('aria-valuemin')).toBe('0');
    expect(bars[0].getAttribute('aria-valuemax')).toBe('100');
  });

  it('shows next milestone text when provided', () => {
    render(<ProgressWidget goals={GOALS} />);
    expect(screen.getByText('→ -1 kg esta semana')).toBeTruthy();
  });

  it('hides next milestone when absent', () => {
    render(<ProgressWidget goals={GOALS} />);
    const items = screen.getAllByTestId('goal-item');
    // second goal has no nextMilestone
    expect(items[1].textContent).not.toContain('→');
  });

  it('clamps progress display to 100', () => {
    const overdone: ActiveGoal[] = [{ id: 'g3', label: 'Teste', progress: 150 }];
    render(<ProgressWidget goals={overdone} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('150');
    const fill = bar.firstChild as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });
});
