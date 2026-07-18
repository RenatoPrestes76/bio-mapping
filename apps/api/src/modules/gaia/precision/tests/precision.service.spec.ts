import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { PrecisionService } from '../services/precision.service.js';
import type { PrecisionRepository } from '../repositories/precision.repository.js';
import type { AuditLogService } from '../../../../common/audit/audit-log.service.js';
import type { PatientProfile, PersonalizedRisk, PersonalizedRecommendation, CarePlan } from '@bio/database';

const now = new Date();
const past = new Date(now.getTime() - 10000);

const makeProfile = (overrides: Partial<PatientProfile> = {}): PatientProfile => ({
  id: 'pr1', patientId: 'p1', tenantId: null, age: 45, sex: 'MALE' as any,
  weight: 80, height: 1.75, bmi: 26.1, lifestyle: 'SEDENTARY' as any,
  smoking: false, alcohol: 'NONE' as any, pregnant: false, menopausal: false,
  familyHistory: ['diabetes'] as any, conditions: [] as any, medications: [] as any,
  occupation: null, version: '1.0', createdAt: now, updatedAt: now,
  ...overrides,
});

const makeRisk = (overrides: Partial<PersonalizedRisk> = {}): PersonalizedRisk => ({
  id: 'ri1', tenantId: null, patientId: 'p1', profileId: 'pr1',
  baseRiskScore: 0.3, familyHistoryAdj: 0.08, lifestyleAdj: 0.15, trendAdj: 0,
  finalRiskScore: 0.53, riskLevel: 'HIGH' as any, factors: [] as any, version: '1.0', createdAt: new Date(),
  ...overrides,
});

const makeRec = (overrides: Partial<PersonalizedRecommendation> = {}): PersonalizedRecommendation => ({
  id: 'rec1', tenantId: null, patientId: 'p1', profileId: 'pr1',
  category: 'EXERCISE' as any, priority: 'HIGH', title: 'Exercício aeróbico',
  description: 'Praticar 150 min/semana', reason: 'Lifestyle sedentário',
  expectedBenefit: null, personalized: true, rulesTriggered: null, createdAt: new Date(),
  ...overrides,
});

const makePlan = (): CarePlan => ({
  id: 'cp1', tenantId: null, patientId: 'p1', profileId: 'pr1',
  title: 'Plano de Cuidado', description: null, status: 'ACTIVE' as any,
  startDate: new Date(), endDate: null, followUpDays: 30,
  successIndicators: null, version: '1.0', createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(),
});

