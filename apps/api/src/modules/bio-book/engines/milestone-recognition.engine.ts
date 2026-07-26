import { HealthMilestone } from '../entities/health-milestone.entity.js';
import type { MilestoneRank } from '../entities/health-milestone.entity.js';
import type { NarrativeEvent } from '../entities/narrative-event.entity.js';

const BIOMARKER_IMPROVEMENT_THRESHOLDS: Record<
  string,
  { lowerIsBetter: boolean; significant: number; landmark: number }
> = {
  hba1c: { lowerIsBetter: true, significant: 5, landmark: 15 },
  glucose: { lowerIsBetter: true, significant: 10, landmark: 20 },
  ldl: { lowerIsBetter: true, significant: 10, landmark: 25 },
  hdl: { lowerIsBetter: false, significant: 10, landmark: 20 },
  triglycerides: { lowerIsBetter: true, significant: 15, landmark: 30 },
  bp_systolic: { lowerIsBetter: true, significant: 5, landmark: 15 },
  creatinine: { lowerIsBetter: true, significant: 10, landmark: 25 },
};

export class MilestoneRecognitionEngine {
  recognize(patientId: string, events: NarrativeEvent[]): HealthMilestone[] {
    const milestones: HealthMilestone[] = [];
    const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());

    const firstRecordMs = this.detectFirstRecord(patientId, sorted);
    if (firstRecordMs) milestones.push(firstRecordMs);

    const biomarkerMs = this.detectBiomarkerImprovements(patientId, sorted);
    milestones.push(...biomarkerMs);

    const hospitalizationMs = this.detectRecovery(patientId, sorted);
    milestones.push(...hospitalizationMs);

    const consistencyMs = this.detectConsistency(patientId, sorted);
    if (consistencyMs) milestones.push(consistencyMs);

    const diagnosticMs = this.detectDiagnosticInsight(patientId, sorted);
    milestones.push(...diagnosticMs);

    return milestones.sort((a, b) => a.achievedAt.getTime() - b.achievedAt.getTime());
  }

  private detectFirstRecord(patientId: string, events: NarrativeEvent[]): HealthMilestone | null {
    if (!events.length) return null;
    return new HealthMilestone({
      patientId,
      milestoneType: 'FIRST_RECORD',
      title: 'Início da Jornada de Saúde',
      description: 'Primeiro registro clínico marcando o início do acompanhamento de saúde.',
      achievedAt: events[0].date,
      rank: 'MINOR',
    });
  }

  private detectBiomarkerImprovements(patientId: string, events: NarrativeEvent[]): HealthMilestone[] {
    const milestones: HealthMilestone[] = [];
    const labEvents = events.filter((e) => e.eventType === 'LAB_RESULT');

    const biomarkerValues: Record<string, Array<{ value: number; date: Date }>> = {};
    for (const evt of labEvents) {
      const markers = evt.metadata['biomarkers'] as Record<string, number> | undefined;
      if (!markers) continue;
      for (const [marker, value] of Object.entries(markers)) {
        if (!biomarkerValues[marker]) biomarkerValues[marker] = [];
        biomarkerValues[marker].push({ value, date: evt.date });
      }
    }

    for (const [marker, readings] of Object.entries(biomarkerValues)) {
      if (readings.length < 2) continue;
      const config = BIOMARKER_IMPROVEMENT_THRESHOLDS[marker];
      if (!config) continue;

      const first = readings[0];
      const last = readings[readings.length - 1];
      const percentChange = ((first.value - last.value) / Math.abs(first.value)) * 100;
      const improved = config.lowerIsBetter ? percentChange > 0 : percentChange < 0;
      const absChange = Math.abs(percentChange);

      if (!improved || absChange < config.significant) continue;

      const rank: MilestoneRank = absChange >= config.landmark ? 'LANDMARK' : 'MAJOR';
      milestones.push(
        new HealthMilestone({
          patientId,
          milestoneType: 'BIOMARKER_IMPROVEMENT',
          title: `Melhora significativa em ${marker.toUpperCase()}`,
          description: `${marker.toUpperCase()} ${config.lowerIsBetter ? 'reduziu' : 'aumentou'} ${absChange.toFixed(1)}% ao longo do acompanhamento.`,
          achievedAt: last.date,
          rank,
          metric: marker,
          fromValue: first.value,
          toValue: last.value,
        }),
      );
    }
    return milestones;
  }

  private detectRecovery(patientId: string, events: NarrativeEvent[]): HealthMilestone[] {
    const milestones: HealthMilestone[] = [];
    const hospitalizations = events.filter((e) => e.eventType === 'HOSPITALIZATION');

    for (const h of hospitalizations) {
      const afterDate = new Date(h.date.getTime() + 30 * 86_400_000);
      const postEvents = events.filter((e) => e.date > h.date && e.date <= afterDate);
      if (postEvents.length >= 1) {
        milestones.push(
          new HealthMilestone({
            patientId,
            milestoneType: 'RECOVERY_MILESTONE',
            title: 'Recuperação Registrada',
            description: 'Retomada do acompanhamento ambulatorial após internação.',
            achievedAt: postEvents[0].date,
            rank: 'MAJOR',
          }),
        );
      }
    }
    return milestones;
  }

  private detectConsistency(patientId: string, events: NarrativeEvent[]): HealthMilestone | null {
    if (events.length < 6) return null;
    const months = new Set<string>();
    for (const e of events) {
      months.add(`${e.date.getUTCFullYear()}-${e.date.getUTCMonth()}`);
    }
    if (months.size < 3) return null;
    return new HealthMilestone({
      patientId,
      milestoneType: 'HABIT_CONSISTENCY',
      title: 'Consistência no Acompanhamento',
      description: `${months.size} meses consecutivos com registros clínicos.`,
      achievedAt: events[events.length - 1].date,
      rank: months.size >= 6 ? 'LANDMARK' : 'MAJOR',
    });
  }

  private detectDiagnosticInsight(patientId: string, events: NarrativeEvent[]): HealthMilestone[] {
    const milestones: HealthMilestone[] = [];
    const genomic = events.filter((e) => e.eventType === 'GENOMIC_DISCOVERY');
    for (const g of genomic) {
      milestones.push(
        new HealthMilestone({
          patientId,
          milestoneType: 'DIAGNOSTIC_INSIGHT',
          title: 'Descoberta Genômica Relevante',
          description: 'Dado genômico identificado com impacto na condução clínica personalizada.',
          achievedAt: g.date,
          rank: 'MAJOR',
        }),
      );
    }
    return milestones;
  }
}
