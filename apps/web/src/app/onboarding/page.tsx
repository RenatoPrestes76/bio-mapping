'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type CheckState = 'checking' | 'needs-onboarding' | 'already-done';

// Onboarding é só o mínimo para o BioBoock funcionar: nome exibido. Tudo o
// mais (CPF, telefone, endereço...) já existe no modelo de Profile da API,
// mas fica para a página de Perfil completa — não faz sentido pedir aqui
// (Sprint 06: "não transformar o onboarding em um formulário gigante").
export default function OnboardingPage() {
  const router = useRouter();
  const [check, setCheck] = useState<CheckState>('checking');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/proxy/profiles/me', { cache: 'no-store' })
      .then((res) => {
        if (cancelled) return;
        setCheck(res.ok ? 'already-done' : 'needs-onboarding');
      })
      .catch(() => {
        if (!cancelled) setCheck('needs-onboarding');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (check === 'already-done') router.replace('/biobook');
  }, [check, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fullName.trim()) {
      setError('Informe como podemos te chamar.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim() }),
      });
      if (!res.ok) {
        setError('Não foi possível concluir. Tente novamente.');
        setSubmitting(false);
        return;
      }
      router.push('/biobook');
    } catch {
      setError('Não foi possível conectar. Tente novamente.');
      setSubmitting(false);
    }
  }

  if (check === 'checking') {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950" aria-busy="true" aria-label="Carregando">
        <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
      </div>
    );
  }

  if (check === 'already-done') return null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Bem-vindo(a) ao BioBoock</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Só mais uma coisa antes de começar.</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Como podemos te chamar?
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submitting ? 'Concluindo…' : 'Concluir'}
          </button>

          <p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
            Você pode completar o resto do seu perfil quando quiser.
          </p>
        </form>
      </div>
    </div>
  );
}
