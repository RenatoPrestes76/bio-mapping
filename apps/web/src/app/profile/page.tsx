'use client';

import { useEffect, useState } from 'react';
import { TextField } from '@/components/ui/TextField';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

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
      <div className="flex flex-1 items-center justify-center bg-canvas-50" aria-busy="true" aria-label="Carregando perfil">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary-200" aria-hidden="true" />
      </div>
    );
  }

  if (state === 'not-found') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-canvas-50 px-4 text-center">
        <p className="text-sm text-ink-soft">Você ainda não completou seu perfil.</p>
        <a href="/onboarding" className="text-sm font-semibold text-primary-700 underline-offset-2 hover:underline">
          Completar agora
        </a>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-1 items-center justify-center bg-canvas-50 px-4">
        <Alert tone="error">Não foi possível carregar seu perfil.</Alert>
      </div>
    );
  }

  const initial = form.fullName.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="mb-8 flex items-center gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700"
          aria-hidden="true"
        >
          {initial}
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Minha história</h1>
          <p className="text-sm text-ink-faint">{form.fullName || 'Sua jornada no BioBoock'}</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <TextField
            id="fullName" label="Nome completo" required value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          />

          <TextField
            id="phone" label="Telefone" value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />

          <TextField
            id="birthDate" label="Data de nascimento" type="date" value={form.birthDate}
            onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
          />

          <TextField
            id="address" label="Endereço" value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <TextField
              id="city" label="Cidade" value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
            <TextField
              id="state" label="Estado" value={form.state_}
              onChange={(e) => setForm((f) => ({ ...f, state_: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextField
              id="zipcode" label="CEP" value={form.zipcode}
              onChange={(e) => setForm((f) => ({ ...f, zipcode: e.target.value }))}
            />
            <TextField
              id="country" label="País" value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
          </div>

          {message && (
            <Alert tone={message.type === 'error' ? 'error' : 'success'}>{message.text}</Alert>
          )}

          <Button type="submit" pending={saving} className="sm:w-auto sm:px-8">
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
