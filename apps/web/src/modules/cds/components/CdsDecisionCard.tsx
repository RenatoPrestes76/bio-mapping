"use client";

import type { CdsEvaluation } from '../types/cds.types';
import { PriorityBadge } from './PriorityBadge';

interface CdsDecisionCardProps {
  evaluation: CdsEvaluation;
  onViewExplanation?: (id: string) => void;
  onRecalculate?: (id: string) => void;
}

export function CdsDecisionCard({ evaluation, onViewExplanation, onRecalculate }: CdsDecisionCardProps) {
  const date = new Date(evaluation.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div data-testid="cds-decision-card" className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <PriorityBadge priority={evaluation.priority} />
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>Confiança: {Math.round(evaluation.confidence * 100)}%</span>
          <span>·</span>
          <span>{date}</span>
        </div>
      </div>

      <p className="font-medium text-zinc-900 dark:text-zinc-50">{evaluation.recommendation}</p>

      {evaluation.reasons && evaluation.reasons.length > 0 && (
        <div className="mt-3 space-y-1">
          {evaluation.reasons.slice(0, 3).map((r, i) => (
            <p key={i} className="text-sm text-zinc-500 dark:text-zinc-400">
              <span className="mr-1 text-zinc-400">—</span>{r}
            </p>
          ))}
          {evaluation.reasons.length > 3 && (
            <p className="text-xs text-zinc-400">+{evaluation.reasons.length - 3} outros motivos</p>
          )}
        </div>
      )}

      {evaluation.requiresMedicalReview && (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
          ⚕️ Revisão médica necessária
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <span className="text-xs text-zinc-400">Evidência: {evaluation.evidenceLevel}</span>
        {evaluation.processingTimeMs !== undefined && (
          <span className="text-xs text-zinc-400">{evaluation.processingTimeMs}ms</span>
        )}
        <div className="ml-auto flex gap-2">
          {onRecalculate && (
            <button
              type="button"
              onClick={() => onRecalculate(evaluation.id)}
              className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Recalcular
            </button>
          )}
          {onViewExplanation && (
            <button
              type="button"
              onClick={() => onViewExplanation(evaluation.id)}
              className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Ver explicação
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
