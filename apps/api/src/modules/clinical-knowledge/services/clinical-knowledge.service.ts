import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ClinicalKnowledgeCategory, EvidenceLevel, KnowledgeStatus } from '@bio/database';
import { AuditLogService } from '../../../common/audit/audit-log.service.js';
import { PrismaClinicalKnowledgeRepository } from '../repositories/prisma-clinical-knowledge.repository.js';
import { KnowledgeProvider, KnowledgeSearchResult } from '../providers/knowledge.provider.js';
import { ClinicalRule } from '../entities/clinical-rule.entity.js';
import { ClinicalGuideline } from '../entities/clinical-guideline.entity.js';
import { ClinicalReference } from '../entities/clinical-reference.entity.js';

export interface CreateKnowledgeDto {
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
}

export interface UpdateKnowledgeDto {
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

export interface SearchKnowledgeDto {
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

@Injectable()
export class ClinicalKnowledgeService {
  constructor(
    private readonly repo: PrismaClinicalKnowledgeRepository,
    private readonly audit: AuditLogService,
    @Optional() private readonly provider?: KnowledgeProvider,
  ) {}

  async create(dto: CreateKnowledgeDto, userId?: string) {
    const item = await this.repo.create({ ...dto, createdBy: userId });
    await this.audit.log('KNOWLEDGE_CREATED', { userId, metadata: { id: item.id, title: item.title } });
    return item;
  }

  async update(id: string, dto: UpdateKnowledgeDto, userId?: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Clinical knowledge ${id} not found`);
    const updated = await this.repo.update(id, { ...dto, updatedBy: userId });
    await this.audit.log('KNOWLEDGE_UPDATED', { userId, metadata: { id, version: updated.version } });
    return updated;
  }

  async findById(id: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(`Clinical knowledge ${id} not found`);
    return item;
  }

  async findByCategory(category: ClinicalKnowledgeCategory, tenantId?: string) {
    return this.repo.findByCategory(category, tenantId);
  }

  async findPublished(tenantId?: string) {
    return this.repo.findPublished(tenantId);
  }

  async search(dto: SearchKnowledgeDto) {
    return this.repo.search(dto);
  }

  async delete(id: string, userId?: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Clinical knowledge ${id} not found`);
    await this.repo.delete(id);
    await this.audit.log('KNOWLEDGE_DELETED', { userId, metadata: { id, title: existing.title } });
  }

  // ── Extended Knowledge Provider methods ─────────────────────────────────────

  searchKnowledge(query: string): {
    dbResults: { items: Awaited<ReturnType<typeof this.repo.search>>['items']; total: number };
    providerResults: KnowledgeSearchResult[];
  } | Promise<{
    dbResults: { items: Awaited<ReturnType<typeof this.repo.search>>['items']; total: number };
    providerResults: KnowledgeSearchResult[];
  }> {
    return this.repo.search({ text: query, page: 1, limit: 50 }).then((dbResults) => ({
      dbResults,
      providerResults: this.provider?.search(query) ?? [],
    }));
  }

  async getRecommendations(category: string, condition?: string): Promise<ClinicalRule[]> {
    const rules = this.provider?.findByCategory(category) ?? [];
    if (!condition) return rules;
    return rules.filter((r) => r.matchesCondition(condition));
  }

  async getEvidence(clinicalCode: string) {
    const dbItems = await this.repo.search({ clinicalCode, page: 1, limit: 50 });
    const providerResults = this.provider?.search(clinicalCode) ?? [];
    return { dbItems: dbItems.items, providerResults };
  }

  findGuidelines(tags?: string[]): ClinicalGuideline[] {
    if (!this.provider) return [];
    if (tags && tags.length > 0) {
      const results = this.provider.findByTags(tags);
      return results
        .filter((r) => r.type === 'guideline')
        .map((r) => r.item as ClinicalGuideline);
    }
    return this.provider.getGuidelines();
  }

  findRules(category?: string): ClinicalRule[] {
    if (!this.provider) return [];
    if (category) return this.provider.findByCategory(category);
    return this.provider.getRules();
  }

  findReferences(filters?: { tags?: string[]; language?: string }): ClinicalReference[] {
    if (!this.provider) return [];
    let refs = this.provider.getReferences();
    if (filters?.tags && filters.tags.length > 0) {
      const tagResults = this.provider.findByTags(filters.tags);
      refs = tagResults
        .filter((r) => r.type === 'reference')
        .map((r) => r.item as ClinicalReference);
    }
    if (filters?.language) {
      refs = refs.filter((r) => r.language === filters.language);
    }
    return refs;
  }
}
