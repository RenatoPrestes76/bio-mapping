import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogService } from '../../../../common/audit/audit-log.service.js';
import { PrecisionRepository } from '../repositories/precision.repository.js';
import { calculatePersonalizedRisk, classifyRiskLevel } from '../engine/risk-personalizer.js';
import { generateRecommendations } from '../engine/recommendation-personalizer.js';
import { summarizeLongitudinalData, groupMetricsByName } from '../engine/longitudinal-analyzer.js';
import type { CreateProfileDto } from '../dto/create-profile.dto.js';
import type { CreateCarePlanDto } from '../dto/create-care-plan.dto.js';
import type {
  PatientProfile,
  PersonalizedRisk,
  PersonalizedRecommendation,
  CarePlan,
  LongitudinalMetric,
  BiologicalSex,
  LifestyleType,
  AlcoholConsumption,
  PersonalizedRiskLevel,
  RecommendationCategory,
} from '@bio/database';

const PRECISION_VERSION = '1.0';

@Injectable()
export class PrecisionService {
  constructor(
    private readonly repository: PrecisionRepository,
    private readonly audit: AuditLogService,
  ) {}

  async createOrUpdateProfile(dto: CreateProfileDto, userId: string): Promise<PatientProfile> {
    let bmi = dto.bmi;
    if (!bmi && dto.weight && dto.height && dto.height > 0) {
      bmi = Math.round((dto.weight / (dto.height * dto.height)) * 10) / 10;
    }

    const profile = await this.repository.upsertProfile({
      patientId: dto.patientId,
      tenantId: dto.tenantId,
      age: dto.age,
      sex: dto.sex as BiologicalSex | undefined,
      weight: dto.weight,
      height: dto.height,
      bmi,
      lifestyle: dto.lifestyle as LifestyleType | undefined,
      smoking: dto.smoking,
      alcohol: dto.alcohol as AlcoholConsumption | undefined,
      pregnant: dto.pregnant,
      menopausal: dto.menopausal,
      familyHistory: dto.familyHistory,
      conditions: dto.conditions,
      medications: dto.medications,
      occupation: dto.occupation,
    });

    const action = profile.updatedAt.getTime() === profile.createdAt.getTime() ? 'PRECISION_PROFILE_CREATED' : 'PRECISION_PROFILE_UPDATED';
    await this.audit.log(action, { userId, metadata: { patientId: dto.patientId } });

    return profile;
  }

  async findProfile(patientId: string): Promise<PatientProfile> {
    const profile = await this.repository.findProfileByPatientId(patientId);
    if (!profile) throw new NotFoundException(`Profile for patient ${patientId} not found`);
    return profile;
  }

  async calculateRisk(patientId: string, userId: string, baseRiskScore = 0.3, trendSlope?: number): Promise<PersonalizedRisk> {
    const profile = await this.repository.findProfileByPatientId(patientId);
    if (!profile) throw new NotFoundException(`Profile for patient ${patientId} not found`);

    const familyHistory = (profile.familyHistory as string[] | null) ?? [];
    const result = calculatePersonalizedRisk({
      baseRiskScore,
      familyHistory,
      lifestyle: (profile.lifestyle as LifestyleType | null) ?? undefined,
      smoking: profile.smoking,
      alcohol: (profile.alcohol as AlcoholConsumption | null) ?? undefined,
      bmi: profile.bmi ?? undefined,
      age: profile.age ?? undefined,
      trendSlope,
    });

    const risk = await this.repository.createRisk({
      tenantId: profile.tenantId ?? undefined,
      patientId,
      profileId: profile.id,
      ...result,
      riskLevel: result.riskLevel as PersonalizedRiskLevel,
    });

    await this.audit.log('PRECISION_RISK_CALCULATED', {
      userId,
      metadata: { patientId, riskLevel: result.riskLevel, finalRiskScore: result.finalRiskScore },
    });

    return risk;
  }

