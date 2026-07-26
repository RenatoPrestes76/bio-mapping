import { Injectable } from '@nestjs/common';
import { HealthNarrative } from '../entities/health-narrative.entity.js';
import { TimelineNarrativeEngine } from '../engines/timeline-narrative.engine.js';
import { MilestoneRecognitionEngine } from '../engines/milestone-recognition.engine.js';
import { ChapterBuilderEngine } from '../engines/chapter-builder.engine.js';
import { BioBookSummaryEngine } from '../engines/bio-book-summary.engine.js';
import type { GenerateBioBookDto } from '../dto/bio-book.dto.js';

@Injectable()
export class BioBookProvider {
  private readonly books = new Map<string, HealthNarrative>();

  private readonly narrativeEngine = new TimelineNarrativeEngine();
  private readonly milestoneEngine = new MilestoneRecognitionEngine();
  private readonly chapterEngine = new ChapterBuilderEngine();
  private readonly summaryEngine = new BioBookSummaryEngine();

  generate(dto: GenerateBioBookDto): HealthNarrative {
    const rawEvents = dto.events ?? [];

    const narrativeEvents = this.narrativeEngine.toNarrativeEvents(dto.patientId, rawEvents);
    const sortedEvents = this.narrativeEngine.sortByDate(narrativeEvents);
    const milestones = this.milestoneEngine.recognize(dto.patientId, sortedEvents);
    const chapters = this.chapterEngine.build(sortedEvents, milestones);
    const summary = this.summaryEngine.generate(dto.patientId, sortedEvents, chapters, milestones);

    const narrative = new HealthNarrative({
      patientId: dto.patientId,
      chapters,
      milestones,
      events: sortedEvents,
      summary,
    });

    this.books.set(dto.patientId, narrative);
    return narrative;
  }

  findByPatient(patientId: string): HealthNarrative | undefined {
    return this.books.get(patientId);
  }

  listAll(): HealthNarrative[] {
    return [...this.books.values()];
  }

  clear(patientId: string): boolean {
    return this.books.delete(patientId);
  }
}
