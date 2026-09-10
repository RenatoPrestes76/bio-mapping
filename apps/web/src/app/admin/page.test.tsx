import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import AdminPage from './page';

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('busca a lista de usuários via GET /api/proxy/users', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id: 'u1', name: 'Jane Doe', email: 'jane@example.com', role: 'PATIENT', status: 'ACTIVE', createdAt: '2026-01-01' }],
        total: 1, page: 1, limit: 20,
      }),
    });

    render(<AdminPage />);

    expect(await screen.findByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText('jane@example.com')).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith('/api/proxy/users?page=1&limit=20', expect.objectContaining({ cache: 'no-store' }));
  });

  it('SECURITY: mostra acesso negado quando a API responde 403 (usuário comum tentou acessar direto)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 403 });

    render(<AdminPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/não tem permissão/i);
  });

  it('mostra estado de erro genérico para outras falhas', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 });

    render(<AdminPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar/i);
  });

  it('mostra estado vazio quando não há usuários', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ data: [], total: 0, page: 1, limit: 20 }),
    });

    render(<AdminPage />);

    expect(await screen.findByText(/nenhum usuário encontrado/i)).toBeTruthy();
  });
});
