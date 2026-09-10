import { cookies } from 'next/headers';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE_SECONDS_DEFAULT,
  REFRESH_TOKEN_MAX_AGE_SECONDS_REMEMBER_ME,
  REMEMBER_ME_COOKIE,
} from './config';

// Só chamável de Server Actions / Route Handlers (cookies().set/delete não
// funciona durante a renderização de Server Components — ver Next.js docs).
// A sessão em si é só os tokens já emitidos pela API real: nada aqui assina
// ou reimplementa autenticação, só guarda o que a API já validou.

const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: maxAgeSeconds,
});

export async function setSessionCookies(
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean,
): Promise<void> {
  const store = await cookies();
  const refreshMaxAge = rememberMe ? REFRESH_TOKEN_MAX_AGE_SECONDS_REMEMBER_ME : REFRESH_TOKEN_MAX_AGE_SECONDS_DEFAULT;
  store.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS));
  store.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(refreshMaxAge));
  store.set(REMEMBER_ME_COOKIE, rememberMe ? '1' : '0', cookieOptions(refreshMaxAge));
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
  store.delete(REMEMBER_ME_COOKIE);
}

export async function getSessionTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
  rememberMe: boolean;
}> {
  const store = await cookies();
  return {
    accessToken: store.get(ACCESS_TOKEN_COOKIE)?.value ?? null,
    refreshToken: store.get(REFRESH_TOKEN_COOKIE)?.value ?? null,
    rememberMe: store.get(REMEMBER_ME_COOKIE)?.value === '1',
  };
}
