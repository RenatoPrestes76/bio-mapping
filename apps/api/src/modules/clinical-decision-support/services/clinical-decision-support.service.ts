import { Injectable, NotFoundException } from '@nestjs/common';
import { DecisionStatus } from '@bio/database';
import { AuditLogService } from '../../../common/audit/audit-log.service.js';
import { ClinicalKnowledgeService } from '../../clinical-knowledge/services/clinical-knowledge.service.js';
import { PrismaClinicalDecisionRepository } from '../repositories/prisma-clinical-decision.repository.js';
import { ClinicalRule, PatientTriggerData } from '../interfaces/clinical-rule.interface.js';
import { HypertensionUncontrolledRule } from '../rules/hypertension-uncontrolled.rule.js';
import { DiabetesHighRiskRule } from '../rules/diabetes-high-risk.rule.js';
import { SevereObesityRule } from '../rules/severe-obesity.rule.js';
import { DyslipidemiaRule } from '../rules/dyslipidemia.rule.js';
import { MetabolicSyndromeRule } from '../rules/metabolic-syndrome.rule.js';

@Injectable()
export class ClinicalDecisionSupportService {
  private readonly rules: ClinicalRule[] = [
    new HypertensionUncontrolledRule(),
    new DiabetesHighRiskRule(),
    new SevereObesityRule(),
    new DyslipidemiaRule(),
    new MetabolicSyndromeRule(),
  ];

  constructor(
    private readonly repo: PrismaClinicalDecisionRepository,
    private readonly knowledgeService: ClinicalKnowledgeService,
    private readonly audit: AuditLogService,
  ) {}

  async evaluate(patientId: string, triggerData: PatientTriggerData, userId?: string, tenantId?: string) {
    const knowledge = await this.knowledgeService.findPublished(tenantId);
    const generated: Awaited<ReturnType<typeof this.repo.create>>[] = [];

    for (const rule of this.rules) {
      if (!rule.supports(triggerData)) continue;

      const result = await rule.evaluate(triggerData, knowledge);
      if (!result) continue;

      const existing = await this.repo.findOpenByPatientAndRule(patientId, rule.ruleId);
      if (existing) continue;

      const decision = await this.repo.create({
        tenantId,
        patientId,
        ruleId: rule.ruleId,
        decisionType: rule.decisionType,
        priority: rule.priority,
        title: result.title,
        description: result.description,
        recommendation: result.recommendation,
        rationale: result.rationale,
        evidenceLevel: result.evidenceLevel,
        knowledgeId: result.knowledgeId,
        triggerData: triggerData as Record<string, unknown>,
        createdBy: userId,
      });

      generated.push(decision);
      await this.audit.log('DECISION_CREATED', { userId, metadata: { id: decision.id, ruleId: rule.ruleId, patientId } });
    }

    return {
      evaluated: this.rules.filter((r) => r.supports(triggerData)).length,
      generated: generated.length,
      decisions: generated,
    };
  }

  async findByPatient(patientId: string, status?: DecisionStatus) {
    return this.repo.findByPatient(patientId, status);
  }

  async findById(id: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(`Clinical decision ${id} not found`);
    return item;
  }

  async updateStatus(id: string, status: DecisionStatus, userId?: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Clinical decision ${id} not found`);
    const updated = await this.repo.updateStatus(id, status, userId);
    await this.audit.log('DECISION_STATUS_UPDATED', { userId, metadata: { id, status } });
    return updated;
  }
}
