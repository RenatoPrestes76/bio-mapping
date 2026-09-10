'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { logoutAction } from '@/app/login/actions';

interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

const PUBLIC_PATHS = new Set(['/login', '/signup']);

// Achado da Sprint 05 (Identidade): a identidade exibida aqui vem de
// GET /users/me através de /api/proxy/*, autenticada pelo access token que só
// o servidor conhece — nunca de um valor decidido no client. Isto é a prova
// de que "o Web conhece a identidade correta" (a checagem real de quem o
// usuário é continua sendo feita pela API a cada chamada, como sempre foi).
export function UserMenu() {
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (PUBLIC_PATHS.has(pathname)) return;
    let cancelled = false;
    fetch('/api/proxy/users/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CurrentUser | null) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (PUBLIC_PATHS.has(pathname) || !loaded || !user) return null;

  return (
    <div className="flex items-center gap-4 border-b border-line bg-surface px-4 py-2.5 text-sm">
      <Link href="/biobook" className="font-bold tracking-tight text-primary-700">
        BioBoock
      </Link>
      <span className="text-ink-faint">
        {user.name} <span className="text-ink-faint/70">({user.email})</span>
      </span>
      <Link href="/profile" className="text-ink-soft underline-offset-2 hover:text-primary-700 hover:underline">
        Perfil
      </Link>
      {user.role === 'ADMIN' && (
        <Link href="/admin" className="text-ink-soft underline-offset-2 hover:text-primary-700 hover:underline">
          Administração
        </Link>
      )}
      <form action={logoutAction} className="ml-auto">
        <button
          type="submit"
          className="rounded-full px-3 py-1.5 text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
        >
          Sair
        </button>
      </form>
    </div>
  );
}
