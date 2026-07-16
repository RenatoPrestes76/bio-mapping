import { Injectable } from '@nestjs/common';
import { computeCardioMetrics } from '@bio/bioscore-engine';
import { PrismaService } from '../../../database/prisma.service.js';

export interface CardioMetricsContext {
  patientId: string;
  ageYears: number;
  restingHr?: number;
  maxHrMeasured?: number;
  hrvMs?: number;
  cardiacRecoveryBpm?: number;
  recordedAt: Date;
}

@Injectable()
export class CardioMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(ctx: CardioMetricsContext) {
    const result = computeCardioMetrics({
      ageYears: ctx.ageYears,
      restingHr: ctx.restingHr,
      maxHrMeasured: ctx.maxHrMeasured,
      hrvMs: ctx.hrvMs,
      cardiacRecoveryBpm: ctx.cardiacRecoveryBpm,
    });

    const saved = await this.prisma.cardioMetrics.create({
      data: {
        patientId: ctx.patientId,
        recordedAt: ctx.recordedAt,
        restingHr: ctx.restingHr,
        maxHrEstimated: result.maxHrEstimated,
        maxHrMeasured: ctx.maxHrMeasured,
        zone1Min: result.zones.zone1.min,
        zone1Max: result.zones.zone1.max,
        zone2Min: result.zones.zone2.min,
        zone2Max: result.zones.zone2.max,
        zone3Min: result.zones.zone3.min,
        zone3Max: result.zones.zone3.max,
        zone4Min: result.zones.zone4.min,
        zone4Max: result.zones.zone4.max,
        zone5Min: result.zones.zone5.min,
        zone5Max: result.zones.zone5.max,
        hrvMs: ctx.hrvMs,
        cardiacRecoveryBpm: ctx.cardiacRecoveryBpm,
        vo2maxEstimated: result.vo2maxEstimated,
        classification: result.classification,
        score: result.score,
      },
    });

    return { saved, score: result.score };
  }
}
