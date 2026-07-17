import { Injectable } from '@nestjs/common';
import { EnrollmentStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class EnrollmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    programId: string;
    patientId: string;
    professionalId?: string;
    startDate: Date;
    expectedEndDate?: Date;
    notes?: string;
  }) {
    return this.prisma.programEnrollment.create({
      data,
      include: { program: { include: { phases: true } }, milestones: true },
    });
  }

  async findByPatient(patientId: string, status?: EnrollmentStatus) {
    return this.prisma.programEnrollment.findMany({
      where: { patientId, ...(status ? { status } : {}) },
      include: {
        program: { select: { id: true, name: true, category: true, durationDays: true } },
        milestones: { orderBy: { order: 'asc' } },
        _count: { select: { tasks: true, clinicalNotes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.programEnrollment.findUnique({
      where: { id },
      include: {
        program: { include: { phases: { orderBy: { order: 'asc' } } } },
        patient: { select: { id: true, userId: true } },
        professional: { select: { id: true, userId: true, specialty: true } },
        milestones: { orderBy: { order: 'asc' } },
        clinicalNotes: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
  }

  async findActive() {
    return this.prisma.programEnrollment.findMany({
      where: { status: EnrollmentStatus.ACTIVE },
      select: { id: true, patientId: true, programId: true, currentPhase: true, startDate: true },
    });
  }

  async update(id: string, data: Partial<{
    status: EnrollmentStatus;
    currentPhase: number;
    progressPct: number;
    adherencePct: number;
    completedAt: Date;
    pausedAt: Date;
    cancelledAt: Date;
    notes: string;
  }>) {
    return this.prisma.programEnrollment.update({ where: { id }, data });
  }
}
