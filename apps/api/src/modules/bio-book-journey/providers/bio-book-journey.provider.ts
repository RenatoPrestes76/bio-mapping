import { Injectable } from '@nestjs/common';
import { BioBookService } from '../../bio-book/bio-book.service.js';
import { BioBookInsightService } from '../../bio-book-insight/bio-book-insight.service.js';
import { JourneyReport } from '../entities/journey-report.entity.js';
import { JourneyPathEngine } from '../engines/journey-path.engine.js';
import { AdaptiveRecommendationEngine } from '../engines/adaptive-recommendation.engine.js';
import { HabitEvolutionEngine } from '../engines/habit-evolution.engine.js';
import { MilestonePredictionEngine } from '../engines/milestone-prediction.engine.js';
import type { AnalyzeBioBookJourneyDto } from '../dto/bio-book-journey.dto.js';
import type { JwtPayload } from '../../identity/auth/types/jwt-payload.interface.js';

@Injectable()
export class BioBookJourneyProvider {
  private readonly reports = new Map<string, JourneyReport>();

  private readonly journeyPathEngine = new JourneyPathEngine();
  private readonly adaptiveRecommendationEngine = new AdaptiveRecommendationEngine();
  private readonly habitEvolutionEngine = new HabitEvolutionEngine();
  private readonly milestonePredictionEngine = new MilestonePredictionEngine();

  constructor(
    private readonly bioBookService: BioBookService,
    private readonly bioBookInsightService: BioBookInsightService,
  ) {}

  analyze(dto: AnalyzeBioBookJourneyDto): JourneyReport {
    // `dto.patientId` já chega aqui forçado para o próprio ator autenticado
    // (ver `BioBookJourneyService.analyze`), então o "actor" sintético abaixo
    // é seguro: as chamadas internas sempre operam sobre o próprio patientId.
    const selfActor: JwtPayload = { sub: dto.patientId, email: '', role: 'PATIENT' };

    // Trigger the full bio-book + insight pipeline first
    this.bioBookInsightService.analyze({
      patientId: dto.patientId,
      events: dto.events,
      goalInputs: dto.goalInputs,
    }, selfActor);

    const narrative = this.bioBookService.getNarrative(dto.patientId, selfActor);
    const insightReport = this.bioBookInsightService.getReport(dto.patientId, selfActor);

    const { events, milestones } = narrative;
    const { insights, goals, scoreEvolution } = insightReport;

    const habitPatterns = this.habitEvolutionEngine.analyze(events);

    const journeyPath = this.journeyPathEngine.compute(
      dto.patientId,
      events,
      milestones,
      goals,
      scoreEvolution,
    );

    const recommendations = this.adaptiveRecommendationEngine.generate(
      dto.patientId,
      insights,
      goals,
      habitPatterns,
      journeyPath,
      events,
    );

    const milestonePredictions = this.milestonePredictionEngine.predict(
      dto.patientId,
      goals,
      scoreEvolution,
      habitPatterns,
      journeyPath,
    );

    const report = new JourneyReport({
      patientId: dto.patientId,
      journeyPath,
      recommendations,
      habitPatterns,
      milestonePredictions,
    });

    this.reports.set(dto.patientId, report);
    return report;
  }

  findByPatient(patientId: string): JourneyReport | undefined {
    return this.reports.get(patientId);
  }
}
