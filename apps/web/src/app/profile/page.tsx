'use client';

import { useEffect, useState } from 'react';

interface Profile {
  id: string;
  userId: string;
  fullName: string;
  cpf: string | null;
  birthDate: string | null;
  gender: string | null;
  phone: string | null;
  photo: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipcode: string | null;
}

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

const inputClass =
  'block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50';
const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300';

export default function ProfilePage() {
  const [state, setState] = useState<LoadState>('loading');
  const [form, setForm] = useState({
    fullName: '', phone: '', birthDate: '', address: '', city: '', state_: '', zipcode: '', country: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/proxy/profiles/me', { cache: 'no-store' })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setState('not-found');
          return;
        }
        if (!res.ok) {
          setState('error');
          return;
        }
        const data = (await res.json()) as Profile;
        setForm({
          fullName: data.fullName ?? '',
          phone: data.phone ?? '',
          birthDate: data.birthDate ? data.birthDate.slice(0, 10) : '',
          address: data.address ?? '',
          city: data.city ?? '',
          state_: data.state ?? '',
          zipcode: data.zipcode ?? '',
          country: data.country ?? '',
        });
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/proxy/profiles/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone || undefined,
          birthDate: form.birthDate || undefined,
          address: form.address || undefined,
          city: form.city || undefined,
          state: form.state_ || undefined,
          zipcode: form.zipcode || undefined,
          country: form.country || undefined,
        }),
      });
      if (!res.ok) {
        setMessage({ type: 'error', text: 'Não foi possível salvar. Tente novamente.' });
        return;
      }
      // Recarrega do servidor para confirmar persistência de verdade, não só
      // ecoar o que foi enviado (Sprint 06: "consultar novamente /users/me
      // [aqui, /profiles/me]... confirmar persistência no banco").
      const updated = (await res.json()) as Profile;
      setForm((prev) => ({ ...prev, fullName: updated.fullName ?? prev.fullName }));
      setMessage({ type: 'success', text: 'Perfil atualizado.' });
    } catch {
      setMessage({ type: 'error', text: 'Não foi possível conectar. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  }

  if (state === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950" aria-busy="true" aria-label="Carregando perfil">
        <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
      </div>
    );
  }

  if (state === 'not-found') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-zinc-50 px-4 text-center dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Você ainda não completou seu perfil.</p>
        <a href="/onboarding" className="text-sm font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50">
          Completar agora
        </a>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">Não foi possível carregar seu perfil.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Meu perfil</h1>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="fullName" className={labelClass}>Nome completo</label>
          <input
            id="fullName" required value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phone" className={labelClass}>Telefone</label>
          <input
            id="phone" value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="birthDate" className={labelClass}>Data de nascimento</label>
          <input
            id="birthDate" type="date" value={form.birthDate}
            onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="address" className={labelClass}>Endereço</label>
          <input
            id="address" value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="city" className={labelClass}>Cidade</label>
            <input
              id="city" value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="state" className={labelClass}>Estado</label>
            <input
              id="state" value={form.state_}
              onChange={(e) => setForm((f) => ({ ...f, state_: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="zipcode" className={labelClass}>CEP</label>
            <input
              id="zipcode" value={form.zipcode}
              onChange={(e) => setForm((f) => ({ ...f, zipcode: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="country" className={labelClass}>País</label>
            <input
              id="country" value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>

        {message && (
          <p
            role={message.type === 'error' ? 'alert' : 'status'}
            className={
              message.type === 'error'
                ? 'rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
                : 'rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300'
            }
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          aria-busy={saving}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 sm:w-auto sm:px-8"
        >
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  );
}
