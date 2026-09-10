import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCookieStore = {
  set: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

import { setSessionCookies, clearSessionCookies, getSessionTokens } from './session';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, REMEMBER_ME_COOKIE } from './config';

describe('session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setSessionCookies', () => {
    it('grava access token, refresh token e a flag de rememberMe, todos httpOnly', async () => {
      await setSessionCookies('access-123', 'refresh-456', false);

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        ACCESS_TOKEN_COOKIE,
        'access-123',
        expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
      );
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        REFRESH_TOKEN_COOKIE,
        'refresh-456',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockCookieStore.set).toHaveBeenCalledWith(REMEMBER_ME_COOKIE, '0', expect.objectContaining({ httpOnly: true }));
    });

    it('usa maxAge maior no refresh token quando rememberMe é true', async () => {
      await setSessionCookies('a', 'r', true);
      const refreshCall = mockCookieStore.set.mock.calls.find((c) => c[0] === REFRESH_TOKEN_COOKIE);
      const defaultCall = await (async () => {
        vi.clearAllMocks();
        await setSessionCookies('a', 'r', false);
        return mockCookieStore.set.mock.calls.find((c) => c[0] === REFRESH_TOKEN_COOKIE);
      })();

      expect(refreshCall?.[2].maxAge).toBeGreaterThan(defaultCall?.[2].maxAge as number);
    });

    it('nunca marca secure:true fora de produção', async () => {
      await setSessionCookies('a', 'r', false);
      const call = mockCookieStore.set.mock.calls[0];
      expect(call[2].secure).toBe(false);
    });

    it('SECURITY: marca secure:true quando NODE_ENV=production (cookie só via HTTPS)', async () => {
      const original = process.env.NODE_ENV;
      vi.stubEnv('NODE_ENV', 'production');
      await setSessionCookies('a', 'r', false);
      const call = mockCookieStore.set.mock.calls[0];
      expect(call[2].secure).toBe(true);
      vi.stubEnv('NODE_ENV', original ?? 'test');
    });
  });

  describe('clearSessionCookies', () => {
    it('remove os três cookies de sessão', async () => {
      await clearSessionCookies();
      expect(mockCookieStore.delete).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE);
      expect(mockCookieStore.delete).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE);
      expect(mockCookieStore.delete).toHaveBeenCalledWith(REMEMBER_ME_COOKIE);
    });
  });

  describe('getSessionTokens', () => {
    it('retorna null quando não há cookies', async () => {
      mockCookieStore.get.mockReturnValue(undefined);
      const result = await getSessionTokens();
      expect(result).toEqual({ accessToken: null, refreshToken: null, rememberMe: false });
    });

    it('retorna os valores dos cookies quando presentes', async () => {
      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === ACCESS_TOKEN_COOKIE) return { value: 'at' };
        if (name === REFRESH_TOKEN_COOKIE) return { value: 'rt' };
        if (name === REMEMBER_ME_COOKIE) return { value: '1' };
        return undefined;
      });
      const result = await getSessionTokens();
      expect(result).toEqual({ accessToken: 'at', refreshToken: 'rt', rememberMe: true });
    });
  });
});
