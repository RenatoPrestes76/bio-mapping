import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamMemberList } from '../components/TeamMemberList';
import type { BioTeamMember } from '../types/bioteams.types';

const ACTIVE: BioTeamMember = {
  id: 'm1', teamId: 't1', userId: 'user-abc', role: 'MEMBER', status: 'ACTIVE',
  joinedAt: '2026-01-01T12:00:00.000Z',
};

const PENDING: BioTeamMember = {
  id: 'm2', teamId: 't1', userId: 'user-def', role: 'COACH', status: 'PENDING',
  joinedAt: '2026-01-02T12:00:00.000Z',
};

describe('TeamMemberList', () => {
  it('renders empty state when no members', () => {
    render(<TeamMemberList members={[]} myRole="OWNER" currentUserId="u1" />);
    expect(screen.getByText('Nenhum membro encontrado.')).toBeTruthy();
  });

  it('renders member list with data-testid', () => {
    render(<TeamMemberList members={[ACTIVE]} myRole="OWNER" currentUserId="u1" />);
    expect(screen.getByTestId('member-list')).toBeTruthy();
  });

  it('shows role label for active member', () => {
    render(<TeamMemberList members={[ACTIVE]} myRole="OWNER" currentUserId="u1" />);
    expect(screen.getByText('Membro')).toBeTruthy();
  });

  it('shows ACTIVE status badge', () => {
    render(<TeamMemberList members={[ACTIVE]} myRole="OWNER" currentUserId="u1" />);
    expect(screen.getByText('Ativo')).toBeTruthy();
  });

  it('shows PENDING status badge', () => {
    render(<TeamMemberList members={[PENDING]} myRole="OWNER" currentUserId="u1" />);
    expect(screen.getByText('Pendente')).toBeTruthy();
  });

  it('shows Aceitar button for pending invite of current user', () => {
    const onAccept = vi.fn();
    render(
      <TeamMemberList
        members={[{ ...PENDING, userId: 'me' }]}
        myRole="MEMBER"
        currentUserId="me"
        onAcceptInvite={onAccept}
      />,
    );
    expect(screen.getByRole('button', { name: 'Aceitar' })).toBeTruthy();
  });

  it('shows remove button for admin viewing other active member', () => {
    const onRemove = vi.fn();
    render(
      <TeamMemberList
        members={[ACTIVE]}
        myRole="OWNER"
        currentUserId="u1"
        onRemove={onRemove}
      />,
    );
    expect(screen.getByRole('button', { name: 'Remover' })).toBeTruthy();
  });

  it('does not show remove button for non-admin', () => {
    render(<TeamMemberList members={[ACTIVE]} myRole="MEMBER" currentUserId="u1" />);
    expect(screen.queryByRole('button', { name: 'Remover' })).toBeNull();
  });

  it('calls onRemove when Remover button clicked', async () => {
    const onRemove = vi.fn();
    render(
      <TeamMemberList
        members={[ACTIVE]}
        myRole="OWNER"
        currentUserId="owner"
        onRemove={onRemove}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));
    expect(onRemove).toHaveBeenCalledWith(ACTIVE.userId);
  });
});
