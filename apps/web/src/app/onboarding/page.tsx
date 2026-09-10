'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/ui/BrandMark';
import { TextField } from '@/components/ui/TextField';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

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
      <div className="flex flex-1 items-center justify-center bg-canvas-50" aria-busy="true" aria-label="Carregando">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary-200" aria-hidden="true" />
      </div>
    );
  }

  if (check === 'already-done') return null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-canvas-50 px-4 py-16">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center text-center">
          <BrandMark />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Bem-vindo(a) ao BioBoock</h1>
          <p className="mt-1 text-sm text-ink-faint">Só mais uma coisa antes de começar sua jornada.</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
          <TextField
            id="fullName"
            name="fullName"
            label="Como podemos te chamar?"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          {error && <Alert tone="error">{error}</Alert>}

          <Button type="submit" pending={submitting}>
            {submitting ? 'Concluindo…' : 'Concluir'}
          </Button>

          <p className="text-center text-xs text-ink-faint">
            Você pode completar o resto do seu perfil quando quiser.
          </p>
        </form>
      </div>
    </div>
  );
}
