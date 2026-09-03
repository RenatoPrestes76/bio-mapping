import type { JourneyReport } from '../entities/journey-report.entity.js';
import type {
  JourneyPath,
  JourneyDirection,
} from '../entities/journey-path.entity.js';
import type { JourneyPhase } from '../entities/journey-phase.entity.js';
import type { AdaptiveRecommendation } from '../entities/adaptive-recommendation.entity.js';
import type {
  HabitPattern,
  HabitTrend,
} from '../entities/habit-pattern.entity.js';
import type { MilestonePrediction } from '../entities/milestone-prediction.entity.js';
import type { TrendInsight } from '../insights/trend-insight.js';

export class AnalyzeBioBookJourneyDto {
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
  goalInputs?: Array<{
    category: string;
    title: string;
    targetDescription: string;
  }>;
}

// ── Journey path response ─────────────────────────────────────────────────────

export class JourneyPathResponseDto {
  patientId!: string;
  /** Derivado de computeTrend() + regras de negócio (hospitalização, fallback por marco) — não é passthrough direto. */
  overallDirection!: JourneyDirection;
  progressPercentage!: number;
  narrative!: string;
  /** Interpretação de computeTrend() sobre a série de score, sem as regras de negócio que overallDirection aplica. Ausente quando a entidade não a define. */
  directionInsight?: TrendInsight;
  currentPhase?: {
    type: string;
    label: string;
    description: string;
    estimatedDurationWeeks: number;
    keyActions: string[];
    successCriteria: string[];
  };
  nextPhase?: {
    type: string;
    label: string;
    description: string;
  };
  phases!: Array<{
    type: string;
    status: string;
    label: string;
    order: number;
  }>;
  completedPhaseCount!: number;

  static fromReport(report: JourneyReport): JourneyPathResponseDto {
    const dto = new JourneyPathResponseDto();
    const path: JourneyPath = report.journeyPath;
    dto.patientId = report.patientId;
    dto.overallDirection = path.overallDirection;
    dto.progressPercentage = path.progressPercentage;
    dto.narrative = path.narrative;
    dto.directionInsight = path.directionInsight;
    dto.completedPhaseCount = path.getCompletedPhases().length;
    dto.phases = path.phases.map((p: JourneyPhase) => ({
      type: p.type,
      status: p.status,
      label: p.label,
      order: p.order,
    }));
    const current = path.getCurrentPhase();
    if (current) {
      dto.currentPhase = {
        type: current.type,
        label: current.label,
        description: current.description,
        estimatedDurationWeeks: current.estimatedDurationWeeks,
        keyActions: current.keyActions,
        successCriteria: current.successCriteria,
      };
    }
    const next = path.getNextPhase();
    if (next) {
      dto.nextPhase = {
        type: next.type,
        label: next.label,
        description: next.description,
      };
    }
    return dto;
  }
}

// ── Next steps response ───────────────────────────────────────────────────────

export class NextStepsResponseDto {
  patientId!: string;
  nextStep!: string;
  immediateCount!: number;
  recommendations!: Array<{
    id: string;
    area: string;
    priority: string;
    title: string;
    rationale: string;
    actions: string[];
    evidenceBasis: string[];
    isClinicianReviewRequired: boolean;
  }>;
  habitPatterns!: Array<{
    habitType: string;
    label: string;
    /** 'EMERGING' é valor de regra de negócio (histórico curto) — não faz parte do TrendDirection do computeTrend(). */
    trend: HabitTrend;
    consistencyScore: number;
    frequencyPerMonth: number;
    recommendation: string;
    needsAttention: boolean;
    insight?: TrendInsight;
  }>;

  static fromReport(report: JourneyReport): NextStepsResponseDto {
    const dto = new NextStepsResponseDto();
    dto.patientId = report.patientId;
    dto.nextStep = report.getNextStep();
    dto.immediateCount = report.getImmediateRecommendations().length;
    dto.recommendations = report.recommendations.map(
      (r: AdaptiveRecommendation) => ({
        id: r.id,
        area: r.area,
        priority: r.priority,
        title: r.title,
        rationale: r.rationale,
        actions: r.actions,
        evidenceBasis: r.evidenceBasis,
        isClinicianReviewRequired: r.isClinicianReviewRequired,
      }),
    );
    dto.habitPatterns = report.habitPatterns.map((h: HabitPattern) => ({
      habitType: h.habitType,
      label: h.label,
      trend: h.trend,
      consistencyScore: h.consistencyScore,
      frequencyPerMonth: h.frequencyPerMonth,
      recommendation: h.recommendation,
      needsAttention: h.needsAttention(),
      insight: h.insight,
    }));
    return dto;
  }
}

// ── Milestone predictions response ────────────────────────────────────────────

export class MilestonePredictionsResponseDto {
  patientId!: string;
  totalPredictions!: number;
  highConfidenceCount!: number;
  predictions!: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    estimatedTimeframe: string;
    confidence: string;
    requiredActions: string[];
    basisDescription: string;
    insight?: TrendInsight;
  }>;

  static fromReport(report: JourneyReport): MilestonePredictionsResponseDto {
    const dto = new MilestonePredictionsResponseDto();
    dto.patientId = report.patientId;
    dto.totalPredictions = report.milestonePredictions.length;
    dto.highConfidenceCount = report.getHighConfidencePredictions().length;
    dto.predictions = report.milestonePredictions.map(
      (p: MilestonePrediction) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        estimatedTimeframe: p.estimatedTimeframe,
        confidence: p.confidence,
        requiredActions: p.requiredActions,
        basisDescription: p.basisDescription,
        insight: p.insight,
      }),
    );
    return dto;
  }
}

// ── Full journey response ─────────────────────────────────────────────────────

export class BioBookJourneyResponseDto {
  patientId!: string;
  reportId!: string;
  journeyPath!: JourneyPathResponseDto;
  nextSteps!: NextStepsResponseDto;
  milestonePredictions!: MilestonePredictionsResponseDto;
  generatedAt!: string;

  static fromReport(report: JourneyReport): BioBookJourneyResponseDto {
    const dto = new BioBookJourneyResponseDto();
    dto.patientId = report.patientId;
    dto.reportId = report.id;
    dto.journeyPath = JourneyPathResponseDto.fromReport(report);
    dto.nextSteps = NextStepsResponseDto.fromReport(report);
    dto.milestonePredictions =
      MilestonePredictionsResponseDto.fromReport(report);
    dto.generatedAt = report.generatedAt.toISOString();
    return dto;
  }
}
