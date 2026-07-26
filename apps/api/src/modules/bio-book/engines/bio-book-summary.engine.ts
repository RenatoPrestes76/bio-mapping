import type { NarrativeEvent } from '../entities/narrative-event.entity.js';
import type { NarrativeChapter } from '../entities/narrative-chapter.entity.js';
import type { HealthMilestone } from '../entities/health-milestone.entity.js';
import type { PersonalHealthSummary } from '../entities/health-narrative.entity.js';

export class BioBookSummaryEngine {
  generate(
    patientId: string,
    events: NarrativeEvent[],
    chapters: NarrativeChapter[],
    milestones: HealthMilestone[],
  ): PersonalHealthSummary {
    const positiveCount = this.countPositive(events, milestones);
    const concernCount = this.countConcerns(events);
    const keyAchievements = this.extractAchievements(milestones);
    const headline = this.buildHeadline(positiveCount, concernCount, milestones, chapters);
    const overview = this.buildOverview(events, chapters, milestones);
    const currentStatus = this.buildCurrentStatus(events, chapters);
    const nextSteps = this.buildNextSteps(events, chapters);
    const journeyDurationDays = this.computeSpan(events);

    return {
      headline,
      overview,
      keyAchievements,
      currentStatus,
      nextSteps,
      positiveCount,
      concernCount,
      totalChapters: chapters.length,
      totalMilestones: milestones.length,
      journeyDurationDays,
    };
  }

  private countPositive(events: NarrativeEvent[], milestones: HealthMilestone[]): number {
    const biomarkerImprovements = milestones.filter((m) => m.milestoneType === 'BIOMARKER_IMPROVEMENT').length;
    const positiveEvents = events.filter(
      (e) => e.eventType === 'CONSULTATION' || e.eventType === 'LAB_RESULT',
    ).length;
    return biomarkerImprovements + Math.floor(positiveEvents * 0.6);
  }

  private countConcerns(events: NarrativeEvent[]): number {
    return events.filter(
      (e) =>
        e.significance === 'HIGH' || e.significance === 'LANDMARK' || e.eventType === 'HOSPITALIZATION',
    ).length;
  }

  private extractAchievements(milestones: HealthMilestone[]): string[] {
    const ranked = [...milestones].sort((a, b) => {
      const order: Record<string, number> = { LANDMARK: 0, MAJOR: 1, MINOR: 2 };
      return (order[a.rank] ?? 2) - (order[b.rank] ?? 2);
    });
    return ranked.slice(0, 5).map((m) => m.title);
  }

  private buildHeadline(
    positiveCount: number,
    concernCount: number,
    milestones: HealthMilestone[],
    chapters: NarrativeChapter[],
  ): string {
    const landmarkCount = milestones.filter((m) => m.isLandmark()).length;
    if (landmarkCount > 0)
      return `Jornada de ${chapters.length} capítulo(s) com ${landmarkCount} marco(s) excepcionais alcançados.`;
    if (positiveCount > concernCount * 2) return 'Histórico predominantemente positivo com evolução favorável.';
    if (concernCount > positiveCount) return 'Jornada com desafios relevantes e acompanhamento contínuo necessário.';
    return 'Histórico clínico equilibrado com progressos consistentes.';
  }

  private buildOverview(
    events: NarrativeEvent[],
    chapters: NarrativeChapter[],
    milestones: HealthMilestone[],
  ): string {
    const span = this.computeSpan(events);
    const months = Math.round(span / 30);
    const parts: string[] = [];

    if (months > 0) parts.push(`Ao longo de ${months} mês(es)`);
    parts.push(`foram registrados ${events.length} evento(s) clínicos em ${chapters.length} capítulo(s)`);
    if (milestones.length) parts.push(`com ${milestones.length} marco(s) de saúde identificados`);
    parts.push('no seu Bio-Book pessoal.');

    return parts.join(', ').replace(', no seu Bio-Book pessoal.', '. Seu Bio-Book pessoal documenta esta evolução.');
  }

  private buildCurrentStatus(events: NarrativeEvent[], chapters: NarrativeChapter[]): string {
    const lastChapter = chapters[chapters.length - 1];
    if (!lastChapter) return 'Sem dados suficientes para determinar estado atual.';

    const lastEvents = lastChapter.events.slice(-3);
    const recentConcerns = lastEvents.filter((e) => e.isSignificant()).length;

    if (lastChapter.theme === 'STABILITY') return 'Estado atual: Estável, com indicadores dentro do esperado.';
    if (lastChapter.theme === 'RECOVERY') return 'Estado atual: Em recuperação, com acompanhamento clínico ativo.';
    if (recentConcerns === 0) return 'Estado atual: Acompanhamento regular, sem eventos críticos recentes.';
    return `Estado atual: ${recentConcerns} evento(s) relevante(s) no período mais recente requerem atenção.`;
  }

  private buildNextSteps(events: NarrativeEvent[], chapters: NarrativeChapter[]): string[] {
    const steps: string[] = [];
    const lastChapter = chapters[chapters.length - 1];

    const hasLabs = events.some((e) => e.eventType === 'LAB_RESULT');
    if (hasLabs) steps.push('Manter periodicidade dos exames laboratoriais.');

    const hasMeds = events.some((e) => e.eventType === 'MEDICATION_START');
    if (hasMeds) steps.push('Continuar adesão ao regime terapêutico prescrito.');

    if (lastChapter?.theme === 'METABOLIC_CHANGE')
      steps.push('Reforçar mudanças de estilo de vida e metas metabólicas.');
    if (lastChapter?.theme === 'RECOVERY') steps.push('Seguir plano de recuperação com retorno programado.');

    steps.push('Manter registros atualizados para continuar construindo seu Bio-Book.');
    return steps.slice(0, 4);
  }

  private computeSpan(events: NarrativeEvent[]): number {
    if (events.length < 2) return 0;
    const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
    return Math.ceil((sorted[sorted.length - 1].date.getTime() - sorted[0].date.getTime()) / 86_400_000);
  }
}
