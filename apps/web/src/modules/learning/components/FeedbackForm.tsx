"use client";

import { useState } from 'react';
import type { FeedbackRole, FeedbackClassification, CreateFeedbackPayload } from '../types/learning.types';

const ROLE_OPTIONS: { value: FeedbackRole; label: string }[] = [
  { value: 'PHYSICIAN', label: 'Médico' },
  { value: 'NUTRITIONIST', label: 'Nutricionista' },
  { value: 'HEALTH_PROFESSIONAL', label: 'Profissional de Saúde' },
  { value: 'PATIENT', label: 'Paciente' },
];

const CLASSIFICATION_OPTIONS: { value: FeedbackClassification; label: string; style: string }[] = [
  { value: 'CORRECT', label: 'Correta', style: 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' },
  { value: 'PARTIALLY_CORRECT', label: 'Parcialmente correta', style: 'border-yellow-400 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' },
  { value: 'INCORRECT', label: 'Incorreta', style: 'border-red-400 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300' },
  { value: 'INCONCLUSIVE', label: 'Inconclusiva', style: 'border-zinc-300 bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400' },
];

interface FeedbackFormProps {
  decisionId: string;
  onSubmit: (payload: CreateFeedbackPayload) => Promise<void>;
  loading?: boolean;
}

export function FeedbackForm({ decisionId, onSubmit, loading = false }: FeedbackFormProps) {
  const [role, setRole] = useState<FeedbackRole>('PHYSICIAN');
  const [classification, setClassification] = useState<FeedbackClassification | ''>('');
  const [comment, setComment] = useState('');
  const [suggestedAction, setSuggestedAction] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classification) return;
    await onSubmit({
      decisionId,
      role,
      classification,
      comment: comment.trim() || undefined,
      suggestedAction: suggestedAction.trim() || undefined,
    });
    setClassification('');
    setComment('');
    setSuggestedAction('');
  };

  return (
    <form
      role="form"
      aria-label="Enviar feedback"
      data-testid="feedback-form"
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Avaliar esta decisão</h3>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Seu perfil</label>
        <select
          aria-label="Perfil do avaliador"
          value={role}
          onChange={(e) => setRole(e.target.value as FeedbackRole)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Classificação da recomendação</label>
        <div className="grid grid-cols-2 gap-2">
          {CLASSIFICATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-testid={`classification-${opt.value.toLowerCase()}`}
              onClick={() => setClassification(opt.value)}
              className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                classification === opt.value
                  ? opt.style + ' border-current'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Comentário <span className="text-zinc-400">(opcional)</span>
        </label>
        <textarea
          aria-label="Comentário"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Descreva sua avaliação..."
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Ação sugerida <span className="text-zinc-400">(opcional)</span>
        </label>
        <input
          type="text"
          aria-label="Ação sugerida"
          value={suggestedAction}
          onChange={(e) => setSuggestedAction(e.target.value)}
          placeholder="Ex.: Reavaliação em 30 dias"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      <button
        type="submit"
        disabled={!classification || loading}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? 'Enviando...' : 'Enviar feedback'}
      </button>
    </form>
  );
}
