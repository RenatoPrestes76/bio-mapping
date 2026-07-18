import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AchievementTimeline } from '../components/AchievementTimeline';
import type { Achievement } from '../types/biobook.types';

const ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', title: 'Primeira avaliação', achievedAt: new Date(Date.now() - 1 * 86_400_000), category: 'assessment' },
  { id: 'a2', title: '30 dias ativo', description: 'Um mês de jornada', achievedAt: new Date(Date.now() - 30 * 86_400_000), category: 'milestone' },
];

describe('AchievementTimeline', () => {
  it('shows empty state when no achievements', () => {
    render(<AchievementTimeline achievements={[]} />);
    expect(screen.getByText('Nenhuma conquista registrada ainda.')).toBeTruthy();
  });

  it('renders all achievement titles', () => {
    render(<AchievementTimeline achievements={ACHIEVEMENTS} />);
    expect(screen.getByText('Primeira avaliação')).toBeTruthy();
    expect(screen.getByText('30 dias ativo')).toBeTruthy();
  });

  it('renders description when provided', () => {
    render(<AchievementTimeline achievements={ACHIEVEMENTS} />);
    expect(screen.getByText('Um mês de jornada')).toBeTruthy();
  });

  it('renders relative dates', () => {
    render(<AchievementTimeline achievements={ACHIEVEMENTS} />);
    expect(screen.getByText('Ontem')).toBeTruthy();
    expect(screen.getByText('1 meses atrás')).toBeTruthy();
  });

  it('renders as an ordered list', () => {
    render(<AchievementTimeline achievements={ACHIEVEMENTS} />);
    expect(screen.getByRole('list')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