  async getRecommendations(patientId: string, userId?: string): Promise<PersonalizedRecommendation[]> {
    const profile = await this.repository.findProfileByPatientId(patientId);
    if (!profile) throw new NotFoundException(`Profile for patient ${patientId} not found`);

    const latestRisk = await this.repository.findLatestRisk(patientId);
    const familyHistory = (profile.familyHistory as string[] | null) ?? [];
    const conditions = (profile.conditions as string[] | null) ?? [];

    const generatedRecs = generateRecommendations({
      age: profile.age ?? undefined,
      sex: (profile.sex as string | null) ?? undefined,
      bmi: profile.bmi ?? undefined,
      lifestyle: (profile.lifestyle as LifestyleType | null) ?? undefined,
      smoking: profile.smoking,
      alcohol: (profile.alcohol as AlcoholConsumption | null) ?? undefined,
      pregnant: profile.pregnant,
      menopausal: profile.menopausal,
      familyHistory,
      conditions,
      riskLevel: latestRisk ? (latestRisk.riskLevel as PersonalizedRiskLevel) : undefined,
    });

    const saved = await this.repository.createRecommendations(
      generatedRecs.map((r) => ({
        tenantId: profile.tenantId ?? undefined,
        patientId,
        profileId: profile.id,
        category: r.category as RecommendationCategory,
        priority: r.priority,
        title: r.title,
        description: r.description,
        reason: r.reason,
        expectedBenefit: r.expectedBenefit,
        personalized: true,
        rulesTriggered: [r.templateId],
      })),
    );

    await this.audit.log('PRECISION_RECOMMENDATION_GENERATED', {
      userId,
      metadata: { patientId, count: saved.length },
    });

    return saved;
  }

  async createCarePlan(dto: CreateCarePlanDto, userId: string): Promise<CarePlan> {
    const profile = await this.repository.findProfileByPatientId(dto.patientId);
    if (!profile) throw new NotFoundException(`Profile for patient ${dto.patientId} not found`);

    const recs = await this.repository.findRecommendationsByPatient(dto.patientId, 5);
    const defaultTitle = dto.title ?? `Plano de Cuidado — ${new Date().toLocaleDateString('pt-BR')}`;
    const followUpDays = dto.followUpDays ?? 30;

    const goals = dto.goals ?? this.buildDefaultGoals(profile, recs);

    const plan = await this.repository.createCarePlan({
      tenantId: profile.tenantId ?? undefined,
      patientId: dto.patientId,
      profileId: profile.id,
      title: defaultTitle,
      description: dto.description,
      status: 'ACTIVE',
      startDate: new Date(),
      followUpDays,
      successIndicators: { followUpDays, recommendationCount: recs.length, version: PRECISION_VERSION },
      createdBy: userId,
      goals: goals.map((g) => ({
        title: g.title,
        description: g.description,
        targetValue: g.targetValue,
        unit: g.unit,
        deadline: g.deadline ? new Date(g.deadline) : undefined,
      })),
    });

    await this.audit.log('PRECISION_CARE_PLAN_CREATED', {
      userId,
      metadata: { patientId: dto.patientId, planId: plan.id },
    });

    return plan;
  }

  async getTimeline(patientId: string, metricName?: string): Promise<{ summaries: ReturnType<typeof summarizeLongitudinalData>[]; metrics: LongitudinalMetric[] }> {
    const metrics = await this.repository.findMetricsByPatient(patientId, metricName);
    const grouped = groupMetricsByName(
      metrics.map((m) => ({ value: m.value, recordedAt: m.recordedAt, metricName: m.metricName })),
    );
    const summaries = Object.values(grouped)
      .map((pts) => summarizeLongitudinalData(pts))
      .filter(Boolean);
    return { summaries, metrics };
  }

  private buildDefaultGoals(
    profile: PatientProfile,
    recs: PersonalizedRecommendation[],
  ): Array<{ title: string; description?: string; targetValue?: number; unit?: string; deadline?: string }> {
    const goals: Array<{ title: string; description?: string; targetValue?: number; unit?: string; deadline?: string }> = [];
    const inDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString();

    if (profile.bmi && profile.bmi >= 25) {
      goals.push({ title: 'Redução de IMC', description: 'Atingir IMC dentro da faixa saudável', targetValue: 24.9, unit: 'kg/m²', deadline: inDays(90) });
    }
    if (recs.some((r) => r.category === 'EXERCISE')) {
      goals.push({ title: 'Atividade física regular', description: '150 min de exercício aeróbico por semana', targetValue: 150, unit: 'min/semana', deadline: inDays(30) });
    }
    if (profile.smoking) {
      goals.push({ title: 'Cessação do tabagismo', description: 'Eliminar uso de tabaco completamente', deadline: inDays(60) });
    }
    if (goals.length === 0) {
      goals.push({ title: 'Acompanhamento clínico regular', description: `Retorno em ${90} dias para reavaliação`, deadline: inDays(90) });
    }
    return goals;
  }
}
