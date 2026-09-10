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
    <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950">
      <span className="text-zinc-600 dark:text-zinc-400">
        {user.name} <span className="text-zinc-400 dark:text-zinc-600">({user.email})</span>
      </span>
      <Link href="/profile" className="text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50">
        Perfil
      </Link>
      {user.role === 'ADMIN' && (
        <Link href="/admin" className="text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50">
          Administração
        </Link>
      )}
      <form action={logoutAction} className="ml-auto">
        <button
          type="submit"
          className="rounded-md px-2 py-1 text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Sair
        </button>
      </form>
    </div>
  );
}
