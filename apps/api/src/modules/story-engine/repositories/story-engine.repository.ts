import { Injectable } from '@nestjs/common';
import type { BioBookChapter, ChapterShare } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

export interface CreateChapterData {
  userId: string;
  tenantId?: string;
  title: string;
  subtitle?: string;
  chapterType: string;
  coverImage?: string;
  summary?: string;
  startDate: Date;
  endDate?: Date;
  metadata?: Record<string, unknown>;
  createdBy?: string;
}

export interface CreateShareData {
  chapterId: string;
  sharedBy: string;
  sharedWith: string;
  message?: string;
}

@Injectable()
export class StoryEngineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createChapter(data: CreateChapterData): Promise<BioBookChapter> {
    return this.prisma.bioBookChapter.create({ data: data as never });
  }

  async findByUser(userId: string): Promise<BioBookChapter[]> {
    return this.prisma.bioBookChapter.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' },
    });
  }

  async findById(id: string): Promise<BioBookChapter | null> {
    return this.prisma.bioBookChapter.findUnique({ where: { id } });
  }

  async updateChapter(id: string, data: Partial<CreateChapterData>): Promise<BioBookChapter> {
    return this.prisma.bioBookChapter.update({ where: { id }, data: data as never });
  }

  async createShare(data: CreateShareData): Promise<ChapterShare> {
    return this.prisma.chapterShare.create({ data });
  }

  async findSharedWith(userId: string): Promise<ChapterShare[]> {
    return this.prisma.chapterShare.findMany({
      where: { sharedWith: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSharesByChapter(chapterId: string): Promise<ChapterShare[]> {
    return this.prisma.chapterShare.findMany({
      where: { chapterId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
