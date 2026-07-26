import type { HealthNarrative, PersonalHealthSummary } from '../entities/health-narrative.entity.js';
import type { NarrativeChapter } from '../entities/narrative-chapter.entity.js';
import type { HealthMilestone } from '../entities/health-milestone.entity.js';
import type { NarrativeEvent } from '../entities/narrative-event.entity.js';

export class GenerateBioBookDto {
  patientId!: string;
  events?: Array<{
    eventType: string;
    date: string;
    severity?: string;
    description?: string;
    biomarkers?: Record<string, number>;
    drugName?: string;
    conditionName?: string;
  }>;
}

export class BioBookTimelineResponseDto {
  patientId!: string;
  totalEvents!: number;
  events!: Array<{
    id: string;
    eventType: string;
    date: string;
    narrativeText: string;
    significance: string;
    chapterNumber: number;
  }>;

  static fromNarrative(narrative: HealthNarrative): BioBookTimelineResponseDto {
    const dto = new BioBookTimelineResponseDto();
    dto.patientId = narrative.patientId;
    dto.totalEvents = narrative.events.length;
    dto.events = narrative.getTimeline().map((e: NarrativeEvent) => ({
      id: e.id,
      eventType: e.eventType,
      date: e.date.toISOString(),
      narrativeText: e.narrativeText,
      significance: e.significance,
      chapterNumber: e.chapterNumber,
    }));
    return dto;
  }
}

export class BioBookChaptersResponseDto {
  patientId!: string;
  totalChapters!: number;
  chapters!: Array<{
    number: number;
    title: string;
    subtitle: string;
    theme: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    summary: string;
    keyInsight: string;
    highlights: string[];
    eventCount: number;
    milestoneCount: number;
  }>;

  static fromNarrative(narrative: HealthNarrative): BioBookChaptersResponseDto {
    const dto = new BioBookChaptersResponseDto();
    dto.patientId = narrative.patientId;
    dto.totalChapters = narrative.chapters.length;
    dto.chapters = narrative.chapters.map((c: NarrativeChapter) => ({
      number: c.number,
      title: c.title,
      subtitle: c.subtitle,
      theme: c.theme,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      durationDays: c.durationDays(),
      summary: c.summary,
      keyInsight: c.keyInsight,
      highlights: c.highlights,
      eventCount: c.events.length,
      milestoneCount: c.milestones.length,
    }));
    return dto;
  }
}

export class BioBookSummaryResponseDto {
  patientId!: string;
  summary!: PersonalHealthSummary;
  milestones!: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    rank: string;
    achievedAt: string;
    metric?: string;
    improvementPercent?: number;
  }>;
  generatedAt!: string;
  journeyDurationDays!: number;

  static fromNarrative(narrative: HealthNarrative): BioBookSummaryResponseDto {
    const dto = new BioBookSummaryResponseDto();
    dto.patientId = narrative.patientId;
    dto.summary = narrative.summary;
    dto.milestones = narrative.milestones.map((m: HealthMilestone) => ({
      id: m.id,
      type: m.milestoneType,
      title: m.title,
      description: m.description,
      rank: m.rank,
      achievedAt: m.achievedAt.toISOString(),
      metric: m.metric,
      improvementPercent: m.improvementPercent,
    }));
    dto.generatedAt = narrative.generatedAt.toISOString();
    dto.journeyDurationDays = narrative.spanDays();
    return dto;
  }
}

export class BioBookResponseDto {
  patientId!: string;
  bioBookId!: string;
  timeline!: BioBookTimelineResponseDto;
  chapters!: BioBookChaptersResponseDto;
  summary!: BioBookSummaryResponseDto;
  generatedAt!: string;

  static fromNarrative(narrative: HealthNarrative): BioBookResponseDto {
    const dto = new BioBookResponseDto();
    dto.patientId = narrative.patientId;
    dto.bioBookId = narrative.id;
    dto.timeline = BioBookTimelineResponseDto.fromNarrative(narrative);
    dto.chapters = BioBookChaptersResponseDto.fromNarrative(narrative);
    dto.summary = BioBookSummaryResponseDto.fromNarrative(narrative);
    dto.generatedAt = narrative.generatedAt.toISOString();
    return dto;
  }
}
