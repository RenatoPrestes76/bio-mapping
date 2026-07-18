"use client";

import type { CarePlan, CarePlanStatus } from '../types/precision.types';

const STATUS_STYLE: Record<CarePlanStatus, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  SUSPENDED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_LABEL: Record<CarePlanStatus, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  COMPLETED: 'Concluído',
  SUSPENDED: 'Suspenso',
};

interface CarePlanCardProps {
  plan: CarePlan;
}

export function CarePlanCard({ plan }: CarePlanCardProps) {
  const status = plan.status as CarePlanStatus;

  return (
    <div
      data-testid="care-plan-card"
      data-status={plan.status}
      className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{plan.title}</h3>
          {plan.description && (
            <p className="mt-0.5 text-sm text-zinc-500">{plan.description}</p>
          )}
        </div>
        <span
          data-testid="care-plan-status-badge"
          className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="flex gap-4 text-xs text-zinc-500">
        <span>Início: {new Date(plan.startDate).toLocaleDateString('pt-BR')}</span>
        <span>Retorno em {plan.followUpDays} dias</span>
      </div>
    </div>
  );
}
