import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircleSummary } from '../components/CircleSummary';

describe('CircleSummary', () => {
  it('renders connections, teams and invites', () => {
    render(<CircleSummary circle={{ connections: 5, teams: 2, pendingInvites: 1 }} />);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('shows invite notice when pendingInvites > 0', () => {
    render(<CircleSummary circle={{ connections: 0, teams: 0, pendingInvites: 3 }} />);
    expect(screen.getByText(/3 convites pendentes/)).toBeTruthy();
  });

  it('uses singular form for one invite', () => {
    render(<CircleSummary circle={{ connections: 0, teams: 0, pendingInvites: 1 }} />);
    expect(screen.getByText(/1 convite pendente/)).toBeTruthy();
  });

  it('hides invite notice when pendingInvites is 0', () => {
    render(<CircleSummary circle={{ connections: 2, teams: 1, pendingInvites: 0 }} />);
    expect(screen.queryByText(/convite/)).toBeNull();
  });

  it('renders stat labels', () => {
    render(<CircleSummary circle={{ connections: 0, teams: 0, pendingInvites: 0 }} />);
    expect(screen.getByText('Conexões')).toBeTruthy();
    expect(screen.getByText('Times')).toBeTruthy();
    expect(screen.getByText('Convites')).toBeTruthy();
  });
});
