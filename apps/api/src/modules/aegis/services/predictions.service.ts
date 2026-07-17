import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { avg, linearSlope, daysAgo } from '../utils/math.utils.js';

type RiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
type TrendDir = 'UP' | 'DOWN' | 'STABLE';

interface PredictionCandidate {
  metric: string;
  horizon: string;
  currentValue?: number;
  predictedValue: number;
  confidence: number;
  trend: TrendDir;
  riskLevel: RiskLevel;
  explanation: string;
  algorithm: string;
}

type DailyMetric = {
  steps?: number | null;
  sleepMinutes?: number | null;
  avgHeartRate?: number | null;
  restingHr?: number | null;
  hrv?: number | null;
  weight?: number | null;
};

function predictLinear(values: number[], horizonDays: number): number {
  const slope = linearSlope(values);
  return values[values.length - 1] + slope * horizonDays;
}

@Injectable()
export class PredictionsService {
  constructor(private readonly prisma: PrismaService) {}

  async computePredictions(patientId: string) {
    const metrics = await this.prisma.dailyMetrics.findMany({
      where: { patientId, date: { gte: daysAgo(30) } },
      orderBy: { date: 'asc' },
    }) as DailyMetric[];

    const loadRecord = await this.prisma.trainingLoad.findFirst({
      where: { patientId },
      orderBy: { date: 'desc' },
    });

    const candidates: PredictionCandidate[] = [
      ...this.predictSleep(metrics),
      ...this.predictCardiovascular(metrics),
      ...this.predictWeight(metrics),
      ...this.predictOverloadRisk(loadRecord?.tsb, loadRecord?.atl, loadRecord?.ctl),
    ];

    // Remove expired predictions
    await this.prisma.healthPrediction.deleteMany({
      where: { patientId, expiresAt: { lt: new Date() } },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const saved = await Promise.all(
      candidates.map((p) =>
        this.prisma.healthPrediction.create({
          data: { patientId, ...p, expiresAt },
        }),
      ),
    );

    return saved;
  }

  async getPredictions(patientId: string) {
    return this.prisma.healthPrediction.findMany({
      where: { patientId, expiresAt: { gt: new Date() } },
      orderBy: { generatedAt: 'desc' },
    });
  }

  // ── Predictors ────────────────────────────────────────────────────────────

  predictSleep(metrics: DailyMetric[]): PredictionCandidate[] {
    const values = metrics.map((m) => m.sleepMinutes).filter((v): v is number => v !== null && v !== undefined);
    if (values.length < 7) return [];

    const current = avg(values.slice(-7));
    const predicted30d = Math.max(0, predictLinear(values, 30));
    const slope = linearSlope(values);
    const trend: TrendDir = Math.abs(slope) < 1 ? 'STABLE' : slope > 0 ? 'UP' : 'DOWN';
    const confidence = Math.min(0.85, 0.5 + values.length * 0.01);

    let riskLevel: RiskLevel = 'NONE';
    if (predicted30d < 300) riskLevel = 'HIGH';
    else if (predicted30d < 360) riskLevel = 'MEDIUM';
    else if (predicted30d < 420) riskLevel = 'LOW';

    return [{
      metric: 'sleepMinutes',
      horizon: '30d',
      currentValue: Math.round(current),
      predictedValue: Math.round(predicted30d),
      confidence: Math.round(confidence * 100) / 100,
      trend,
      riskLevel,
      explanation: `Com base na tendência atual (${slope > 0 ? '+' : ''}${(slope * 7).toFixed(0)} min/semana), seu sono deverá ser de ${(predicted30d / 60).toFixed(1)}h/noite em 30 dias.`,
      algorithm: 'linear-regression-v1',
    }];
  }

  predictCardiovascular(metrics: DailyMetric[]): PredictionCandidate[] {
    const hrValues = metrics
      .map((m) => m.restingHr ?? m.avgHeartRate)
      .filter((v): v is number => v !== null && v !== undefined);

    if (hrValues.length < 7) return [];

    const current = avg(hrValues.slice(-7));
    const predicted30d = Math.max(30, predictLinear(hrValues, 30));
    const slope = linearSlope(hrValues);
    const trend: TrendDir = Math.abs(slope * 7) < 1 ? 'STABLE' : slope > 0 ? 'UP' : 'DOWN';
    const confidence = Math.min(0.80, 0.45 + hrValues.length * 0.01);

    let riskLevel: RiskLevel = 'NONE';
    if (predicted30d > 100) riskLevel = 'HIGH';
    else if (predicted30d > 85) riskLevel = 'MEDIUM';
    else if (predicted30d > 75) riskLevel = 'LOW';

    const direction = slope > 0 ? 'aumentar' : 'diminuir';

    return [{
      metric: 'restingHr',
      horizon: '30d',
      currentValue: Math.round(current * 10) / 10,
      predictedValue: Math.round(predicted30d * 10) / 10,
      confidence: Math.round(confidence * 100) / 100,
      trend,
      riskLevel,
      explanation: `Com base na tendência das últimas ${hrValues.length} medições, sua FC de repouso tende a ${direction} para ~${Math.round(predicted30d)} bpm nos próximos 30 dias.`,
      algorithm: 'linear-regression-v1',
    }];
  }

  predictWeight(metrics: DailyMetric[]): PredictionCandidate[] {
    const values = metrics.map((m) => m.weight).filter((v): v is number => v !== null && v !== undefined);
    if (values.length < 7) return [];

    const current = avg(values.slice(-7));
    const predicted30d = Math.max(20, predictLinear(values, 30));
    const slope = linearSlope(values);
    const trend: TrendDir = Math.abs(slope * 7) < 0.2 ? 'STABLE' : slope > 0 ? 'UP' : 'DOWN';
    const confidence = Math.min(0.75, 0.40 + values.length * 0.01);

    return [{
      metric: 'weight',
      horizon: '30d',
      currentValue: Math.round(current * 10) / 10,
      predictedValue: Math.round(predicted30d * 10) / 10,
      confidence: Math.round(confidence * 100) / 100,
      trend,
      riskLevel: 'NONE',
      explanation: `Sua tendência de peso aponta para ${Math.round(predicted30d * 10) / 10}kg em 30 dias (${slope >= 0 ? '+' : ''}${(slope * 30).toFixed(1)}kg/mês).`,
      algorithm: 'linear-regression-v1',
    }];
  }

  predictOverloadRisk(tsb?: number, atl?: number, ctl?: number): PredictionCandidate[] {
    if (tsb === undefined || tsb === null) return [];

    const predictedTsb = tsb;
    let riskLevel: RiskLevel = 'NONE';
    let explanation: string;

    if (tsb < -30) {
      riskLevel = 'HIGH';
      explanation = `Seu TSB atual (${Math.round(tsb)}) indica risco alto de overtraining. Sem descanso adequado, o risco de lesão ou queda de desempenho é elevado.`;
    } else if (tsb < -20) {
      riskLevel = 'MEDIUM';
      explanation = `Seu TSB (${Math.round(tsb)}) indica carga acumulada elevada. Monitore sua recuperação nos próximos dias.`;
    } else if (tsb < -10) {
      riskLevel = 'LOW';
      explanation = `Seu TSB (${Math.round(tsb)}) está no limiar. Se mantiver o volume atual, pode acumular fadiga nas próximas semanas.`;
    } else {
      riskLevel = 'NONE';
      explanation = `Seu TSB (${Math.round(tsb)}) está em zona segura. Continue monitorando para garantir equilíbrio entre carga e recuperação.`;
    }

    return [{
      metric: 'overloadRisk',
      horizon: '7d',
      currentValue: tsb,
      predictedValue: predictedTsb,
      confidence: 0.7,
      trend: 'STABLE',
      riskLevel,
      explanation,
      algorithm: 'tsb-risk-v1',
    }];
  }
}
