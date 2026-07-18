import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoryTimeline } from '../components/StoryTimeline';
import type { StoryTimelineEntry } from '../types/biobook.types';

vi.mock('../services/biobook.service', () => ({
  shareChapter: vi.fn().mockResolvedValue(null),
}));

const ENTRIES: StoryTimelineEntry[] = [
  {
    chapter: {
      id: 'c1', userId: 'u1', title: 'O Início da Jornada',
      chapterType: 'FIRST_ASSESSMENT', summary: 'Marco inicial.',
      startDate: '2025-01-01T00:00:00.000Z', createdAt: '2025-01-01T00:00:00.000Z',
    },
    events: [
      { id: 'e1', eventType: 'INSIGHT_GENERATED', severity: 'LOW', title: 'Primeiro insight', occurredAt: new Date('2025-01-10'), sourceTable: 'health_insights' },
    ],
  },
  {
    chapter: {
      id: 'c2', userId: 'u1', title: 'Protocolo Concluído',
      chapterType: 'ACHIEVEMENT', summary: 'Concluído com sucesso.',
      startDate: '2025-03-01T00:00:00.000Z', createdAt: '2025-03-01T00:00:00.000Z',
    },
    events: [],
  },
];

describe('StoryTimeline', () => {
  it('shows empty state when no entries', () => {
    render(<StoryTimeline entries={[]} />);
    expect(screen.getByText(/Nenhum capítulo ainda/)).toBeTruthy();
  });

  it('renders all chapter titles', () => {
    render(<StoryTimeline entries={ENTRIES} />);
    expect(screen.getByText('O Início da Jornada')).toBeTruthy();
  });

  it('renders ACHIEVEMENT chapter as AchievementBanner', () => {
    render(<StoryTimeline entries={ENTRIES} />);
    expect(screen.getByRole('banner', { name: /Conquista: Protocolo Concluído/ })).toBeTruthy();
  });

  it('renders events under their chapter', () => {
    render(<StoryTimeline entries={ENTRIES} />);
    expect(screen.getByText('Primeiro insight')).toBeTruthy();
  });

  it('renders share button for non-achievement chapters', () => {
    render(<StoryTimeline entries={ENTRIES} />);
    const shareBtn = screen.getByRole('button', { name: 'Compartilhar' });
    expect(shareBtn).toBeTruthy();
  });
});
