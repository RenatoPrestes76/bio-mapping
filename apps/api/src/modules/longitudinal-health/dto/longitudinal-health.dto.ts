import type { ClinicalEventType, EventSeverity, EventSource, BiomarkerValue } from '../entities/clinical-event.entity.js';

export interface CreateClinicalEventDto {
  eventType: ClinicalEventType;
  source?: EventSource;
  date: string;
  severity?: EventSeverity;
  metadata?: {
    description?: string;
    provider?: string;
    facility?: string;
    icdCode?: string;
    drugName?: string;
    dosage?: string;
    biomarkers?: BiomarkerValue[];
    conditionName?: string;
    stage?: string;
    responseType?: string;
    [key: string]: unknown;
  };
}

export class AnalyzeLongitudinalDto {
  patientId: string = '';
  events: CreateClinicalEventDto[] = [];
  period?: { start: string; end: string };
  biomarkersToTrack?: string[];
  diseasesToTrack?: string[];
  includeRiskEvolution?: boolean = true;
}

export class GetTimelineDto {
  periodDays?: number = 365;
}
