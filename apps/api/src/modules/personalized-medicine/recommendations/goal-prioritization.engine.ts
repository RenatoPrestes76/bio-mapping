import { PatientProfile } from '../entities/patient-profile.entity.js';
import { ProfileScores } from '../scoring/profile-scoring.engine.js';
import { HealthGoal } from '../entities/personalized-plan.entity.js';

export class GoalPrioritizationEngine {
  prioritize(profile: PatientProfile, scores: ProfileScores): HealthGoal[] {
    const goals: HealthGoal[] = [];
    let goalIdx = 0;

    if (profile.isSmoker()) {
      goals.push({
        id: `goal-${++goalIdx}`,
        category: 'LIFESTYLE',
        description: 'Cessação completa do tabagismo',
        timeframeWeeks: 12,
        priority: 'CRITICAL',
      });
    }

    if (scores.cardiovascularScore >= 60) {
      goals.push({
        id: `goal-${++goalIdx}`,
        category: 'CARDIOVASCULAR',
        description: 'Reduzir risco cardiovascular — controle de PA, LDL e fatores de risco',
        timeframeWeeks: 24,
        priority: 'CRITICAL',
      });
    } else if (scores.cardiovascularScore >= 40) {
      goals.push({
        id: `goal-${++goalIdx}`,
        category: 'CARDIOVASCULAR',
        description: 'Melhorar saúde cardiovascular — controle pressórico e lipídico',
        timeframeWeeks: 24,
        priority: 'HIGH',
      });
    }

    if (scores.metabolicScore >= 60) {
      goals.push({
        id: `goal-${++goalIdx}`,
        category: 'METABOLIC',
        description: 'Controle metabólico urgente — normalizar glicemia, HbA1c e lipídeos',
        timeframeWeeks: 12,
        priority: 'CRITICAL',
      });
    } else if (scores.metabolicScore >= 40) {
      goals.push({
        id: `goal-${++goalIdx}`,
        category: 'METABOLIC',
        description: 'Melhorar parâmetros metabólicos — controle glicêmico e lipídico',
        timeframeWeeks: 16,
        priority: 'HIGH',
      });
    }

    if (profile.isSedentary()) {
      goals.push({
        id: `goal-${++goalIdx}`,
        category: 'PHYSICAL_ACTIVITY',
        description: 'Aumentar atividade física para ≥ 150 min/semana de intensidade moderada',
        targetValue: 150,
        targetUnit: 'min/semana',
        timeframeWeeks: 8,
        priority: 'HIGH',
      });
    } else {
      const wm = profile.physicalActivity.weeklyMinutes;
      if (wm !== undefined && wm < 150) {
        goals.push({
          id: `goal-${++goalIdx}`,
          category: 'PHYSICAL_ACTIVITY',
          description: `Aumentar atividade física de ${wm} para ≥ 150 min/semana`,
          targetValue: 150,
          targetUnit: 'min/semana',
          timeframeWeeks: 6,
          priority: 'HIGH',
        });
      }
    }

    const bmi = profile.computeBMI();
    if (bmi && bmi >= 30) {
      const targetBmi = Math.max(25, bmi * 0.93);
      goals.push({
        id: `goal-${++goalIdx}`,
        category: 'WEIGHT',
        description: `Reduzir peso corporal em 5-10% nos próximos 6 meses (meta IMC ≤ ${targetBmi.toFixed(1)})`,
        targetValue: parseFloat(targetBmi.toFixed(1)),
        targetUnit: 'kg/m²',
        timeframeWeeks: 24,
        priority: 'HIGH',
      });
    }

    if (scores.lifestyleScore < 40) {
      goals.push({
        id: `goal-${++goalIdx}`,
        category: 'LIFESTYLE',
        description: 'Melhorar estilo de vida geral — sono, estresse, dieta e atividade física',
        timeframeWeeks: 12,
        priority: 'HIGH',
      });
    }

    const sleepHours = profile.sleep.averageHours;
    if (sleepHours !== undefined && sleepHours < 6) {
      goals.push({
        id: `goal-${++goalIdx}`,
        category: 'SLEEP',
        description: 'Melhorar duração e qualidade do sono para 7-9h por noite',
        targetValue: 8,
        targetUnit: 'horas/noite',
        timeframeWeeks: 6,
        priority: 'HIGH',
      });
    }

    const stress = profile.stress.level;
    if (stress === 'HIGH' || stress === 'VERY_HIGH') {
      goals.push({
        id: `goal-${++goalIdx}`,
        category: 'MENTAL_HEALTH',
        description: 'Reduzir nível de estresse com técnicas de manejo e acompanhamento psicológico',
        timeframeWeeks: 12,
        priority: 'MEDIUM',
      });
    }

    if (goals.length === 0) {
      goals.push({
        id: `goal-${++goalIdx}`,
        category: 'PREVENTIVE',
        description: 'Manter estilo de vida saudável e realizar check-ups preventivos anuais',
        timeframeWeeks: 52,
        priority: 'LOW',
      });
    }

    return goals;
  }
}
