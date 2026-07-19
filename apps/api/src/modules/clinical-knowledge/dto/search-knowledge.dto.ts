import { ClinicalKnowledgeCategory, EvidenceLevel, KnowledgeStatus } from '@bio/database';

export class SearchKnowledgeDto {
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
