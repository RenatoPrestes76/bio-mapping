import { Injectable } from '@nestjs/common';
import { DecisionStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';
import { CreateDecisionData, IClinicalDecisionRepository } from '../interfaces/clinical-decision-repository.interface.js';

@Injectable()
export class PrismaClinicalDecisionRepository implements IClinicalDecisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDecisionData) {
    return this.prisma.clinicalDecision.create({
      data: {
        tenantId: data.tenantId,
        patientId: data.patientId,
        ruleId: data.ruleId,
        decisionType: data.decisionType as never,
        priority: data.priority as never,
        title: data.title,
        description: data.description,
        recommendation: data.recommendation,
        rationale: data.rationale,
        evidenceLevel: data.evidenceLevel as never,
        knowledgeId: data.knowledgeId,
        triggerData: data.triggerData as object | undefined,
        metadata: data.metadata as object | undefined,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      },
    });
  }

  async findByPatient(patientId: string, status?: DecisionStatus) {
    return this.prisma.clinicalDecision.findMany({
      where: { patientId, ...(status ? { status } : {}) },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOpen(tenantId?: string) {
    return this.prisma.clinicalDecision.findMany({
      where: { status: DecisionStatus.OPEN, ...(tenantId ? { tenantId } : {}) },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOpenByPatientAndRule(patientId: string, ruleId: string) {
    return this.prisma.clinicalDecision.findFirst({
      where: { patientId, ruleId, status: DecisionStatus.OPEN },
    });
  }

  async findById(id: string) {
    return this.prisma.clinicalDecision.findUnique({ where: { id } });
  }

  async updateStatus(id: string, status: DecisionStatus, updatedBy?: string) {
    return this.prisma.clinicalDecision.update({
      where: { id },
      data: { status, updatedBy },
    });
  }

  async delete(id: string) {
    await this.prisma.clinicalDecision.delete({ where: { id } });
  }
}
