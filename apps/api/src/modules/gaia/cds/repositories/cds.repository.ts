import { Injectable } from '@nestjs/common';
import type { CdsEvaluation, CdsRule, CdsAlert, CdsFeedback, CdsPriority, EvidenceLevel, CdsAlertType } from '@bio/database';
import { PrismaService } from '../../../../database/prisma.service.js';

@Injectable()
export class CdsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Evaluations ──────────────────────────────────────────────────────────────

  async createEvaluation(data: {
    tenantId?: string;
    patientId: string;
    evaluatedBy?: string;
    priority: CdsPriority;
    confidence: number;
    recommendation: string;
    reasons: string[];
    evidenceLevel: EvidenceLevel;
    requiresMedicalReview: boolean;
    variables?: Record<string, unknown>;
    weights?: Record<string, unknown>;
    rulesTriggered?: unknown[];
    modelsUsed?: string[];
    references?: string[];
    inputData?: Record<string, unknown>;
    processingTimeMs?: number;
    version?: string;
  }): Promise<CdsEvaluation> {
    return this.prisma.cdsEvaluation.create({ data });
  }

  async findEvaluationById(id: string): Promise<CdsEvaluation | null> {
    return this.prisma.cdsEvaluation.findUnique({ where: { id } });
  }

  async findHistory(patientId: string, limit = 20): Promise<CdsEvaluation[]> {
    return this.prisma.cdsEvaluation.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async updateEvaluation(id: string, data: Partial<{
    priority: CdsPriority;
    confidence: number;
    recommendation: string;
    reasons: string[];
    evidenceLevel: EvidenceLevel;
    requiresMedicalReview: boolean;
    processingTimeMs: number;
  }>): Promise<CdsEvaluation> {
    return this.prisma.cdsEvaluation.update({ where: { id }, data });
  }

  // ── Rules ─────────────────────────────────────────────────────────────────────

  async findActiveRules(tenantId?: string): Promise<CdsRule[]> {
    return this.prisma.cdsRule.findMany({
      where: { active: true, ...(tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {}) },
      orderBy: { priority: 'asc' },
    });
  }

  async createRule(data: {
    tenantId?: string;
    name: string;
    description?: string;
    conditions: unknown;
    conjunction?: string;
    priority: CdsPriority;
    recommendation: string;
    evidenceLevel: EvidenceLevel;
    version?: string;
  }): Promise<CdsRule> {
    return this.prisma.cdsRule.create({ data });
  }

  async updateRule(id: string, data: Partial<{
    name: string;
    description: string;
    conditions: unknown;
    conjunction: string;
    priority: CdsPriority;
    recommendation: string;
    active: boolean;
  }>): Promise<CdsRule> {
    return this.prisma.cdsRule.update({ where: { id }, data });
  }

  // ── Alerts ────────────────────────────────────────────────────────────────────

  async createAlert(data: {
    tenantId?: string;
    patientId: string;
    evaluationId: string;
    alertType: CdsAlertType;
    priority: CdsPriority;
    reason: string;
    origin: string;
    expiresAt?: Date;
  }): Promise<CdsAlert> {
    return this.prisma.cdsAlert.create({ data });
  }

  async findAlertsByPatient(patientId: string, unreadOnly = false): Promise<CdsAlert[]> {
    return this.prisma.cdsAlert.findMany({
      where: { patientId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAlertRead(id: string): Promise<CdsAlert> {
    return this.prisma.cdsAlert.update({ where: { id }, data: { read: true } });
  }

  // ── Feedback ──────────────────────────────────────────────────────────────────

  async createFeedback(data: {
    evaluationId: string;
    userId: string;
    rating: number;
    comment?: string;
    outcome?: string;
  }): Promise<CdsFeedback> {
    return this.prisma.cdsFeedback.create({ data });
  }

  async findFeedbackByEvaluation(evaluationId: string): Promise<CdsFeedback[]> {
    return this.prisma.cdsFeedback.findMany({ where: { evaluationId } });
  }
}
