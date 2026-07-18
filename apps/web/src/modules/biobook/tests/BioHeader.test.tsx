import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BioHeader } from '../components/BioHeader';

const BASE = { name: 'Maria Silva', username: 'maria.silva' };

describe('BioHeader', () => {
  it('renders name and username', () => {
    render(<BioHeader {...BASE} />);
    expect(screen.getByText('Maria Silva')).toBeTruthy();
    expect(screen.getByText('@maria.silva')).toBeTruthy();
  });

  it('shows initial letter when no avatarUrl', () => {
    render(<BioHeader {...BASE} />);
    expect(screen.getByText('M')).toBeTruthy();
  });

  it('renders img when avatarUrl is provided', () => {
    render(<BioHeader {...BASE} avatarUrl="https://example.com/avatar.jpg" />);
    const img = screen.getByRole('img');
    expect(img).toBeTruthy();
    expect((img as HTMLImageElement).src).toContain('avatar.jpg');
  });

  it('shows goal and sport tags', () => {
    render(<BioHeader {...BASE} mainGoal="Emagrecer" mainSport="Natação" />);
    expect(screen.getByText('Emagrecer')).toBeTruthy();
    expect(screen.getByText('Natação')).toBeTruthy();
  });

  it('shows duration when memberSince is provided', () => {
    const memberSince = new Date(Date.now() - 60 * 86_400_000);
    render(<BioHeader {...BASE} memberSince={memberSince} />);
    expect(screen.getByText(/No Bio Mapping há/)).toBeTruthy();
  });

  it('hides duration when memberSince is absent', () => {
    render(<BioHeader {...BASE} />);
    expect(screen.queryByText(/No Bio Mapping/)).toBeNull();
  });
});
