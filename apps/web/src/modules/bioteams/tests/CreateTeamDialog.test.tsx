import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateTeamDialog } from '../components/CreateTeamDialog';

describe('CreateTeamDialog', () => {
  it('does not render when closed', () => {
    render(<CreateTeamDialog open={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders dialog when open', () => {
    render(<CreateTeamDialog open onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: /criar equipe/i })).toBeTruthy();
  });

  it('renders team name input', () => {
    render(<CreateTeamDialog open onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Nome da equipe')).toBeTruthy();
  });

  it('renders category select with 12 options', () => {
    render(<CreateTeamDialog open onClose={vi.fn()} onSubmit={vi.fn()} />);
    const select = screen.getByLabelText('Categoria') as HTMLSelectElement;
    expect(select.options).toHaveLength(12);
  });

  it('renders visibility select', () => {
    render(<CreateTeamDialog open onClose={vi.fn()} onSubmit={vi.fn()} />);
    const select = screen.getByLabelText('Visibilidade') as HTMLSelectElement;
    expect(select.options).toHaveLength(3);
  });

  it('calls onSubmit with team data', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CreateTeamDialog open onClose={vi.fn()} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Nome da equipe'), 'Team Alpha');
    await userEvent.click(screen.getByRole('button', { name: 'Criar equipe' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Team Alpha' }));
  });

  it('submit button disabled when name is empty', () => {
    render(<CreateTeamDialog open onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Criar equipe' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('calls onClose when cancel clicked', async () => {
    const onClose = vi.fn();
    render(<CreateTeamDialog open onClose={onClose} onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
  });
});
