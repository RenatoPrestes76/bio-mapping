import { Injectable } from '@nestjs/common';
import { MilestoneStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class MilestoneRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(milestones: Array<{
    enrollmentId: string;
    patientId: string;
    title: string;
    description?: string;
    metric?: string;
    targetValue?: number;
    unit?: string;
    order: number;
    dueDate?: Date;
  }>) {
    return this.prisma.milestone.createManyAndReturn({ data: milestones });
  }

  async findByEnrollment(enrollmentId: string) {
    return this.prisma.milestone.findMany({
      where: { enrollmentId },
      orderBy: { order: 'asc' },
    });
  }

  async findByPatient(patientId: string, status?: MilestoneStatus) {
    return this.prisma.milestone.findMany({
      where: { patientId, ...(status ? { status } : {}) },
      orderBy: [{ status: 'asc' }, { order: 'asc' }],
    });
  }

  async updateProgress(id: string, currentValue: number, status?: MilestoneStatus) {
    return this.prisma.milestone.update({
      where: { id },
      data: {
        currentValue,
        ...(status ? { status } : {}),
        ...(status === MilestoneStatus.ACHIEVED ? { achievedAt: new Date() } : {}),
      },
    });
  }
}
