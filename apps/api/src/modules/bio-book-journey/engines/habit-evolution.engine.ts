import { HabitPattern } from '../entities/habit-pattern.entity.js';
import type { HabitType, HabitTrend } from '../entities/habit-pattern.entity.js';
import type { NarrativeEvent } from '../../bio-book/entities/narrative-event.entity.js';

const HABIT_EVENT_MAP: Record<HabitType, string[]> = {
  MEDICAL_FOLLOW_UP: ['CONSULTATION'],
  LAB_MONITORING: ['LAB_RESULT'],
  MEDICATION_ADHERENCE: ['MEDICATION_START', 'THERAPEUTIC_CHANGE'],
  LIFESTYLE_TRACKING: ['CLINICAL_RECOMMENDATION', 'LIFESTYLE_CHANGE'],
  THERAPEUTIC_ENGAGEMENT: ['CONSULTATION', 'LAB_RESULT', 'CLINICAL_RECOMMENDATION', 'THERAPEUTIC_CHANGE'],
};

const HABIT_RECOMMENDATIONS: Record<HabitType, { healthy: string; declining: string; emerging: string }> = {
  MEDICAL_FOLLOW_UP: {
    healthy: 'Manter o ritmo de consultas regulares com sua equipe de saúde.',
    declining: 'Retomar consultas periódicas — o acompanhamento regular é fundamental.',
    emerging: 'Consolidar a regularidade das consultas como hábito permanente.',
  },
  LAB_MONITORING: {
    healthy: 'Continue com os exames periódicos para monitorar seus indicadores.',
    declining: 'Priorizar a realização dos exames laboratoriais de acompanhamento.',
    emerging: 'Estabelecer periodicidade fixa de exames com seu médico.',
  },
  MEDICATION_ADHERENCE: {
    healthy: 'Excelente adesão ao regime terapêutico. Mantenha a consistência.',
    declining: 'Reforçar a adesão ao tratamento — converse com seu médico sobre ajustes.',
    emerging: 'Construir rotina sólida de adesão medicamentosa.',
  },
  LIFESTYLE_TRACKING: {
    healthy: 'Seu acompanhamento de estilo de vida está ativo. Continue registrando.',
    declining: 'Retomar o rastreamento de hábitos e recomendações de estilo de vida.',
    emerging: 'Transformar o registro de estilo de vida em hábito regular.',
  },
  THERAPEUTIC_ENGAGEMENT: {
    healthy: 'Alto engajamento terapêutico. Sua jornada está bem conduzida.',
    declining: 'Aumentar o engajamento global no acompanhamento de saúde.',
    emerging: 'Engajamento terapêutico em formação. Continue intensificando.',
  },
};

interface MonthlyCount {
  key: string;
  count: number;
}

export class HabitEvolutionEngine {
  analyze(events: NarrativeEvent[]): HabitPattern[] {
    if (!events.length) return [];

    const habits: HabitPattern[] = [];
    const habitTypes: HabitType[] = [
      'MEDICAL_FOLLOW_UP',
      'LAB_MONITORING',
      'MEDICATION_ADHERENCE',
      'LIFESTYLE_TRACKING',
    ];

    for (const habitType of habitTypes) {
      const relevantEvents = events.filter((e) =>
        HABIT_EVENT_MAP[habitType].includes(e.eventType),
      );
      if (!relevantEvents.length) continue;

      const pattern = this.buildHabitPattern(habitType, relevantEvents, events);
      habits.push(pattern);
    }

    return habits.sort((a, b) => b.consistencyScore - a.consistencyScore);
  }

  private buildHabitPattern(
    habitType: HabitType,
    relevantEvents: NarrativeEvent[],
    allEvents: NarrativeEvent[],
  ): HabitPattern {
    const sorted = [...relevantEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
    const monthly = this.groupByMonth(sorted);
    const trend = this.computeTrend(monthly);
    const consistencyScore = this.computeConsistency(monthly, allEvents);
    const frequencyPerMonth = this.computeFrequency(monthly);
    const lastObservedAt = sorted[sorted.length - 1].date;
    const rec = HABIT_RECOMMENDATIONS[habitType];
    const recommendation = trend === 'DECLINING' ? rec.declining :
      trend === 'EMERGING' ? rec.emerging : rec.healthy;

    return new HabitPattern({
      habitType,
      trend,
      consistencyScore,
      frequencyPerMonth,
      lastObservedAt,
      evidences: [`${relevantEvents.length} evento(s) registrado(s)`, `Último: ${lastObservedAt.toLocaleDateString('pt-BR')}`],
      recommendation,
    });
  }

  private groupByMonth(events: NarrativeEvent[]): MonthlyCount[] {
    const byMonth = new Map<string, number>();
    for (const e of events) {
      const key = `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth()).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
    return [...byMonth.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => a.key.localeCompare(b.key));
  }

  private computeTrend(monthly: MonthlyCount[]): HabitTrend {
    if (!monthly.length) return 'EMERGING';
    if (monthly.length === 1) return 'EMERGING';

    const half = Math.floor(monthly.length / 2);
    const firstHalf = monthly.slice(0, half);
    const secondHalf = monthly.slice(half);

    const avgFirst = firstHalf.reduce((s, m) => s + m.count, 0) / (firstHalf.length || 1);
    const avgSecond = secondHalf.reduce((s, m) => s + m.count, 0) / (secondHalf.length || 1);

    if (avgSecond > avgFirst * 1.2) return 'IMPROVING';
    if (avgSecond < avgFirst * 0.8) return 'DECLINING';
    return 'STABLE';
  }

  private computeConsistency(monthly: MonthlyCount[], allEvents: NarrativeEvent[]): number {
    if (!monthly.length || !allEvents.length) return 0;

    const allSorted = [...allEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
    const spanMonths = this.computeSpanMonths(allSorted);
    if (spanMonths === 0) return monthly.length > 0 ? 50 : 0;

    const activeMonths = monthly.length;
    const ratio = activeMonths / spanMonths;
    const avgFrequency = monthly.reduce((s, m) => s + m.count, 0) / activeMonths;
    const frequencyBonus = Math.min(20, avgFrequency * 10);

    return Math.min(100, Math.round(ratio * 80 + frequencyBonus));
  }

  private computeFrequency(monthly: MonthlyCount[]): number {
    if (!monthly.length) return 0;
    const total = monthly.reduce((s, m) => s + m.count, 0);
    return Math.round((total / monthly.length) * 10) / 10;
  }

  private computeSpanMonths(sortedEvents: NarrativeEvent[]): number {
    if (sortedEvents.length < 2) return 1;
    const first = sortedEvents[0].date;
    const last = sortedEvents[sortedEvents.length - 1].date;
    return Math.max(1, Math.ceil((last.getTime() - first.getTime()) / (30 * 86_400_000)));
  }
}
