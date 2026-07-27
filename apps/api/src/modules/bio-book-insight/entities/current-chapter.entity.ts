import type { ChapterTheme } from '../../bio-book/entities/narrative-chapter.entity.js';

export class CurrentChapter {
  readonly patientId: string;
  readonly chapterNumber: number;
  readonly chapterTitle: string;
  readonly description: string;
  readonly focus: string[];
  readonly startedAt: Date;
  readonly theme: ChapterTheme;
  readonly progressInChapter: number;
  readonly nextMilestoneHint: string;
  readonly daysInChapter: number;

  constructor(params: {
    patientId: string;
    chapterNumber: number;
    chapterTitle: string;
    description: string;
    focus: string[];
    startedAt: Date;
    theme: ChapterTheme;
    progressInChapter?: number;
    nextMilestoneHint?: string;
    daysInChapter?: number;
  }) {
    this.patientId = params.patientId;
    this.chapterNumber = params.chapterNumber;
    this.chapterTitle = params.chapterTitle;
    this.description = params.description;
    this.focus = params.focus;
    this.startedAt = params.startedAt;
    this.theme = params.theme;
    this.progressInChapter = Math.max(0, Math.min(100, params.progressInChapter ?? 0));
    this.nextMilestoneHint = params.nextMilestoneHint ?? 'Continue mantendo os registros de acompanhamento.';
    this.daysInChapter = params.daysInChapter ?? 0;
  }

  isInProgress(): boolean {
    return this.progressInChapter < 100;
  }

  toSummary(): {
    chapterNumber: number;
    chapterTitle: string;
    theme: ChapterTheme;
    progressInChapter: number;
    focus: string[];
  } {
    return {
      chapterNumber: this.chapterNumber,
      chapterTitle: this.chapterTitle,
      theme: this.theme,
      progressInChapter: this.progressInChapter,
      focus: this.focus,
    };
  }
}
