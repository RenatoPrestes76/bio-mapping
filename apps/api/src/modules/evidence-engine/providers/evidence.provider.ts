import { Injectable } from '@nestjs/common';
import { Evidence, EvidenceSource, EvidenceLanguage } from '../entities/evidence.entity.js';
import { EvidenceRating } from '../entities/evidence-rating.entity.js';
import { ClinicalCitation } from '../entities/clinical-citation.entity.js';
import { CitationIndex } from '../citations/citation-index.js';
import { RatedEvidence, buildRatedEvidence, rankByScore, deduplicateEvidence } from '../grading/evidence-scorer.js';
import { BUILT_IN_EVIDENCE } from './built-in-evidence.js';
import { BUILT_IN_RATINGS } from './built-in-ratings.js';
import { BUILT_IN_CITATIONS } from './built-in-citations.js';

@Injectable()
export class EvidenceProvider {
  private evidence: Evidence[] = [];
  private readonly ratings = new Map<string, EvidenceRating>();
  private readonly citationIndex = new CitationIndex();
  private readonly cache = new Map<string, unknown>();

  constructor() {
    this.loadEvidence();
    this.loadCitations();
  }

  loadEvidence(): void {
    this.cache.clear();
    this.evidence = [...BUILT_IN_EVIDENCE];
    this.ratings.clear();
    for (const rating of BUILT_IN_RATINGS) {
      this.ratings.set(rating.evidenceId, rating);
    }
  }

  loadCitations(): void {
    this.citationIndex.clear();
    for (const citation of BUILT_IN_CITATIONS) {
      this.citationIndex.addCitation(citation);
    }
  }

  searchEvidence(query: string, source?: EvidenceSource, language?: EvidenceLanguage): Evidence[] {
    const cacheKey = `search:${query.toLowerCase().trim()}:${source ?? ''}:${language ?? ''}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) as Evidence[];

    let results = this.evidence;
    if (source) results = results.filter((e) => e.source === source);
    if (language) results = results.filter((e) => e.language === language);

    if (query && query.trim()) {
      results = results.filter((e) => e.matchesQuery(query));
    }

    const deduped = deduplicateEvidence(results);
    this.cache.set(cacheKey, deduped);
    return deduped;
  }

  findByTopic(topic: string): Evidence[] {
    const cacheKey = `topic:${topic.toLowerCase().trim()}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) as Evidence[];
    const results = this.evidence.filter((e) => e.matchesQuery(topic));
    const deduped = deduplicateEvidence(results);
    this.cache.set(cacheKey, deduped);
    return deduped;
  }

  findByCondition(condition: string): Evidence[] {
    const cacheKey = `condition:${condition.toLowerCase().trim()}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) as Evidence[];
    const results = this.evidence.filter((e) => e.matchesQuery(condition));
    const deduped = deduplicateEvidence(results);
    this.cache.set(cacheKey, deduped);
    return deduped;
  }

  findByGuideline(guidelineId: string): Evidence[] {
    const cacheKey = `guideline:${guidelineId}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) as Evidence[];
    const citations = this.citationIndex.findByGuidelineId(guidelineId);
    const evidenceIds = new Set(citations.map((c) => c.evidenceId));
    const results = this.evidence.filter((e) => evidenceIds.has(e.id));
    this.cache.set(cacheKey, results);
    return results;
  }

  findRelatedEvidence(evidenceId: string): Evidence[] {
    const cacheKey = `related:${evidenceId}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) as Evidence[];
    const base = this.evidence.find((e) => e.id === evidenceId);
    if (!base) {
      this.cache.set(cacheKey, []);
      return [];
    }
    const results = this.evidence.filter(
      (e) => e.id !== evidenceId && (e.matchesKeywords(base.keywords) || base.matchesKeywords(e.keywords)),
    );
    const deduped = deduplicateEvidence(results);
    this.cache.set(cacheKey, deduped);
    return deduped;
  }

  rankEvidence(items?: Evidence[]): RatedEvidence[] {
    const toRank = items ?? this.evidence;
    const rated: RatedEvidence[] = [];
    for (const ev of toRank) {
      const rating = this.ratings.get(ev.id);
      if (rating) rated.push(buildRatedEvidence(ev, rating));
    }
    return rankByScore(rated);
  }

  getRating(evidenceId: string): EvidenceRating | undefined {
    return this.ratings.get(evidenceId);
  }

  getById(id: string): Evidence | undefined {
    return this.evidence.find((e) => e.id === id);
  }

  getCitationsForEvidence(evidenceId: string): ClinicalCitation[] {
    return this.citationIndex.findByEvidenceId(evidenceId);
  }

  getCitationsForRule(ruleId: string): ClinicalCitation[] {
    return this.citationIndex.findByRuleId(ruleId);
  }

  getCitationsForGuideline(guidelineId: string): ClinicalCitation[] {
    return this.citationIndex.findByGuidelineId(guidelineId);
  }

  count(): number {
    return this.evidence.length;
  }

  citationCount(): number {
    return this.citationIndex.size();
  }

  clearCache(): void {
    this.cache.clear();
  }
}
