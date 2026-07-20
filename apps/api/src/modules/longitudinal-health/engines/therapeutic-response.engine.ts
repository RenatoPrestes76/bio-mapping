import type { ClinicalEvent } from '../entities/clinical-event.entity.js';
import type { TherapeuticResponse, TherapeuticResponseType } from '../entities/health-timeline.entity.js';

export interface DrugResponseWindow {
  drug: string;
  startDate: Date;
  endDate: Date;
  beforeEvents: ClinicalEvent[];
  afterEvents: ClinicalEvent[];
}

function snapshotBiomarkers(events: ClinicalEvent[]): Record<string, number> {
  const snap: Record<string, number> = {};
  for (const event of events) {
    for (const bv of event.getBiomarkers()) {
      const key = bv.marker.toLowerCase();
      if (snap[key] === undefined) snap[key] = bv.value;
    }
  }
  return snap;
}

function assessResponse(
  before: Record<string, number>,
  after: Record<string, number>,
): TherapeuticResponseType {
  const markers = Object.keys({ ...before, ...after });
  if (markers.length === 0) return 'UNKNOWN';

  let improvedCount = 0;
  let worsenedCount = 0;
  let unchangedCount = 0;

  for (const m of markers) {
    const b = before[m];
    const a = after[m];
    if (b === undefined || a === undefined) continue;
    const pct = Math.abs((a - b) / (b || 1));
    if (pct < 0.05) { unchangedCount++; continue; }
    if (a < b) improvedCount++;
    else worsenedCount++;
  }

  const total = improvedCount + worsenedCount + unchangedCount;
  if (total === 0) return 'UNKNOWN';

  const improvedRatio = improvedCount / total;
  const worsenedRatio = worsenedCount / total;

  if (improvedRatio >= 0.7) return 'EXCELLENT';
  if (improvedRatio >= 0.4 && worsenedRatio < 0.3) return 'PARTIAL';
  if (worsenedRatio >= 0.4) return 'NONE';
  return 'INCONSISTENT';
}

export class TherapeuticResponseEngine {
  analyzeResponse(
    drug: string,
    startDate: Date,
    events: ClinicalEvent[],
    windowDays = 90,
  ): TherapeuticResponse | null {
    const endDate = new Date(startDate.getTime() + windowDays * 86_400_000);
    const lookback = new Date(startDate.getTime() - windowDays * 86_400_000);

    const beforeEvents = events.filter((e) => e.date >= lookback && e.date < startDate);
    const afterEvents = events.filter((e) => e.date > startDate && e.date <= endDate);

    if (beforeEvents.length === 0 && afterEvents.length === 0) return null;

    const biomarkersBefore = snapshotBiomarkers(beforeEvents);
    const biomarkersAfter = snapshotBiomarkers(afterEvents);
    const responseType = assessResponse(biomarkersBefore, biomarkersAfter);

    return {
      drug,
      startDate,
      responseType,
      biomarkersBefore,
      biomarkersAfter,
      evaluationPeriodDays: windowDays,
      notes: `Evaluated ${beforeEvents.length} pre-treatment and ${afterEvents.length} post-treatment events.`,
    };
  }

  analyzeAllMedications(events: ClinicalEvent[]): TherapeuticResponse[] {
    const responses: TherapeuticResponse[] = [];
    const medicationEvents = events.filter((e) => e.eventType === 'MEDICATION');

    for (const me of medicationEvents) {
      const drug = me.metadata.drugName ?? 'unknown';
      if (drug === 'unknown') continue;
      const response = this.analyzeResponse(drug, me.date, events);
      if (response) responses.push(response);
    }

    return responses;
  }

  aggregateByDrug(responses: TherapeuticResponse[]): Map<string, TherapeuticResponseType> {
    const map = new Map<string, TherapeuticResponseType>();
    for (const r of responses) {
      if (!map.has(r.drug) || r.responseType === 'EXCELLENT') {
        map.set(r.drug, r.responseType);
      }
    }
    return map;
  }
}
