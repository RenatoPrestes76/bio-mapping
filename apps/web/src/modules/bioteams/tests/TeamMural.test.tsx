import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeamMural } from '../components/TeamMural';
import type { TeamMural as TeamMuralData, BioTeamMember, BioTeamEvent } from '../types/bioteams.types';

const EMPTY_MURAL: TeamMuralData = { chapters: [], events: [], recentJoins: [] };

const MEMBER: BioTeamMember = {
  id: 'm1', teamId: 't1', userId: 'user-abc', role: 'MEMBER', status: 'ACTIVE',
  joinedAt: '2026-01-01T12:00:00.000Z',
};

const EVENT: BioTeamEvent = {
  id: 'e1', teamId: 't1', title: 'Treino Funcional', description: undefined,
  eventType: 'TRAINING', startDate: '2025-11-01T08:00:00.000Z',
  createdBy: 'u1', createdAt: '2025-11-01T08:00:00.000Z', updatedAt: '2025-11-01T08:00:00.000Z',
};

describe('TeamMural', () => {
  it('shows empty state when no content', () => {
    render(<TeamMural mural={EMPTY_MURAL} />);
    expect(screen.getByTestId('mural-empty')).toBeTruthy();
  });

  it('renders recent joins section', () => {
    render(<TeamMural mural={{ ...EMPTY_MURAL, recentJoins: [MEMBER] }} />);
    expect(screen.getByText('Novos membros')).toBeTruthy();
    expect(screen.getByText('US')).toBeTruthy();
  });

  it('renders events section', () => {
    render(<TeamMural mural={{ ...EMPTY_MURAL, events: [EVENT] }} />);
    expect(screen.getByText('Eventos recentes')).toBeTruthy();
    expect(screen.getByText('Treino Funcional')).toBeTruthy();
  });

  it('renders chapters section', () => {
    const chapter = { id: 'c1', title: 'Meu Primeiro Treino', chapterType: 'TRAINING_CYCLE', createdAt: '2026-01-01T12:00:00.000Z', userId: 'u1' };
    render(<TeamMural mural={{ ...EMPTY_MURAL, chapters: [chapter] }} />);
    expect(screen.getByText('Capítulos BioBook')).toBeTruthy();
    expect(screen.getByText('Meu Primeiro Treino')).toBeTruthy();
  });

  it('renders mural container when content present', () => {
    render(<TeamMural mural={{ ...EMPTY_MURAL, recentJoins: [MEMBER] }} />);
    expect(screen.getByTestId('team-mural')).toBeTruthy();
  });
});
