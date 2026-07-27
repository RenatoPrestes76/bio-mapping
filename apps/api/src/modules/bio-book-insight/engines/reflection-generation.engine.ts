import { HealthReflection } from '../entities/health-reflection.entity.js';
import type { ReflectionSentiment } from '../entities/health-reflection.entity.js';
import type { NarrativeEvent } from '../../bio-book/entities/narrative-event.entity.js';
import type { HealthMilestone } from '../../bio-book/entities/health-milestone.entity.js';

const MONTH_LABELS_PT: string[] = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const QUARTER_LABELS: string[] = ['1º Trimestre', '2º Trimestre', '3º Trimestre', '4º Trimestre'];

export class ReflectionGenerationEngine {
  generate(
    patientId: string,
    events: NarrativeEvent[],
    milestones: HealthMilestone[],
  ): HealthReflection[] {
    if (!events.length) return [];

    const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
    const reflections: HealthReflection[] = [];

    const spanDays = (sorted[sorted.length - 1].date.getTime() - sorted[0].date.getTime()) / 86_400_000;

    if (spanDays >= 25) {
      reflections.push(...this.buildMonthlyReflections(patientId, sorted, milestones));
    }

    if (spanDays >= 85) {
      reflections.push(...this.buildQuarterlyReflections(patientId, sorted, milestones));
    }

    reflections.push(this.buildFullJourneyReflection(patientId, sorted, milestones));

    return reflections;
  }

  private buildMonthlyReflections(
    patientId: string,
    events: NarrativeEvent[],
    milestones: HealthMilestone[],
  ): HealthReflection[] {
    const byMonth = new Map<string, NarrativeEvent[]>();

    for (const e of events) {
      const key = `${e.date.getUTCFullYear()}-${e.date.getUTCMonth()}`;
      const list = byMonth.get(key) ?? [];
      list.push(e);
      byMonth.set(key, list);
    }

    const reflections: HealthReflection[] = [];
    for (const [key, monthEvents] of byMonth) {
      const [year, month] = key.split('-').map(Number);
      const label = `${MONTH_LABELS_PT[month]} ${year}`;
      const fromDate = new Date(Date.UTC(year, month, 1));
      const toDate = new Date(Date.UTC(year, month + 1, 0));
      const monthMilestones = milestones.filter(
        (m) => m.achievedAt >= fromDate && m.achievedAt <= toDate,
      );

      reflections.push(
        this.buildReflection(patientId, 'MONTHLY', label, fromDate, toDate, monthEvents, monthMilestones),
      );
    }

    return reflections.sort((a, b) => a.fromDate.getTime() - b.fromDate.getTime());
  }

  private buildQuarterlyReflections(
    patientId: string,
    events: NarrativeEvent[],
    milestones: HealthMilestone[],
  ): HealthReflection[] {
    const byQuarter = new Map<string, NarrativeEvent[]>();

    for (const e of events) {
      const year = e.date.getUTCFullYear();
      const quarter = Math.floor(e.date.getUTCMonth() / 3);
      const key = `${year}-Q${quarter}`;
      const list = byQuarter.get(key) ?? [];
      list.push(e);
      byQuarter.set(key, list);
    }

    const reflections: HealthReflection[] = [];
    for (const [key, qEvents] of byQuarter) {
      const [year, q] = key.split('-Q').map(Number);
      const quarter = q;
      const label = `${QUARTER_LABELS[quarter]} ${year}`;
      const fromMonth = quarter * 3;
      const fromDate = new Date(Date.UTC(year, fromMonth, 1));
      const toDate = new Date(Date.UTC(year, fromMonth + 3, 0));
      const qMilestones = milestones.filter(
        (m) => m.achievedAt >= fromDate && m.achievedAt <= toDate,
      );

      reflections.push(
        this.buildReflection(patientId, 'QUARTERLY', label, fromDate, toDate, qEvents, qMilestones),
      );
    }

    return reflections.sort((a, b) => a.fromDate.getTime() - b.fromDate.getTime());
  }

