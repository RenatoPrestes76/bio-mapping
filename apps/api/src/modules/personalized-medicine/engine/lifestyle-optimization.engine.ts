import { PatientProfile } from '../entities/patient-profile.entity.js';
import { ProfileScores } from '../scoring/profile-scoring.engine.js';
import { MonitoringPlan, FollowUpSchedule } from '../entities/personalized-plan.entity.js';

export interface LifestyleRecommendation {
  domain: 'NUTRITION' | 'EXERCISE' | 'SLEEP' | 'STRESS' | 'SOCIAL' | 'PREVENTIVE';
  title: string;
  description: string;
  priority: number;
}

export class LifestyleOptimizationEngine {
  optimize(profile: PatientProfile, scores: ProfileScores): LifestyleRecommendation[] {
    const recs: LifestyleRecommendation[] = [];

    recs.push(...this.nutritionRecommendations(profile, scores));
    recs.push(...this.exerciseRecommendations(profile, scores));
    recs.push(...this.sleepRecommendations(profile));
    recs.push(...this.stressRecommendations(profile));
    recs.push(...this.preventiveRecommendations(profile));

    return recs.sort((a, b) => b.priority - a.priority);
  }

  generateMonitoringPlan(profile: PatientProfile, scores: ProfileScores): MonitoringPlan {
    const biomarkersToMonitor: string[] = [];
    const selfMonitoringItems: string[] = [];
    let checkupFrequencyWeeks = 26;

    if (scores.metabolicScore >= 40 || profile.hasCondition('diabetes') || profile.hasCondition('diabete')) {
      biomarkersToMonitor.push('HbA1c', 'Glicemia de jejum');
      selfMonitoringItems.push('Glicemia capilar conforme orientação médica');
      checkupFrequencyWeeks = Math.min(checkupFrequencyWeeks, 13);
    }

    if (scores.cardiovascularScore >= 40 || profile.hasCondition('hipertensão') || profile.hasCondition('hypertension')) {
      biomarkersToMonitor.push('Pressão arterial (PAS/PAD)');
      selfMonitoringItems.push('Medição domiciliar de PA 2x/dia por 7 dias antes das consultas');
      checkupFrequencyWeeks = Math.min(checkupFrequencyWeeks, 8);
    }

    const ldl = profile.getBiomarker('ldl');
    if (ldl && ldl.value >= 160) {
      biomarkersToMonitor.push('Perfil lipídico completo (LDL, HDL, TG, colesterol total)');
      checkupFrequencyWeeks = Math.min(checkupFrequencyWeeks, 13);
    }

    const bmi = profile.computeBMI();
    if (bmi && bmi >= 25) {
      biomarkersToMonitor.push('Peso corporal e IMC');
      selfMonitoringItems.push('Pesagem semanal em jejum, mesma balança e mesmo horário');
    }

    if (profile.isSmoker()) {
      selfMonitoringItems.push('Diário de tabagismo — registrar cigarros/dia e gatilhos');
    }

    if (scores.overallRiskScore >= 60) {
      checkupFrequencyWeeks = Math.min(checkupFrequencyWeeks, 4);
    }

    if (biomarkersToMonitor.length === 0) {
      biomarkersToMonitor.push('Glicemia de jejum', 'Pressão arterial', 'Perfil lipídico');
      checkupFrequencyWeeks = 26;
    }
    if (selfMonitoringItems.length === 0) {
      selfMonitoringItems.push('Registro semanal de atividade física e qualidade do sono');
    }

    return { biomarkersToMonitor, checkupFrequencyWeeks, selfMonitoringItems };
  }

  generateFollowUp(profile: PatientProfile, scores: ProfileScores): FollowUpSchedule {
    const specialistReferrals: string[] = [];
    const examsRequired: string[] = [];
    let nextCheckupWeeks = 26;

    if (scores.cardiovascularScore >= 60) {
      nextCheckupWeeks = 4;
      specialistReferrals.push('Cardiologista — risco cardiovascular elevado');
      examsRequired.push('ECG de repouso', 'Teste ergométrico', 'Ecocardiograma');
    } else if (scores.cardiovascularScore >= 40) {
      nextCheckupWeeks = 8;
      examsRequired.push('ECG de repouso');
    }

    if (scores.metabolicScore >= 60) {
      nextCheckupWeeks = Math.min(nextCheckupWeeks, 4);
      specialistReferrals.push('Endocrinologista — controle metabólico crítico');
      examsRequired.push('HbA1c', 'Glicemia de jejum', 'Insulinemia de jejum');
    } else if (scores.metabolicScore >= 40) {
      nextCheckupWeeks = Math.min(nextCheckupWeeks, 12);
      examsRequired.push('HbA1c', 'Glicemia de jejum');
    }

    const bmi = profile.computeBMI();
    if (bmi && bmi >= 30) {
      specialistReferrals.push('Nutricionista — manejo nutricional para obesidade');
      if (bmi >= 40 || (bmi >= 35 && (scores.metabolicScore >= 60 || scores.cardiovascularScore >= 60))) {
        specialistReferrals.push('Cirurgião bariátrico — avaliação para cirurgia bariátrica');
      }
    }

    if (profile.stress.level === 'HIGH' || profile.stress.level === 'VERY_HIGH') {
      specialistReferrals.push('Psicólogo ou psiquiatra — avaliação de estresse crônico');
    }

    const sleep = profile.sleep;
    if ((sleep.disorders && sleep.disorders.length > 0) || (sleep.averageHours !== undefined && sleep.averageHours < 6)) {
      specialistReferrals.push('Especialista em medicina do sono');
      examsRequired.push('Polissonografia');
    }

    if (examsRequired.length === 0) {
      examsRequired.push('Hemograma completo', 'Perfil lipídico', 'Glicemia de jejum', 'TSH');
    }

    return { nextCheckupWeeks, specialistReferrals, examsRequired };
  }

