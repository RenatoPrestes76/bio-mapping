import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AchievementBanner } from '../components/AchievementBanner';
import type { BioBookChapter } from '../types/biobook.types';

const ACHIEVEMENT: BioBookChapter = {
  id: 'c1',
  userId: 'u1',
  title: 'Protocolo Concluído',
  chapterType: 'ACHIEVEMENT',
  summary: 'Protocolo de saúde concluído com sucesso.',
  startDate: '2025-03-15T12:00:00.000Z',
  endDate: '2025-05-15T12:00:00.000Z',
  createdAt: '2025-03-15T12:00:00.000Z',
};

describe('AchievementBanner', () => {
  it('renders the title', () => {
    render(<AchievementBanner chapter={ACHIEVEMENT} />);
    expect(screen.getByText('Protocolo Concluído')).toBeTruthy();
  });

  it('renders the summary', () => {
    render(<AchievementBanner chapter={ACHIEVEMENT} />);
    expect(screen.getByText('Protocolo de saúde concluído com sucesso.')).toBeTruthy();
  });

  it('renders "Conquista" label', () => {
    render(<AchievementBanner chapter={ACHIEVEMENT} />);
    expect(screen.getByText('Conquista')).toBeTruthy();
  });

  it('renders start date', () => {
    render(<AchievementBanner chapter={ACHIEVEMENT} />);
    expect(screen.getByText(/março/i)).toBeTruthy();
  });

  it('has accessible banner role', () => {
    render(<AchievementBanner chapter={ACHIEVEMENT} />);
    expect(screen.getByRole('banner', { name: /Conquista: Protocolo Concluído/ })).toBeTruthy();
  });
});