  private buildFullJourneyReflection(
    patientId: string,
    events: NarrativeEvent[],
    milestones: HealthMilestone[],
  ): HealthReflection {
    const fromDate = events[0].date;
    const toDate = events[events.length - 1].date;
    const spanMonths = Math.round((toDate.getTime() - fromDate.getTime()) / (30 * 86_400_000));
    const label = `Jornada completa (${spanMonths > 0 ? spanMonths + ' meses' : 'início'})`;

    return this.buildReflection(patientId, 'FULL_JOURNEY', label, fromDate, toDate, events, milestones);
  }

  private buildReflection(
    patientId: string,
    period: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'FULL_JOURNEY',
    label: string,
    fromDate: Date,
    toDate: Date,
    events: NarrativeEvent[],
    milestones: HealthMilestone[],
  ): HealthReflection {
    const evolution = this.buildEvolution(events, period);
    const challenges = this.buildChallenges(events);
    const achievements = [...milestones.map((m) => m.title)];
    const nextSteps = this.buildNextSteps(events);
    const sentiment = this.computeSentiment(events, milestones);

    return new HealthReflection({
      patientId,
      period,
      periodLabel: label,
      fromDate,
      toDate,
      evolution,
      challenges,
      achievements,
      nextSteps,
      overallSentiment: sentiment,
      eventCount: events.length,
    });
  }

  private buildEvolution(events: NarrativeEvent[], period: string): string {
    const labCount = events.filter((e) => e.eventType === 'LAB_RESULT').length;
    const consultCount = events.filter((e) => e.eventType === 'CONSULTATION').length;
    const medCount = events.filter(
      (e) => e.eventType === 'MEDICATION_START' || e.eventType === 'THERAPEUTIC_CHANGE',
    ).length;

    const parts: string[] = [`${events.length} evento(s) registrado(s) neste período.`];
    if (labCount > 0) parts.push(`${labCount} exame(s) laboratorial(is) realizados.`);
    if (consultCount > 0) parts.push(`${consultCount} consulta(s) de acompanhamento.`);
    if (medCount > 0) parts.push(`${medCount} ajuste(s) terapêutico(s) realizados.`);
    return parts.join(' ');
  }

  private buildChallenges(events: NarrativeEvent[]): string[] {
    const challenges: string[] = [];
    const hospitalizations = events.filter((e) => e.eventType === 'HOSPITALIZATION');
    if (hospitalizations.length > 0) {
      challenges.push(`${hospitalizations.length} internação(ões) neste período requereram atenção especial.`);
    }
    const critical = events.filter((e) => e.significance === 'LANDMARK' && e.eventType !== 'MILESTONE');
    if (critical.length > 0) {
      challenges.push(`${critical.length} evento(s) de alta relevância clínica identificados.`);
    }
    return challenges;
  }

  private buildNextSteps(events: NarrativeEvent[]): string[] {
    const steps: string[] = [];
    if (events.some((e) => e.eventType === 'LAB_RESULT')) {
      steps.push('Manter a regularidade dos exames laboratoriais de acompanhamento.');
    }
    if (events.some((e) => e.eventType === 'MEDICATION_START' || e.eventType === 'THERAPEUTIC_CHANGE')) {
      steps.push('Continuar com o regime terapêutico atual e monitorar os resultados.');
    }
    if (!steps.length) {
      steps.push('Continue atualizando seus registros de saúde para enriquecer sua narrativa.');
    }
    return steps;
  }

  private computeSentiment(events: NarrativeEvent[], milestones: HealthMilestone[]): ReflectionSentiment {
    const hasHospitalization = events.some((e) => e.eventType === 'HOSPITALIZATION');
    if (hasHospitalization) return 'CHALLENGING';
    const landmarkMs = milestones.filter((m) => m.isLandmark()).length;
    if (landmarkMs > 0) return 'POSITIVE';
    const positiveEvents = events.filter((e) => e.isSignificant() && e.eventType !== 'HOSPITALIZATION').length;
    return positiveEvents > 0 ? 'POSITIVE' : 'NEUTRAL';
  }
}
