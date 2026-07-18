"use client";

import type { OutcomeCategory } from '../types/learning.types';

const OUTCOME_LABEL: Record<OutcomeCategory, string> = {
  IMPROVED: 'Melhorou',
  STABLE: 'Estável',
  WORSENED: 'Piorou',
  HOSPITALIZED: 'Hospitalizado',
  RESOLVED: 'Resolvido',
  UNKNOWN: 'Desconhecido',
};

const OUTCOME_STYLE: Record<OutcomeCategory, string> = {
  IMPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  STABLE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  WORSENED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  HOSPITALIZED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  RESOLVED: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  UNKNOWN: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

interface OutcomeStatusBadgeProps {
  outcome: OutcomeCategory;
  size?: 'sm' | 'md';
}

export function OutcomeStatusBadge({ outcome, size = 'md' }: OutcomeStatusBadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span
      data-testid="outcome-status-badge"
      data-outcome={outcome}
      className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${OUTCOME_STYLE[outcome]}`}
    >
      {OUTCOME_LABEL[outcome]}
    </span>
  );
}
