"use client";

import type { PersonalizedRisk, PersonalizedRiskLevel } from '../types/precision.types';

const RISK_STYLE: Record<PersonalizedRiskLevel, string> = {
  VERY_LOW: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  MODERATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  VERY_HIGH: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-300',
};

const RISK_LABEL: Record<PersonalizedRiskLevel, string> = {
  VERY_LOW: 'Muito Baixo',
  LOW: 'Baixo',
  MODERATE: 'Moderado',
  HIGH: 'Alto',
  VERY_HIGH: 'Muito Alto',
};

const BAR_COLOR: Record<PersonalizedRiskLevel, string> = {
  VERY_LOW: 'bg-emerald-500',
  LOW: 'bg-blue-500',
  MODERATE: 'bg-yellow-500',
  HIGH: 'bg-orange-500',
  VERY_HIGH: 'bg-red-500',
};

interface RiskStratificationCardProps {
  risk: PersonalizedRisk;
}

export function RiskStratificationCard({ risk }: RiskStratificationCardProps) {
  const level = risk.riskLevel as PersonalizedRiskLevel;
  const scorePercent = Math.round(risk.finalRiskScore * 100);

  return (
    <div
      data-testid="risk-stratification-card"
      data-risk-level={risk.riskLevel}
      className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Risco Personalizado</h3>
        <span
          data-testid="risk-level-badge"
          className={`rounded-full px-3 py-1 text-sm font-semibold ${RISK_STYLE[level]}`}
        >
          {RISK_LABEL[level]}
        </span>
      </div>

      <div className="mb-4">
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-zinc-500">Score final</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-50" data-testid="risk-score">
            {scorePercent}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={`h-2 rounded-full transition-all ${BAR_COLOR[level]}`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center text-xs">
        {[
          { label: 'Base', value: Math.round(risk.baseRiskScore * 100) },
          { label: 'Histórico familiar', value: Math.round(risk.familyHistoryAdj * 100) },
          { label: 'Estilo de vida', value: Math.round(risk.lifestyleAdj * 100) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800">
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">{value > 0 ? `+${value}` : value}%</p>
            <p className="text-zinc-400">{label}</p>
          </div>
        ))}
      </div>

      {risk.factors && risk.factors.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-zinc-400 uppercase tracking-wide">Fatores de risco</p>
          <ul className="space-y-1">
            {risk.factors.map((f, i) => (
              <li key={i} data-testid="risk-factor" className="flex items-start gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-zinc-400">
        {new Date(risk.createdAt).toLocaleString('pt-BR')}
      </p>
    </div>
  );
}
