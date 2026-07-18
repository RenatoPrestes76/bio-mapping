import { PatientTimelineEvent, TimelineEventSeverity, TimelineEventType } from '@bio/database';

export interface CreateTimelineEventData {
  patientId: string;
  tenantId?: string;
  eventType: TimelineEventType;
  severity?: TimelineEventSeverity;
  title: string;
  description?: string;
  sourceId?: string;
  sourceTable?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
  createdBy?: string;
}

export interface TimelineEventFilters {
  patientId: string;
  eventType?: TimelineEventType;
  severity?: TimelineEventSeverity;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface IPatientTimelineRepository {
  create(data: CreateTimelineEventData): Promise<PatientTimelineEvent>;
  findByPatient(filters: TimelineEventFilters): Promise<PatientTimelineEvent[]>;
  countByPatient(patientId: string): Promise<number>;
}
