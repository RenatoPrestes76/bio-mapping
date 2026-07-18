import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CircleList } from '../components/CircleList';
import type { BioConnection } from '../types/biocircle.types';

const ACCEPTED: BioConnection = {
  id: 'c1', requesterId: 'u1', receiverId: 'u2',
  relationshipType: 'FRIEND', status: 'ACCEPTED',
  acceptedAt: '2025-01-02T00:00:00.000Z',
  createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-02T00:00:00.000Z',
};

const PENDING: BioConnection = {
  id: 'c2', requesterId: 'u3', receiverId: 'u1',
  relationshipType: 'COACH', status: 'PENDING',
  createdAt: '2025-01-03T00:00:00.000Z', updatedAt: '2025-01-03T00:00:00.000Z',
};

const EMPTY_HANDLERS = {
  onAccept: vi.fn(), onReject: vi.fn(), onRemove: vi.fn(), onBlock: vi.fn(),
};

describe('CircleList', () => {
  it('shows empty state for connections tab', () => {
    render(<CircleList connections={[]} receivedInvites={[]} sentInvites={[]} currentUserId="u1" {...EMPTY_HANDLERS} />);
    expect(screen.getByText('Nenhuma conexão ainda.')).toBeTruthy();
  });

  it('renders accepted connections in default tab', () => {
    render(<CircleList connections={[ACCEPTED]} receivedInvites={[]} sentInvites={[]} currentUserId="u1" {...EMPTY_HANDLERS} />);
    expect(screen.getAllByTestId('connection-card')).toHaveLength(1);
  });

  it('switches to received tab', async () => {
    render(<CircleList connections={[]} receivedInvites={[PENDING]} sentInvites={[]} currentUserId="u1" {...EMPTY_HANDLERS} />);
    await userEvent.click(screen.getByRole('tab', { name: /recebidos/i }));
    expect(screen.getByText('Coach')).toBeTruthy();
  });

  it('switches to sent tab and shows empty state', async () => {
    render(<CircleList connections={[]} receivedInvites={[]} sentInvites={[]} currentUserId="u1" {...EMPTY_HANDLERS} />);
    await userEvent.click(screen.getByRole('tab', { name: /enviados/i }));
    expect(screen.getByText('Nenhum convite enviado.')).toBeTruthy();
  });

  it('shows count badge on tabs with items', () => {
    render(<CircleList connections={[ACCEPTED]} receivedInvites={[PENDING]} sentInvites={[]} currentUserId="u1" {...EMPTY_HANDLERS} />);
    // There should be count badges
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('renders all 3 tab buttons', () => {
    render(<CircleList connections={[]} receivedInvites={[]} sentInvites={[]} currentUserId="u1" {...EMPTY_HANDLERS} />);
    expect(screen.getByRole('tab', { name: /conexões/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /recebidos/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /enviados/i })).toBeTruthy();
  });
});