describe('PrecisionService', () => {
  let service: PrecisionService;
  let repo: jest.Mocked<PrecisionRepository>;
  let audit: jest.Mocked<AuditLogService>;

  beforeEach(() => {
    repo = {
      upsertProfile: jest.fn(),
      findProfileByPatientId: jest.fn(),
      createRisk: jest.fn(),
      findLatestRisk: jest.fn(),
      createRecommendations: jest.fn(),
      findRecommendationsByPatient: jest.fn(),
      createCarePlan: jest.fn(),
      findCarePlansByPatient: jest.fn(),
      findCarePlanGoals: jest.fn(),
      recordMetric: jest.fn(),
      findMetricsByPatient: jest.fn(),
    } as any;
    audit = { log: jest.fn() } as any;
    service = new PrecisionService(repo, audit);
  });

  describe('createOrUpdateProfile', () => {
    it('creates profile and logs CREATED when timestamps equal', async () => {
      const profile = makeProfile({ createdAt: now, updatedAt: now });
      (repo.upsertProfile as any).mockResolvedValue(profile);
      const result = await service.createOrUpdateProfile({ patientId: 'p1', tenantId: 't1' } as any, 'u1');
      expect(result.id).toBe('pr1');
      expect(audit.log).toHaveBeenCalledWith('PRECISION_PROFILE_CREATED', expect.objectContaining({ userId: 'u1' }));
    });

    it('logs PRECISION_PROFILE_UPDATED when timestamps differ', async () => {
      const profile = makeProfile({ createdAt: past, updatedAt: now });
      (repo.upsertProfile as any).mockResolvedValue(profile);
      await service.createOrUpdateProfile({ patientId: 'p1' } as any, 'u1');
      expect(audit.log).toHaveBeenCalledWith('PRECISION_PROFILE_UPDATED', expect.anything());
    });

    it('auto-calculates BMI from weight and height', async () => {
      const profile = makeProfile();
      (repo.upsertProfile as any).mockResolvedValue(profile);
      await service.createOrUpdateProfile({ patientId: 'p1', weight: 80, height: 1.75 } as any, 'u1');
      const callArg = (repo.upsertProfile as any).mock.calls[0][0];
      expect(callArg.bmi).toBeCloseTo(26.1, 0);
    });

    it('does not override bmi when explicitly provided', async () => {
      const profile = makeProfile({ bmi: 22.0 });
      (repo.upsertProfile as any).mockResolvedValue(profile);
      await service.createOrUpdateProfile({ patientId: 'p1', bmi: 22.0 } as any, 'u1');
      const callArg = (repo.upsertProfile as any).mock.calls[0][0];
      expect(callArg.bmi).toBe(22.0);
    });
  });

  describe('findProfile', () => {
    it('returns profile when found', async () => {
      (repo.findProfileByPatientId as any).mockResolvedValue(makeProfile());
      const result = await service.findProfile('p1');
      expect(result.id).toBe('pr1');
    });

    it('throws NotFoundException when profile not found', async () => {
      (repo.findProfileByPatientId as any).mockResolvedValue(null);
      await expect(service.findProfile('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateRisk', () => {
    it('throws NotFoundException when profile not found', async () => {
      (repo.findProfileByPatientId as any).mockResolvedValue(null);
      await expect(service.calculateRisk('unknown', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('computes and persists risk for found profile', async () => {
      (repo.findProfileByPatientId as any).mockResolvedValue(makeProfile());
      (repo.createRisk as any).mockResolvedValue(makeRisk());
      const result = await service.calculateRisk('p1', 'u1');
      expect(result.id).toBe('ri1');
      expect(repo.createRisk).toHaveBeenCalled();
    });

    it('logs PRECISION_RISK_CALCULATED audit', async () => {
      (repo.findProfileByPatientId as any).mockResolvedValue(makeProfile());
      (repo.createRisk as any).mockResolvedValue(makeRisk());
      await service.calculateRisk('p1', 'u1', 0.3);
      expect(audit.log).toHaveBeenCalledWith('PRECISION_RISK_CALCULATED', expect.objectContaining({ userId: 'u1' }));
    });

    it('uses provided baseRiskScore', async () => {
      const profile = makeProfile({ familyHistory: [] as any, smoking: false });
      (repo.findProfileByPatientId as any).mockResolvedValue(profile);
      (repo.createRisk as any).mockResolvedValue(makeRisk({ baseRiskScore: 0.5 }));
      await service.calculateRisk('p1', 'u1', 0.5);
      const callArg = (repo.createRisk as any).mock.calls[0][0];
      expect(callArg.baseRiskScore).toBe(0.5);
    });
  });

  describe('getRecommendations', () => {
    it('throws NotFoundException when profile not found', async () => {
      (repo.findProfileByPatientId as any).mockResolvedValue(null);
      await expect(service.getRecommendations('unknown')).rejects.toThrow(NotFoundException);
    });

    it('generates and saves recommendations', async () => {
      (repo.findProfileByPatientId as any).mockResolvedValue(makeProfile({ lifestyle: 'SEDENTARY' as any, familyHistory: ['diabetes'] as any }));
      (repo.findLatestRisk as any).mockResolvedValue(null);
      (repo.createRecommendations as any).mockResolvedValue([makeRec()]);
      const result = await service.getRecommendations('p1', 'u1');
      expect(result).toHaveLength(1);
      expect(repo.createRecommendations).toHaveBeenCalled();
    });

    it('logs PRECISION_RECOMMENDATION_GENERATED audit', async () => {
      (repo.findProfileByPatientId as any).mockResolvedValue(makeProfile());
      (repo.findLatestRisk as any).mockResolvedValue(null);
      (repo.createRecommendations as any).mockResolvedValue([makeRec()]);
      await service.getRecommendations('p1', 'u1');
      expect(audit.log).toHaveBeenCalledWith('PRECISION_RECOMMENDATION_GENERATED', expect.objectContaining({ userId: 'u1' }));
    });

    it('includes riskLevel from latest risk when available', async () => {
      (repo.findProfileByPatientId as any).mockResolvedValue(makeProfile());
      (repo.findLatestRisk as any).mockResolvedValue(makeRisk({ riskLevel: 'HIGH' as any }));
      (repo.createRecommendations as any).mockResolvedValue([makeRec()]);
      const saved = await service.getRecommendations('p1', 'u1');
      expect(Array.isArray(saved)).toBe(true);
    });
  });

  describe('createCarePlan', () => {
    it('throws NotFoundException when profile not found', async () => {
      (repo.findProfileByPatientId as any).mockResolvedValue(null);
      await expect(service.createCarePlan({ patientId: 'unknown' } as any, 'u1')).rejects.toThrow(NotFoundException);
    });

    it('creates care plan and logs audit', async () => {
      (repo.findProfileByPatientId as any).mockResolvedValue(makeProfile());
      (repo.findRecommendationsByPatient as any).mockResolvedValue([]);
      (repo.createCarePlan as any).mockResolvedValue(makePlan());
      const result = await service.createCarePlan({ patientId: 'p1', title: 'Test Plan' } as any, 'u1');
      expect(result.id).toBe('cp1');
      expect(audit.log).toHaveBeenCalledWith('PRECISION_CARE_PLAN_CREATED', expect.objectContaining({ userId: 'u1' }));
    });

    it('generates default goals when none provided', async () => {
      const profile = makeProfile({ bmi: 28, smoking: true });
      (repo.findProfileByPatientId as any).mockResolvedValue(profile);
      (repo.findRecommendationsByPatient as any).mockResolvedValue([]);
      (repo.createCarePlan as any).mockResolvedValue(makePlan());
      await service.createCarePlan({ patientId: 'p1' } as any, 'u1');
      const callArg = (repo.createCarePlan as any).mock.calls[0][0];
      expect(callArg.goals.length).toBeGreaterThan(0);
    });

    it('uses provided goals without overriding', async () => {
      (repo.findProfileByPatientId as any).mockResolvedValue(makeProfile());
      (repo.findRecommendationsByPatient as any).mockResolvedValue([]);
      (repo.createCarePlan as any).mockResolvedValue(makePlan());
      const customGoal = { title: 'Custom Goal' };
      await service.createCarePlan({ patientId: 'p1', goals: [customGoal] } as any, 'u1');
      const callArg = (repo.createCarePlan as any).mock.calls[0][0];
      expect(callArg.goals).toHaveLength(1);
      expect(callArg.goals[0].title).toBe('Custom Goal');
    });

    it('uses default followUpDays of 30 when not specified', async () => {
      (repo.findProfileByPatientId as any).mockResolvedValue(makeProfile());
      (repo.findRecommendationsByPatient as any).mockResolvedValue([]);
      (repo.createCarePlan as any).mockResolvedValue(makePlan());
      await service.createCarePlan({ patientId: 'p1' } as any, 'u1');
      const callArg = (repo.createCarePlan as any).mock.calls[0][0];
      expect(callArg.followUpDays).toBe(30);
    });
  });

  describe('getTimeline', () => {
    it('returns summaries and raw metrics', async () => {
      const metrics = [
        { id: 'm1', patientId: 'p1', tenantId: null, metricName: 'glucose', value: 85, unit: 'mg/dL', recordedAt: new Date(), source: null, notes: null },
        { id: 'm2', patientId: 'p1', tenantId: null, metricName: 'glucose', value: 90, unit: 'mg/dL', recordedAt: new Date(Date.now() - 86400000), source: null, notes: null },
      ];
      (repo.findMetricsByPatient as any).mockResolvedValue(metrics);
      const result = await service.getTimeline('p1');
      expect(result.metrics).toHaveLength(2);
      expect(result.summaries.length).toBeGreaterThan(0);
    });

    it('passes metricName filter to repository', async () => {
      (repo.findMetricsByPatient as any).mockResolvedValue([]);
      await service.getTimeline('p1', 'glucose');
      expect(repo.findMetricsByPatient).toHaveBeenCalledWith('p1', 'glucose');
    });

    it('returns empty summaries for empty metrics', async () => {
      (repo.findMetricsByPatient as any).mockResolvedValue([]);
      const result = await service.getTimeline('p1');
      expect(result.summaries).toHaveLength(0);
      expect(result.metrics).toHaveLength(0);
    });
  });
});
