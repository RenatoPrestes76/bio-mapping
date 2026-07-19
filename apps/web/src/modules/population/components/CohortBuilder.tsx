'use client';

import { useState } from 'react';
import type { CohortFilterDefinition, FilterOperator, PopulationSegment, CreateCohortPayload } from '../types/population.types';

const SEGMENT_LABELS: Record<PopulationSegment, string> = {
  HEALTHY: 'Saudável',
  AT_RISK: 'Em Risco',
  CHRONIC_DISEASES: 'Doenças Crônicas',
  CARDIOMETABOLIC: 'Cardiometabólico',
  ONCOLOGY: 'Oncologia',
  MENTAL_HEALTH: 'Saúde Mental',
  WOMENS_HEALTH: 'Saúde da Mulher',
  SENIOR: 'Idoso (65+)',
};

const FILTER_KEYS = ['age', 'sex', 'bmi', 'smoking', 'conditions', 'medications', 'riskLevel', 'lifestyle'];
const OPERATORS: FilterOperator[] = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains'];

interface Props {
  onSubmit: (payload: CreateCohortPayload) => void;
  loading?: boolean;
}

export function CohortBuilder({ onSubmit, loading }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [segment, setSegment] = useState<PopulationSegment | ''>('');
  const [filters, setFilters] = useState<CohortFilterDefinition[]>([]);

  const addFilter = () => {
    setFilters((f) => [...f, { filterKey: 'age', filterOperator: 'gte', filterValue: '' }]);
  };

  const updateFilter = (i: number, field: keyof CohortFilterDefinition, value: string) => {
    setFilters((f) => f.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  };

  const removeFilter = (i: number) => {
    setFilters((f) => f.filter((_, idx) => idx !== i));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      segment: segment || undefined,
      filters,
      tenantId: 'demo-tenant',
    });
  };

  return (
    <form onSubmit={handleSubmit} data-testid="cohort-builder">
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="cohort-name" style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
          Nome da Coorte *
        </label>
        <input
          id="cohort-name"
          data-testid="cohort-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Diabéticos Tipo 2"
          required
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="cohort-description" style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
          Descrição
        </label>
        <textarea
          id="cohort-description"
          data-testid="cohort-description-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, resize: 'vertical' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="cohort-segment" style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
          Segmento Populacional
        </label>
        <select
          id="cohort-segment"
          data-testid="cohort-segment-select"
          value={segment}
          onChange={(e) => setSegment(e.target.value as PopulationSegment | '')}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
        >
          <option value="">Todos os segmentos</option>
          {(Object.keys(SEGMENT_LABELS) as PopulationSegment[]).map((s) => (
            <option key={s} value={s} data-testid="segment-option" data-segment={s}>
              {SEGMENT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>Filtros</span>
          <button
            type="button"
            data-testid="add-filter-btn"
            onClick={addFilter}
            style={{ padding: '4px 12px', border: '1px solid #6366f1', color: '#6366f1', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
          >
            + Adicionar Filtro
          </button>
        </div>

        {filters.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            Sem filtros — coorte incluirá todos os pacientes do tenant.
          </p>
        )}

        {filters.map((f, i) => (
          <div key={i} data-testid="filter-row" style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <select
              value={f.filterKey}
              onChange={(e) => updateFilter(i, 'filterKey', e.target.value)}
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4 }}
            >
              {FILTER_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <select
              value={f.filterOperator}
              onChange={(e) => updateFilter(i, 'filterOperator', e.target.value)}
              style={{ flex: 0.7, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4 }}
            >
              {OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
            </select>
            <input
              value={f.filterValue}
              onChange={(e) => updateFilter(i, 'filterValue', e.target.value)}
              placeholder="valor"
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4 }}
            />
            <button
              type="button"
              data-testid="remove-filter-btn"
              onClick={() => removeFilter(i)}
              style={{ padding: '6px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="submit"
        data-testid="create-cohort-btn"
        disabled={loading || !name.trim()}
        style={{
          width: '100%', padding: '10px', background: '#6366f1', color: 'white',
          border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
          opacity: loading || !name.trim() ? 0.6 : 1,
        }}
      >
        {loading ? 'Criando...' : 'Criar Coorte'}
      </button>
    </form>
  );
}
