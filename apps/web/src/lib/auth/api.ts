import { API_BASE } from './config';

// Achado da Sprint 05 (WEB AUTHENTICATION & IDENTITY INTEGRATION): estas
// funções falam com o mecanismo de autenticação REAL já existente na API
// (apps/api/src/modules/identity/auth) — JWT Bearer de vida curta (15 min) +
// refresh token opaco persistido no banco. Nenhum sistema de auth paralelo
// foi criado; o Web só relaya credenciais para o backend oficial.

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  birthDate: string | null;
  gender: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  status: number;
  message: string;
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  let message = 'Não foi possível completar a solicitação.';
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (body?.message) {
      message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
    }
  } catch {
    // corpo não é JSON — mantém a mensagem genérica
  }
  return { status: res.status, message };
}

export async function apiLogin(
  email: string,
  password: string,
  rememberMe: boolean,
): Promise<{ ok: true; data: AuthTokens } | { ok: false; error: ApiError }> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: await parseErrorResponse(res) };
    return { ok: true, data: (await res.json()) as AuthTokens };
  } catch {
    return { ok: false, error: { status: 0, message: 'Não foi possível conectar à API. Tente novamente.' } };
  }
}

export async function apiRegister(
  email: string,
  password: string,
  name: string,
): Promise<{ ok: true; data: AuthTokens } | { ok: false; error: ApiError }> {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: await parseErrorResponse(res) };
    return { ok: true, data: (await res.json()) as AuthTokens };
  } catch {
    return { ok: false, error: { status: 0, message: 'Não foi possível conectar à API. Tente novamente.' } };
  }
}

export async function apiRefresh(
  refreshToken: string,
): Promise<{ ok: true; data: AuthTokens } | { ok: false; error: ApiError }> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: await parseErrorResponse(res) };
    return { ok: true, data: (await res.json()) as AuthTokens };
  } catch {
    return { ok: false, error: { status: 0, message: 'Não foi possível conectar à API.' } };
  }
}

export async function apiLogout(refreshToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
  } catch {
    // logout é best-effort do lado da API — a sessão local é sempre limpa
    // pelo chamador independente do resultado desta chamada.
  }
}

export async function apiGetMe(accessToken: string): Promise<ApiUser | null> {
  try {
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as ApiUser;
  } catch {
    return null;
  }
}
