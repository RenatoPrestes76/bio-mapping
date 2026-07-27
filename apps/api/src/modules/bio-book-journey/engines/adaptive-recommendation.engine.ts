import { AdaptiveRecommendation } from '../entities/adaptive-recommendation.entity.js';
import type { RecommendationArea } from '../entities/adaptive-recommendation.entity.js';
import type { HabitPattern } from '../entities/habit-pattern.entity.js';
import type { PersonalInsight } from '../../bio-book-insight/entities/personal-insight.entity.js';
import type { PersonalGoal } from '../../bio-book-insight/entities/personal-goal.entity.js';
import type { JourneyPath } from '../entities/journey-path.entity.js';
import type { NarrativeEvent } from '../../bio-book/entities/narrative-event.entity.js';

export class AdaptiveRecommendationEngine {
  generate(
    patientId: string,
    insights: PersonalInsight[],
    goals: PersonalGoal[],
    habitPatterns: HabitPattern[],
    journeyPath: JourneyPath,
    events: NarrativeEvent[],
  ): AdaptiveRecommendation[] {
    const recs: AdaptiveRecommendation[] = [];

    recs.push(...this.fromRiskInsights(patientId, insights));
    recs.push(...this.fromGoals(patientId, goals));
    recs.push(...this.fromHabits(patientId, habitPatterns));
    recs.push(...this.fromJourneyPhase(patientId, journeyPath));
    recs.push(...this.fromOpportunityInsights(patientId, insights, events));

    return this.deduplicate(recs);
  }

  private fromRiskInsights(patientId: string, insights: PersonalInsight[]): AdaptiveRecommendation[] {
    const recs: AdaptiveRecommendation[] = [];
    const riskInsights = insights.filter((i) => i.category === 'RISK' && i.isStrong());

    for (const insight of riskInsights.slice(0, 2)) {
      recs.push(
        new AdaptiveRecommendation({
          patientId,
          area: 'MONITORING',
          priority: 'IMMEDIATE',
          title: `Atenção requerida: ${insight.title}`,
          rationale: insight.text,
          actions: ['Agendar consulta médica de avaliação', 'Registrar eventuais sintomas novos'],
          evidenceBasis: insight.evidences,
          isClinicianReviewRequired: true,
        }),
      );
    }
    return recs;
  }

  private fromGoals(patientId: string, goals: PersonalGoal[]): AdaptiveRecommendation[] {
    const recs: AdaptiveRecommendation[] = [];
    const atRiskGoals = goals.filter((g) => g.isAtRisk());
    const lowProgressGoals = goals.filter((g) => g.progressPercent < 40 && !g.isCompleted());

    for (const goal of atRiskGoals.slice(0, 1)) {
      recs.push(
        new AdaptiveRecommendation({
          patientId,
          area: 'FOLLOW_UP',
          priority: 'IMMEDIATE',
          title: `Objetivo em risco: ${goal.title}`,
          rationale: `O objetivo "${goal.title}" está marcado como em risco com ${goal.progressPercent}% de progresso.`,
          actions: ['Revisar o plano de ação com seu médico', 'Identificar obstáculos ao progresso'],
          evidenceBasis: goal.evidences,
          isClinicianReviewRequired: true,
        }),
      );
    }

    for (const goal of lowProgressGoals.slice(0, 2)) {
      recs.push(
        new AdaptiveRecommendation({
          patientId,
          area: this.goalCategoryToArea(goal.category as string),
          priority: 'SHORT_TERM',
          title: `Impulsionar progresso: ${goal.title}`,
          rationale: `Progresso atual em "${goal.title}": ${goal.progressPercent}%. Há oportunidade de aceleração.`,
          actions: goal.evidences.length > 0 ? ['Aumentar frequência de monitoramento', 'Revisar estratégia com especialista'] : ['Iniciar registro regular', 'Definir metas intermediárias'],
          evidenceBasis: goal.evidences,
          isClinicianReviewRequired: false,
        }),
      );
    }

    return recs;
  }

