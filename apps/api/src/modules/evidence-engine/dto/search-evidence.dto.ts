import { EvidenceSource, EvidenceLanguage } from '../entities/evidence.entity.js';

export class SearchEvidenceDto {
  query?: string;
  source?: EvidenceSource;
  language?: EvidenceLanguage;
  topic?: string;
  condition?: string;
  recentYears?: number;
  page?: number;
  limit?: number;
}
