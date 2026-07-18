import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertBanner } from '../components/AlertBanner';
import type { CdsAlert } from '../types/cds.types';

const BASE_ALERT: CdsAlert = {
  id: 'a1', patientId: 'p1', evaluationId: 'e1',
  alertType: 'IMPORTANT', priority: 'HIGH',
  reason: 'Avaliação médica necessária em até 48h.',
  origin: 'CDS Engine v1.0',
  read: false,
  createdAt: new Date('2026-07-18T12:00:00.000Z').toISOString(),
};

describe('AlertBanner', () => {
  it('renders with role="alert"', () => {
    render(<AlertBanner alert={BASE_ALERT} />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('renders alert reason text', () => {
    render(<AlertBanner alert={BASE_ALERT} />);
    expect(screen.getByText('Avaliação médica necessária em até 48h.')).toBeTruthy();
  });

  it('renders origin', () => {
    render(<AlertBanner alert={BASE_ALERT} />);
    expect(screen.getByText(/CDS Engine/)).toBeTruthy();
  });

  it('has data-testid="alert-banner"', () => {
    render(<AlertBanner alert={BASE_ALERT} />);
    expect(screen.getByTestId('alert-banner')).toBeTruthy();
  });

  it('has data-priority attribute', () => {
    const { container } = render(<AlertBanner alert={BASE_ALERT} />);
    expect(container.querySelector('[data-priority="HIGH"]')).toBeTruthy();
  });

  it('shows dismiss button when onDismiss provided', () => {
    render(<AlertBanner alert={BASE_ALERT} onDismiss={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Dispensar alerta' })).toBeTruthy();
  });

  it('does not show dismiss button without onDismiss', () => {
    render(<AlertBanner alert={BASE_ALERT} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('calls onDismiss with alert id when clicked', async () => {
    const onDismiss = vi.fn();
    render(<AlertBanner alert={BASE_ALERT} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: 'Dispensar alerta' }));
    expect(onDismiss).toHaveBeenCalledWith('a1');
  });

  it('renders CRITICAL alert with different styling', () => {
    const { container } = render(<AlertBanner alert={{ ...BASE_ALERT, priority: 'CRITICAL', alertType: 'CRITICAL' }} />);
    const el = container.querySelector('[data-priority="CRITICAL"]');
    expect(el?.className).toContain('red-900');
  });
});
