import { NarrativeChapter } from '../entities/narrative-chapter.entity.js';
import type { ChapterTheme } from '../entities/narrative-chapter.entity.js';
import type { NarrativeEvent } from '../entities/narrative-event.entity.js';
import type { HealthMilestone } from '../entities/health-milestone.entity.js';

interface ChapterSegment {
  events: NarrativeEvent[];
  milestones: HealthMilestone[];
  start: Date;
  end: Date;
}

export class ChapterBuilderEngine {
  build(events: NarrativeEvent[], milestones: HealthMilestone[]): NarrativeChapter[] {
    if (!events.length) return [];
    const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
    const segments = this.segmentIntoChapters(sorted, milestones);
    return segments.map((seg, idx) => this.buildChapter(idx + 1, seg));
  }

  private segmentIntoChapters(events: NarrativeEvent[], milestones: HealthMilestone[]): ChapterSegment[] {
    if (!events.length) return [];

    const breakpoints = this.findBreakpoints(events);
    const segments: ChapterSegment[] = [];
    let startIdx = 0;

    for (const breakIdx of breakpoints) {
      const chunk = events.slice(startIdx, breakIdx + 1);
      if (chunk.length) {
        segments.push(this.makeSegment(chunk, milestones));
      }
      startIdx = breakIdx + 1;
    }

    const tail = events.slice(startIdx);
    if (tail.length) segments.push(this.makeSegment(tail, milestones));

    return segments.length ? segments : [this.makeSegment(events, milestones)];
  }

  private findBreakpoints(events: NarrativeEvent[]): number[] {
    const breakpoints: number[] = [];
    // Break at landmark events or 90-day gaps
    for (let i = 1; i < events.length; i++) {
      const gapDays = (events[i].date.getTime() - events[i - 1].date.getTime()) / 86_400_000;
      if (gapDays > 90 || events[i].isLandmark()) {
        breakpoints.push(i - 1);
      }
    }
    // Max 5 chapters: take only the largest gaps if too many
    if (breakpoints.length > 4) {
      const gapSizes = breakpoints.map((bp) => {
        const gapDays = (events[bp + 1].date.getTime() - events[bp].date.getTime()) / 86_400_000;
        return { bp, gapDays };
      });
      gapSizes.sort((a, b) => b.gapDays - a.gapDays);
      const kept = gapSizes.slice(0, 4).map((g) => g.bp).sort((a, b) => a - b);
      return kept;
    }
    return breakpoints;
  }

  private makeSegment(events: NarrativeEvent[], allMilestones: HealthMilestone[]): ChapterSegment {
    const start = events[0].date;
    const end = events[events.length - 1].date;
    const milestones = allMilestones.filter((m) => m.achievedAt >= start && m.achievedAt <= end);
    return { events, milestones, start, end };
  }

  private buildChapter(number: number, seg: ChapterSegment): NarrativeChapter {
    const theme = this.classifyTheme(number, seg);
    const summary = this.buildSummary(seg);
    const keyInsight = this.buildKeyInsight(seg);
    const highlights = this.buildHighlights(seg);

    const chapter = new NarrativeChapter({
      number,
      theme,
      startDate: seg.start,
      endDate: seg.end,
      events: seg.events.map((e) => {
        Object.defineProperty(e, 'chapterNumber', { value: number, writable: false, configurable: true });
        return e;
      }),
      milestones: seg.milestones,
      summary,
      keyInsight,
      highlights,
    });
    return chapter;
  }

  private classifyTheme(chapterNumber: number, seg: ChapterSegment): ChapterTheme {
    const { events } = seg;
    if (chapterNumber === 1) return 'INITIAL_BASELINE';

    const hasHospitalization = events.some((e) => e.eventType === 'HOSPITALIZATION');
    if (hasHospitalization) return 'RECOVERY';

    const hasGenomic = events.some((e) => e.eventType === 'GENOMIC_DISCOVERY');
    if (hasGenomic) return 'LONGEVITY';

    const diagnosisCount = events.filter((e) => e.eventType === 'DIAGNOSIS').length;
    const medicationCount = events.filter(
      (e) => e.eventType === 'MEDICATION_START' || e.eventType === 'THERAPEUTIC_CHANGE',
    ).length;

    if (diagnosisCount > 0 && medicationCount > 0) return 'METABOLIC_CHANGE';
    if (medicationCount > 0) return 'OPTIMIZATION';

    const landmarkCount = events.filter((e) => e.isLandmark()).length;
    if (landmarkCount > 0) return 'EVOLUTION_PERFORMANCE';

    const significantCount = events.filter((e) => e.isSignificant()).length;
    const ratio = significantCount / events.length;
    if (ratio < 0.2) return 'STABILITY';

    return 'OPTIMIZATION';
  }

  private buildSummary(seg: ChapterSegment): string {
    const parts: string[] = [];
    const { events, milestones } = seg;
    const durationDays = Math.ceil((seg.end.getTime() - seg.start.getTime()) / 86_400_000);

    parts.push(`Período de ${durationDays} dias com ${events.length} evento(s) registrado(s).`);

    const diagnoses = events.filter((e) => e.eventType === 'DIAGNOSIS');
    if (diagnoses.length) parts.push(`${diagnoses.length} diagnóstico(s) registrado(s).`);

    const meds = events.filter((e) => e.eventType === 'MEDICATION_START' || e.eventType === 'THERAPEUTIC_CHANGE');
    if (meds.length) parts.push(`${meds.length} ajuste(s) terapêutico(s) realizados.`);

    if (milestones.length) parts.push(`${milestones.length} marco(s) de saúde alcançado(s).`);

    return parts.join(' ');
  }

  private buildKeyInsight(seg: ChapterSegment): string {
    const significant = seg.events.filter((e) => e.isSignificant());
    if (!significant.length) return 'Período de acompanhamento clínico regular.';

    const landmark = seg.events.find((e) => e.isLandmark());
    if (landmark) return landmark.narrativeText;

    return significant[0].narrativeText;
  }

  private buildHighlights(seg: ChapterSegment): string[] {
    const significant = seg.events.filter((e) => e.isSignificant()).slice(0, 3);
    const milestoneHighlights = seg.milestones.map((m) => m.title).slice(0, 2);
    return [...significant.map((e) => e.narrativeText), ...milestoneHighlights].slice(0, 5);
  }
}
