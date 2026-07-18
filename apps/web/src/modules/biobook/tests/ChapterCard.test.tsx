import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChapterCard } from '../components/ChapterCard';
import type { BioBookChapter } from '../types/biobook.types';

const CHAPTER: BioBookChapter = {
  id: 'c1',
  userId: 'u1',
  title: 'O Início da Jornada',
  subtitle: 'Primeira avaliação registrada',
  chapterType: 'FIRST_ASSESSMENT',
  summary: 'Marco inicial da jornada.',
  startDate: '2025-01-01T00:00:00.000Z',
  createdAt: '2025-01-01T00:00:00.000Z',
};

describe('ChapterCard', () => {
  it('renders chapter title', () => {
    render(<ChapterCard chapter={CHAPTER} />);
    expect(screen.getByText('O Início da Jornada')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    render(<ChapterCard chapter={CHAPTER} />);
    expect(screen.getByText('Primeira avaliação registrada')).toBeTruthy();
  });

  it('renders chapter type label', () => {
    render(<ChapterCard chapter={CHAPTER} />);
    expect(screen.getByText('Início da Jornada')).toBeTruthy();
  });

  it('renders summary text', () => {
    render(<ChapterCard chapter={CHAPTER} />);
    expect(screen.getByText('Marco inicial da jornada.')).toBeTruthy();
  });

  it('renders event count when > 0', () => {
    render(<ChapterCard chapter={CHAPTER} eventCount={3} />);
    expect(screen.getByText('3 eventos')).toBeTruthy();
  });

  it('does not render event count when 0', () => {
    render(<ChapterCard chapter={CHAPTER} eventCount={0} />);
    expect(screen.queryByText(/evento/)).toBeNull();
  });

  it('renders share button when onShare is provided', () => {
    render(<ChapterCard chapter={CHAPTER} onShare={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Compartilhar' })).toBeTruthy();
  });

  it('calls onShare with chapter id when share button clicked', async () => {
    const onShare = vi.fn();
    render(<ChapterCard chapter={CHAPTER} onShare={onShare} />);
    await userEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));
    expect(onShare).toHaveBeenCalledWith('c1');
  });

  it('does not render share button when onShare is absent', () => {
    render(<ChapterCard chapter={CHAPTER} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders end date when provided', () => {
    const chapter = { ...CHAPTER, endDate: '2025-06-01T00:00:00.000Z' };
    render(<ChapterCard chapter={chapter} />);
    expect(screen.getByText(/—/)).toBeTruthy();
  });
});
