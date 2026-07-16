import { Injectable } from '@nestjs/common';
import { computeBodyMetrics } from '@bio/bioscore-engine';
import type { ActivityLevel, Gender } from '@bio/bioscore-engine';
import { PrismaService } from '../../../database/prisma.service.js';

export interface BodyMetricsContext {
  patientId: string;
  weightKg: number;
  heightCm: number;
  ageYears: number;
  gender: Gender;
  waistCm?: number;
  hipCm?: number;
  neckCm?: number;
  activityLevel?: ActivityLevel;
  recordedAt: Date;
}

@Injectable()
export class BodyMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(ctx: BodyMetricsContext) {
    const result = computeBodyMetrics({
      weightKg: ctx.weightKg,
      heightCm: ctx.heightCm,
      ageYears: ctx.ageYears,
      gender: ctx.gender,
      waistCm: ctx.waistCm,
      hipCm: ctx.hipCm,
      neckCm: ctx.neckCm,
      activityLevel: ctx.activityLevel,
    });

    const saved = await this.prisma.healthMetrics.create({
      data: {
        patientId: ctx.patientId,
        recordedAt: ctx.recordedAt,
        bmi: result.bmi,
        bmiClassification: result.bmiClassification,
        idealWeightKg: result.idealWeightKg,
        bodyFatPct: result.bodyFatPct,
        leanMassKg: result.leanMassKg,
        fatMassKg: result.fatMassKg,
        waistHeightRatio: result.waistHeightRatio,
        bmr: result.bmr,
        tdee: result.tdee,
        obesityIndex: result.obesityIndex,
        bodyClassification: result.bodyClassification,
        score: result.score,
      },
    });

    return { saved, score: result.score };
  }
}
