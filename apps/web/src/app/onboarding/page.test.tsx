import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

import OnboardingPage from './page';

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('redireciona para /biobook quando o usuário já tem perfil (não mostra o formulário de novo)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ fullName: 'Jane' }) });

    render(<OnboardingPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/biobook'));
  });

  it('mostra o formulário mínimo (só nome) quando o usuário ainda não tem perfil', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 404 });

    render(<OnboardingPage />);

    expect(await screen.findByLabelText('Como podemos te chamar?')).toBeTruthy();
    expect(screen.getByRole('button', { name: /concluir/i })).toBeTruthy();
  });

  it('envia o nome via POST /api/proxy/profiles e redireciona ao concluir', async () => {
    const user = userEvent.setup();
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1', fullName: 'Jane' }) });

    render(<OnboardingPage />);

    const input = await screen.findByLabelText('Como podemos te chamar?');
    await user.type(input, 'Jane');
    await user.click(screen.getByRole('button', { name: /concluir/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/biobook'));
    const [, secondCallInit] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(secondCallInit.method).toBe('POST');
    expect(JSON.parse(secondCallInit.body)).toEqual({ fullName: 'Jane' });
  });

  it('não deixa concluir sem preencher o nome', async () => {
    const user = userEvent.setup();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 404 });

    render(<OnboardingPage />);
    await screen.findByLabelText('Como podemos te chamar?');
    await user.click(screen.getByRole('button', { name: /concluir/i }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