  private fromHabits(patientId: string, habitPatterns: HabitPattern[]): AdaptiveRecommendation[] {
    const recs: AdaptiveRecommendation[] = [];
    const decliningHabits = habitPatterns.filter((h) => h.needsAttention());

    for (const habit of decliningHabits.slice(0, 2)) {
      recs.push(
        new AdaptiveRecommendation({
          patientId,
          area: this.habitToArea(habit.habitType),
          priority: habit.trend === 'DECLINING' ? 'SHORT_TERM' : 'SHORT_TERM',
          title: `Retomar: ${habit.label}`,
          rationale: `${habit.label} com tendência de ${habit.trend === 'DECLINING' ? 'queda' : 'atenção'} (consistência: ${habit.consistencyScore}%).`,
          actions: [habit.recommendation],
          evidenceBasis: habit.evidences,
          isClinicianReviewRequired: false,
        }),
      );
    }

    const healthyHabits = habitPatterns.filter((h) => h.isHealthy());
    if (healthyHabits.length >= 2) {
      recs.push(
        new AdaptiveRecommendation({
          patientId,
          area: 'LONGEVITY',
          priority: 'LONG_TERM',
          title: 'Expandir para hábitos de longevidade',
          rationale: `${healthyHabits.length} hábitos saudáveis estabelecidos. Momento ideal para adicionar estratégias preventivas de longo prazo.`,
          actions: ['Explorar dados genômicos e preditivos', 'Considerar avaliação de longevidade'],
          evidenceBasis: healthyHabits.map((h) => h.label),
          isClinicianReviewRequired: false,
        }),
      );
    }

    return recs;
  }

  private fromJourneyPhase(patientId: string, journeyPath: JourneyPath): AdaptiveRecommendation[] {
    const recs: AdaptiveRecommendation[] = [];
    const current = journeyPath.getCurrentPhase();
    const next = journeyPath.getNextPhase();

    if (!current) return recs;

    recs.push(
      new AdaptiveRecommendation({
        patientId,
        area: 'FOLLOW_UP',
        priority: 'SHORT_TERM',
        title: `Consolidar: ${current.label}`,
        rationale: `Você está na fase de ${current.label}. Cumprir os critérios desta fase impulsionará sua jornada.`,
        actions: current.keyActions.slice(0, 2),
        evidenceBasis: current.successCriteria.slice(0, 2),
        isClinicianReviewRequired: false,
      }),
    );

    if (next) {
      recs.push(
        new AdaptiveRecommendation({
          patientId,
          area: 'LIFESTYLE',
          priority: 'LONG_TERM',
          title: `Preparar para: ${next.label}`,
          rationale: `A próxima fase da sua jornada é ${next.label}: ${next.description}`,
          actions: [`Manter os registros desta fase`, `Atingir critérios: ${next.label}`],
          evidenceBasis: [`Próxima fase planejada: ${next.label}`],
          isClinicianReviewRequired: false,
        }),
      );
    }

    return recs;
  }

  private fromOpportunityInsights(
    patientId: string,
    insights: PersonalInsight[],
    events: NarrativeEvent[],
  ): AdaptiveRecommendation[] {
    const recs: AdaptiveRecommendation[] = [];
    const opportunityInsights = insights.filter((i) => i.category === 'OPPORTUNITY');

    for (const insight of opportunityInsights.slice(0, 1)) {
      recs.push(
        new AdaptiveRecommendation({
          patientId,
          area: 'LONGEVITY',
          priority: 'LONG_TERM',
          title: `Oportunidade: ${insight.title}`,
          rationale: insight.text,
          actions: ['Discutir com seu médico as oportunidades identificadas', 'Registrar progressos'],
          evidenceBasis: insight.evidences,
          isClinicianReviewRequired: false,
        }),
      );
    }

    return recs;
  }

  private deduplicate(recs: AdaptiveRecommendation[]): AdaptiveRecommendation[] {
    const seen = new Set<string>();
    return recs.filter((r) => {
      const key = r.title.toLowerCase().slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private goalCategoryToArea(category: string): RecommendationArea {
    const map: Record<string, RecommendationArea> = {
      METABOLIC: 'MONITORING',
      CARDIOVASCULAR: 'MONITORING',
      WEIGHT: 'ACTIVITY',
      LIFESTYLE: 'LIFESTYLE',
      MEDICATION: 'ADHERENCE',
      LONGEVITY: 'LONGEVITY',
    };
    return map[category] ?? 'LIFESTYLE';
  }

  private habitToArea(habitType: string): RecommendationArea {
    const map: Record<string, RecommendationArea> = {
      MEDICAL_FOLLOW_UP: 'FOLLOW_UP',
      LAB_MONITORING: 'MONITORING',
      MEDICATION_ADHERENCE: 'ADHERENCE',
      LIFESTYLE_TRACKING: 'LIFESTYLE',
      THERAPEUTIC_ENGAGEMENT: 'FOLLOW_UP',
    };
    return map[habitType] ?? 'LIFESTYLE';
  }
}
