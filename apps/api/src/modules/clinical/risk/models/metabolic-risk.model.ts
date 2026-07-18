import { ClinicalInsightCategory } from '@bio/database';
import type { ScoringInput, ScoringResult } from '../../scoring/engines/scoring-engine.interface';
import { ClinicalContext } from '../../../gaia/contracts';
import { ClinicalRiskModel } from '../clinical-risk.types';

const NEUTRAL_SCORE = 5;
const MAX_FIELD_SCORE = 10;

function bmiScore(bmi: number | null): number {
  if (bmi === null) return NEUTRAL_SCORE;
  if (bmi >= 18.5 && bmi < 25) return 10;
  if ((bmi >= 25 && bmi < 30) || (bmi >= 17 && bmi < 18.5)) return 6;
  return 2;
}

function activityScore(avgStepsPerDay: number | null): number {
  if (avgStepsPerDay === null) return NEUTRAL_SCORE;
  if (avgStepsPerDay >= 8000) return 10;
  if (avgStepsPerDay >= 5000) return 6;
  return 2;
}

function sleepScore(avgMinutesPerNight: number | null): number {
  if (avgMinutesPerNight === null) return NEUTRAL_SCORE;
  if (avgMinutesPerNight >= 420) return 10;
  if (avgMinutesPerNight >= 360) return 6;
  return 2;
}

function latestBmi(context: ClinicalContext): number | null {
  const items = context.vitals.items;
  if (items.length === 0) return null;
  const sorted = [...items].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  return sorted[0]?.bmi ?? null;
}

function averageWearableMetric(context: ClinicalContext, metricType: string): number | null {
  const values = context.wearables.items.filter((item) => item.metricType === metricType).map((item) => item.value);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Piloto arquitetural (Sprint 14.3, T5) — prova a arquitetura do Clinical
 * Risk Engine, não um algoritmo médico. Regras deliberadamente simples,
 * versão 0.1.0 claramente inicial e substituível. Reaproveita sinais já
 * presentes no domínio wellness (peso/IMC dos vitals, passos e sono dos
 * wearables) via ScoringEngine 'risk-classification' (bandas padrão, sem
 * customização).
 */
export const METABOLIC_RISK_MODEL: ClinicalRiskModel = {
  category: ClinicalInsightCategory.METABOLIC,
  name: 'metabolic-risk',
  version: '0.1.0',
  scoringEngineName: 'risk-classification',
  requiredCapabilities: ['vitals', 'wearables'],

  buildScoringInput(context: ClinicalContext): ScoringInput {
    const bmi = latestBmi(context);
    const avgSteps = averageWearableMetric(context, 'STEPS');
    const avgSleepMinutes = averageWearableMetric(context, 'SLEEP');

    return {
      sections: [{ id: 'metabolic-factors', title: 'Fatores de Risco Metabólico', order: 0 }],
      fields: [
        {
          id: 'bmi',
          sectionId: 'metabolic-factors',
          label: 'Índice de Massa Corporal',
          scoringWeight: 1,
          min: 0,
          max: MAX_FIELD_SCORE,
          required: false,
        },
        {
          id: 'activity',
          sectionId: 'metabolic-factors',
          label: 'Nível de Atividade Física',
          scoringWeight: 1,
          min: 0,
          max: MAX_FIELD_SCORE,
          required: false,
        },
        {
          id: 'sleep',
          sectionId: 'metabolic-factors',
          label: 'Qualidade do Sono',
          scoringWeight: 1,
          min: 0,
          max: MAX_FIELD_SCORE,
          required: false,
        },
      ],
      answers: [
        { fieldId: 'bmi', value: bmi !== null ? String(bmi) : null, score: bmiScore(bmi) },
        { fieldId: 'activity', value: avgSteps !== null ? String(avgSteps) : null, score: activityScore(avgSteps) },
        {
          fieldId: 'sleep',
          value: avgSleepMinutes !== null ? String(avgSleepMinutes) : null,
          score: sleepScore(avgSleepMinutes),
        },
      ],
    };
  },

  buildRecommendations(result: ScoringResult): string[] {
    if (result.riskLevel === 'HIGH' || result.riskLevel === 'CRITICAL') {
      return [
        'Conversar com um profissional de saúde',
        'Aumentar a atividade física gradualmente',
        'Buscar acompanhamento nutricional',
      ];
    }
    if (result.riskLevel === 'MODERATE') {
      return ['Aumentar a atividade física', 'Melhorar a qualidade do sono'];
    }
    return ['Manter os hábitos atuais', 'Reavaliação periódica recomendada'];
  },
};
