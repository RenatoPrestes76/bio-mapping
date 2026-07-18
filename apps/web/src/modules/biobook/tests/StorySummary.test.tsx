import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StorySummary } from '../components/StorySummary';
import type { BioBookChapter } from '../types/biobook.types';

const CHAPTERS: BioBookChapter[] = [
  {
    id: 'c1', userId: 'u1', title: 'O Início', chapterType: 'FIRST_ASSESSMENT',
    summary: '', startDate: '2025-01-01T00:00:00.000Z', createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'c2', userId: 'u1', title: 'Conquista', chapterType: 'ACHIEVEMENT',
    summary: '', startDate: '2025-03-01T00:00:00.000Z', createdAt: '2025-03-01T00:00:00.000Z',
  },
];

describe('StorySummary', () => {
  it('shows empty state with generate button when no chapters', () => {
    const onGenerate = vi.fn();
    render(<StorySummary chapters={[]} onGenerate={onGenerate} />);
    expect(screen.getByText('Sua história ainda não foi criada')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gerar Minha História' })).toBeTruthy();
  });

  it('calls onGenerate when button clicked (empty state)', async () => {
    const onGenerate = vi.fn();
    render(<StorySummary chapters={[]} onGenerate={onGenerate} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('shows chapter count when chapters exist', () => {
    render(<StorySummary chapters={CHAPTERS} />);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('Capítulos')).toBeTruthy();
  });

  it('shows achievement count', () => {
    render(<StorySummary chapters={CHAPTERS} />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('Conquistas')).toBeTruthy();
  });

  it('shows update button when chapters exist and onGenerate provided', () => {
    render(<StorySummary chapters={CHAPTERS} onGenerate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Atualizar Capítulos' })).toBeTruthy();
  });

  it('disables button while generating', () => {
    render(<StorySummary chapters={[]} onGenerate={vi.fn()} generating />);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('Gerando');
  });
});
