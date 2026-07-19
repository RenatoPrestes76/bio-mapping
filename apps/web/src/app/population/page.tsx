'use client';

import { useState, useEffect } from 'react';
import { usePopulation } from '../../modules/population/hooks/usePopulation';
import { CohortBuilder } from '../../modules/population/components/CohortBuilder';
import { RiskDistributionChart } from '../../modules/population/components/RiskDistributionChart';
import { PopulationTrendsPanel } from '../../modules/population/components/PopulationTrendsPanel';
import { PopulationAlertList } from '../../modules/population/components/PopulationAlertList';
import type { ComputedTrend } from '../../modules/population/types/population.types';

const DEMO_TENANT = 'demo-tenant';

const TABS = ['Dashboard', 'Coortes', 'Alertas'] as const;
type Tab = (typeof TABS)[number];

export default function PopulationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');
  const {
    dashboard,
    alerts,
    trends,
    loading,
    submitCreateCohort,
    loadDashboard,
    loadAlerts,
    acknowledgeAlert,
    loadTrends,
  } = usePopulation();

  useEffect(() => {
    loadDashboard(DEMO_TENANT);
    loadAlerts(DEMO_TENANT);
    loadTrends(DEMO_TENANT);
  }, [loadDashboard, loadAlerts, loadTrends]);

  const computedTrends: ComputedTrend[] = trends
    ? (trends as { computed?: ComputedTrend[] }).computed ?? []
    : [];

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Saúde Populacional
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Análise de coortes, distribuição de risco e alertas populacionais.
      </p>

      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            data-testid={`tab-${tab.toLowerCase()}`}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? '#6366f1' : '#374151',
              borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Dashboard' && (
        <div data-testid="dashboard-tab">
          {loading && (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>
              Carregando dashboard...
            </p>
          )}
          {!loading && !dashboard && (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>
              Nenhum dado de população disponível.
            </p>
          )}
          {dashboard && (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 16,
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                  <p style={{ color: '#6b7280', margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Total de Pacientes
                  </p>
                  <p data-testid="total-patients-stat" style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
                    {dashboard.totalPatients}
                  </p>
                </div>
                {dashboard.highRiskPercentage !== null && (
                  <div style={{ padding: 16, border: '1px solid #fee2e2', borderRadius: 8, background: '#fff5f5' }}>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Alto Risco
                    </p>
                    <p data-testid="high-risk-stat" style={{ fontSize: '2rem', fontWeight: 700, color: '#dc2626', margin: 0 }}>
                      {dashboard.highRiskPercentage.toFixed(1)}%
                    </p>
                  </div>
                )}
                {dashboard.meanAge !== null && (
                  <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Idade Média
                    </p>
                    <p data-testid="mean-age-stat" style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
                      {dashboard.meanAge.toFixed(0)} anos
                    </p>
                  </div>
                )}
                {dashboard.smokingPrevalence !== null && (
                  <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Prevalência Tabagismo
                    </p>
                    <p data-testid="smoking-stat" style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
                      {dashboard.smokingPrevalence.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>

              <div style={{ padding: 20, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: '1.5rem' }}>
                <RiskDistributionChart distribution={dashboard.riskDistribution} />
              </div>

              {computedTrends.length > 0 && (
                <div style={{ padding: 20, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12, marginTop: 0 }}>
                    Tendências Populacionais
                  </h2>
                  <PopulationTrendsPanel trends={computedTrends} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Coortes' && (
        <div data-testid="cohorts-tab">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 16 }}>
            Criar Nova Coorte
          </h2>
          <div style={{ maxWidth: 600, padding: 24, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <CohortBuilder
              onSubmit={submitCreateCohort}
              loading={loading}
            />
          </div>
        </div>
      )}

      {activeTab === 'Alertas' && (
        <div data-testid="alerts-tab">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 16 }}>
            Alertas Populacionais Ativos
          </h2>
          <PopulationAlertList
            alerts={alerts}
            onAcknowledge={acknowledgeAlert}
            loading={loading}
          />
        </div>
      )}
    </main>
  );
}
