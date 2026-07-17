import { Injectable } from '@nestjs/common';
import { InsightPriority, RecommendationStatus } from '@bio/database';
import { RecommendationRepository } from '../repositories/recommendation.repository.js';
import { InsightCandidate } from './insight-engine.service.js';

interface RecommendationTemplate {
  priority: InsightPriority;
  title: string;
  description: string;
  rationale: (insight: InsightCandidate) => string;
  action: string;
}

const RECOMMENDATION_RULES: Record<string, RecommendationTemplate> = {
  SLEEP_DECLINE_SIGNIFICANT: {
    priority: InsightPriority.IMPORTANTE,
    title: 'Melhore sua rotina de sono',
    description: 'Sua qualidade de sono diminuiu significativamente. O sono é fundamental para recuperação e saúde geral.',
    rationale: (i) => i.message,
    action: 'Tente dormir 30 minutos mais cedo durante 5 dias consecutivos. Evite telas 1h antes de dormir e mantenha o quarto fresco e escuro.',
  },
  SLEEP_DECLINE_MILD: {
    priority: InsightPriority.ATENCAO,
    title: 'Monitore sua rotina de sono',
    description: 'Sua duração de sono reduziu levemente nas últimas semanas.',
    rationale: (i) => i.message,
    action: 'Estabeleça um horário fixo para dormir e acordar. Evite cafeína após as 14h.',
  },
  SLEEP_INSUFFICIENT: {
    priority: InsightPriority.ATENCAO,
    title: 'Priorize o sono',
    description: 'Você está dormindo menos de 6h consistentemente, abaixo do mínimo recomendado.',
    rationale: (i) => i.message,
    action: 'Crie um ritual de relaxamento 1h antes de dormir. Meta: dormir pelo menos 7h por noite durante 2 semanas.',
  },
  HR_ELEVATION: {
    priority: InsightPriority.IMPORTANTE,
    title: 'Reduza a intensidade dos treinos',
    description: 'Sua frequência cardíaca de repouso está em tendência de alta, indicando possível sobrecarga ou estresse.',
    rationale: (i) => i.message,
    action: 'Substitua 1 treino intenso por uma caminhada leve ou yoga esta semana. Priorize 8h de sono e hidratação adequada.',
  },
  TRAINING_OVERLOAD_CRITICAL: {
    priority: InsightPriority.ALTA_PRIORIDADE,
    title: 'Descanse agora',
    description: 'Sua carga de treino acumulada atingiu nível crítico. Risco real de lesão ou burnout.',
    rationale: (i) => i.message,
    action: 'Pause treinos intensos por 2-3 dias. Foque em recuperação ativa: caminhada leve, mobilidade articular e hidratação abundante.',
  },
  TRAINING_OVERLOAD_HIGH: {
    priority: InsightPriority.IMPORTANTE,
    title: 'Reduza a carga de treino',
    description: 'Sua carga acumulada está elevada e pode comprometer sua recuperação.',
    rationale: (i) => i.message,
    action: 'Reduza volume de treino em 20% esta semana. Adicione um dia de descanso ativo. Priorize sono e nutrição.',
  },
  ACTIVITY_DROP_CRITICAL: {
    priority: InsightPriority.ALTA_PRIORIDADE,
    title: 'Retome sua atividade física',
    description: 'Sua atividade física caiu drasticamente. Períodos prolongados de sedentarismo impactam saúde e metabolismo.',
    rationale: (i) => i.message,
    action: 'Comece com caminhadas de 10 minutos após o almoço. Meta desta semana: atingir ao menos 5.000 passos/dia.',
  },
  ACTIVITY_DROP: {
    priority: InsightPriority.ATENCAO,
    title: 'Aumente sua atividade física',
    description: 'Sua atividade física diminuiu nos últimos dias.',
    rationale: (i) => i.message,
    action: 'Meta desta semana: +1.000 passos/dia em relação à média atual. Inclua uma caminhada de 15 minutos na rotina.',
  },
  HRV_DECLINING: {
    priority: InsightPriority.ATENCAO,
    title: 'Priorize sua recuperação',
    description: 'Seu HRV está em queda, indicando menor capacidade de recuperação do sistema nervoso autônomo.',
    rationale: (i) => i.message,
    action: 'Priorize 8h de sono. Evite álcool e cafeína após as 14h. Experimente 5 minutos de respiração diafragmática antes de dormir.',
  },
  CARDIOVASCULAR_PROGRESS: {
    priority: InsightPriority.INFORMATIVO,
    title: 'Continue assim!',
    description: 'Sua capacidade cardiovascular está melhorando — sinal de que seu treino e recuperação estão bem equilibrados.',
    rationale: (i) => i.message,
    action: 'Mantenha a consistência dos treinos. Sua rotina atual está gerando adaptações cardiovasculares positivas.',
  },
  HR_IMPROVING: {
    priority: InsightPriority.INFORMATIVO,
    title: 'Ótima evolução cardiovascular',
    description: 'Sua frequência cardíaca de repouso está diminuindo, o que indica melhora cardiovascular.',
    rationale: (i) => i.message,
    action: 'Continue com sua rotina de exercícios. Considere aumentar gradualmente a intensidade para novos estímulos.',
  },
  HRV_IMPROVING: {
    priority: InsightPriority.INFORMATIVO,
    title: 'Recuperação em alta',
    description: 'Seu HRV está melhorando, indicando que seu organismo está se recuperando bem.',
    rationale: (i) => i.message,
    action: 'Sua estratégia de recuperação está funcionando. Mantenha as práticas atuais de sono, hidratação e nutrição.',
  },
  RECOVERY_DECLINING: {
    priority: InsightPriority.ATENCAO,
    title: 'Melhore sua estratégia de recuperação',
    description: 'Seus indicadores de recuperação estão em queda.',
    rationale: (i) => i.message,
    action: 'Adicione técnicas de recuperação ativa: alongamento, banho de contraste, sono de qualidade e nutrição adequada pós-treino.',
  },
};

@Injectable()
export class RecommendationService {
  constructor(private readonly repo: RecommendationRepository) {}

  async generateFromInsights(patientId: string, insights: InsightCandidate[], insightIds?: Map<string, string>): Promise<number> {
    let created = 0;

    for (const insight of insights) {
      const template = RECOMMENDATION_RULES[insight.insightType];
      if (!template) continue;

      const alreadyPending = await this.repo.existsPending(patientId, template.title);
      if (alreadyPending) continue;

      await this.repo.create(patientId, {
        insightId: insightIds?.get(insight.insightType),
        priority: template.priority,
        title: template.title,
        description: template.description,
        rationale: template.rationale(insight),
        metrics: insight.metrics,
        action: template.action,
      });
      created++;
    }

    return created;
  }

  async getRecommendations(patientId: string, status?: RecommendationStatus) {
    return this.repo.findByStatus(patientId, status);
  }

  async getHistory(patientId: string, limit = 30) {
    return this.repo.findHistory(patientId, limit);
  }

  async updateStatus(id: string, status: RecommendationStatus) {
    return this.repo.updateStatus(id, status);
  }

  getTemplate(insightType: string): RecommendationTemplate | undefined {
    return RECOMMENDATION_RULES[insightType];
  }
}
