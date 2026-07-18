import { Injectable } from '@nestjs/common';
import { PatientTimelineEvent } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';
import {
  CreateTimelineEventData,
  IPatientTimelineRepository,
  TimelineEventFilters,
} from '../interfaces/patient-timeline-repository.interface.js';

@Injectable()
export class PrismaPatientTimelineRepository implements IPatientTimelineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTimelineEventData): Promise<PatientTimelineEvent> {
    return this.prisma.patientTimelineEvent.create({
      data: {
        patientId: data.patientId,
        tenantId: data.tenantId,
        eventType: data.eventType,
        severity: data.severity,
        title: data.title,
        description: data.description,
        sourceId: data.sourceId,
        sourceTable: data.sourceTable,
        metadata: data.metadata as object | undefined,
        occurredAt: data.occurredAt ?? new Date(),
        createdBy: data.createdBy,
      },
    });
  }

  async findByPatient(filters: TimelineEventFilters): Promise<PatientTimelineEvent[]> {
    const { patientId, eventType, severity, from, to, limit = 50, offset = 0 } = filters;
    return this.prisma.patientTimelineEvent.findMany({
      where: {
        patientId,
        ...(eventType && { eventType }),
        ...(severity && { severity }),
        ...((from || to) && {
          occurredAt: {
            ...(from && { gte: from }),
            ...(to && { lte: to }),
          },
        }),
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async countByPatient(patientId: string): Promise<number> {
    return this.prisma.patientTimelineEvent.count({ where: { patientId } });
  }
}
