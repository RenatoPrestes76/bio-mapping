import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PathwayStatus, StepStatus } from '@bio/database';
import { AuditLogService } from '../../../common/audit/audit-log.service.js';
import { PrismaClinicalPathwayRepository } from '../repositories/prisma-clinical-pathway.repository.js';
import { findTemplate } from '../workflow/pathway-templates.js';

export interface StartPathwayDto {
  patientId: string;
  templateId: string;
  decisionId?: string;
  knowledgeId?: string;
  tenantId?: string;
}

export interface AdvanceStepDto {
  stepId: string;
  status?: StepStatus;
}

@Injectable()
export class ClinicalPathwayService {
  constructor(
    private readonly repo: PrismaClinicalPathwayRepository,
    private readonly audit: AuditLogService,
  ) {}

  async start(dto: StartPathwayDto, userId?: string) {
    const template = findTemplate(dto.templateId);
    if (!template) throw new NotFoundException(`No pathway template found for templateId: ${dto.templateId}`);

    const existing = await this.repo.findActiveByPatientAndTemplate(dto.patientId, dto.templateId);
    if (existing) {
      throw new BadRequestException(
        `Patient already has an active pathway for template ${dto.templateId}. Resolve or cancel it before starting a new one.`,
      );
    }

    const now = new Date();
    const pathway = await this.repo.create({
      tenantId: dto.tenantId,
      patientId: dto.patientId,
      name: template.name,
      description: template.description,
      priority: template.priority,
      triggerDecisionId: dto.decisionId,
      templateId: template.templateId,
      clinicalCode: template.clinicalCode,
      knowledgeId: dto.knowledgeId,
      totalSteps: template.steps.length,
      createdBy: userId,
      steps: template.steps.map((s) => ({
        sequence: s.sequence,
        title: s.title,
        description: s.description,
        actionType: s.actionType,
        dueDate: s.dueDaysFromStart === 0 ? now : new Date(now.getTime() + s.dueDaysFromStart * 86_400_000),
        knowledgeId: dto.knowledgeId,
      })),
    });

    await this.audit.log('PATHWAY_STARTED', { userId, metadata: { id: pathway.id, templateId: dto.templateId, patientId: dto.patientId } });
    return pathway;
  }

  async findByPatient(patientId: string, status?: PathwayStatus) {
    return this.repo.findByPatient(patientId, status);
  }

  async findById(id: string) {
    const pathway = await this.repo.findById(id);
    if (!pathway) throw new NotFoundException(`Clinical pathway ${id} not found`);
    return pathway;
  }

  async advanceStep(pathwayId: string, dto: AdvanceStepDto, userId?: string) {
    const pathway = await this.repo.findById(pathwayId);
    if (!pathway) throw new NotFoundException(`Clinical pathway ${pathwayId} not found`);
    if (pathway.status !== PathwayStatus.ACTIVE) {
      throw new BadRequestException(`Pathway ${pathwayId} is not active (status: ${pathway.status})`);
    }

    const step = pathway.steps.find((s) => s.id === dto.stepId);
    if (!step) throw new NotFoundException(`Step ${dto.stepId} not found in pathway ${pathwayId}`);

    const newStatus = dto.status ?? StepStatus.COMPLETED;
    const completedAt = newStatus === StepStatus.COMPLETED ? new Date() : undefined;
    await this.repo.updateStep(dto.stepId, newStatus, completedAt);

    const completedOrSkipped = new Set<StepStatus>([StepStatus.COMPLETED, StepStatus.SKIPPED]);
    const updatedSteps = pathway.steps.map((s) => (s.id === dto.stepId ? { ...s, status: newStatus } : s));
    const nextPendingStep = updatedSteps.find((s) => !completedOrSkipped.has(s.status));
    const nextStep = nextPendingStep ? nextPendingStep.sequence : pathway.totalSteps;

    await this.repo.advanceCurrentStep(pathwayId, nextStep, userId);

    if (!nextPendingStep) {
      const updated = await this.repo.complete(pathwayId, new Date(), userId);
      await this.audit.log('PATHWAY_COMPLETED', { userId, metadata: { id: pathwayId } });
      return updated;
    }

    await this.audit.log('PATHWAY_STEP_ADVANCED', { userId, metadata: { pathwayId, stepId: dto.stepId, newStatus } });
    return this.repo.findById(pathwayId);
  }

  async complete(pathwayId: string, userId?: string) {
    const pathway = await this.repo.findById(pathwayId);
    if (!pathway) throw new NotFoundException(`Clinical pathway ${pathwayId} not found`);
    if (pathway.status !== PathwayStatus.ACTIVE) {
      throw new BadRequestException(`Pathway ${pathwayId} is not active`);
    }
    const updated = await this.repo.complete(pathwayId, new Date(), userId);
    await this.audit.log('PATHWAY_COMPLETED', { userId, metadata: { id: pathwayId } });
    return updated;
  }

  async cancel(pathwayId: string, userId?: string) {
    const pathway = await this.repo.findById(pathwayId);
    if (!pathway) throw new NotFoundException(`Clinical pathway ${pathwayId} not found`);
    if (pathway.status !== PathwayStatus.ACTIVE) {
      throw new BadRequestException(`Pathway ${pathwayId} is not active`);
    }
    const updated = await this.repo.cancel(pathwayId, userId);
    await this.audit.log('PATHWAY_CANCELLED', { userId, metadata: { id: pathwayId } });
    return updated;
  }
}
