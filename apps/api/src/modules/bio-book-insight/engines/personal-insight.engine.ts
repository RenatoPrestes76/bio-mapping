import { PersonalInsight } from '../entities/personal-insight.entity.js';
import type { InsightStrength } from '../entities/personal-insight.entity.js';
import type { NarrativeEvent } from '../../bio-book/entities/narrative-event.entity.js';
import type { HealthMilestone } from '../../bio-book/entities/health-milestone.entity.js';
import type { NarrativeChapter } from '../../bio-book/entities/narrative-chapter.entity.js';

export class PersonalInsightEngine {
  generate(
    patientId: string,
    events: NarrativeEvent[],
    milestones: HealthMilestone[],
    chapters: NarrativeChapter[],
  ): PersonalInsight[] {
    if (!events.length) return [];

    const insights: PersonalInsight[] = [];

    insights.push(...this.detectAchievementInsights(patientId, milestones));
    insights.push(...this.detectEvolutionInsights(patientId, events, chapters));
    insights.push(...this.detectCorrelationInsights(patientId, events));
    insights.push(...this.detectOpportunityInsights(patientId, events, milestones));
    insights.push(...this.detectRiskInsights(patientId, events));

    return insights.sort((a, b) => {
      const strengthOrder: Record<string, number> = { VERY_STRONG: 0, STRONG: 1, MODERATE: 2, WEAK: 3 };
      return (strengthOrder[a.strength] ?? 3) - (strengthOrder[b.strength] ?? 3);
    });
  }

  private detectAchievementInsights(
    patientId: string,
    milestones: HealthMilestone[],
  ): PersonalInsight[] {
    const insights: PersonalInsight[] = [];
    const landmarks = milestones.filter((m) => m.isLandmark());
    if (landmarks.length > 0) {
      insights.push(
        new PersonalInsight({
          patientId,
          category: 'ACHIEVEMENT',
          title: 'Marcos excepcionais conquistados',
          text: `Você alcançou ${landmarks.length} marco(s) excepcional(is) em sua jornada de saúde, evidenciando progresso significativo e consistente.`,
          strength: 'VERY_STRONG',
          evidences: landmarks.map((m) => m.title),
          tags: ['marco', 'conquista', 'progresso'],
        }),
      );
    }

    const biomarkerMs = milestones.filter((m) => m.milestoneType === 'BIOMARKER_IMPROVEMENT');
    if (biomarkerMs.length > 0) {
      insights.push(
        new PersonalInsight({
          patientId,
          category: 'ACHIEVEMENT',
          title: 'Melhoras em biomarcadores',
          text: `${biomarkerMs.length} indicador(es) biológico(s) apresentaram melhora mensurável ao longo do acompanhamento.`,
          strength: biomarkerMs.length >= 3 ? 'STRONG' : 'MODERATE',
          evidences: biomarkerMs.map((m) => m.title),
          tags: ['biomarcador', 'evolução', 'saúde'],
        }),
      );
    }

    return insights;
  }

  private detectEvolutionInsights(
    patientId: string,
    events: NarrativeEvent[],
    chapters: NarrativeChapter[],
  ): PersonalInsight[] {
    const insights: PersonalInsight[] = [];
    if (!events.length || !chapters.length) return insights;

    const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
    const spanDays = Math.ceil((sorted[sorted.length - 1].date.getTime() - sorted[0].date.getTime()) / 86_400_000);

    if (spanDays > 180) {
      insights.push(
        new PersonalInsight({
          patientId,
          category: 'EVOLUTION',
          title: 'Jornada de longo prazo',
          text: `Sua jornada de saúde registrada abrange ${Math.round(spanDays / 30)} meses de acompanhamento contínuo — um compromisso significativo com sua saúde.`,
          strength: spanDays > 365 ? 'VERY_STRONG' : 'STRONG',
          evidences: [`${events.length} eventos em ${chapters.length} capítulos`],
          tags: ['continuidade', 'compromisso', 'longo-prazo'],
          fromDate: sorted[0].date,
          toDate: sorted[sorted.length - 1].date,
        }),
      );
    }

    const peakChapter = chapters.reduce((best, c) =>
      c.significantEventCount() > best.significantEventCount() ? c : best,
    );
    if (peakChapter.significantEventCount() > 0) {
      insights.push(
        new PersonalInsight({
          patientId,
          category: 'EVOLUTION',
          title: 'Período de maior evolução identificado',
          text: `Seu maior período de evolução foi o Capítulo ${peakChapter.number}: "${peakChapter.title}", com ${peakChapter.significantEventCount()} evento(s) clinicamente relevante(s).`,
          strength: 'STRONG',
          evidences: peakChapter.highlights.slice(0, 3),
          tags: ['pico', 'evolução', 'capítulo'],
          fromDate: peakChapter.startDate,
          toDate: peakChapter.endDate,
        }),
      );
    }

    return insights;
  }

