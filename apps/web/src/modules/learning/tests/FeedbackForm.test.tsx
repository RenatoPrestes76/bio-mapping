import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackForm } from '../components/FeedbackForm';

describe('FeedbackForm', () => {
  it('renders with data-testid', () => {
    render(<FeedbackForm decisionId="d1" onSubmit={vi.fn()} />);
    expect(screen.getByTestId('feedback-form')).toBeTruthy();
  });

  it('renders role selector with default PHYSICIAN', () => {
    render(<FeedbackForm decisionId="d1" onSubmit={vi.fn()} />);
    const select = screen.getByRole('combobox', { name: /perfil/i });
    expect((select as HTMLSelectElement).value).toBe('PHYSICIAN');
  });

  it('renders all 4 classification buttons', () => {
    render(<FeedbackForm decisionId="d1" onSubmit={vi.fn()} />);
    expect(screen.getByText('Correta')).toBeTruthy();
    expect(screen.getByText('Parcialmente correta')).toBeTruthy();
    expect(screen.getByText('Incorreta')).toBeTruthy();
    expect(screen.getByText('Inconclusiva')).toBeTruthy();
  });

  it('submit button is disabled until classification is selected', () => {
    render(<FeedbackForm decisionId="d1" onSubmit={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /enviar/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('submit button is enabled after classification selected', async () => {
    render(<FeedbackForm decisionId="d1" onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByTestId('classification-correct'));
    const btn = screen.getByRole('button', { name: /enviar/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it('calls onSubmit with correct payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<FeedbackForm decisionId="d1" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByTestId('classification-correct'));
    const textarea = screen.getByRole('textbox', { name: /comentário/i });
    await userEvent.type(textarea, 'Muito boa recomendação');
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        decisionId: 'd1',
        role: 'PHYSICIAN',
        classification: 'CORRECT',
        comment: 'Muito boa recomendação',
      }),
    );
  });

  it('calls onSubmit with INCORRECT classification', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<FeedbackForm decisionId="d1" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByTestId('classification-incorrect'));
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ classification: 'INCORRECT' }));
  });

  it('does not include empty comment in payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<FeedbackForm decisionId="d1" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByTestId('classification-correct'));
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));
    const call = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(call.comment).toBeUndefined();
  });

  it('shows loading state when loading=true', () => {
    render(<FeedbackForm decisionId="d1" onSubmit={vi.fn()} loading={true} />);
    expect(screen.getByText('Enviando...')).toBeTruthy();
  });

  it('clears form after submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<FeedbackForm decisionId="d1" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByTestId('classification-correct'));
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));
    const btn = screen.getByRole('button', { name: /enviar/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('allows selecting PARTIALLY_CORRECT', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<FeedbackForm decisionId="d1" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByTestId('classification-partially_correct'));
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ classification: 'PARTIALLY_CORRECT' }));
  });

  it('role can be changed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<FeedbackForm decisionId="d1" onSubmit={onSubmit} />);
    const select = screen.getByRole('combobox', { name: /perfil/i });
    fireEvent.change(select, { target: { value: 'PATIENT' } });
    await userEvent.click(screen.getByTestId('classification-correct'));
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ role: 'PATIENT' }));
  });
});
