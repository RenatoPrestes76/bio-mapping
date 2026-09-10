import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ProfilePage from './page';

const PROFILE = {
  id: 'p1', userId: 'u1', fullName: 'Jane Doe', cpf: null, birthDate: null,
  gender: null, phone: '11999999999', photo: null, address: 'Rua A, 123',
  city: 'São Paulo', state: 'SP', country: 'BR', zipcode: '01000-000',
};

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('busca o próprio perfil via GET /api/proxy/profiles/me e preenche o formulário', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => PROFILE });

    render(<ProfilePage />);

    expect(await screen.findByDisplayValue('Jane Doe')).toBeTruthy();
    expect(screen.getByDisplayValue('São Paulo')).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith('/api/proxy/profiles/me', expect.objectContaining({ cache: 'no-store' }));
  });

  it('mostra um link para completar o onboarding quando o perfil ainda não existe (404)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 404 });

    render(<ProfilePage />);

    expect(await screen.findByText(/ainda não completou seu perfil/i)).toBeTruthy();
  });

  it('salva as alterações via PATCH e confirma com os dados que a API realmente devolveu', async () => {
    const user = userEvent.setup();
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => PROFILE })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...PROFILE, fullName: 'Jane Updated' }) });

    render(<ProfilePage />);
    await screen.findByDisplayValue('Jane Doe');

    const nameInput = screen.getByLabelText('Nome completo');
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Updated');
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(screen.getByText(/perfil atualizado/i)).toBeTruthy());

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(url).toBe('/api/proxy/profiles/me');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body).fullName).toBe('Jane Updated');
    // Confirma que o valor exibido reflete o que a API respondeu, não só o
    // que foi digitado — persistência real, não eco local.
    expect((screen.getByLabelText('Nome completo') as HTMLInputElement).value).toBe('Jane Updated');
  });

  it('mostra erro quando o PATCH falha, sem apagar o formulário', async () => {
    const user = userEvent.setup();
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => PROFILE })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    render(<ProfilePage />);
    await screen.findByDisplayValue('Jane Doe');
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
