'use client';

import type { RiskDistribution } from '../types/population.types';

const RISK_CONFIG = [
  { key: 'LOW', label: 'Baixo', color: '#22c55e' },
  { key: 'MODERATE', label: 'Moderado', color: '#f59e0b' },
  { key: 'HIGH', label: 'Alto', color: '#f97316' },
  { key: 'VERY_HIGH', label: 'Muito Alto', color: '#ef4444' },
  { key: 'CRITICAL', label: 'Crítico', color: '#7f1d1d' },
] as const;

interface Props {
  distribution: RiskDistribution;
}

export function RiskDistributionChart({ distribution }: Props) {
  const { percentages, counts, total, meanRisk } = distribution;

  return (
    <div data-testid="risk-distribution-chart">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>Distribuição de Risco</span>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Total: <strong data-testid="total-patients">{total}</strong> pacientes ·{' '}
          Risco médio: <strong data-testid="mean-risk">{(meanRisk * 100).toFixed(1)}%</strong>
        </span>
      </div>

      <div data-testid="risk-bar" style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
        {RISK_CONFIG.map(({ key, color }) => {
          const pct = percentages[key as keyof typeof percentages];
          if (pct === 0) return null;
          return (
            <div
              key={key}
              data-testid={`risk-segment-${key.toLowerCase()}`}
              title={`${key}: ${pct.toFixed(1)}%`}
              style={{ width: `${pct}%`, background: color, transition: 'width 0.3s' }}
            />
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {RISK_CONFIG.map(({ key, label, color }) => {
          const count = counts[key as keyof typeof counts];
          const pct = percentages[key as keyof typeof percentages];
          return (
            <div
              key={key}
              data-testid={`risk-legend-${key.toLowerCase()}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem' }}
            >
              <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
              <span>{label}</span>
              <span style={{ color: '#6b7280' }}>
                {count} ({pct.toFixed(1)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
