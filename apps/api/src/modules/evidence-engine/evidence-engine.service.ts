import { Injectable, NotFoundException } from '@nestjs/common';
import { Evidence, EvidenceSource, EvidenceLanguage } from './entities/evidence.entity.js';
import { ClinicalCitation } from './entities/clinical-citation.entity.js';
import { RatedEvidence } from './grading/evidence-scorer.js';
import { GradingResult, buildGradingResult } from './grading/grade-system.js';
import { EvidenceRating } from './entities/evidence-rating.entity.js';
import { EvidenceProvider } from './providers/evidence.provider.js';

export interface EvidenceSummary {
  evidence: Evidence;
  rating: EvidenceRating | null;
  grading: GradingResult | null;
  citations: ClinicalCitation[];
  relatedCount: number;
}

export interface ClinicalSupportResult {
  citations: ClinicalCitation[];
  evidence: Evidence[];
}

@Injectable()
export class EvidenceEngineService {
  constructor(private readonly provider: EvidenceProvider) {}

  getEvidence(id: string): Evidence {
    const ev = this.provider.getById(id);
    if (!ev) throw new NotFoundException(`Evidence '${id}' not found`);
    return ev;
  }

  search(query: string, source?: EvidenceSource, language?: EvidenceLanguage): Evidence[] {
    return this.provider.searchEvidence(query, source, language);
  }

  rank(query?: string): RatedEvidence[] {
    if (query && query.trim()) {
      const found = this.provider.searchEvidence(query);
      return this.provider.rankEvidence(found);
    }
    return this.provider.rankEvidence();
  }

  getSupportingStudies(condition: string): Evidence[] {
    return this.provider.findByCondition(condition);
  }

  findByTopic(topic: string): Evidence[] {
    return this.provider.findByTopic(topic);
  }

  findByGuideline(guidelineId: string): Evidence[] {
    return this.provider.findByGuideline(guidelineId);
  }

  getClinicalSupport(ruleId: string): ClinicalSupportResult {
    const citations = this.provider.getCitationsForRule(ruleId);
    const evidenceIds = [...new Set(citations.map((c) => c.evidenceId))];
    const evidence = evidenceIds
      .map((id) => this.provider.getById(id))
      .filter((e): e is Evidence => e !== undefined);
    return { citations, evidence };
  }

  getEvidenceSummary(evidenceId: string): EvidenceSummary {
    const evidence = this.getEvidence(evidenceId);
    const rating = this.provider.getRating(evidenceId) ?? null;
    const citations = this.provider.getCitationsForEvidence(evidenceId);
    const related = this.provider.findRelatedEvidence(evidenceId);
    const grading = rating
      ? buildGradingResult(evidence.source, rating.grade, rating.strength, rating.overallScore())
      : null;
    return { evidence, rating, grading, citations, relatedCount: related.length };
  }
}
