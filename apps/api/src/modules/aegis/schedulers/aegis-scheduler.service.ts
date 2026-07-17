import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service.js';
import { DecisionEngineService } from '../../gaia/decision-engine.service.js';
import { InsightEngineService } from '../services/insight-engine.service.js';
import { RecommendationService } from '../services/recommendation.service.js';
import { GoalsService } from '../services/goals.service.js';
import { PredictionsService } from '../services/predictions.service.js';

@Injectable()
export class AegisSchedulerService {
  private readonly logger = new Logger(AegisSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly insightEngine: InsightEngineService,
    private readonly recommendations: RecommendationService,
    private readonly goals: GoalsService,
    private readonly predictions: PredictionsService,
    private readonly decisionEngine: DecisionEngineService,
  ) {}

  @Cron('0 4 * * *')
  async generateDailyInsights() {
    const patients = await this.getActivePatientsWithData();
    this.logger.log(`Generating insights for ${patients.length} patients`);
    for (const patientId of patients) {
      try {
        await this.insightEngine.generateInsights(patientId);
      } catch (e) {
        this.logger.error(`Insight generation failed for ${patientId}`, e);
      }
    }
  }

  @Cron('30 4 * * *')
  async generateDailyRecommendations() {
    const patients = await this.getActivePatientsWithData();
    this.logger.log(`Generating recommendations for ${patients.length} patients`);
    for (const patientId of patients) {
      try {
        const insights = await this.prisma.healthInsight.findMany({
          where: { patientId, generatedAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
        });
        if (insights.length > 0) {
          const candidates = insights.map((i) => ({
            category: i.category,
            priority: i.priority,
            insightType: i.insightType,
            title: i.title,
            message: i.message,
            metrics: i.metrics as string[],
            algorithm: i.algorithm,
            dataWindow: i.dataWindow,
          }));
          const idMap = new Map(insights.map((i) => [i.insightType, i.id]));
          await this.recommendations.generateFromInsights(patientId, candidates, idMap);
        }
      } catch (e) {
        this.logger.error(`Recommendation generation failed for ${patientId}`, e);
      }
    }
  }

  @Cron('0 5 * * *')
  async adjustDailyGoals() {
    const patients = await this.getActivePatientsWithData();
    this.logger.log(`Auto-adjusting goals for ${patients.length} patients`);
    for (const patientId of patients) {
      try {
        await this.goals.autoAdjustGoals(patientId);
      } catch (e) {
        this.logger.error(`Goal adjustment failed for ${patientId}`, e);
      }
    }
  }

  @Cron('30 5 * * *')
  async computeDailyPredictions() {
    const patients = await this.getActivePatientsWithData();
    this.logger.log(`Computing predictions for ${patients.length} patients`);
    for (const patientId of patients) {
      try {
        await this.predictions.computePredictions(patientId);
      } catch (e) {
        this.logger.error(`Prediction computation failed for ${patientId}`, e);
      }
    }
  }

  /**
   * Sprint 14.1 (T7): insights/recomendações/previsões passam pelo pipeline
   * genérico do Decision Engine (que por baixo delega 100% para
   * InsightEngineService/RecommendationService/PredictionsService — mesmos
   * efeitos colaterais de antes). autoAdjustGoals continua chamado
   * diretamente: metas não fazem parte do contrato DecisionProvider nesta
   * sprint.
   */
  async runAllForPatient(patientId: string) {
    const decisionResult = await this.decisionEngine.runPipeline(patientId, {
      providers: ['aegis-wellness'],
    });
    await this.goals.autoAdjustGoals(patientId);

    const wellnessRun = decisionResult.results.find((r) => r.provider === 'aegis-wellness');

    return {
      insights: wellnessRun?.insights.length ?? 0,
      decisionResult,
    };
  }

  private async getActivePatientsWithData(): Promise<string[]> {
    const rows = await this.prisma.dailyMetrics.groupBy({
      by: ['patientId'],
      where: { date: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } },
    });
    return rows.map((r) => r.patientId);
  }
}
