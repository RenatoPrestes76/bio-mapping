import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { API_BASE } from '@/lib/auth/config';
import { apiRefresh } from '@/lib/auth/api';
import { clearSessionCookies, getSessionTokens, setSessionCookies } from '@/lib/auth/session';

// Achado da Sprint 05: os 8 módulos do Web (biobook, biocircle, bioteams, cds,
// learning, population, precision, simulation) rodam como Client Components
// (`"use client"`) — o fetch acontece no browser. Um cookie httpOnly não pode
// ser lido por JS do client nem é automaticamente reenviado para um domínio
// diferente (a API real, em outra origem). Por isso o Web precisa de um BFF
// (Backend for Frontend — ver node_modules/next/dist/docs/01-app/02-guides/
// backend-for-frontend.md): este Route Handler roda no servidor do Next,
// único lugar que lê o cookie httpOnly, anexa `Authorization: Bearer`, chama
// a API real, e — se o access token expirou — renova via refresh token antes
// de tentar de novo, tudo sem nunca expor o token ao JS do navegador.
//
// Os 8 services do Web chamam `/api/proxy/...` (mesmo domínio do Web) em vez
// da API diretamente; o browser já envia os cookies httpOnly sozinho nessa
// chamada same-origin — nenhum service precisa saber que token existe.

async function forward(accessToken: string, path: string, search: string, init: RequestInit) {
  return fetch(`${API_BASE}/${path}${search}`, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
}

async function handle(request: NextRequest, path: string[]): Promise<NextResponse> {
  const { accessToken, refreshToken, rememberMe } = await getSessionTokens();
  if (!accessToken) {
    return NextResponse.json({ statusCode: 401, message: 'Não autenticado' }, { status: 401 });
  }

  const joinedPath = path.join('/');
  const search = request.nextUrl.search;
  const contentType = request.headers.get('content-type');
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer();

  const baseInit: RequestInit = {
    method: request.method,
    headers: contentType ? { 'Content-Type': contentType } : {},
    body: body ? Buffer.from(body) : undefined,
  };

  let upstream = await forward(accessToken, joinedPath, search, baseInit);
  let refreshedAccessToken: string | null = null;

  // Achado da Sprint 05: renovação silenciosa. O access token dura só 15 min
  // (ver ACCESS_TOKEN_TTL na API) — sem isto, qualquer sessão de uso normal
  // do produto seria derrubada a cada 15 minutos. Só tenta UMA vez, e só se
  // houver refresh token; sem loop de retry infinito.
  if (upstream.status === 401 && refreshToken) {
    const refreshed = await apiRefresh(refreshToken);
    if (refreshed.ok) {
      refreshedAccessToken = refreshed.data.accessToken;
      await setSessionCookies(refreshed.data.accessToken, refreshed.data.refreshToken, rememberMe);
      upstream = await forward(refreshedAccessToken, joinedPath, search, baseInit);
    } else {
      await clearSessionCookies();
    }
  }

  const responseBody = await upstream.arrayBuffer();
  const response = new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });

  return response;
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handle(request, path);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handle(request, path);
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handle(request, path);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handle(request, path);
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handle(request, path);
}
