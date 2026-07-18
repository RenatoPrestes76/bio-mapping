import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamCard } from '../components/TeamCard';
import type { BioTeam, BioTeamMember } from '../types/bioteams.types';

const TEAM: BioTeam = {
  id: 't1', name: 'Alpha Runners', category: 'RUNNING', visibility: 'INVITE_ONLY',
  ownerId: 'u1', description: 'Grupo de corrida', createdAt: '2026-01-01T12:00:00.000Z', updatedAt: '2026-01-01T12:00:00.000Z',
};

const MEMBER: BioTeamMember = {
  id: 'm1', teamId: 't1', userId: 'u1', role: 'OWNER', status: 'ACTIVE',
  joinedAt: '2026-01-01T12:00:00.000Z',
};

describe('TeamCard', () => {
  it('renders team name', () => {
    render(<TeamCard team={TEAM} member={MEMBER} />);
    expect(screen.getByText('Alpha Runners')).toBeTruthy();
  });

  it('renders category label in Portuguese', () => {
    render(<TeamCard team={TEAM} member={MEMBER} />);
    expect(screen.getByText(/Corrida/)).toBeTruthy();
  });

  it('renders visibility label', () => {
    render(<TeamCard team={TEAM} member={MEMBER} />);
    expect(screen.getByText(/Por convite/)).toBeTruthy();
  });

  it('renders member role badge', () => {
    render(<TeamCard team={TEAM} member={MEMBER} />);
    expect(screen.getByText('Fundador')).toBeTruthy();
  });

  it('renders description when provided', () => {
    render(<TeamCard team={TEAM} member={MEMBER} />);
    expect(screen.getByText('Grupo de corrida')).toBeTruthy();
  });

  it('calls onClick with team id when clicked', async () => {
    const onClick = vi.fn();
    render(<TeamCard team={TEAM} member={MEMBER} onClick={onClick} />);
    await userEvent.click(screen.getByTestId('team-card'));
    expect(onClick).toHaveBeenCalledWith('t1');
  });

  it('renders MEMBER role as "Membro"', () => {
    render(<TeamCard team={TEAM} member={{ ...MEMBER, role: 'MEMBER' }} />);
    expect(screen.getByText('Membro')).toBeTruthy();
  });

  it('renders COACH role as "Coach"', () => {
    render(<TeamCard team={TEAM} member={{ ...MEMBER, role: 'COACH' }} />);
    expect(screen.getByText('Coach')).toBeTruthy();
  });
});
