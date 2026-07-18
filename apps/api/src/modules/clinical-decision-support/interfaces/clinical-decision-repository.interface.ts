import { ClinicalDecision, DecisionStatus } from '@bio/database';

export interface CreateDecisionData {
  tenantId?: string;
  patientId: string;
  ruleId: string;
  decisionType: string;
  priority: string;
  title: string;
  description?: string;
  recommendation?: string;
  rationale?: string;
  evidenceLevel: string;
  knowledgeId?: string;
  triggerData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdBy?: string;
}

export interface IClinicalDecisionRepository {
  create(data: CreateDecisionData): Promise<ClinicalDecision>;
  findByPatient(patientId: string, status?: DecisionStatus): Promise<ClinicalDecision[]>;
  findOpen(tenantId?: string): Promise<ClinicalDecision[]>;
  findOpenByPatientAndRule(patientId: string, ruleId: string): Promise<ClinicalDecision | null>;
  findById(id: string): Promise<ClinicalDecision | null>;
  updateStatus(id: string, status: DecisionStatus, updatedBy?: string): Promise<ClinicalDecision>;
  delete(id: string): Promise<void>;
}
