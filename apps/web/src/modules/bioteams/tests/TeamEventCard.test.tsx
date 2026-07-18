import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamEventCard } from '../components/TeamEventCard';
import type { BioTeamEvent } from '../types/bioteams.types';

const FUTURE_EVENT: BioTeamEvent = {
  id: 'e1', teamId: 't1', title: 'Corrida do Rio 2027', description: '10km pela orla',
  eventType: 'COMPETITION', startDate: '2027-06-15T08:00:00.000Z',
  location: 'Copacabana', createdBy: 'u1',
  createdAt: '2026-01-01T12:00:00.000Z', updatedAt: '2026-01-01T12:00:00.000Z',
};

const PAST_EVENT: BioTeamEvent = {
  ...FUTURE_EVENT, id: 'e2', startDate: '2025-01-01T08:00:00.000Z',
};

describe('TeamEventCard', () => {
  it('renders event title', () => {
    render(<TeamEventCard event={FUTURE_EVENT} />);
    expect(screen.getByText('Corrida do Rio 2027')).toBeTruthy();
  });

  it('renders event type label in Portuguese', () => {
    render(<TeamEventCard event={FUTURE_EVENT} />);
    expect(screen.getByText('Competição')).toBeTruthy();
  });

  it('renders location', () => {
    render(<TeamEventCard event={FUTURE_EVENT} />);
    expect(screen.getByText(/Copacabana/)).toBeTruthy();
  });

  it('shows "Próximo" badge for future events', () => {
    render(<TeamEventCard event={FUTURE_EVENT} />);
    expect(screen.getByText('Próximo')).toBeTruthy();
  });

  it('does not show "Próximo" badge for past events', () => {
    render(<TeamEventCard event={PAST_EVENT} />);
    expect(screen.queryByText('Próximo')).toBeNull();
  });

  it('renders event description', () => {
    render(<TeamEventCard event={FUTURE_EVENT} />);
    expect(screen.getByText('10km pela orla')).toBeTruthy();
  });

  it('shows generate chapter button for past events when handler provided', () => {
    const onGenerate = vi.fn();
    render(<TeamEventCard event={PAST_EVENT} onGenerateChapter={onGenerate} />);
    expect(screen.getByText('Gerar capítulo do BioBook')).toBeTruthy();
  });

  it('calls onGenerateChapter with event id', async () => {
    const onGenerate = vi.fn();
    render(<TeamEventCard event={PAST_EVENT} onGenerateChapter={onGenerate} />);
    await userEvent.click(screen.getByText('Gerar capítulo do BioBook'));
    expect(onGenerate).toHaveBeenCalledWith('e2');
  });

  it('does not show generate chapter for future events', () => {
    const onGenerate = vi.fn();
    render(<TeamEventCard event={FUTURE_EVENT} onGenerateChapter={onGenerate} />);
    expect(screen.queryByText('Gerar capítulo do BioBook')).toBeNull();
  });

  it('renders TRAINING type with "Treino" label', () => {
    render(<TeamEventCard event={{ ...FUTURE_EVENT, eventType: 'TRAINING' }} />);
    expect(screen.getByText('Treino')).toBeTruthy();
  });
});
