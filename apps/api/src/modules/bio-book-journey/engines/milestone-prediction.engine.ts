import { MilestonePrediction } from '../entities/milestone-prediction.entity.js';
import type { PredictionConfidence } from '../entities/milestone-prediction.entity.js';
import type { PersonalGoal } from '../../bio-book-insight/entities/personal-goal.entity.js';
import type { HealthScorePoint } from '../../bio-book-insight/entities/health-score-point.entity.js';
import type { HabitPattern } from '../entities/habit-pattern.entity.js';
import type { JourneyPath } from '../entities/journey-path.entity.js';

export class MilestonePredictionEngine {
  predict(
    patientId: string,
    goals: PersonalGoal[],
    scoreEvolution: HealthScorePoint[],
    habitPatterns: HabitPattern[],
    journeyPath: JourneyPath,
  ): MilestonePrediction[] {
    const predictions: MilestonePrediction[] = [];

    predictions.push(...this.fromGoals(patientId, goals));
    predictions.push(...this.fromScoreTrend(patientId, scoreEvolution));
    predictions.push(...this.fromHabits(patientId, habitPatterns));
    predictions.push(this.routineFollowUp(patientId));
    predictions.push(...this.fromJourneyPhase(patientId, journeyPath));

    return predictions.slice(0, 6);
  }

  private fromGoals(patientId: string, goals: PersonalGoal[]): MilestonePrediction[] {
    const predictions: MilestonePrediction[] = [];
    const onTrackGoals = goals.filter((g) => g.isOnTrack() && g.progressPercent >= 50 && !g.isCompleted());

    for (const goal of onTrackGoals.slice(0, 2)) {
      const remaining = 100 - goal.progressPercent;
      const weeksEstimate = Math.ceil(remaining / 10);
      const confidence: PredictionConfidence = goal.progressPercent >= 70 ? 'HIGH' : 'MODERATE';

      predictions.push(
        new MilestonePrediction({
          patientId,
          title: `Alcance de meta: ${goal.title}`,
          description: `Com ${goal.progressPercent}% de progresso, este objetivo está próximo de ser atingido.`,
          category: 'GOAL_ACHIEVEMENT',
          estimatedTimeframe: `Próximas ${weeksEstimate}–${weeksEstimate + 4} semanas`,
          confidence,
          requiredActions: [`Manter consistência em: ${goal.category}`, ...goal.evidences.slice(0, 1)],
          basisDescription: `Meta com ${goal.progressPercent}% de progresso e status ON_TRACK.`,
        }),
      );
    }

    const nearlyAchieved = goals.filter((g) => g.progressPercent === 100 && g.status !== 'ACHIEVED');
    for (const goal of nearlyAchieved.slice(0, 1)) {
      predictions.push(
        new MilestonePrediction({
          patientId,
          title: `Reconhecimento iminente: ${goal.title}`,
          description: 'Meta praticamente atingida — aguarda validação clínica para reconhecimento.',
          category: 'GOAL_ACHIEVEMENT',
          estimatedTimeframe: 'Próximas 1–2 semanas',
          confidence: 'HIGH',
          requiredActions: ['Confirmar com seu médico que a meta foi alcançada'],
          basisDescription: 'Meta com 100% de progresso registrado.',
        }),
      );
    }

    return predictions;
  }

  private fromScoreTrend(patientId: string, scoreEvolution: HealthScorePoint[]): MilestonePrediction[] {
    if (scoreEvolution.length < 2) return [];

    const last3 = scoreEvolution.slice(-3);
    const allUp = last3.length >= 2 && last3.every((p, i) => i === 0 || p.score > last3[i - 1].score);
    if (!allUp) return [];

    const current = last3[last3.length - 1].score;
    const thresholds = [70, 75, 80, 85, 90];
    const nextThreshold = thresholds.find((t) => t > current);
    if (!nextThreshold) return [];

    const delta = nextThreshold - current;
    const weeksToThreshold = Math.ceil(delta / 2);

    return [
      new MilestonePrediction({
        patientId,
        title: `Novo nível de saúde: ${nextThreshold} pontos`,
        description: `Seu score de saúde está em trajetória ascendente (${current} pontos). Em breve atingirá o nível ${nextThreshold}.`,
        category: 'SCORE_LEVEL',
        estimatedTimeframe: `Próximas ${weeksToThreshold}–${weeksToThreshold + 6} semanas`,
        confidence: last3.length >= 3 ? 'HIGH' : 'MODERATE',
        requiredActions: ['Manter rotina de consultas e exames', 'Registrar todos os eventos de saúde'],
        basisDescription: `Score em evolução: ${last3.map((p) => p.score).join(' → ')} pontos.`,
      }),
    ];
  }

  private fromHabits(patientId: string, habitPatterns: HabitPattern[]): MilestonePrediction[] {
    const improvingHabits = habitPatterns.filter((h) => h.trend === 'IMPROVING' && h.consistencyScore >= 50);
    if (!improvingHabits.length) return [];

    return [
      new MilestonePrediction({
        patientId,
        title: 'Marco de consistência avançada',
        description: `${improvingHabits.length} hábito(s) em melhora progressiva indicam formação de consistência avançada.`,
        category: 'HABIT_MILESTONE',
        estimatedTimeframe: 'Próximas 6–8 semanas',
        confidence: improvingHabits.length >= 2 ? 'HIGH' : 'MODERATE',
        requiredActions: improvingHabits.map((h) => `Manter: ${h.label}`).slice(0, 2),
        basisDescription: `Hábitos em melhora: ${improvingHabits.map((h) => h.label).join(', ')}.`,
      }),
    ];
  }

  private routineFollowUp(patientId: string): MilestonePrediction {
    return new MilestonePrediction({
      patientId,
      title: 'Próxima consulta de acompanhamento',
      description: 'Manter a periodicidade de consultas é o alicerce de toda jornada de saúde bem-sucedida.',
      category: 'ROUTINE_FOLLOW_UP',
      estimatedTimeframe: 'Próximas 2–4 semanas',
      confidence: 'HIGH',
      requiredActions: ['Agendar ou confirmar próxima consulta médica'],
      basisDescription: 'Recomendação padrão de acompanhamento contínuo.',
    });
  }

  private fromJourneyPhase(patientId: string, journeyPath: JourneyPath): MilestonePrediction[] {
    const next = journeyPath.getNextPhase();
    if (!next) return [];

    return [
      new MilestonePrediction({
        patientId,
        title: `Transição para: ${next.label}`,
        description: `Ao cumprir os critérios da fase atual, você avançará para "${next.label}": ${next.description}`,
        category: 'GOAL_ACHIEVEMENT',
        estimatedTimeframe: `Estimativa: ${next.estimatedDurationWeeks} semanas`,
        confidence: journeyPath.isAdvancing() ? 'MODERATE' : 'LOW',
        requiredActions: next.keyActions.slice(0, 2),
        basisDescription: `Direção atual da jornada: ${journeyPath.overallDirection}.`,
      }),
    ];
  }
}
