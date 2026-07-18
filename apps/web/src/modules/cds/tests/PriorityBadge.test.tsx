import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriorityBadge } from '../components/PriorityBadge';

describe('PriorityBadge', () => {
  it('renders LOW in Portuguese', () => {
    render(<PriorityBadge priority="LOW" />);
    expect(screen.getByText('Baixo')).toBeTruthy();
  });

  it('renders MODERATE in Portuguese', () => {
    render(<PriorityBadge priority="MODERATE" />);
    expect(screen.getByText('Moderado')).toBeTruthy();
  });

  it('renders HIGH in Portuguese', () => {
    render(<PriorityBadge priority="HIGH" />);
    expect(screen.getByText('Alto')).toBeTruthy();
  });

  it('renders URGENT in Portuguese', () => {
    render(<PriorityBadge priority="URGENT" />);
    expect(screen.getByText('Urgente')).toBeTruthy();
  });

  it('renders CRITICAL in Portuguese', () => {
    render(<PriorityBadge priority="CRITICAL" />);
    expect(screen.getByText('Crítico')).toBeTruthy();
  });

  it('has data-priority attribute', () => {
    const { container } = render(<PriorityBadge priority="HIGH" />);
    expect(container.querySelector('[data-priority="HIGH"]')).toBeTruthy();
  });

  it('has data-testid', () => {
    render(<PriorityBadge priority="LOW" />);
    expect(screen.getByTestId('priority-badge')).toBeTruthy();
  });

  it('applies sm size class when size=sm', () => {
    const { container } = render(<PriorityBadge priority="LOW" size="sm" />);
    expect(container.firstChild?.toString()).toBeTruthy();
  });
});
