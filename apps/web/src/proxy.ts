import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './lib/auth/config';

// Achado da Sprint 05: apps/web não tinha proteção de rota nenhuma. `proxy.ts`
// (renomeado de `middleware.ts` no Next 16 — ver AGENTS.md deste projeto) faz
// só a checagem otimista de PRESENÇA do cookie de sessão, sem chamar a API:
// Next.js recomenda manter o Proxy barato pois ele roda em toda navegação,
// inclusive prefetch. A checagem REAL (token válido, não expirado, não
// revogado) acontece a cada chamada em /api/proxy/*, que é quem efetivamente
// fala com a API — Proxy aqui é só UX (evita mostrar a página vazia antes de
// redirecionar), nunca a única linha de defesa.

const PUBLIC_ROUTES = new Set(['/login', '/signup']);

function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE) ?? request.cookies.get(REFRESH_TOKEN_COOKIE));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const authenticated = hasSessionCookie(request);

  if (!isPublicRoute && !authenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicRoute && authenticated) {
    return NextResponse.redirect(new URL('/biobook', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