  private nutritionRecommendations(
    profile: PatientProfile,
    scores: ProfileScores,
  ): LifestyleRecommendation[] {
    const recs: LifestyleRecommendation[] = [];

    if (scores.metabolicScore >= 40) {
      recs.push({
        domain: 'NUTRITION',
        title: 'Dieta terapêutica individualizada',
        description: 'Consultar nutricionista para plano alimentar personalizado; priorizar alimentos de baixo índice glicêmico, ricos em fibras e antioxidantes',
        priority: 9,
      });
    }

    if (profile.nutrition.waterIntake === undefined || profile.nutrition.waterIntake < 2) {
      recs.push({
        domain: 'NUTRITION',
        title: 'Hidratação adequada',
        description: 'Aumentar ingestão hídrica para ≥ 2 litros de água/dia; substituir bebidas açucaradas por água ou chás sem açúcar',
        priority: 6,
      });
    }

    return recs;
  }

  private exerciseRecommendations(
    profile: PatientProfile,
    scores: ProfileScores,
  ): LifestyleRecommendation[] {
    const recs: LifestyleRecommendation[] = [];
    const weeklyMinutes = profile.physicalActivity.weeklyMinutes ?? 0;

    if (weeklyMinutes < 60 || profile.isSedentary()) {
      recs.push({
        domain: 'EXERCISE',
        title: 'Início gradual de atividade física',
        description: 'Começar com 10 min de caminhada 3x/semana; aumentar 5 min a cada 2 semanas até atingir 150 min/semana de intensidade moderada',
        priority: 9,
      });
    } else if (weeklyMinutes < 150) {
      recs.push({
        domain: 'EXERCISE',
        title: 'Progressão da atividade física',
        description: `Aumentar atividade atual (${weeklyMinutes} min/semana) para pelo menos 150 min/semana; adicionar treinamento de força 2x/semana`,
        priority: 8,
      });
    }

    return recs;
  }

  private sleepRecommendations(profile: PatientProfile): LifestyleRecommendation[] {
    const recs: LifestyleRecommendation[] = [];
    const hours = profile.sleep.averageHours;

    if (hours === undefined || hours < 7) {
      recs.push({
        domain: 'SLEEP',
        title: 'Otimização do sono',
        description: 'Estabelecer rotina de sono com horário fixo; criar ambiente propício (escuro, fresco, silencioso); evitar cafeína após 14h e telas 1h antes de dormir',
        priority: 7,
      });
    }

    return recs;
  }

  private stressRecommendations(profile: PatientProfile): LifestyleRecommendation[] {
    const recs: LifestyleRecommendation[] = [];

    if (profile.stress.level === 'HIGH' || profile.stress.level === 'VERY_HIGH') {
      recs.push({
        domain: 'STRESS',
        title: 'Manejo ativo do estresse',
        description: 'Implementar técnicas de relaxamento (respiração diafragmática, meditação, yoga); avaliar carga de trabalho e relações sociais; considerar psicoterapia',
        priority: 8,
      });
    }

    return recs;
  }

  private preventiveRecommendations(profile: PatientProfile): LifestyleRecommendation[] {
    const recs: LifestyleRecommendation[] = [];

    if (profile.isElderly()) {
      recs.push({
        domain: 'PREVENTIVE',
        title: 'Prevenção de quedas e sarcopenia',
        description: 'Exercícios de equilíbrio e fortalecimento muscular 2-3x/semana; avaliação de polifarmácia; suplementação de vitamina D e cálcio se indicado',
        priority: 8,
      });
    }

    recs.push({
      domain: 'PREVENTIVE',
      title: 'Rastreamentos preventivos regulares',
      description: 'Manter check-ups anuais: pressão arterial, glicemia, perfil lipídico, peso; rastreamentos específicos por faixa etária (colonoscopia, mamografia, densitometria)',
      priority: 5,
    });

    return recs;
  }
}
