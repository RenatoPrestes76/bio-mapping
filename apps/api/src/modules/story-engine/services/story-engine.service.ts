import { Injectable, NotFoundException } from '@nestjs/common';
import type { BioBookChapter, ChapterShare } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';
import { AuditLogService } from '../../../common/audit/audit-log.service.js';
import { StoryEngineRepository, type CreateChapterData } from '../repositories/story-engine.repository.js';
import { generateChapters, computeGenerationKey, type ChapterCandidate } from '../generators/chapter-generator.js';
import type { UpdateChapterDto } from '../dto/update-chapter.dto.js';
import type { ShareChapterDto } from '../dto/share-chapter.dto.js';

export interface StoryTimelineEntry {
  chapter: BioBookChapter;
  events: Array<{
    id: string;
    eventType: string;
    severity: string;
    title: string;
    description: string | null;
    occurredAt: Date;
    sourceTable: string | null;
  }>;
}

@Injectable()
export class StoryEngineService {
  constructor(
    private readonly repository: StoryEngineRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async generate(userId: string, createdBy?: string): Promise<BioBookChapter[]> {
    const [decisions, pathways, events, trends] = await Promise.all([
      this.prisma.clinicalDecision.findMany({
        where: { patientId: userId },
        select: { id: true, priority: true, status: true, createdAt: true, ruleId: true },
      }),
      this.prisma.clinicalPathway.findMany({
        where: { patientId: userId },
        select: { id: true, status: true, title: true, createdAt: true, completedAt: true },
      }),
      this.prisma.patientTimelineEvent.findMany({
        where: { patientId: userId },
        select: { id: true, eventType: true, severity: true, title: true, occurredAt: true },
      }),
      this.prisma.clinicalTrend.findMany({
        where: { patientId: userId, status: 'ACTIVE' },
        select: { id: true, metric: true, trendType: true, direction: true, startDate: true, endDate: true, summary: true },
      }),
    ]);

    const candidates = generateChapters({
      userId,
      decisions: decisions.map((d) => ({
        id: d.id,
        priority: d.priority,
        status: d.status,
        createdAt: d.createdAt,
        ruleId: d.ruleId,
      })),
      pathways: pathways.map((p) => ({
        id: p.id,
        status: p.status,
        title: p.title,
        createdAt: p.createdAt,
        completedAt: p.completedAt,
      })),
      timelineEvents: events.map((e) => ({
        id: e.id,
        eventType: String(e.eventType),
        severity: String(e.severity),
        title: e.title,
        occurredAt: e.occurredAt,
      })),
      trends: trends.map((t) => ({
        id: t.id,
        metric: t.metric,
        trendType: String(t.trendType),
        direction: String(t.direction),
        startDate: t.startDate,
        endDate: t.endDate,
        summary: t.summary,
      })),
    });

    const existing = await this.repository.findByUser(userId);
    const existingKeys = new Set<string>(
      existing
        .filter((c) => c.metadata && (c.metadata as Record<string, unknown>).generationKey)
        .map((c) => (c.metadata as Record<string, unknown>).generationKey as string),
    );

    const toCreate = candidates.filter((c: ChapterCandidate) => !existingKeys.has(computeGenerationKey(c)));

    const created = await Promise.all(
      toCreate.map((c: ChapterCandidate) =>
        this.repository.createChapter({
          userId: c.userId,
          title: c.title,
          subtitle: c.subtitle,
          chapterType: c.chapterType,
          summary: c.summary,
          startDate: c.startDate,
          endDate: c.endDate,
          metadata: { ...c.metadata, generationKey: computeGenerationKey(c) },
          createdBy,
        } as CreateChapterData),
      ),
    );

    await this.audit.log('CHAPTER_GENERATED', {
      userId: createdBy,
      metadata: { userId, count: created.length },
    });

    return created;
  }

  async getTimeline(userId: string): Promise<StoryTimelineEntry[]> {
    const chapters = await this.repository.findByUser(userId);
    if (chapters.length === 0) return [];

    const events = await this.prisma.patientTimelineEvent.findMany({
      where: { patientId: userId },
      orderBy: { occurredAt: 'asc' },
      select: { id: true, eventType: true, severity: true, title: true, description: true, occurredAt: true, sourceTable: true },
    });

    return chapters.map((chapter) => ({
      chapter,
      events: events
        .filter(
          (e) =>
            e.occurredAt >= chapter.startDate &&
            (!chapter.endDate || e.occurredAt <= chapter.endDate),
        )
        .map((e) => ({
          id: e.id,
          eventType: String(e.eventType),
          severity: String(e.severity),
          title: e.title,
          description: e.description,
          occurredAt: e.occurredAt,
          sourceTable: e.sourceTable,
        })),
    }));
  }

  async findByUser(userId: string): Promise<BioBookChapter[]> {
    return this.repository.findByUser(userId);
  }

  async findById(id: string): Promise<BioBookChapter> {
    const chapter = await this.repository.findById(id);
    if (!chapter) throw new NotFoundException(`Chapter ${id} not found`);
    return chapter;
  }

  async update(id: string, dto: UpdateChapterDto, userId?: string): Promise<BioBookChapter> {
    await this.findById(id);
    const updated = await this.repository.updateChapter(id, dto);
    await this.audit.log('CHAPTER_UPDATED', { userId, metadata: { chapterId: id } });
    return updated;
  }

  async share(id: string, dto: ShareChapterDto, sharedBy: string): Promise<ChapterShare> {
    await this.findById(id);
    const share = await this.repository.createShare({
      chapterId: id,
      sharedBy,
      sharedWith: dto.sharedWith,
      message: dto.message,
    });
    await this.audit.log('CHAPTER_SHARED', {
      userId: sharedBy,
      metadata: { chapterId: id, sharedWith: dto.sharedWith },
    });
    return share;
  }

  async findSharedWith(userId: string): Promise<ChapterShare[]> {
    return this.repository.findSharedWith(userId);
  }
}
