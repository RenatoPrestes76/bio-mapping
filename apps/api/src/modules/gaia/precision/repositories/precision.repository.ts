import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service.js';
import type {
  PatientProfile,
  PersonalizedRisk,
  PersonalizedRecommendation,
  CarePlan,
  CarePlanGoal,
  LongitudinalMetric,
  BiologicalSex,
  LifestyleType,
  AlcoholConsumption,
  PersonalizedRiskLevel,
  RecommendationCategory,
  CarePlanStatus,
} from '@bio/database';

@Injectable()
export class PrecisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Patient Profile ────────────────────────────────────────────────────────

  async upsertProfile(data: {
    patientId: string;
    tenantId?: string;
    age?: number;
    sex?: BiologicalSex;
    weight?: number;
    height?: number;
    bmi?: number;
    lifestyle?: LifestyleType;
    smoking?: boolean;
    alcohol?: AlcoholConsumption;
    pregnant?: boolean;
    menopausal?: boolean;
    familyHistory?: string[];
    conditions?: string[];
    medications?: string[];
    occupation?: string;
  }): Promise<PatientProfile> {
    const payload = {
      tenantId: data.tenantId,
      age: data.age,
      sex: data.sex,
      weight: data.weight,
      height: data.height,
      bmi: data.bmi,
      lifestyle: data.lifestyle,
      smoking: data.smoking,
      alcohol: data.alcohol,
      pregnant: data.pregnant,
      menopausal: data.menopausal,
      familyHistory: data.familyHistory ? (data.familyHistory as unknown as object) : undefined,
      conditions: data.conditions ? (data.conditions as unknown as object) : undefined,
      medications: data.medications ? (data.medications as unknown as object) : undefined,
      occupation: data.occupation,
    };
    return this.prisma.patientProfile.upsert({
      where: { patientId: data.patientId },
      create: { patientId: data.patientId, ...payload },
      update: payload,
    });
  }

  async findProfileByPatientId(patientId: string): Promise<PatientProfile | null> {
    return this.prisma.patientProfile.findUnique({ where: { patientId } });
  }

  // ── Personalized Risk ──────────────────────────────────────────────────────

  async createRisk(data: {
    tenantId?: string;
    patientId: string;
    profileId: string;
    baseRiskScore: number;
    familyHistoryAdj: number;
    lifestyleAdj: number;
    trendAdj: number;
    finalRiskScore: number;
    riskLevel: PersonalizedRiskLevel;
    factors?: string[];
  }): Promise<PersonalizedRisk> {
    return this.prisma.personalizedRisk.create({
      data: {
        tenantId: data.tenantId,
        patientId: data.patientId,
        profileId: data.profileId,
        baseRiskScore: data.baseRiskScore,
        familyHistoryAdj: data.familyHistoryAdj,
        lifestyleAdj: data.lifestyleAdj,
        trendAdj: data.trendAdj,
        finalRiskScore: data.finalRiskScore,
        riskLevel: data.riskLevel,
        factors: data.factors ? (data.factors as unknown as object) : undefined,
      },
    });
  }

  async findLatestRisk(patientId: string): Promise<PersonalizedRisk | null> {
    return this.prisma.personalizedRisk.findFirst({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Personalized Recommendations ───────────────────────────────────────────

  async createRecommendations(
    recs: Array<{
      tenantId?: string;
      patientId: string;
      profileId: string;
      category: RecommendationCategory;
      priority: string;
      title: string;
      description: string;
      reason: string;
      expectedBenefit?: string;
      personalized?: boolean;
      rulesTriggered?: string[];
    }>,
  ): Promise<PersonalizedRecommendation[]> {
    return this.prisma.$transaction(
      recs.map((r) =>
        this.prisma.personalizedRecommendation.create({
          data: {
            tenantId: r.tenantId,
            patientId: r.patientId,
            profileId: r.profileId,
            category: r.category,
            priority: r.priority,
            title: r.title,
            description: r.description,
            reason: r.reason,
            expectedBenefit: r.expectedBenefit,
            personalized: r.personalized ?? true,
            rulesTriggered: r.rulesTriggered ? (r.rulesTriggered as unknown as object) : undefined,
          },
        }),
      ),
    );
  }

  async findRecommendationsByPatient(patientId: string, limit = 20): Promise<PersonalizedRecommendation[]> {
    return this.prisma.personalizedRecommendation.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ── Care Plans ─────────────────────────────────────────────────────────────

  async createCarePlan(data: {
    tenantId?: string;
    patientId: string;
    profileId: string;
    title: string;
    description?: string;
    status?: CarePlanStatus;
    startDate: Date;
    endDate?: Date;
    followUpDays?: number;
    successIndicators?: Record<string, unknown>;
    createdBy: string;
    goals?: Array<{ title: string; description?: string; targetValue?: number; unit?: string; deadline?: Date }>;
  }): Promise<CarePlan> {
    const plan = await this.prisma.carePlan.create({
      data: {
        tenantId: data.tenantId,
        patientId: data.patientId,
        profileId: data.profileId,
        title: data.title,
        description: data.description,
        status: data.status ?? 'ACTIVE',
        startDate: data.startDate,
        endDate: data.endDate,
        followUpDays: data.followUpDays ?? 30,
        successIndicators: data.successIndicators ? (data.successIndicators as object) : undefined,
        createdBy: data.createdBy,
      },
    });
    if (data.goals && data.goals.length > 0) {
      await this.prisma.$transaction(
        data.goals.map((g) =>
          this.prisma.carePlanGoal.create({
            data: { carePlanId: plan.id, title: g.title, description: g.description, targetValue: g.targetValue, unit: g.unit, deadline: g.deadline },
          }),
        ),
      );
    }
    return plan;
  }

  async findCarePlansByPatient(patientId: string): Promise<CarePlan[]> {
    return this.prisma.carePlan.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCarePlanGoals(carePlanId: string): Promise<CarePlanGoal[]> {
    return this.prisma.carePlanGoal.findMany({ where: { carePlanId }, orderBy: { createdAt: 'asc' } });
  }

  // ── Longitudinal Metrics ───────────────────────────────────────────────────

  async recordMetric(data: {
    tenantId?: string;
    patientId: string;
    metricName: string;
    value: number;
    unit?: string;
    recordedAt: Date;
    source?: string;
    notes?: string;
  }): Promise<LongitudinalMetric> {
    return this.prisma.longitudinalMetric.create({ data: { ...data } });
  }

  async findMetricsByPatient(patientId: string, metricName?: string, limit = 100): Promise<LongitudinalMetric[]> {
    return this.prisma.longitudinalMetric.findMany({
      where: { patientId, ...(metricName ? { metricName } : {}) },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }
}
