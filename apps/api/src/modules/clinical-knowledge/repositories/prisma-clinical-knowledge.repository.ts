import { Injectable } from '@nestjs/common';
import { ClinicalKnowledgeCategory, KnowledgeStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';
import {
  CreateKnowledgeData,
  IClinicalKnowledgeRepository,
  SearchKnowledgeFilters,
  UpdateKnowledgeData,
} from '../interfaces/clinical-knowledge-repository.interface.js';

@Injectable()
export class PrismaClinicalKnowledgeRepository implements IClinicalKnowledgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateKnowledgeData) {
    return this.prisma.clinicalKnowledge.create({
      data: {
        tenantId: data.tenantId,
        category: data.category,
        title: data.title,
        description: data.description,
        clinicalCode: data.clinicalCode,
        source: data.source,
        evidenceLevel: data.evidenceLevel,
        language: data.language ?? 'pt-BR',
        status: data.status ?? KnowledgeStatus.DRAFT,
        tags: data.tags ?? [],
        metadata: data.metadata as object | undefined,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      },
    });
  }

  async update(id: string, data: UpdateKnowledgeData) {
    const current = await this.prisma.clinicalKnowledge.findUniqueOrThrow({ where: { id } });
    return this.prisma.clinicalKnowledge.update({
      where: { id },
      data: {
        ...data,
        metadata: data.metadata as object | undefined,
        version: current.version + 1,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.clinicalKnowledge.findUnique({ where: { id } });
  }

  async findByCategory(category: ClinicalKnowledgeCategory, tenantId?: string) {
    return this.prisma.clinicalKnowledge.findMany({
      where: { category, ...(tenantId ? { tenantId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPublished(tenantId?: string) {
    return this.prisma.clinicalKnowledge.findMany({
      where: { status: KnowledgeStatus.PUBLISHED, ...(tenantId ? { tenantId } : {}) },
      orderBy: { category: 'asc' },
    });
  }

  async search(filters: SearchKnowledgeFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.evidenceLevel ? { evidenceLevel: filters.evidenceLevel } : {}),
      ...(filters.clinicalCode ? { clinicalCode: { contains: filters.clinicalCode, mode: 'insensitive' as const } } : {}),
      ...(filters.source ? { source: { contains: filters.source, mode: 'insensitive' as const } } : {}),
      ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
      ...(filters.text
        ? {
            OR: [
              { title: { contains: filters.text, mode: 'insensitive' as const } },
              { description: { contains: filters.text, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.clinicalKnowledge.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.clinicalKnowledge.count({ where }),
    ]);

    return { items, total };
  }

  async delete(id: string) {
    await this.prisma.clinicalKnowledge.delete({ where: { id } });
  }
}
