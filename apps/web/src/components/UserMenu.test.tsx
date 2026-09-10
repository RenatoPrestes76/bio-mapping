import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const mockUsePathname = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('@/app/login/actions', () => ({
  logoutAction: vi.fn(),
}));

import { UserMenu } from './UserMenu';

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('não renderiza nada na página de login', async () => {
    mockUsePathname.mockReturnValue('/login');
    const { container } = render(<UserMenu />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(fetch).not.toHaveBeenCalled();
  });

  it('busca a identidade via /api/proxy/users/me (nunca decide quem é o usuário no client)', async () => {
    mockUsePathname.mockReturnValue('/biobook');
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'u1', email: 'jane@example.com', name: 'Jane Doe', role: 'PATIENT' }),
    });

    render(<UserMenu />);

    expect(await screen.findByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText(/jane@example\.com/)).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith('/api/proxy/users/me', expect.objectContaining({ cache: 'no-store' }));
  });

  it('não renderiza identidade quando a sessão não é válida (401 em /users/me)', async () => {
    mockUsePathname.mockReturnValue('/biobook');
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, json: async () => null });

    const { container } = render(<UserMenu />);

    await waitFor(() => expect(container.textContent).toBe(''));
  });

  it('exibe um botão de Sair vinculado à ação de logout', async () => {
    mockUsePathname.mockReturnValue('/biobook');
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'u1', email: 'jane@example.com', name: 'Jane Doe', role: 'PATIENT' }),
    });

    render(<UserMenu />);

    expect(await screen.findByRole('button', { name: 'Sair' })).toBeTruthy();
  });

  // Achado da Sprint 06.1: o link de Administração só deve aparecer para
  // quem a API já diz ser ADMIN via /users/me — nunca decidido localmente.
  it('SECURITY: não exibe o link de Administração para um usuário PATIENT', async () => {
    mockUsePathname.mockReturnValue('/biobook');
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'u1', email: 'jane@example.com', name: 'Jane Doe', role: 'PATIENT' }),
    });

    render(<UserMenu />);
    await screen.findByText('Jane Doe');

    expect(screen.queryByRole('link', { name: 'Administração' })).toBeNull();
  });

  it('exibe o link de Administração quando a API confirma role ADMIN', async () => {
    mockUsePathname.mockReturnValue('/biobook');
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'u1', email: 'root@example.com', name: 'Admin', role: 'ADMIN' }),
    });

    render(<UserMenu />);

    const link = await screen.findByRole('link', { name: 'Administração' });
    expect(link.getAttribute('href')).toBe('/admin');
  });
});
