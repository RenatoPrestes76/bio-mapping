import { Injectable } from '@nestjs/common';
import { BioBookService } from '../../bio-book/bio-book.service.js';
import { BioBookInsightReport } from '../entities/bio-book-insight-report.entity.js';
import { PersonalInsightEngine } from '../engines/personal-insight.engine.js';
import { ReflectionGenerationEngine } from '../engines/reflection-generation.engine.js';
import { GoalEvolutionEngine } from '../engines/goal-evolution.engine.js';
import { HealthScoreEvolutionEngine } from '../engines/health-score-evolution.engine.js';
import { CurrentChapterEngine } from '../engines/current-chapter.engine.js';
import type { AnalyzeBioBookInsightDto } from '../dto/bio-book-insight.dto.js';
import type { JwtPayload } from '../../identity/auth/types/jwt-payload.interface.js';

@Injectable()
export class BioBookInsightProvider {
  private readonly reports = new Map<string, BioBookInsightReport>();

  private readonly insightEngine = new PersonalInsightEngine();
  private readonly reflectionEngine = new ReflectionGenerationEngine();
  private readonly goalEngine = new GoalEvolutionEngine();
  private readonly scoreEngine = new HealthScoreEvolutionEngine();
  private readonly chapterEngine = new CurrentChapterEngine();

  constructor(private readonly bioBookService: BioBookService) {}

  analyze(dto: AnalyzeBioBookInsightDto): BioBookInsightReport {
    // `dto.patientId` já chega aqui forçado para o próprio ator autenticado
    // (ver `BioBookInsightService.analyze`), então o "actor" sintético abaixo
    // é seguro: `BioBookService.generate` sempre usa `actor.sub` como
    // patientId, e não faz checagem de ownership nesta chamada interna.
    const selfActor: JwtPayload = { sub: dto.patientId, email: '', role: 'PATIENT' };
    const narrative = this.bioBookService.generate({
      patientId: dto.patientId,
      events: dto.events,
    }, selfActor);

    const { events, milestones, chapters } = narrative;
    const goalInputs = dto.goalInputs ?? [];

    const insights = this.insightEngine.generate(dto.patientId, events, milestones, chapters);
    const reflections = this.reflectionEngine.generate(dto.patientId, events, milestones);
    const goals = this.goalEngine.buildGoals(dto.patientId, events, milestones, goalInputs);
    const scoreEvolution = this.scoreEngine.compute(events, milestones);
    const currentChapter = this.chapterEngine.determine(dto.patientId, chapters);

    const report = new BioBookInsightReport({
      patientId: dto.patientId,
      insights,
      reflections,
      goals,
      scoreEvolution,
      currentChapter,
    });

    this.reports.set(dto.patientId, report);
    return report;
  }

  findByPatient(patientId: string): BioBookInsightReport | undefined {
    return this.reports.get(patientId);
  }

  listAll(): BioBookInsightReport[] {
    return [...this.reports.values()];
  }
}
