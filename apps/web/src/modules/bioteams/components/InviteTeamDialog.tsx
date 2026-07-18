"use client";

import { useState } from 'react';
import type { TeamMemberRole } from '../types/bioteams.types';

const ROLE_OPTIONS: Array<{ value: TeamMemberRole; label: string }> = [
  { value: 'MEMBER', label: 'Membro' },
  { value: 'COACH', label: 'Coach' },
  { value: 'TRAINER', label: 'Treinador' },
  { value: 'NUTRITIONIST', label: 'Nutricionista' },
  { value: 'PHYSICIAN', label: 'Médico' },
  { value: 'ADMINISTRATOR', label: 'Administrador' },
  { value: 'GUEST', label: 'Convidado' },
];

interface InviteTeamDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (userId: string, role: TeamMemberRole) => Promise<void>;
}

export function InviteTeamDialog({ open, onClose, onSubmit }: InviteTeamDialogProps) {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<TeamMemberRole>('MEMBER');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) return;
    setLoading(true);
    try {
      await onSubmit(userId.trim(), role);
      setUserId('');
      setRole('MEMBER');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Convidar membro">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">Convidar membro</h2>
        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          <div>
            <label htmlFor="invite-user-id" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              ID do usuário
            </label>
            <input
              id="invite-user-id"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="ID ou email do usuário"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
          <div>
            <label htmlFor="invite-role" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Papel
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as TeamMemberRole)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              {ROLE_OPTIONS.map((opt) => (
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
              disabled={loading || !userId.trim()}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {loading ? 'Enviando...' : 'Convidar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
