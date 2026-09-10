'use client';

import { useEffect, useState } from 'react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  createdAt: string;
}

interface UsersPage {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

type LoadState = 'loading' | 'ready' | 'forbidden' | 'error';

// Área Administrador deliberadamente mínima (Sprint 06.1: "não implementar
// funcionalidades administrativas além do necessário para validar a
// identidade"). Consome GET /users, que já existe e já é @Roles(Role.ADMIN)
// desde antes desta sprint — nenhum endpoint novo foi criado só para esta
// tela. A proteção real está no backend (RolesGuard, testado); o estado
// "forbidden" abaixo é só UX de fallback, nunca a linha de defesa.
export default function AdminPage() {
  const [state, setState] = useState<LoadState>('loading');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/proxy/users?page=1&limit=20', { cache: 'no-store' })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 403) {
          setState('forbidden');
          return;
        }
        if (!res.ok) {
          setState('error');
          return;
        }
        const data = (await res.json()) as UsersPage;
        setUsers(data.data);
        setTotal(data.total);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center bg-canvas-50" aria-busy="true" aria-label="Carregando área administrativa">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary-200" aria-hidden="true" />
      </div>
    );
  }

  if (state === 'forbidden') {
    return (
      <div className="flex flex-1 items-center justify-center bg-canvas-50 px-4">
        <p role="alert" className="rounded-lg border border-error/20 bg-error-bg px-3.5 py-2.5 text-sm text-error">
          Você não tem permissão para acessar esta área.
        </p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-1 items-center justify-center bg-canvas-50 px-4">
        <p role="alert" className="rounded-lg border border-error/20 bg-error-bg px-3.5 py-2.5 text-sm text-error">Não foi possível carregar a área administrativa.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-xl font-bold tracking-tight text-ink">Administração</h1>
      <p className="mb-6 text-sm text-ink-faint">{total} usuário(s) cadastrado(s).</p>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-soft">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Lista de usuários cadastrados no BioBoock</caption>
          <thead className="bg-surface-muted text-ink-faint">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Nome</th>
              <th scope="col" className="px-4 py-2.5 font-medium">E-mail</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Role</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2.5 text-ink">{u.name}</td>
                <td className="px-4 py-2.5 text-ink-soft">{u.email}</td>
                <td className="px-4 py-2.5 text-ink-soft">{u.role}</td>
                <td className="px-4 py-2.5 text-ink-soft">{u.status ?? '—'}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-faint">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
