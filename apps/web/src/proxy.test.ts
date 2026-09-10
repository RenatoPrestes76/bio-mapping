import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';
import { ACCESS_TOKEN_COOKIE } from './lib/auth/config';

function makeRequest(pathname: string, cookieHeader?: string): NextRequest {
  return new NextRequest(new URL(pathname, 'http://localhost:3010'), {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
}

describe('proxy (route protection)', () => {
  it('redireciona para /login quando não há cookie de sessão em rota protegida', () => {
    const res = proxy(makeRequest('/biobook'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('preserva a rota de origem em ?from= no redirect para login', () => {
    const res = proxy(makeRequest('/biocircle'));
    const location = new URL(res.headers.get('location')!);
    expect(location.searchParams.get('from')).toBe('/biocircle');
  });

  it('SECURITY: não deixa passar para uma rota protegida sem sessão', () => {
    const res = proxy(makeRequest('/population'));
    expect(res.status).toBe(307);
  });

  it('deixa passar uma rota protegida quando há cookie de access token', () => {
    const res = proxy(makeRequest('/biobook', `${ACCESS_TOKEN_COOKIE}=some-token`));
    expect(res.status).toBe(200);
  });

  it('/login fica acessível sem sessão', () => {
    const res = proxy(makeRequest('/login'));
    expect(res.status).toBe(200);
  });

  it('redireciona /login para /biobook quando já há sessão (evita ver o formulário logado)', () => {
    const res = proxy(makeRequest('/login', `${ACCESS_TOKEN_COOKIE}=some-token`));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/biobook');
  });
});
