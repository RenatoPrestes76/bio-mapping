import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class ClinicalNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    enrollmentId: string;
    patientId: string;
    professionalId: string;
    title: string;
    content: string;
    noteType?: string;
    attachments?: Record<string, unknown>[];
    isPrivate?: boolean;
  }) {
    return this.prisma.clinicalNote.create({
      data: data as Parameters<typeof this.prisma.clinicalNote.create>[0]['data'],
      include: { professional: { select: { id: true, userId: true, specialty: true } } },
    });
  }

  async findByEnrollment(enrollmentId: string, includePrivate = false) {
    return this.prisma.clinicalNote.findMany({
      where: { enrollmentId, deletedAt: null, ...(includePrivate ? {} : { isPrivate: false }) },
      include: { professional: { select: { id: true, userId: true, specialty: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.clinicalNote.findMany({
      where: { patientId, deletedAt: null, isPrivate: false },
      include: {
        professional: { select: { id: true, userId: true, specialty: true } },
        enrollment: { select: { id: true, program: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async update(id: string, data: { title?: string; content?: string; noteType?: string; isPrivate?: boolean }) {
    return this.prisma.clinicalNote.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.clinicalNote.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
