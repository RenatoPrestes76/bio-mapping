'use client';

import type { ComputedTrend, TrendDirection } from '../types/population.types';

const DIRECTION_CONFIG: Record<TrendDirection, { label: string; color: string; symbol: string }> = {
  INCREASING: { label: 'Crescente', color: '#ef4444', symbol: '↑' },
  DECREASING: { label: 'Decrescente', color: '#22c55e', symbol: '↓' },
  STABLE: { label: 'Estável', color: '#6b7280', symbol: '→' },
};

interface Props {
  trends: ComputedTrend[];
  loading?: boolean;
}

export function PopulationTrendsPanel({ trends, loading }: Props) {
  if (loading) {
    return (
      <div data-testid="trends-loading" style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
        Carregando tendências...
      </div>
    );
  }

  if (!trends || trends.length === 0) {
    return (
      <div data-testid="trends-empty" style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
        Nenhuma tendência disponível para o período.
      </div>
    );
  }

  return (
    <div data-testid="population-trends-panel">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Indicador</th>
            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Direção</th>
            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Variação</th>
            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Confiança</th>
            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Significativo</th>
          </tr>
        </thead>
        <tbody>
          {trends.map((t, i) => {
            const cfg = DIRECTION_CONFIG[t.trend.direction];
            return (
              <tr
                key={t.key}
                data-testid="trend-row"
                data-metric={t.key}
                style={{
                  borderBottom: '1px solid #f3f4f6',
                  background: i % 2 === 0 ? 'transparent' : '#fafafa',
                }}
              >
                <td style={{ padding: '8px 12px', fontWeight: 500 }}>{t.key}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span
                    data-testid={`trend-direction-${t.key}`}
                    data-direction={t.trend.direction}
                    style={{ color: cfg.color, fontWeight: 600 }}
                  >
                    {cfg.symbol} {cfg.label}
                  </span>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ color: cfg.color }}>
                    {t.trend.changePercent >= 0 ? '+' : ''}{t.trend.changePercent.toFixed(1)}%
                  </span>
                </td>
                <td style={{ padding: '8px 12px', color: '#6b7280' }}>
                  {(t.trend.confidence * 100).toFixed(0)}%
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {t.trend.isSignificant ? (
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>Sim</span>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>Não</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
