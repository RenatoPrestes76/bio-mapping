'use client';

import type { PopulationAlert, CohortAlertSeverity } from '../types/population.types';

const SEVERITY_CONFIG: Record<CohortAlertSeverity, { label: string; color: string; bg: string }> = {
  LOW: { label: 'Baixo', color: '#16a34a', bg: '#dcfce7' },
  MODERATE: { label: 'Moderado', color: '#d97706', bg: '#fef3c7' },
  HIGH: { label: 'Alto', color: '#ea580c', bg: '#ffedd5' },
  CRITICAL: { label: 'Crítico', color: '#dc2626', bg: '#fee2e2' },
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  RISK_INCREASE: 'Aumento de Risco',
  DISEASE_GROWTH: 'Crescimento de Doença',
  ADHERENCE_DROP: 'Queda de Adesão',
  BIOMARKER_CHANGE: 'Mudança em Biomarcador',
  TREND_SHIFT: 'Mudança de Tendência',
};

interface Props {
  alerts: PopulationAlert[];
  onAcknowledge?: (id: string) => void;
  loading?: boolean;
}

export function PopulationAlertList({ alerts, onAcknowledge, loading }: Props) {
  if (loading) {
    return (
      <div data-testid="alerts-loading" style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
        Carregando alertas...
      </div>
    );
  }

  const active = alerts.filter((a) => a.isActive);

  if (active.length === 0) {
    return (
      <div data-testid="alerts-empty" style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
        Nenhum alerta ativo no momento.
      </div>
    );
  }

  return (
    <div data-testid="population-alert-list">
      {active.map((alert) => {
        const cfg = SEVERITY_CONFIG[alert.severity];
        return (
          <div
            key={alert.id}
            data-testid="alert-item"
            data-severity={alert.severity}
            data-type={alert.alertType}
            style={{
              border: `1px solid ${cfg.color}`,
              borderLeft: `4px solid ${cfg.color}`,
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 10,
              background: cfg.bg,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span
                    data-testid="alert-severity-badge"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: cfg.color,
                      background: 'white',
                      padding: '2px 8px',
                      borderRadius: 9999,
                      border: `1px solid ${cfg.color}`,
                    }}
                  >
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {ALERT_TYPE_LABELS[alert.alertType] ?? alert.alertType}
                  </span>
                </div>
                <p data-testid="alert-title" style={{ fontWeight: 600, margin: 0, marginBottom: 2 }}>
                  {alert.title}
                </p>
                <p data-testid="alert-description" style={{ fontSize: '0.875rem', color: '#374151', margin: 0 }}>
                  {alert.description}
                </p>
                {alert.currentValue !== undefined && alert.previousValue !== undefined && (
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4, margin: 0 }}>
                    Anterior: {alert.previousValue.toFixed(2)} → Atual: {alert.currentValue.toFixed(2)}
                  </p>
                )}
              </div>
              {onAcknowledge && (
                <button
                  data-testid="acknowledge-btn"
                  onClick={() => onAcknowledge(alert.id)}
                  style={{
                    padding: '4px 12px',
                    border: `1px solid ${cfg.color}`,
                    background: 'white',
                    color: cfg.color,
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  Reconhecer
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
