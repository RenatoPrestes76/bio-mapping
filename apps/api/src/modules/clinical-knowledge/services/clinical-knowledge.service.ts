import { Injectable, NotFoundException } from '@nestjs/common';
import { ClinicalKnowledgeCategory, EvidenceLevel, KnowledgeStatus } from '@bio/database';
import { AuditLogService } from '../../../common/audit/audit-log.service.js';
import { PrismaClinicalKnowledgeRepository } from '../repositories/prisma-clinical-knowledge.repository.js';

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
}
