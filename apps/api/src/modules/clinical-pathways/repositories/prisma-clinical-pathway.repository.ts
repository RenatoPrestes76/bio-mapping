import { Injectable } from '@nestjs/common';
import { PathwayStatus, StepStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';
import { CreatePathwayData, IClinicalPathwayRepository } from '../interfaces/clinical-pathway-repository.interface.js';

const STEPS_INCLUDE = { steps: { orderBy: { sequence: 'asc' as const } } };

@Injectable()
export class PrismaClinicalPathwayRepository implements IClinicalPathwayRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePathwayData) {
    return this.prisma.clinicalPathway.create({
      data: {
        tenantId: data.tenantId,
        patientId: data.patientId,
        name: data.name,
        description: data.description,
        priority: data.priority,
        triggerDecisionId: data.triggerDecisionId,
        templateId: data.templateId,
        clinicalCode: data.clinicalCode,
        knowledgeId: data.knowledgeId,
        totalSteps: data.totalSteps,
        metadata: data.metadata as object | undefined,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
        steps: {
          create: data.steps.map((s) => ({
            sequence: s.sequence,
            title: s.title,
            description: s.description,
            actionType: s.actionType as never,
            dueDate: s.dueDate,
            knowledgeId: s.knowledgeId,
          })),
        },
      },
      include: STEPS_INCLUDE,
    });
  }

  async findByPatient(patientId: string, status?: PathwayStatus) {
    return this.prisma.clinicalPathway.findMany({
      where: { patientId, ...(status ? { status } : {}) },
      include: STEPS_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(tenantId?: string) {
    return this.prisma.clinicalPathway.findMany({
      where: { status: PathwayStatus.ACTIVE, ...(tenantId ? { tenantId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveByPatientAndTemplate(patientId: string, templateId: string) {
    return this.prisma.clinicalPathway.findFirst({
      where: { patientId, templateId, status: PathwayStatus.ACTIVE },
    });
  }

  async findById(id: string) {
    return this.prisma.clinicalPathway.findUnique({
      where: { id },
      include: STEPS_INCLUDE,
    });
  }

  async updateStep(stepId: string, status: StepStatus, completedAt?: Date) {
    return this.prisma.clinicalPathwayStep.update({
      where: { id: stepId },
      data: { status, completedAt: completedAt ?? null },
    });
  }

  async advanceCurrentStep(pathwayId: string, nextStep: number, updatedBy?: string) {
    return this.prisma.clinicalPathway.update({
      where: { id: pathwayId },
      data: { currentStep: nextStep, updatedBy },
    });
  }

  async complete(pathwayId: string, completedAt: Date, updatedBy?: string) {
    await this.prisma.clinicalPathwayStep.updateMany({
      where: { pathwayId, status: StepStatus.PENDING },
      data: { status: StepStatus.SKIPPED },
    });
    return this.prisma.clinicalPathway.update({
      where: { id: pathwayId },
      data: { status: PathwayStatus.COMPLETED, completedAt, updatedBy },
    });
  }

  async cancel(pathwayId: string, updatedBy?: string) {
    await this.prisma.clinicalPathwayStep.updateMany({
      where: { pathwayId, status: { in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] } },
      data: { status: StepStatus.CANCELLED },
    });
    return this.prisma.clinicalPathway.update({
      where: { id: pathwayId },
      data: { status: PathwayStatus.CANCELLED, updatedBy },
    });
  }
}
