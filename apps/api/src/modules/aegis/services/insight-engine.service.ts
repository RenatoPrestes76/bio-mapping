import { Injectable } from '@nestjs/common';
import { WellnessInsightCategory, InsightPriority } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';
import { HealthInsightRepository } from '../repositories/health-insight.repository.js';
import { avg, linearSlope, daysAgo } from '../utils/math.utils.js';

export interface InsightCandidate {
  category: WellnessInsightCategory;
  priority: InsightPriority;
  insightType: string;
  title: string;
  message: string;
  metrics: string[];
  algorithm: string;
  dataWindow: number;
}

type DailyMetric = {
  date: Date;
  steps?: number | null;
  calories?: number | null;
  sleepMinutes?: number | null;
  avgHeartRate?: number | null;
  restingHr?: number | null;
  hrv?: number | null;
  spo2?: number | null;
  weight?: number | null;
  bodyFat?: number | null;
};

const MODEL_VERSION = '1.0.0';

@Injectable()
export class InsightEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly insightRepo: HealthInsightRepository,
  ) {}

  async generateInsights(patientId: string): Promise<number> {
    const metrics = await this.prisma.dailyMetrics.findMany({
      where: { patientId, date: { gte: daysAgo(30) } },
      orderBy: { date: 'asc' },
    }) as DailyMetric[];

    const loadRecord = await this.prisma.trainingLoad.findFirst({
      where: { patientId },
      orderBy: { date: 'desc' },
    });

    const candidates: InsightCandidate[] = [
      ...this.analyzeSleep(metrics),
      ...this.analyzeHeartRate(metrics),
      ...this.analyzeHRV(metrics),
      ...this.analyzeActivity(metrics),
      ...this.analyzeTrainingLoad(loadRecord?.tsb, loadRecord?.atl, loadRecord?.ctl),
      ...this.analyzeWeight(metrics),
      ...this.analyzeCardiovascularComposite(metrics),
      ...this.analyzeRecovery(metrics),
    ];

    await this.insightRepo.expireOld(patientId);

    let created = 0;
    for (const c of candidates) {
      const exists = await this.insightRepo.existsToday(patientId, c.insightType);
      if (!exists) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.insightRepo.create(patientId, { ...c, modelVersion: MODEL_VERSION, expiresAt });
        created++;
      }
    }
    return created;
  }

  // ── Sleep ─────────────────────────────────────────────────────────────────

  analyzeSleep(metrics: DailyMetric[]): InsightCandidate[] {
    const withSleep = metrics.filter((m) => m.sleepMinutes !== null && m.sleepMinutes !== undefined);
    if (withSleep.length < 7) return [];

    const recent7 = withSleep.slice(-7).map((m) => m.sleepMinutes!);
    const prior7 = withSleep.slice(-14, -7).map((m) => m.sleepMinutes!);
    const results: InsightCandidate[] = [];

    if (prior7.length >= 3) {
      const recentAvg = avg(recent7);
      const priorAvg = avg(prior7);
      const changePct = (recentAvg - priorAvg) / priorAvg;

      if (changePct <= -0.20) {
        results.push({
          category: WellnessInsightCategory.SLEEP,
          priority: InsightPriority.IMPORTANTE,
          insightType: 'SLEEP_DECLINE_SIGNIFICANT',
          title: 'Queda significativa no sono',
          message: `Seu sono caiu ${Math.round(-changePct * 100)}% nas últimas duas semanas (média atual: ${(avg(recent7) / 60).toFixed(1)}h/noite).`,
          metrics: ['sleepMinutes'],
          algorithm: 'sleep-decline-v1',
          dataWindow: 14,
        });
      } else if (changePct <= -0.10) {
        results.push({
          category: WellnessInsightCategory.SLEEP,
          priority: InsightPriority.ATENCAO,
          insightType: 'SLEEP_DECLINE_MILD',
          title: 'Leve redução no sono',
          message: `Seu sono reduziu ${Math.round(-changePct * 100)}% nas últimas duas semanas. Fique atento à sua rotina noturna.`,
          metrics: ['sleepMinutes'],
          algorithm: 'sleep-decline-v1',
          dataWindow: 14,
        });
      } else if (changePct >= 0.10) {
        results.push({
          category: WellnessInsightCategory.SLEEP,
          priority: InsightPriority.INFORMATIVO,
          insightType: 'SLEEP_IMPROVING',
          title: 'Sono melhorando',
          message: `Seu sono melhorou ${Math.round(changePct * 100)}% nas últimas duas semanas. Continue com a boa rotina!`,
          metrics: ['sleepMinutes'],
          algorithm: 'sleep-decline-v1',
          dataWindow: 14,
        });
      }
    }

    const recentAvg = avg(recent7);
    if (recentAvg < 360 && recentAvg > 0) {
      results.push({
        category: WellnessInsightCategory.SLEEP,
        priority: InsightPriority.ATENCAO,
        insightType: 'SLEEP_INSUFFICIENT',
        title: 'Sono insuficiente',
        message: `Sua média de sono é ${(recentAvg / 60).toFixed(1)}h/noite — abaixo do mínimo recomendado de 6h. Isso pode impactar sua recuperação e saúde.`,
        metrics: ['sleepMinutes'],
        algorithm: 'sleep-threshold-v1',
        dataWindow: 7,
      });
    }

    return results;
  }

  // ── Heart Rate ────────────────────────────────────────────────────────────

  analyzeHeartRate(metrics: DailyMetric[]): InsightCandidate[] {
    const hrValues = metrics
      .map((m) => m.restingHr ?? m.avgHeartRate)
      .filter((v): v is number => v !== null && v !== undefined);

    if (hrValues.length < 7) return [];

    const slope = linearSlope(hrValues);
    const totalChange = slope * (hrValues.length - 1);

    if (totalChange <= -3 && slope < 0) {
      return [{
        category: WellnessInsightCategory.HEART_RATE,
        priority: InsightPriority.INFORMATIVO,
        insightType: 'HR_IMPROVING',
        title: 'Frequência cardíaca de repouso em queda',
        message: `Sua FC de repouso reduziu ~${Math.abs(Math.round(totalChange))} bpm nas últimas ${hrValues.length} medições — um sinal positivo de melhora cardiovascular.`,
        metrics: ['restingHr', 'avgHeartRate'],
        algorithm: 'hr-trend-v1',
        dataWindow: hrValues.length,
      }];
    }

    if (totalChange >= 5 && slope > 0) {
      return [{
        category: WellnessInsightCategory.HEART_RATE,
        priority: InsightPriority.IMPORTANTE,
        insightType: 'HR_ELEVATION',
        title: 'Aumento contínuo da frequência cardíaca',
        message: `Sua FC de repouso aumentou ~${Math.round(totalChange)} bpm nas últimas ${hrValues.length} medições. Isso pode indicar estresse, infecção ou necessidade de recuperação.`,
        metrics: ['restingHr', 'avgHeartRate'],
        algorithm: 'hr-trend-v1',
        dataWindow: hrValues.length,
      }];
    }

    return [];
  }

  // ── HRV ──────────────────────────────────────────────────────────────────

  analyzeHRV(metrics: DailyMetric[]): InsightCandidate[] {
    const withHrv = metrics.filter((m) => m.hrv !== null && m.hrv !== undefined).map((m) => m.hrv!);
    if (withHrv.length < 7) return [];

    const recent7 = withHrv.slice(-7);
    const prior7 = withHrv.slice(-14, -7);
    if (prior7.length < 3) return [];

    const recentAvg = avg(recent7);
    const priorAvg = avg(prior7);
    const changePct = (recentAvg - priorAvg) / priorAvg;

    if (changePct >= 0.05) {
      return [{
        category: WellnessInsightCategory.HRV,
        priority: InsightPriority.INFORMATIVO,
        insightType: 'HRV_IMPROVING',
        title: 'HRV em melhora',
        message: `Seu HRV melhorou ${Math.round(changePct * 100)}% nas últimas duas semanas (${Math.round(recentAvg)}ms vs ${Math.round(priorAvg)}ms). Sua capacidade de recuperação está aumentando.`,
        metrics: ['hrv'],
        algorithm: 'hrv-trend-v1',
        dataWindow: 14,
      }];
    }

    if (changePct <= -0.10) {
      return [{
        category: WellnessInsightCategory.HRV,
        priority: InsightPriority.ATENCAO,
        insightType: 'HRV_DECLINING',
        title: 'HRV em declínio',
        message: `Seu HRV caiu ${Math.round(-changePct * 100)}% nas últimas duas semanas (${Math.round(recentAvg)}ms vs ${Math.round(priorAvg)}ms). Priorize sono de qualidade e reduza fontes de estresse.`,
        metrics: ['hrv'],
        algorithm: 'hrv-trend-v1',
        dataWindow: 14,
      }];
    }

    return [];
  }

  // ── Activity ──────────────────────────────────────────────────────────────

  analyzeActivity(metrics: DailyMetric[]): InsightCandidate[] {
    const withSteps = metrics.filter((m) => m.steps !== null && m.steps !== undefined);
    if (withSteps.length < 7) return [];

    const recent3 = withSteps.slice(-3).map((m) => m.steps!);
    const baseline = withSteps.slice(-14, -3).map((m) => m.steps!);
    if (!baseline.length) return [];

    const recentAvg = avg(recent3);
    const baselineAvg = avg(baseline);
    if (baselineAvg === 0) return [];

    const changePct = (recentAvg - baselineAvg) / baselineAvg;

    if (changePct <= -0.50) {
      return [{
        category: WellnessInsightCategory.ACTIVITY,
        priority: InsightPriority.ALTA_PRIORIDADE,
        insightType: 'ACTIVITY_DROP_CRITICAL',
        title: 'Queda crítica de atividade física',
        message: `Seus passos caíram ${Math.round(-changePct * 100)}% nos últimos 3 dias (${Math.round(recentAvg).toLocaleString()} vs ${Math.round(baselineAvg).toLocaleString()} passos/dia). Retome a atividade gradualmente.`,
        metrics: ['steps'],
        algorithm: 'activity-drop-v1',
        dataWindow: 14,
      }];
    }

    if (changePct <= -0.20) {
      return [{
        category: WellnessInsightCategory.ACTIVITY,
        priority: InsightPriority.ATENCAO,
        insightType: 'ACTIVITY_DROP',
        title: 'Queda de atividade física',
        message: `Seus passos reduziram ${Math.round(-changePct * 100)}% nos últimos 3 dias comparado ao seu padrão. Fique atento à consistência.`,
        metrics: ['steps'],
        algorithm: 'activity-drop-v1',
        dataWindow: 14,
      }];
    }

    if (changePct >= 0.20) {
      return [{
        category: WellnessInsightCategory.ACTIVITY,
        priority: InsightPriority.INFORMATIVO,
        insightType: 'ACTIVITY_IMPROVING',
        title: 'Atividade física em alta',
        message: `Seus passos aumentaram ${Math.round(changePct * 100)}% nos últimos 3 dias. Excelente progresso — mantenha o ritmo!`,
        metrics: ['steps'],
        algorithm: 'activity-drop-v1',
        dataWindow: 14,
      }];
    }

    return [];
  }

  // ── Training Load ─────────────────────────────────────────────────────────

  analyzeTrainingLoad(tsb?: number, atl?: number, ctl?: number): InsightCandidate[] {
    if (tsb === undefined || tsb === null) return [];

    if (tsb < -30) {
      return [{
        category: WellnessInsightCategory.TRAINING_LOAD,
        priority: InsightPriority.ALTA_PRIORIDADE,
        insightType: 'TRAINING_OVERLOAD_CRITICAL',
        title: 'Risco elevado de overtraining',
        message: `Seu Training Stress Balance é ${Math.round(tsb)} (zona crítica). A carga acumulada ultrapassa sua capacidade de recuperação. Risco real de lesão ou burnout.`,
        metrics: ['tsb', 'atl', 'ctl'],
        algorithm: 'training-load-v1',
        dataWindow: 30,
      }];
    }

    if (tsb < -20) {
      return [{
        category: WellnessInsightCategory.TRAINING_LOAD,
        priority: InsightPriority.IMPORTANTE,
        insightType: 'TRAINING_OVERLOAD_HIGH',
        title: 'Carga de treino elevada',
        message: `Seu TSB é ${Math.round(tsb)} — a carga acumulada está alta. Considere reduzir o volume ou intensidade dos treinos esta semana.`,
        metrics: ['tsb', 'atl', 'ctl'],
        algorithm: 'training-load-v1',
        dataWindow: 30,
      }];
    }

    if (tsb >= 10 && tsb <= 25 && (ctl ?? 0) > 15) {
      return [{
        category: WellnessInsightCategory.TRAINING_LOAD,
        priority: InsightPriority.INFORMATIVO,
        insightType: 'TRAINING_OPTIMAL',
        title: 'Boa forma de treino',
        message: `Seu TSB está em ${Math.round(tsb)} — você está bem recuperado e com boa forma de treino. Ótimo momento para alta performance.`,
        metrics: ['tsb', 'atl', 'ctl'],
        algorithm: 'training-load-v1',
        dataWindow: 30,
      }];
    }

    return [];
  }

  // ── Weight ────────────────────────────────────────────────────────────────

  analyzeWeight(metrics: DailyMetric[]): InsightCandidate[] {
    const withWeight = metrics.filter((m) => m.weight !== null && m.weight !== undefined);
    if (withWeight.length < 7) return [];

    const recent7 = withWeight.slice(-7).map((m) => m.weight!);
    const older = withWeight.slice(-28, -7).map((m) => m.weight!);
    if (older.length < 3) return [];

    const recentAvg = avg(recent7);
    const olderAvg = avg(older);
    const change = recentAvg - olderAvg;

    if (Math.abs(change) < 0.5) {
      return [{
        category: WellnessInsightCategory.WEIGHT,
        priority: InsightPriority.INFORMATIVO,
        insightType: 'WEIGHT_STABLE',
        title: 'Peso estável',
        message: `Seu peso manteve-se estável nas últimas semanas (variação de apenas ${Math.abs(change).toFixed(1)}kg). Boa manutenção!`,
        metrics: ['weight'],
        algorithm: 'weight-trend-v1',
        dataWindow: 28,
      }];
    }

    if (change < -0.5) {
      return [{
        category: WellnessInsightCategory.WEIGHT,
        priority: InsightPriority.INFORMATIVO,
        insightType: 'WEIGHT_REDUCING',
        title: 'Peso em redução',
        message: `Seu peso reduziu ${Math.abs(change).toFixed(1)}kg nas últimas semanas. Acompanhe a composição corporal para garantir que a perda seja saudável.`,
        metrics: ['weight'],
        algorithm: 'weight-trend-v1',
        dataWindow: 28,
      }];
    }

    return [];
  }

  // ── Cardiovascular Composite ──────────────────────────────────────────────

  analyzeCardiovascularComposite(metrics: DailyMetric[]): InsightCandidate[] {
    const hrValues = metrics
      .map((m) => m.restingHr ?? m.avgHeartRate)
      .filter((v): v is number => v !== null && v !== undefined);
    const withHrv = metrics.filter((m) => m.hrv !== null && m.hrv !== undefined).map((m) => m.hrv!);

    if (hrValues.length < 7 || withHrv.length < 7) return [];

    const hrSlope = linearSlope(hrValues);
    const hrChange = hrSlope * (hrValues.length - 1);

    const recentHrv = avg(withHrv.slice(-7));
    const priorHrv = avg(withHrv.slice(-14, -7));
    const hrvImprovingPct = priorHrv > 0 ? (recentHrv - priorHrv) / priorHrv : 0;

    if (hrChange < -2 && hrvImprovingPct >= 0.03) {
      return [{
        category: WellnessInsightCategory.CARDIOVASCULAR,
        priority: InsightPriority.INFORMATIVO,
        insightType: 'CARDIOVASCULAR_PROGRESS',
        title: 'Capacidade cardiovascular em evolução',
        message: `Sua FC de repouso está caindo (~${Math.abs(Math.round(hrChange))} bpm) e seu HRV melhorou ${Math.round(hrvImprovingPct * 100)}% — dois indicadores de progressão cardiovascular positiva. Continue!`,
        metrics: ['restingHr', 'hrv'],
        algorithm: 'cardiovascular-composite-v1',
        dataWindow: 14,
      }];
    }

    return [];
  }

  // ── Recovery ──────────────────────────────────────────────────────────────

  analyzeRecovery(metrics: DailyMetric[]): InsightCandidate[] {
    const withHrv = metrics.filter((m) => m.hrv !== null && m.hrv !== undefined).map((m) => m.hrv!);
    if (withHrv.length < 10) return [];

    const recent5 = withHrv.slice(-5);
    const prior5 = withHrv.slice(-10, -5);
    if (!prior5.length) return [];

    const recentAvg = avg(recent5);
    const priorAvg = avg(prior5);
    const changePct = priorAvg > 0 ? (recentAvg - priorAvg) / priorAvg : 0;

    if (changePct >= 0.08) {
      return [{
        category: WellnessInsightCategory.RECOVERY,
        priority: InsightPriority.INFORMATIVO,
        insightType: 'RECOVERY_IMPROVING',
        title: 'Recuperação melhorando',
        message: `Seus indicadores de recuperação melhoraram ${Math.round(changePct * 100)}% na última semana. Sua estratégia de descanso está funcionando.`,
        metrics: ['hrv'],
        algorithm: 'recovery-trend-v1',
        dataWindow: 10,
      }];
    }

    if (changePct <= -0.10) {
      return [{
        category: WellnessInsightCategory.RECOVERY,
        priority: InsightPriority.ATENCAO,
        insightType: 'RECOVERY_DECLINING',
        title: 'Recuperação em queda',
        message: `Seus indicadores de recuperação caíram ${Math.round(-changePct * 100)}% na última semana. Priorize sono adequado e reduza estressores.`,
        metrics: ['hrv'],
        algorithm: 'recovery-trend-v1',
        dataWindow: 10,
      }];
    }

    return [];
  }
}
