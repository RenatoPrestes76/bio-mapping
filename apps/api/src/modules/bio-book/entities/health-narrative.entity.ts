import type { NarrativeChapter } from './narrative-chapter.entity.js';
import type { HealthMilestone, MilestoneType } from './health-milestone.entity.js';
import type { NarrativeEvent } from './narrative-event.entity.js';

export interface PersonalHealthSummary {
  headline: string;
  overview: string;
  keyAchievements: string[];
  currentStatus: string;
  nextSteps: string[];
  positiveCount: number;
  concernCount: number;
  totalChapters: number;
  totalMilestones: number;
  journeyDurationDays: number;
}

export class HealthNarrative {
  readonly id: string;
  readonly patientId: string;
  readonly chapters: NarrativeChapter[];
  readonly milestones: HealthMilestone[];
  readonly events: NarrativeEvent[];
  readonly summary: PersonalHealthSummary;
  readonly generatedAt: Date;

  constructor(params: {
    id?: string;
    patientId: string;
    chapters: NarrativeChapter[];
    milestones: HealthMilestone[];
    events: NarrativeEvent[];
    summary: PersonalHealthSummary;
  }) {
    this.id = params.id ?? `book-${params.patientId}-${Date.now()}`;
    this.patientId = params.patientId;
    this.chapters = params.chapters;
    this.milestones = params.milestones;
    this.events = [...params.events].sort((a, b) => a.date.getTime() - b.date.getTime());
    this.summary = params.summary;
    this.generatedAt = new Date();
  }

  getTimeline(): NarrativeEvent[] {
    return this.events;
  }

  getChapterByNumber(n: number): NarrativeChapter | undefined {
    return this.chapters.find((c) => c.number === n);
  }

  getMilestonesByType(type: MilestoneType): HealthMilestone[] {
    return this.milestones.filter((m) => m.milestoneType === type);
  }

  getLatestChapter(): NarrativeChapter | undefined {
    return this.chapters[this.chapters.length - 1];
  }

  getLandmarkMilestones(): HealthMilestone[] {
    return this.milestones.filter((m) => m.isLandmark());
  }

  spanDays(): number {
    if (this.events.length < 2) return 0;
    const first = this.events[0].date.getTime();
    const last = this.events[this.events.length - 1].date.getTime();
    return Math.ceil((last - first) / 86_400_000);
  }
}
