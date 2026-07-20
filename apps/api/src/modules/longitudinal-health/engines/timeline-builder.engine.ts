import { ClinicalEvent } from '../entities/clinical-event.entity.js';
import type { CreateClinicalEventDto } from '../dto/longitudinal-health.dto.js';

export class TimelineBuilderEngine {
  buildEvents(patientId: string, dtos: CreateClinicalEventDto[]): ClinicalEvent[] {
    return dtos.map(
      (dto) =>
        new ClinicalEvent({
          patientId,
          eventType: dto.eventType,
          source: dto.source,
          date: new Date(dto.date),
          severity: dto.severity,
          metadata: dto.metadata,
        }),
    );
  }

  sortChronologically(events: ClinicalEvent[]): ClinicalEvent[] {
    return [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  filterByPeriod(events: ClinicalEvent[], start: Date, end: Date): ClinicalEvent[] {
    return events.filter((e) => e.date >= start && e.date <= end);
  }

  filterByType(events: ClinicalEvent[], types: ClinicalEvent['eventType'][]): ClinicalEvent[] {
    const set = new Set(types);
    return events.filter((e) => set.has(e.eventType));
  }

  computeDateRange(events: ClinicalEvent[]): { start: Date; end: Date } {
    if (events.length === 0) {
      const now = new Date();
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return { start: yearAgo, end: now };
    }
    const dates = events.map((e) => e.date.getTime());
    return { start: new Date(Math.min(...dates)), end: new Date(Math.max(...dates)) };
  }

  mergeEventLists(existing: ClinicalEvent[], incoming: ClinicalEvent[]): ClinicalEvent[] {
    const ids = new Set(existing.map((e) => e.id));
    const merged = [...existing];
    for (const e of incoming) {
      if (!ids.has(e.id)) merged.push(e);
    }
    return this.sortChronologically(merged);
  }

  groupByMonth(events: ClinicalEvent[]): Map<string, ClinicalEvent[]> {
    const groups = new Map<string, ClinicalEvent[]>();
    for (const e of events) {
      const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    return groups;
  }

  countByType(events: ClinicalEvent[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.eventType] = (counts[e.eventType] ?? 0) + 1;
    }
    return counts;
  }
}
