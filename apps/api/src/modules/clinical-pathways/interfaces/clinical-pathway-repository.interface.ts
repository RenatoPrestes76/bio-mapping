import { ClinicalPathway, ClinicalPathwayStep, PathwayStatus, StepStatus } from '@bio/database';

export interface CreatePathwayData {
  tenantId?: string;
  patientId: string;
  name: string;
  description?: string;
  priority?: string;
  triggerDecisionId?: string;
  templateId: string;
  clinicalCode?: string;
  knowledgeId?: string;
  totalSteps: number;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  steps: CreateStepData[];
}

export interface CreateStepData {
  sequence: number;
  title: string;
  description: string;
  actionType: string;
  dueDate?: Date;
  knowledgeId?: string;
}

export type PathwayWithSteps = ClinicalPathway & { steps: ClinicalPathwayStep[] };

export interface IClinicalPathwayRepository {
  create(data: CreatePathwayData): Promise<PathwayWithSteps>;
  findByPatient(patientId: string, status?: PathwayStatus): Promise<PathwayWithSteps[]>;
  findActive(tenantId?: string): Promise<ClinicalPathway[]>;
  findActiveByPatientAndTemplate(patientId: string, templateId: string): Promise<ClinicalPathway | null>;
  findById(id: string): Promise<PathwayWithSteps | null>;
  updateStep(stepId: string, status: StepStatus, completedAt?: Date): Promise<ClinicalPathwayStep>;
  advanceCurrentStep(pathwayId: string, nextStep: number, updatedBy?: string): Promise<ClinicalPathway>;
  complete(pathwayId: string, completedAt: Date, updatedBy?: string): Promise<ClinicalPathway>;
  cancel(pathwayId: string, updatedBy?: string): Promise<ClinicalPathway>;
}
