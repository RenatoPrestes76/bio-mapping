import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SharedChapterCard } from '../components/SharedChapterCard';
import type { BioCircleNotification } from '../types/biocircle.types';

const UNREAD: BioCircleNotification = {
  id: 'n1', userId: 'u1', type: 'CHAPTER_SHARED',
  referenceId: 'c1', referenceType: 'bio_connections',
  read: false, createdAt: new Date(Date.now() - 86_400_000).toISOString(),
};

const READ: BioCircleNotification = { ...UNREAD, id: 'n2', read: true };

describe('SharedChapterCard', () => {
  it('renders notification type label', () => {
    render(<SharedChapterCard notification={UNREAD} />);
    expect(screen.getByText(/compartilhou um capítulo com você/)).toBeTruthy();
  });

  it('renders relative date', () => {
    render(<SharedChapterCard notification={UNREAD} />);
    expect(screen.getByText('Ontem')).toBeTruthy();
  });

  it('renders unread notification with different style', () => {
    const { container } = render(<SharedChapterCard notification={UNREAD} />);
    expect(container.querySelector('[data-testid="shared-chapter-card"]')?.className).toContain('bg-zinc-50');
  });

  it('renders read notification without highlight', () => {
    const { container } = render(<SharedChapterCard notification={READ} />);
    expect(container.querySelector('[data-testid="shared-chapter-card"]')?.className).not.toContain('bg-zinc-50');
  });

  it('renders CONNECTION_REQUEST label', () => {
    render(<SharedChapterCard notification={{ ...UNREAD, type: 'CONNECTION_REQUEST' }} />);
    expect(screen.getByText(/enviou um convite/)).toBeTruthy();
  });

  it('renders CONNECTION_ACCEPTED label', () => {
    render(<SharedChapterCard notification={{ ...UNREAD, type: 'CONNECTION_ACCEPTED' }} />);
    expect(screen.getByText(/aceitou sua conexão/)).toBeTruthy();
  });
});
