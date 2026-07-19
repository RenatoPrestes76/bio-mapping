import { ClinicalKnowledgeCategory, EvidenceLevel, KnowledgeStatus } from '@bio/database';

export class UpdateKnowledgeDto {
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
}
