import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { Prisma } from '@bio/database';
import { FilterAssessmentsDto } from '../dto/filter-assessments.dto';

const ASSESSMENT_INCLUDE = {
  template: true,
  answers: true,
} satisfies Prisma.AssessmentInclude;

@Injectable()
export class AssessmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AssessmentCreateInput) {
    return this.prisma.assessment.create({ data, include: ASSESSMENT_INCLUDE });
  }

  async findAll(patientId: string, dto: FilterAssessmentsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AssessmentWhereInput = { patientId, deletedAt: null };
    if (dto.status) where.status = dto.status;
    if (dto.professionalId) where.professionalId = dto.professionalId;
    if (dto.organizationId) where.organizationId = dto.organizationId;
    if (dto.from || dto.to) {
      where.performedAt = {
        ...(dto.from && { gte: new Date(dto.from) }),
        ...(dto.to && { lte: new Date(dto.to) }),
      };
    }
    if (dto.category) {
      where.template = { category: dto.category };
    }

    return this.prisma.$transaction([
      this.prisma.assessment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { performedAt: 'desc' },
        include: ASSESSMENT_INCLUDE,
      }),
      this.prisma.assessment.count({ where }),
    ]);
  }

  async findAllFiltered(dto: FilterAssessmentsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AssessmentWhereInput = { deletedAt: null };
    if (dto.patientId) where.patientId = dto.patientId;
    if (dto.professionalId) where.professionalId = dto.professionalId;
    if (dto.organizationId) where.organizationId = dto.organizationId;
    if (dto.status) where.status = dto.status;
    if (dto.from || dto.to) {
      where.performedAt = {
        ...(dto.from && { gte: new Date(dto.from) }),
        ...(dto.to && { lte: new Date(dto.to) }),
      };
    }
    if (dto.category) {
      where.template = { category: dto.category };
    }

    return this.prisma.$transaction([
      this.prisma.assessment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: ASSESSMENT_INCLUDE,
      }),
      this.prisma.assessment.count({ where }),
    ]);
  }

  async findById(id: string) {
    return this.prisma.assessment.findFirst({
      where: { id, deletedAt: null },
      include: {
        template: {
          include: { sections: { include: { fields: true } } },
        },
        answers: true,
        evidence: true,
        history: { orderBy: { changedAt: 'desc' } },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.AssessmentUpdateInput,
    historyEntries: Prisma.AssessmentHistoryCreateManyInput[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.assessment.update({ where: { id }, data, include: ASSESSMENT_INCLUDE });
      if (historyEntries.length > 0) {
        await tx.assessmentHistory.createMany({ data: historyEntries });
      }
      return updated;
    });
  }

  async upsertAnswers(assessmentId: string, answers: Array<{ fieldId: string; value?: string | null; score?: number | null; comment?: string | null }>) {
    return this.prisma.$transaction(
      answers.map((a) =>
        this.prisma.assessmentAnswer.upsert({
          where: { assessmentId_fieldId: { assessmentId, fieldId: a.fieldId } },
          create: { assessmentId, fieldId: a.fieldId, value: a.value ?? null, score: a.score ?? null, comment: a.comment ?? null },
          update: { value: a.value ?? null, score: a.score ?? null, comment: a.comment ?? null },
        }),
      ),
    );
  }

  async softDelete(id: string) {
    return this.prisma.assessment.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
