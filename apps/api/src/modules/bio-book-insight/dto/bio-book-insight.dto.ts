import type { BioBookInsightReport } from '../entities/bio-book-insight-report.entity.js';
import type { PersonalInsight } from '../entities/personal-insight.entity.js';
import type { HealthReflection } from '../entities/health-reflection.entity.js';
import type { PersonalGoal } from '../entities/personal-goal.entity.js';
import type { HealthScorePoint } from '../entities/health-score-point.entity.js';
import type { CurrentChapter } from '../entities/current-chapter.entity.js';

export class AnalyzeBioBookInsightDto {
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

// ── Insight response ──────────────────────────────────────────────────────────

export class InsightsResponseDto {
  patientId!: string;
  totalInsights!: number;
  insights!: Array<{
    id: string;
    category: string;
    title: string;
    text: string;
    strength: string;
    evidences: string[];
    tags: string[];
    isActionable: boolean;
    isPositive: boolean;
  }>;

  static fromReport(report: BioBookInsightReport): InsightsResponseDto {
    const dto = new InsightsResponseDto();
    dto.patientId = report.patientId;
    dto.totalInsights = report.insights.length;
    dto.insights = report.insights.map((i: PersonalInsight) => ({
      id: i.id,
      category: i.category,
      title: i.title,
      text: i.text,
      strength: i.strength,
      evidences: i.evidences,
      tags: i.tags,
      isActionable: i.isActionable(),
      isPositive: i.isPositive(),
    }));
    return dto;
  }
}

// ── Reflection response ───────────────────────────────────────────────────────

export class ReflectionResponseDto {
  patientId!: string;
  totalReflections!: number;
  reflections!: Array<{
    id: string;
    period: string;
    periodLabel: string;
    fromDate: string;
    toDate: string;
    evolution: string;
    challenges: string[];
    achievements: string[];
    nextSteps: string[];
    overallSentiment: string;
    eventCount: number;
  }>;
  fullJourney?: {
    evolution: string;
    challenges: string[];
    achievements: string[];
    nextSteps: string[];
  };

  static fromReport(report: BioBookInsightReport): ReflectionResponseDto {
    const dto = new ReflectionResponseDto();
    dto.patientId = report.patientId;
    dto.totalReflections = report.reflections.length;
    dto.reflections = report.reflections.map((r: HealthReflection) => ({
      id: r.id,
      period: r.period,
      periodLabel: r.periodLabel,
      fromDate: r.fromDate.toISOString(),
      toDate: r.toDate.toISOString(),
      evolution: r.evolution,
      challenges: r.challenges,
      achievements: r.achievements,
      nextSteps: r.nextSteps,
      overallSentiment: r.overallSentiment,
      eventCount: r.eventCount,
    }));
    const fullJourney = report.getFullJourneyReflection();
    if (fullJourney) {
      dto.fullJourney = {
        evolution: fullJourney.evolution,
        challenges: fullJourney.challenges,
        achievements: fullJourney.achievements,
        nextSteps: fullJourney.nextSteps,
      };
    }
    return dto;
  }
}

// ── Goals response ────────────────────────────────────────────────────────────

export class GoalsResponseDto {
  patientId!: string;
  totalGoals!: number;
  completedGoals!: number;
  goals!: Array<{
    id: string;
    category: string;
    title: string;
    description: string;
    targetDescription: string;
    progressPercent: number;
    status: string;
    evidences: string[];
    startedAt: string;
  }>;

  static fromReport(report: BioBookInsightReport): GoalsResponseDto {
    const dto = new GoalsResponseDto();
    dto.patientId = report.patientId;
    dto.totalGoals = report.goals.length;
    dto.completedGoals = report.getCompletedGoals().length;
    dto.goals = report.goals.map((g: PersonalGoal) => ({
      id: g.id,
      category: g.category,
      title: g.title,
      description: g.description,
      targetDescription: g.targetDescription,
      progressPercent: g.progressPercent,
      status: g.status,
      evidences: g.evidences,
      startedAt: g.startedAt.toISOString(),
    }));
    return dto;
  }
}

// ── Score evolution response ──────────────────────────────────────────────────

export class ScoreEvolutionResponseDto {
  patientId!: string;
  totalPoints!: number;
  totalScoreGain!: number;
  currentScore?: number;
  currentLevel?: string;
  points!: Array<{
    date: string;
    label: string;
    score: number;
    trend: string;
    delta?: number;
    breakdown: { adherence: number; biomarker: number; lifestyle: number };
    levelLabel: string;
  }>;

  static fromReport(report: BioBookInsightReport): ScoreEvolutionResponseDto {
    const dto = new ScoreEvolutionResponseDto();
    dto.patientId = report.patientId;
    dto.totalPoints = report.scoreEvolution.length;
    dto.totalScoreGain = report.totalScoreGain();
    const latest = report.getLatestScorePoint();
    if (latest) {
      dto.currentScore = latest.score;
      dto.currentLevel = latest.levelLabel();
    }
    dto.points = report.scoreEvolution.map((p: HealthScorePoint) => ({
      date: p.date.toISOString(),
      label: p.label,
      score: p.score,
      trend: p.trend,
      delta: p.delta,
      breakdown: { ...p.breakdown },
      levelLabel: p.levelLabel(),
    }));
    return dto;
  }
}

// ── Current chapter response ──────────────────────────────────────────────────

export class CurrentChapterResponseDto {
  patientId!: string;
  hasCurrentChapter!: boolean;
  currentChapter?: {
    chapterNumber: number;
    chapterTitle: string;
    description: string;
    theme: string;
    focus: string[];
    progressInChapter: number;
    nextMilestoneHint: string;
    startedAt: string;
    daysInChapter: number;
  };

  static fromReport(report: BioBookInsightReport): CurrentChapterResponseDto {
    const dto = new CurrentChapterResponseDto();
    dto.patientId = report.patientId;
    dto.hasCurrentChapter = report.currentChapter !== null;
    if (report.currentChapter) {
      const c: CurrentChapter = report.currentChapter;
      dto.currentChapter = {
        chapterNumber: c.chapterNumber,
        chapterTitle: c.chapterTitle,
        description: c.description,
        theme: c.theme,
        focus: c.focus,
        progressInChapter: c.progressInChapter,
        nextMilestoneHint: c.nextMilestoneHint,
        startedAt: c.startedAt.toISOString(),
        daysInChapter: c.daysInChapter,
      };
    }
    return dto;
  }
}

// ── Full report response ──────────────────────────────────────────────────────

export class BioBookInsightResponseDto {
  patientId!: string;
  reportId!: string;
  insights!: InsightsResponseDto;
  reflection!: ReflectionResponseDto;
  goals!: GoalsResponseDto;
  scoreEvolution!: ScoreEvolutionResponseDto;
  currentChapter!: CurrentChapterResponseDto;
  generatedAt!: string;

  static fromReport(report: BioBookInsightReport): BioBookInsightResponseDto {
    const dto = new BioBookInsightResponseDto();
    dto.patientId = report.patientId;
    dto.reportId = report.id;
    dto.insights = InsightsResponseDto.fromReport(report);
    dto.reflection = ReflectionResponseDto.fromReport(report);
    dto.goals = GoalsResponseDto.fromReport(report);
    dto.scoreEvolution = ScoreEvolutionResponseDto.fromReport(report);
    dto.currentChapter = CurrentChapterResponseDto.fromReport(report);
    dto.generatedAt = report.generatedAt.toISOString();
    return dto;
  }
}
