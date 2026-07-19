import { Injectable } from '@nestjs/common';
import { ClinicalRule } from '../entities/clinical-rule.entity.js';
import { ClinicalGuideline } from '../entities/clinical-guideline.entity.js';
import { ClinicalReference } from '../entities/clinical-reference.entity.js';
import { BUILT_IN_RULES } from '../knowledge/rules.js';
import { BUILT_IN_GUIDELINES } from '../knowledge/guidelines.js';
import { BUILT_IN_REFERENCES } from '../knowledge/references.js';

export type KnowledgeItem = ClinicalRule | ClinicalGuideline | ClinicalReference;

export interface KnowledgeSearchResult {
  type: 'rule' | 'guideline' | 'reference';
  item: KnowledgeItem;
  score: number;
}

@Injectable()
export class KnowledgeProvider {
  private rules: ClinicalRule[] = [];
  private guidelines: ClinicalGuideline[] = [];
  private references: ClinicalReference[] = [];
  private readonly cache = new Map<string, KnowledgeSearchResult[]>();

  constructor() {
    this.loadRules();
  }

  loadRules(): void {
    this.rules = [...BUILT_IN_RULES];
    this.guidelines = [...BUILT_IN_GUIDELINES];
    this.references = [...BUILT_IN_REFERENCES];
    this.cache.clear();
  }

  getRules(): ClinicalRule[] {
    return [...this.rules];
  }

  getGuidelines(): ClinicalGuideline[] {
    return [...this.guidelines];
  }

  getReferences(): ClinicalReference[] {
    return [...this.references];
  }

  search(query: string): KnowledgeSearchResult[] {
    if (!query || !query.trim()) {
      return this.buildAllResults();
    }

    const cacheKey = `search:${query.toLowerCase().trim()}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const results: KnowledgeSearchResult[] = [];

    for (const rule of this.rules) {
      if (rule.matchesCondition(query)) {
        results.push({ type: 'rule', item: rule, score: this.scoreRule(rule, query) });
      }
    }
    for (const guideline of this.guidelines) {
      if (guideline.matchesQuery(query)) {
        results.push({ type: 'guideline', item: guideline, score: this.scoreGuideline(guideline, query) });
      }
    }
    for (const ref of this.references) {
      if (ref.matchesQuery(query)) {
        results.push({ type: 'reference', item: ref, score: this.scoreReference(ref, query) });
      }
    }

    const sorted = results.sort((a, b) => b.score - a.score);
    this.cache.set(cacheKey, sorted);
    return sorted;
  }

  findByCategory(category: string): ClinicalRule[] {
    const cacheKey = `cat:${category.toUpperCase()}`;
    if (this.cache.has(cacheKey)) {
      return (this.cache.get(cacheKey)! as unknown) as ClinicalRule[];
    }

    const result = this.rules.filter(
      (r) => r.category.toUpperCase() === category.toUpperCase(),
    );
    (this.cache as Map<string, unknown>).set(cacheKey, result);
    return result;
  }

  findByTags(tags: string[]): KnowledgeSearchResult[] {
    if (!tags || tags.length === 0) return [];

    const lowerTags = tags.map((t) => t.toLowerCase());
    const results: KnowledgeSearchResult[] = [];

    for (const rule of this.rules) {
      const overlap = rule.tags.filter((t) => lowerTags.includes(t.toLowerCase())).length;
      if (overlap > 0) results.push({ type: 'rule', item: rule, score: overlap });
    }
    for (const guideline of this.guidelines) {
      const overlap = guideline.tags.filter((t) => lowerTags.includes(t.toLowerCase())).length;
      if (overlap > 0) results.push({ type: 'guideline', item: guideline, score: overlap });
    }
    for (const ref of this.references) {
      const overlap = ref.tags.filter((t) => lowerTags.includes(t.toLowerCase())).length;
      if (overlap > 0) results.push({ type: 'reference', item: ref, score: overlap });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  findRelated(id: string, type: 'rule' | 'guideline' | 'reference'): KnowledgeSearchResult[] {
    let targetTags: string[] = [];
    let targetCategory: string | undefined;

    if (type === 'rule') {
      const rule = this.rules.find((r) => r.id === id);
      if (!rule) return [];
      targetTags = rule.tags;
      targetCategory = rule.category;
    } else if (type === 'guideline') {
      const guideline = this.guidelines.find((g) => g.id === id);
      if (!guideline) return [];
      targetTags = guideline.tags;
    } else {
      const ref = this.references.find((r) => r.id === id);
      if (!ref) return [];
      targetTags = ref.tags;
    }

    const results = this.findByTags(targetTags);

    if (targetCategory) {
      for (const r of this.rules) {
        if (r.id !== id && r.category === targetCategory && !results.find((res) => res.item === r)) {
          results.push({ type: 'rule', item: r, score: 0.5 });
        }
      }
    }

    return results.filter((r) => r.item !== this.findById(id, type)).slice(0, 10);
  }

  private findById(id: string, type: 'rule' | 'guideline' | 'reference'): KnowledgeItem | undefined {
    if (type === 'rule') return this.rules.find((r) => r.id === id);
    if (type === 'guideline') return this.guidelines.find((g) => g.id === id);
    return this.references.find((r) => r.id === id);
  }

  private buildAllResults(): KnowledgeSearchResult[] {
    return [
      ...this.rules.map((r) => ({ type: 'rule' as const, item: r, score: 1 })),
      ...this.guidelines.map((g) => ({ type: 'guideline' as const, item: g, score: 1 })),
      ...this.references.map((r) => ({ type: 'reference' as const, item: r, score: 1 })),
    ];
  }

  private scoreRule(rule: ClinicalRule, query: string): number {
    const q = query.toLowerCase();
    let score = rule.priority === 1 ? 3 : rule.priority === 2 ? 2 : 1;
    if (rule.condition.toLowerCase().includes(q)) score += 2;
    if (rule.recommendation.toLowerCase().includes(q)) score += 1;
    const evidenceBoost: Record<string, number> = { A: 2, B: 1.5, C: 1, D: 0.5, EXPERT_OPINION: 0.3 };
    score += evidenceBoost[rule.evidenceLevel] ?? 0;
    return score;
  }

  private scoreGuideline(guideline: ClinicalGuideline, query: string): number {
    const q = query.toLowerCase();
    let score = 1;
    if (guideline.title.toLowerCase().includes(q)) score += 3;
    if (guideline.organization.toLowerCase().includes(q)) score += 1;
    const tagMatches = guideline.tags.filter((t) => t.toLowerCase().includes(q)).length;
    score += tagMatches;
    return score;
  }

  private scoreReference(ref: ClinicalReference, query: string): number {
    const q = query.toLowerCase();
    let score = ref.confidence * 2;
    if (ref.title.toLowerCase().includes(q)) score += 3;
    if (ref.description.toLowerCase().includes(q)) score += 1;
    const tagMatches = ref.tags.filter((t) => t.toLowerCase().includes(q)).length;
    score += tagMatches;
    return score;
  }
}
