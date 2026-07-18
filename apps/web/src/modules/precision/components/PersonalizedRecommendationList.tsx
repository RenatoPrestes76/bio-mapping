"use client";

import type { PersonalizedRecommendation, RecommendationCategory } from '../types/precision.types';

const CATEGORY_ICON: Record<RecommendationCategory, string> = {
  NUTRITION: '🥗',
  EXERCISE: '🏃',
  MEDICATION: '💊',
  MONITORING: '📊',
  LIFESTYLE: '🌿',
  PREVENTIVE: '🛡',
  SPECIALIST_REFERRAL: '👨‍⚕️',
};

const CATEGORY_LABEL: Record<RecommendationCategory, string> = {
  NUTRITION: 'Nutrição',
  EXERCISE: 'Exercício',
  MEDICATION: 'Medicação',
  MONITORING: 'Monitoramento',
  LIFESTYLE: 'Estilo de vida',
  PREVENTIVE: 'Preventivo',
  SPECIALIST_REFERRAL: 'Encaminhamento',
};

const PRIORITY_STYLE: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  LOW: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

const PRIORITY_LABEL: Record<string, string> = {
  URGENT: 'Urgente',
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
};

interface PersonalizedRecommendationListProps {
  recommendations: PersonalizedRecommendation[];
}

export function PersonalizedRecommendationList({ recommendations }: PersonalizedRecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <div
        data-testid="recommendation-list"
        className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400 dark:border-zinc-700"
      >
        Nenhuma recomendação personalizada disponível.
      </div>
    );
  }

  return (
    <div data-testid="recommendation-list" className="space-y-3">
      {recommendations.map((rec) => {
        const category = rec.category as RecommendationCategory;
        return (
          <div
            key={rec.id}
            data-testid="recommendation-item"
            data-category={rec.category}
            data-priority={rec.priority}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-xl" aria-hidden="true">
                {CATEGORY_ICON[category] ?? '📋'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{rec.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[rec.priority] ?? PRIORITY_STYLE.LOW}`}>
                    {PRIORITY_LABEL[rec.priority] ?? rec.priority}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {CATEGORY_LABEL[category] ?? category}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{rec.description}</p>
                <p className="mt-1.5 text-xs text-zinc-400">{rec.reason}</p>
                {rec.expectedBenefit && (
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    Benefício esperado: {rec.expectedBenefit}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
