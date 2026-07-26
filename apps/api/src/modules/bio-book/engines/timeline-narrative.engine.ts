import { NarrativeEvent } from '../entities/narrative-event.entity.js';
import type { NarrativeEventType, NarrativeSignificance } from '../entities/narrative-event.entity.js';

interface RawClinicalEvent {
  eventType: string;
  date: string | Date;
  severity?: string;
  description?: string;
  biomarkers?: Record<string, number>;
  drugName?: string;
  conditionName?: string;
}

const EVENT_TYPE_MAP: Record<string, NarrativeEventType> = {
  LAB_RESULT: 'LAB_RESULT',
  DIAGNOSIS: 'DIAGNOSIS',
  MEDICATION: 'MEDICATION_START',
  MEDICATION_START: 'MEDICATION_START',
  MEDICATION_CHANGE: 'MEDICATION_CHANGE',
  THERAPEUTIC_CHANGE: 'THERAPEUTIC_CHANGE',
  CONSULTATION: 'CONSULTATION',
  PROCEDURE: 'PROCEDURE',
  HOSPITALIZATION: 'HOSPITALIZATION',
  GENOMIC_EVENT: 'GENOMIC_DISCOVERY',
  CLINICAL_RECOMMENDATION: 'CLINICAL_RECOMMENDATION',
};

const SEVERITY_TO_SIGNIFICANCE: Record<string, NarrativeSignificance> = {
  CRITICAL: 'LANDMARK',
  SEVERE: 'HIGH',
  MODERATE: 'HIGH',
  MILD: 'MEDIUM',
  INFORMATIONAL: 'LOW',
};

export class TimelineNarrativeEngine {
  toNarrativeEvents(patientId: string, rawEvents: RawClinicalEvent[]): NarrativeEvent[] {
    return rawEvents.map((raw, idx) => {
      const narrativeType = EVENT_TYPE_MAP[raw.eventType] ?? 'CONSULTATION';
      const significance = SEVERITY_TO_SIGNIFICANCE[raw.severity ?? 'INFORMATIONAL'] ?? 'LOW';
      const narrativeText = this.buildNarrativeText(raw);

      return new NarrativeEvent({
        patientId,
        eventType: narrativeType,
        date: raw.date,
        narrativeText,
        significance,
        chapterNumber: 1,
        sourceEventId: `raw-${idx}`,
        metadata: { originalType: raw.eventType, severity: raw.severity },
      });
    });
  }

  private buildNarrativeText(raw: RawClinicalEvent): string {
    switch (raw.eventType) {
      case 'DIAGNOSIS':
        return raw.conditionName
          ? `Diagnóstico de ${raw.conditionName} registrado.`
          : (raw.description ?? 'Novo diagnóstico registrado.');
      case 'LAB_RESULT': {
        const markers = raw.biomarkers ? Object.keys(raw.biomarkers).join(', ') : '';
        return markers
          ? `Resultados laboratoriais obtidos: ${markers}.`
          : (raw.description ?? 'Resultado laboratorial registrado.');
      }
      case 'MEDICATION':
      case 'MEDICATION_START':
        return raw.drugName
          ? `Início do uso de ${raw.drugName}.`
          : (raw.description ?? 'Novo medicamento iniciado.');
      case 'MEDICATION_CHANGE':
      case 'THERAPEUTIC_CHANGE':
        return raw.drugName
          ? `Ajuste terapêutico com ${raw.drugName}.`
          : (raw.description ?? 'Ajuste na terapia medicamentosa.');
      case 'CONSULTATION':
        return raw.description ?? 'Consulta médica realizada.';
      case 'PROCEDURE':
        return raw.description ?? 'Procedimento clínico realizado.';
      case 'HOSPITALIZATION':
        return raw.description ?? 'Internação registrada.';
      case 'GENOMIC_EVENT':
        return raw.description ?? 'Dado genômico relevante identificado.';
      case 'CLINICAL_RECOMMENDATION':
        return raw.description ?? 'Recomendação clínica emitida.';
      default:
        return raw.description ?? 'Evento clínico registrado.';
    }
  }

  sortByDate(events: NarrativeEvent[]): NarrativeEvent[] {
    return [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  filterLandmarks(events: NarrativeEvent[]): NarrativeEvent[] {
    return events.filter((e) => e.isLandmark());
  }

  countByType(events: NarrativeEvent[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.eventType] = (counts[e.eventType] ?? 0) + 1;
    }
    return counts;
  }
}
