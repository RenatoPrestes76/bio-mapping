"use client";

import type { CdsExplanation } from '../types/cds.types';
import { PriorityBadge } from './PriorityBadge';

const EVIDENCE_LABEL: Record<string, string> = {
  A: 'Grau A — Evidência forte (meta-análise/ECR)',
  B: 'Grau B — Evidência moderada (estudo coorte)',
  C: 'Grau C — Evidência limitada (consenso)',
  D: 'Grau D — Evidência fraca (opinião especialista)',
  EXPERT_OPINION: 'Opinião de especialista',
};

interface ExplanationPanelProps {
  explanation: CdsExplanation;
}

export function ExplanationPanel({ explanation }: ExplanationPanelProps) {
  const { evaluation, reasons, variables, weights, rulesTriggered, modelsUsed, confidenceInterpretation, slaHours } = explanation;

  return (
    <div data-testid="explanation-panel" className="space-y-5">
      {/* Decision summary */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <PriorityBadge priority={evaluation.priority} />
          <span className="text-sm text-zinc-500">SLA: {slaHours}h</span>
          {evaluation.requiresMedicalReview && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
              Revisão médica necessária
            </span>
          )}
        </div>
        <p className="font-medium text-zinc-900 dark:text-zinc-50">{evaluation.recommendation}</p>
        <p className="mt-2 text-sm text-zinc-500">
          Confiança: <span className="font-medium text-zinc-900 dark:text-zinc-50">{Math.round(evaluation.confidence * 100)}% — {confidenceInterpretation}</span>
        </p>
        <p className="text-xs text-zinc-400">
          {EVIDENCE_LABEL[evaluation.evidenceLevel] ?? evaluation.evidenceLevel}
        </p>
      </div>

      {/* Reasons */}
      {reasons.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Motivos</h4>
          <ul className="space-y-1">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <span className="text-emerald-500">✓</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rules triggered */}
      {(rulesTriggered as Array<{ id: string; name: string; priority: string }>).length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Regras disparadas</h4>
          <div className="space-y-1">
            {(rulesTriggered as Array<{ id: string; name: string; priority: string }>).map((rule) => (
              <div key={rule.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{rule.name}</span>
                <PriorityBadge priority={rule.priority as Parameters<typeof PriorityBadge>[0]['priority']} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Variables used */}
      {Object.keys(variables).length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Variáveis utilizadas</h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(variables).map(([key, val]) => (
              <div key={key} className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800">
                <p className="text-xs text-zinc-400">{key}</p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{String(val)}</p>
                {weights[key] !== undefined && (
                  <p className="text-xs text-zinc-400">Peso: {String(weights[key])}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Models used */}
      {modelsUsed.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Modelos utilizados</h4>
          <div className="flex flex-wrap gap-2">
            {modelsUsed.map((m) => (
              <span key={m} className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
