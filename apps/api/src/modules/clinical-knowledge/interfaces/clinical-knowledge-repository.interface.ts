import { ClinicalKnowledge, ClinicalKnowledgeCategory, EvidenceLevel, KnowledgeStatus } from '@bio/database';

export interface CreateKnowledgeData {
  tenantId?: string;
  category: ClinicalKnowledgeCategory;
  title: string;
  description?: string;
  clinicalCode?: string;
  source?: string;
  evidenceLevel: EvidenceLevel;
  language?: string;
  status?: KnowledgeStatus;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdBy?: string;
}

export interface UpdateKnowledgeData {
  category?: ClinicalKnowledgeCategory;
  title?: string;
  description?: string;
  clinicalCode?: string;
  source?: string;
  evidenceLevel?: EvidenceLevel;
  language?: string;
  status?: KnowledgeStatus;
  tags?: string[];
  metadata?: Record<string, unknown>;
  updatedBy?: string;
}

export interface SearchKnowledgeFilters {
  category?: ClinicalKnowledgeCategory;
  status?: KnowledgeStatus;
  evidenceLevel?: EvidenceLevel;
  clinicalCode?: string;
  source?: string;
  text?: string;
  tenantId?: string;
  page?: number;
  limit?: number;
}

export interface IClinicalKnowledgeRepository {
  create(data: CreateKnowledgeData): Promise<ClinicalKnowledge>;
  update(id: string, data: UpdateKnowledgeData): Promise<ClinicalKnowledge>;
  findById(id: string): Promise<ClinicalKnowledge | null>;
  findByCategory(category: ClinicalKnowledgeCategory, tenantId?: string): Promise<ClinicalKnowledge[]>;
  findPublished(tenantId?: string): Promise<ClinicalKnowledge[]>;
  search(filters: SearchKnowledgeFilters): Promise<{ items: ClinicalKnowledge[]; total: number }>;
  delete(id: string): Promise<void>;
}
