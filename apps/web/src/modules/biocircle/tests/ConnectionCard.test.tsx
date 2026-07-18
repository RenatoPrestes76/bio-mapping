import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectionCard } from '../components/ConnectionCard';
import type { BioConnection } from '../types/biocircle.types';

const PENDING: BioConnection = {
  id: 'c1', requesterId: 'u1', receiverId: 'u2',
  relationshipType: 'FRIEND', status: 'PENDING',
  createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
};

const ACCEPTED: BioConnection = { ...PENDING, status: 'ACCEPTED', acceptedAt: '2025-01-02T00:00:00.000Z' };

describe('ConnectionCard', () => {
  it('renders relationship type label', () => {
    render(<ConnectionCard connection={PENDING} currentUserId="u2" />);
    expect(screen.getByText('Amigo')).toBeTruthy();
  });

  it('shows status label', () => {
    render(<ConnectionCard connection={PENDING} currentUserId="u2" />);
    expect(screen.getByText('Pendente')).toBeTruthy();
  });

  it('shows accept/reject buttons for receiver of PENDING invite', () => {
    render(
      <ConnectionCard connection={PENDING} currentUserId="u2" onAccept={vi.fn()} onReject={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Aceitar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeTruthy();
  });

  it('does not show accept/reject for requester', () => {
    render(
      <ConnectionCard connection={PENDING} currentUserId="u1" onAccept={vi.fn()} onReject={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: 'Aceitar' })).toBeNull();
  });

  it('shows remove/block buttons for ACCEPTED connection', () => {
    render(
      <ConnectionCard connection={ACCEPTED} currentUserId="u1" onRemove={vi.fn()} onBlock={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Remover' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bloquear' })).toBeTruthy();
  });

  it('calls onAccept with connection id', async () => {
    const onAccept = vi.fn();
    render(<ConnectionCard connection={PENDING} currentUserId="u2" onAccept={onAccept} onReject={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar' }));
    expect(onAccept).toHaveBeenCalledWith('c1');
  });

  it('calls onRemove with connection id', async () => {
    const onRemove = vi.fn();
    render(<ConnectionCard connection={ACCEPTED} currentUserId="u1" onRemove={onRemove} onBlock={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));
    expect(onRemove).toHaveBeenCalledWith('c1');
  });

  it('shows ACCEPTED status label', () => {
    render(<ConnectionCard connection={ACCEPTED} currentUserId="u1" />);
    expect(screen.getByText('Conectado')).toBeTruthy();
  });
});