  private detectCorrelationInsights(patientId: string, events: NarrativeEvent[]): PersonalInsight[] {
    const insights: PersonalInsight[] = [];

    const consultations = events.filter((e) => e.eventType === 'CONSULTATION');
    const labs = events.filter((e) => e.eventType === 'LAB_RESULT');

    if (consultations.length >= 3 && labs.length >= 3) {
      insights.push(
        new PersonalInsight({
          patientId,
          category: 'CORRELATION',
          title: 'Correlação: consultas e exames',
          text: 'A combinação regular de consultas e exames laboratoriais ao longo da sua jornada reflete um padrão de acompanhamento clínico estruturado, associado a melhores resultados de saúde.',
          strength: 'MODERATE',
          evidences: [`${consultations.length} consultas`, `${labs.length} exames laboratoriais`],
          tags: ['padrão', 'correlação', 'acompanhamento'],
        }),
      );
    }

    const meds = events.filter(
      (e) => e.eventType === 'MEDICATION_START' || e.eventType === 'THERAPEUTIC_CHANGE',
    );
    if (meds.length >= 1 && labs.length >= 2) {
      insights.push(
        new PersonalInsight({
          patientId,
          category: 'CORRELATION',
          title: 'Monitoramento terapêutico',
          text: `A sequência de ajustes terapêuticos (${meds.length}) acompanhados de exames laboratoriais indica monitoramento ativo da resposta ao tratamento.`,
          strength: 'MODERATE',
          evidences: [`${meds.length} ajuste(s) terapêutico(s)`, `${labs.length} exame(s) de monitoramento`],
          tags: ['terapia', 'monitoramento', 'resposta'],
        }),
      );
    }

    return insights;
  }

  private detectOpportunityInsights(
    patientId: string,
    events: NarrativeEvent[],
    milestones: HealthMilestone[],
  ): PersonalInsight[] {
    const insights: PersonalInsight[] = [];
    const genomicEvents = events.filter((e) => e.eventType === 'GENOMIC_DISCOVERY');
    if (genomicEvents.length > 0) {
      insights.push(
        new PersonalInsight({
          patientId,
          category: 'OPPORTUNITY',
          title: 'Dados genômicos disponíveis',
          text: 'Você possui dados genômicos registrados que podem ser aproveitados para personalizar ainda mais o seu plano de saúde e prevenção.',
          strength: 'STRONG',
          evidences: [`${genomicEvents.length} evento(s) genômico(s) registrado(s)`],
          tags: ['genômica', 'personalização', 'precisão'],
        }),
      );
    }

    const consistency = milestones.find((m) => m.milestoneType === 'HABIT_CONSISTENCY');
    if (consistency) {
      insights.push(
        new PersonalInsight({
          patientId,
          category: 'OPPORTUNITY',
          title: 'Consistência como base para otimização',
          text: 'Sua consistência no acompanhamento cria uma base sólida para metas de otimização mais avançadas, como melhoras em biomarcadores específicos ou longevidade.',
          strength: 'MODERATE',
          evidences: [consistency.title],
          tags: ['consistência', 'otimização', 'oportunidade'],
        }),
      );
    }

    return insights;
  }

  private detectRiskInsights(patientId: string, events: NarrativeEvent[]): PersonalInsight[] {
    const insights: PersonalInsight[] = [];
    const hospitalizations = events.filter((e) => e.eventType === 'HOSPITALIZATION');
    if (hospitalizations.length > 0) {
      insights.push(
        new PersonalInsight({
          patientId,
          category: 'RISK',
          title: 'Histórico de internação registrado',
          text: `${hospitalizations.length} internação(ões) constam no seu histórico. O acompanhamento contínuo e preventivo é recomendado para reduzir recorrências.`,
          strength: hospitalizations.length > 1 ? 'STRONG' : 'MODERATE',
          evidences: hospitalizations.map((e) => `Internação em ${e.date.toLocaleDateString('pt-BR')}`),
          tags: ['risco', 'internação', 'prevenção'],
        }),
      );
    }

    const criticalEvents = events.filter((e) => e.significance === 'LANDMARK' && e.eventType !== 'MILESTONE');
    if (criticalEvents.length >= 2) {
      insights.push(
        new PersonalInsight({
          patientId,
          category: 'RISK',
          title: 'Múltiplos eventos críticos registrados',
          text: `${criticalEvents.length} eventos de alta relevância clínica foram identificados no histórico. Acompanhamento preventivo regular é fundamental.`,
          strength: 'WEAK',
          evidences: criticalEvents.slice(0, 3).map((e) => e.narrativeText),
          tags: ['risco', 'eventos-críticos', 'prevenção'],
        }),
      );
    }

    return insights;
  }
}
