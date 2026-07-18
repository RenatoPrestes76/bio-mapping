"use client";

import { useState } from 'react';
import type { TeamCategory, TeamVisibility, CreateTeamInput } from '../types/bioteams.types';

const CATEGORY_OPTIONS: Array<{ value: TeamCategory; label: string }> = [
  { value: 'GYM', label: 'Academia' },
  { value: 'RUNNING', label: 'Corrida' },
  { value: 'CYCLING', label: 'Ciclismo' },
  { value: 'SWIMMING', label: 'Natação' },
  { value: 'TRIATHLON', label: 'Triathlon' },
  { value: 'BODYBUILDING', label: 'Musculação' },
  { value: 'CROSSFIT', label: 'CrossFit' },
  { value: 'MARTIAL_ARTS', label: 'Artes Marciais' },
  { value: 'SPORTS_CLUB', label: 'Clube Esportivo' },
  { value: 'CLINIC', label: 'Clínica' },
  { value: 'CORPORATE_WELLNESS', label: 'Bem-estar Corporativo' },
  { value: 'CUSTOM', label: 'Personalizado' },
];

const VISIBILITY_OPTIONS: Array<{ value: TeamVisibility; label: string }> = [
  { value: 'INVITE_ONLY', label: 'Por convite' },
  { value: 'PUBLIC', label: 'Público' },
  { value: 'PRIVATE', label: 'Privado' },
];

interface CreateTeamDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTeamInput) => Promise<void>;
}

export function CreateTeamDialog({ open, onClose, onSubmit }: CreateTeamDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TeamCategory>('GYM');
  const [visibility, setVisibility] = useState<TeamVisibility>('INVITE_ONLY');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSubmit({ name: name.trim(), description: description.trim() || undefined, category, visibility });
      setName('');
      setDescription('');
      setCategory('GYM');
      setVisibility('INVITE_ONLY');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Criar equipe">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">Criar nova equipe</h2>
        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          <div>
            <label htmlFor="team-name" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nome da equipe
            </label>
            <input
              id="team-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Team Alpha"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
          <div>
            <label htmlFor="team-description" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Descrição
            </label>
            <textarea
              id="team-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Descreva sua equipe..."
              className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
          <div>
            <label htmlFor="team-category" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Categoria
            </label>
            <select
              id="team-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as TeamCategory)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="team-visibility" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Visibilidade
            </label>
            <select
              id="team-visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as TeamVisibility)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {loading ? 'Criando...' : 'Criar equipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
