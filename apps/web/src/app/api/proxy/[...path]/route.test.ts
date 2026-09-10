import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSessionTokens = vi.fn();
const mockSetSessionCookies = vi.fn();
const mockClearSessionCookies = vi.fn();
const mockApiRefresh = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getSessionTokens: () => mockGetSessionTokens(),
  setSessionCookies: (...args: unknown[]) => mockSetSessionCookies(...args),
  clearSessionCookies: () => mockClearSessionCookies(),
}));

vi.mock('@/lib/auth/api', () => ({
  apiRefresh: (...args: unknown[]) => mockApiRefresh(...args),
}));

import { GET } from './route';

function makeGetRequest(path: string): NextRequest {
  return new NextRequest(new URL(`/api/proxy/${path}`, 'http://localhost:3010'));
}

describe('GET /api/proxy/[...path]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('SECURITY: retorna 401 sem chamar a API quando não há access token na sessão', async () => {
    mockGetSessionTokens.mockResolvedValue({ accessToken: null, refreshToken: null, rememberMe: false });

    const res = await GET(makeGetRequest('patients/p1'), { params: Promise.resolve({ path: ['patients', 'p1'] }) });

    expect(res.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('anexa Authorization: Bearer com o access token da sessão ao repassar para a API real', async () => {
    mockGetSessionTokens.mockResolvedValue({ accessToken: 'at-123', refreshToken: 'rt-456', rememberMe: false });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );

    await GET(makeGetRequest('patients/p1'), { params: Promise.resolve({ path: ['patients', 'p1'] }) });

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/patients/p1');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer at-123');
  });

  it('em 401 da API com refresh token disponível, renova e tenta de novo uma vez', async () => {
    mockGetSessionTokens.mockResolvedValue({ accessToken: 'expired', refreshToken: 'rt-456', rememberMe: true });
    mockApiRefresh.mockResolvedValue({ ok: true, data: { accessToken: 'fresh-at', refreshToken: 'fresh-rt' } });

    const unauthorized = new Response(null, { status: 401 });
    const success = new Response(JSON.stringify({ data: 1 }), { status: 200, headers: { 'content-type': 'application/json' } });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(unauthorized).mockResolvedValueOnce(success);

    const res = await GET(makeGetRequest('patients/p1'), { params: Promise.resolve({ path: ['patients', 'p1'] }) });

    expect(res.status).toBe(200);
    expect(mockSetSessionCookies).toHaveBeenCalledWith('fresh-at', 'fresh-rt', true);
    expect(fetch).toHaveBeenCalledTimes(2);
    const secondCallHeaders = (fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].headers as Record<string, string>;
    expect(secondCallHeaders.Authorization).toBe('Bearer fresh-at');
  });

  it('SECURITY: quando o refresh também falha, limpa a sessão e não vaza dado nenhum', async () => {
    mockGetSessionTokens.mockResolvedValue({ accessToken: 'expired', refreshToken: 'revoked-rt', rememberMe: false });
    mockApiRefresh.mockResolvedValue({ ok: false, error: { status: 401, message: 'Refresh token inválido' } });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(null, { status: 401 }));

    const res = await GET(makeGetRequest('patients/p1'), { params: Promise.resolve({ path: ['patients', 'p1'] }) });

    expect(res.status).toBe(401);
    expect(mockClearSessionCookies).toHaveBeenCalled();
  });

  it('sem refresh token disponível, não tenta renovar em um 401 da API', async () => {
    mockGetSessionTokens.mockResolvedValue({ accessToken: 'expired', refreshToken: null, rememberMe: false });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(null, { status: 401 }));

    await GET(makeGetRequest('patients/p1'), { params: Promise.resolve({ path: ['patients', 'p1'] }) });

    expect(mockApiRefresh).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
