import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApiLogin = vi.fn();
const mockApiLogout = vi.fn();
const mockSetSessionCookies = vi.fn();
const mockClearSessionCookies = vi.fn();
const mockGetSessionTokens = vi.fn();
const mockRedirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});

vi.mock('@/lib/auth/api', () => ({
  apiLogin: (...args: unknown[]) => mockApiLogin(...args),
  apiLogout: (...args: unknown[]) => mockApiLogout(...args),
}));

vi.mock('@/lib/auth/session', () => ({
  setSessionCookies: (...args: unknown[]) => mockSetSessionCookies(...args),
  clearSessionCookies: () => mockClearSessionCookies(),
  getSessionTokens: () => mockGetSessionTokens(),
}));

vi.mock('next/navigation', () => ({
  redirect: (path: string) => mockRedirect(path),
}));

import { loginAction, logoutAction } from './actions';

function formDataOf(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe('loginAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna erro quando e-mail ou senha estão vazios, sem chamar a API', async () => {
    const result = await loginAction(undefined, formDataOf({ email: '', password: '' }));
    expect(result.error).toBeTruthy();
    expect(mockApiLogin).not.toHaveBeenCalled();
  });

  it('SECURITY: em credencial inválida, repassa a mensagem genérica da API sem criar sessão', async () => {
    mockApiLogin.mockResolvedValue({ ok: false, error: { status: 401, message: 'Credenciais inválidas' } });
    const result = await loginAction(undefined, formDataOf({ email: 'a@example.com', password: 'wrong' }));
    expect(result.error).toBe('Credenciais inválidas');
    expect(mockSetSessionCookies).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('repassa a mensagem de conta bloqueada (Sprint 03) sem mascarar', async () => {
    mockApiLogin.mockResolvedValue({ ok: false, error: { status: 403, message: 'Conta bloqueada ou inativa' } });
    const result = await loginAction(undefined, formDataOf({ email: 'a@example.com', password: 'x' }));
    expect(result.error).toBe('Conta bloqueada ou inativa');
  });

  it('em sucesso, grava a sessão e redireciona — nunca expõe o token ao retorno do action', async () => {
    mockApiLogin.mockResolvedValue({
      ok: true,
      data: { user: { id: 'u1' }, accessToken: 'at', refreshToken: 'rt' },
    });

    await expect(
      loginAction(undefined, formDataOf({ email: 'a@example.com', password: 'x', rememberMe: 'on' })),
    ).rejects.toThrow('NEXT_REDIRECT:/biobook');

    expect(mockSetSessionCookies).toHaveBeenCalledWith('at', 'rt', true);
  });

  it('rememberMe é false quando o checkbox não é marcado', async () => {
    mockApiLogin.mockResolvedValue({ ok: true, data: { user: {}, accessToken: 'at', refreshToken: 'rt' } });
    await expect(loginAction(undefined, formDataOf({ email: 'a@example.com', password: 'x' }))).rejects.toThrow();
    expect(mockSetSessionCookies).toHaveBeenCalledWith('at', 'rt', false);
  });
});

describe('logoutAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('revoga a sessão na API, limpa os cookies locais e redireciona ao login', async () => {
    mockGetSessionTokens.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', rememberMe: false });

    await expect(logoutAction()).rejects.toThrow('NEXT_REDIRECT:/login');

    expect(mockApiLogout).toHaveBeenCalledWith('rt');
    expect(mockClearSessionCookies).toHaveBeenCalled();
  });

  it('ainda limpa a sessão local mesmo sem refresh token armazenado', async () => {
    mockGetSessionTokens.mockResolvedValue({ accessToken: null, refreshToken: null, rememberMe: false });

    await expect(logoutAction()).rejects.toThrow('NEXT_REDIRECT:/login');

    expect(mockApiLogout).not.toHaveBeenCalled();
    expect(mockClearSessionCookies).toHaveBeenCalled();
  });
});
