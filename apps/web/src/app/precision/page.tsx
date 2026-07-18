"use client";

import { useState } from 'react';
import { usePrecision } from '../../modules/precision/hooks/usePrecision';
import { RiskStratificationCard } from '../../modules/precision/components/RiskStratificationCard';
import { CarePlanCard } from '../../modules/precision/components/CarePlanCard';
import { LongitudinalChart } from '../../modules/precision/components/LongitudinalChart';
import { PersonalizedRecommendationList } from '../../modules/precision/components/PersonalizedRecommendationList';
import type { CreateProfilePayload, BiologicalSex, LifestyleType, AlcoholConsumption } from '../../modules/precision/types/precision.types';

const DEMO_PATIENT_ID = 'patient-001';

export default function PrecisionPage() {
  const {
    profile, risk, recommendations, carePlan, timeline,
    loading, error,
    submitProfile, loadRisk, loadRecommendations, submitCarePlan, loadTimeline,
  } = usePrecision();

  const [tab, setTab] = useState<'overview' | 'profile' | 'timeline'>('overview');
  const [profileForm, setProfileForm] = useState<Partial<CreateProfilePayload>>({
    patientId: DEMO_PATIENT_ID,
    age: 45,
    sex: 'MALE' as BiologicalSex,
    weight: 80,
    height: 1.75,
    lifestyle: 'SEDENTARY' as LifestyleType,
    smoking: false,
    alcohol: 'NONE' as AlcoholConsumption,
    familyHistory: ['diabetes'],
    conditions: [],
  });
  const [profileSuccess, setProfileSuccess] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await submitProfile(profileForm as CreateProfilePayload);
    if (result) {
      setProfileSuccess(true);
      await Promise.all([
        loadRisk({ patientId: profileForm.patientId! }),
        loadRecommendations(profileForm.patientId!),
      ]);
    }
  };

  const handleLoadOverview = async () => {
    await Promise.all([
      loadRisk({ patientId: DEMO_PATIENT_ID }),
      loadRecommendations(DEMO_PATIENT_ID),
    ]);
  };

  const handleCreatePlan = async () => {
    const result = await submitCarePlan({ patientId: DEMO_PATIENT_ID });
    if (!result) return;
  };

  const handleLoadTimeline = async () => {
    await loadTimeline(DEMO_PATIENT_ID);
  };

  const TABS = [
    { id: 'overview' as const, label: 'Visão Geral' },
    { id: 'profile' as const, label: 'Perfil do Paciente' },
    { id: 'timeline' as const, label: 'Linha do Tempo' },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Medicina de Precisão</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Análises personalizadas ao perfil individual do paciente
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
        </div>
      )}

      {/* Overview Tab */}
      {tab === 'overview' && !loading && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={handleLoadOverview}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Calcular risco e recomendações
            </button>
          </div>

          {risk && <RiskStratificationCard risk={risk} />}

          {recommendations.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Recomendações personalizadas ({recommendations.length})
              </h2>
              <PersonalizedRecommendationList recommendations={recommendations} />
            </div>
          )}

          {!risk && recommendations.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400 dark:border-zinc-700">
              Calcule o risco para visualizar o perfil de risco e recomendações personalizadas.
            </div>
          )}

          {recommendations.length > 0 && !carePlan && (
            <button
              onClick={handleCreatePlan}
              disabled={loading}
              className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Gerar plano de cuidado
            </button>
          )}

          {carePlan && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Plano de cuidado</h2>
              <CarePlanCard plan={carePlan} />
            </div>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {tab === 'profile' && !loading && (
        <form
          onSubmit={handleProfileSubmit}
          className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Perfil do Paciente</h2>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Idade</label>
              <input
                type="number"
                value={profileForm.age ?? ''}
                onChange={(e) => setProfileForm((f) => ({ ...f, age: Number(e.target.value) }))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                value={profileForm.weight ?? ''}
                onChange={(e) => setProfileForm((f) => ({ ...f, weight: Number(e.target.value) }))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Altura (m)</label>
              <input
                type="number"
                step="0.01"
                value={profileForm.height ?? ''}
                onChange={(e) => setProfileForm((f) => ({ ...f, height: Number(e.target.value) }))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Sexo biológico</label>
              <select
                value={profileForm.sex ?? ''}
                onChange={(e) => setProfileForm((f) => ({ ...f, sex: e.target.value as BiologicalSex }))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">Não informado</option>
                <option value="MALE">Masculino</option>
                <option value="FEMALE">Feminino</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Estilo de vida</label>
              <select
                value={profileForm.lifestyle ?? ''}
                onChange={(e) => setProfileForm((f) => ({ ...f, lifestyle: e.target.value as LifestyleType }))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">Não informado</option>
                <option value="SEDENTARY">Sedentário</option>
                <option value="LIGHTLY_ACTIVE">Levemente ativo</option>
                <option value="MODERATELY_ACTIVE">Moderadamente ativo</option>
                <option value="VERY_ACTIVE">Muito ativo</option>
                <option value="ATHLETE">Atleta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Álcool</label>
              <select
                value={profileForm.alcohol ?? ''}
                onChange={(e) => setProfileForm((f) => ({ ...f, alcohol: e.target.value as AlcoholConsumption }))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="NONE">Não bebe</option>
                <option value="OCCASIONAL">Ocasional</option>
                <option value="MODERATE">Moderado</option>
                <option value="HEAVY">Frequente</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="smoking"
                checked={profileForm.smoking ?? false}
                onChange={(e) => setProfileForm((f) => ({ ...f, smoking: e.target.checked }))}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <label htmlFor="smoking" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Fumante</label>
            </div>
          </div>

          {profileSuccess && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Perfil salvo com sucesso.</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {profile ? 'Atualizar perfil' : 'Salvar perfil'}
          </button>
        </form>
      )}

      {/* Timeline Tab */}
      {tab === 'timeline' && !loading && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleLoadTimeline}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Carregar linha do tempo
            </button>
          </div>
          {timeline ? (
            <LongitudinalChart summaries={timeline.summaries} />
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400 dark:border-zinc-700">
              Carregue a linha do tempo para visualizar a evolução das métricas.
            </div>
          )}
        </div>
      )}
    </main>
  );
}
