"use client";

import { useState } from 'react';
import type { UserPrivacySettings, PrivacyVisibility } from '../types/biocircle.types';
import { updatePrivacySettings } from '../services/biocircle.service';

const VISIBILITY_OPTIONS: { value: PrivacyVisibility; label: string }[] = [
  { value: 'EVERYONE', label: 'Todos' },
  { value: 'CONNECTIONS', label: 'Conexões' },
  { value: 'NOBODY', label: 'Ninguém' },
];

const SETTING_LABELS: Record<keyof Omit<UserPrivacySettings, 'id' | 'userId'>, string> = {
  discoverableBy: 'Quem pode me encontrar',
  invitesFrom: 'Quem pode me enviar convites',
  bioBookVisible: 'Quem pode ver meu BioBook',
  photosVisible: 'Quem pode ver minhas fotos',
  metricsVisible: 'Quem pode ver minhas métricas',
  achievementsVisible: 'Quem pode ver minhas conquistas',
};

type SettingKey = keyof Omit<UserPrivacySettings, 'id' | 'userId'>;

interface PrivacySettingsProps {
  initial?: UserPrivacySettings | null;
  onSaved?: () => void;
}

const DEFAULT: Record<SettingKey, PrivacyVisibility> = {
  discoverableBy: 'EVERYONE',
  invitesFrom: 'EVERYONE',
  bioBookVisible: 'CONNECTIONS',
  photosVisible: 'CONNECTIONS',
  metricsVisible: 'CONNECTIONS',
  achievementsVisible: 'CONNECTIONS',
};

export function PrivacySettings({ initial, onSaved }: PrivacySettingsProps) {
  const [values, setValues] = useState<Record<SettingKey, PrivacyVisibility>>(
    initial
      ? {
          discoverableBy: initial.discoverableBy,
          invitesFrom: initial.invitesFrom,
          bioBookVisible: initial.bioBookVisible,
          photosVisible: initial.photosVisible,
          metricsVisible: initial.metricsVisible,
          achievementsVisible: initial.achievementsVisible,
        }
      : { ...DEFAULT },
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleChange(key: SettingKey, value: PrivacyVisibility) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await updatePrivacySettings(values);
    setSaving(false);
    setSaved(true);
    onSaved?.();
  }

  return (
    <form
      onSubmit={handleSave}
      aria-label="Configurações de privacidade"
      className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Privacidade
      </h2>

      <div className="space-y-4">
        {(Object.keys(SETTING_LABELS) as SettingKey[]).map((key) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <label htmlFor={key} className="text-sm text-zinc-700 dark:text-zinc-300">
              {SETTING_LABELS[key]}
            </label>
            <select
              id={key}
              value={values[key]}
              onChange={(e) => handleChange(key, e.target.value as PrivacyVisibility)}
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">Salvo!</span>
        )}
      </div>
    </form>
  );
}
