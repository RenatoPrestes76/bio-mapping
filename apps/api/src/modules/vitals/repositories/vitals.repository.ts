import { Injectable } from '@nestjs/common';
import { VitalRecord, VitalSource, VitalStatus, Prisma } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service';
import { FilterVitalsDto } from '../dto/filter-vitals.dto';

@Injectable()
export class VitalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.VitalRecordCreateInput): Promise<VitalRecord> {
    return this.prisma.vitalRecord.create({ data });
  }

  async findById(id: string): Promise<(VitalRecord & { biomarkers: any[]; history: any[] }) | null> {
    return this.prisma.vitalRecord.findFirst({
      where: { id, deletedAt: null },
      include: {
        biomarkers: { orderBy: { name: 'asc' } },
        history: { orderBy: { changedAt: 'desc' } },
      },
    });
  }

  async findAll(
    patientId: string,
    dto: FilterVitalsDto,
  ): Promise<[VitalRecord[], number]> {
    const where = this.buildWhere(patientId, dto);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const [records, total] = await Promise.all([
      this.prisma.vitalRecord.findMany({
        where,
        include: { biomarkers: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { recordedAt: 'desc' },
      }),
      this.prisma.vitalRecord.count({ where }),
    ]);

    return [records, total];
  }

  async update(
    id: string,
    data: Prisma.VitalRecordUpdateInput,
    historyEntries: Prisma.VitalRecordHistoryCreateManyInput[],
  ): Promise<VitalRecord> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.vitalRecord.update({ where: { id }, data });
      if (historyEntries.length > 0) {
        await tx.vitalRecordHistory.createMany({ data: historyEntries });
      }
      return updated;
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.vitalRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private buildWhere(patientId: string, dto: FilterVitalsDto): Prisma.VitalRecordWhereInput {
    const where: Prisma.VitalRecordWhereInput = { patientId, deletedAt: null };

    if (dto.startDate || dto.endDate) {
      where.recordedAt = {};
      if (dto.startDate) (where.recordedAt as Prisma.DateTimeFilter).gte = new Date(dto.startDate);
      if (dto.endDate) (where.recordedAt as Prisma.DateTimeFilter).lte = new Date(dto.endDate);
    }

    if (dto.professionalId) where.professionalId = dto.professionalId;
    if (dto.source) where.source = dto.source as VitalSource;
    if (dto.status) where.status = dto.status as VitalStatus;

    return where;
  }
}
