"use client";

import { useState } from 'react';
import type { ConnectionRelationshipType } from '../types/biocircle.types';

const RELATIONSHIP_OPTIONS: { value: ConnectionRelationshipType; label: string }[] = [
  { value: 'FRIEND', label: 'Amigo' },
  { value: 'COACH', label: 'Coach' },
  { value: 'TRAINER', label: 'Treinador' },
  { value: 'NUTRITIONIST', label: 'Nutricionista' },
  { value: 'PHYSICIAN', label: 'Médico' },
  { value: 'FAMILY', label: 'Família' },
  { value: 'TEAMMATE', label: 'Colega de equipe' },
];

interface InviteDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (receiverId: string, relationshipType: ConnectionRelationshipType) => Promise<void>;
}

export function InviteDialog({ open, onClose, onSubmit }: InviteDialogProps) {
  const [receiverId, setReceiverId] = useState('');
  const [relationshipType, setRelationshipType] = useState<ConnectionRelationshipType>('FRIEND');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!receiverId.trim()) { setError('Informe o ID do usuário'); return; }
    setError(null);
    setLoading(true);
    try {
      await onSubmit(receiverId.trim(), relationshipType);
      setReceiverId('');
      onClose();
    } catch {
      setError('Não foi possível enviar o convite.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enviar convite de conexão"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Enviar convite
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="receiverId" className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              ID do usuário
            </label>
            <input
              id="receiverId"
              type="text"
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              placeholder="Digite o ID ou e-mail"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>

          <div>
            <label htmlFor="relationshipType" className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Tipo de conexão
            </label>
            <select
              id="relationshipType"
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as ConnectionRelationshipType)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {loading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
