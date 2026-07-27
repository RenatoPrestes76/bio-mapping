import { NotFoundException } from '@nestjs/common';
import { BioBookInsightController } from '../bio-book-insight.controller.js';
import { BioBookInsightService } from '../bio-book-insight.service.js';
import { BioBookInsightReport } from '../entities/bio-book-insight-report.entity.js';
import { PersonalInsight } from '../entities/personal-insight.entity.js';
import { HealthReflection } from '../entities/health-reflection.entity.js';
import { PersonalGoal } from '../entities/personal-goal.entity.js';
import { HealthScorePoint } from '../entities/health-score-point.entity.js';
import { CurrentChapter } from '../entities/current-chapter.entity.js';
import {
  BioBookInsightResponseDto,
  InsightsResponseDto,
  ReflectionResponseDto,
  GoalsResponseDto,
  ScoreEvolutionResponseDto,
  CurrentChapterResponseDto,
} from '../dto/bio-book-insight.dto.js';

jest.mock('../../identity/auth/guards/jwt-auth.guard.js', () => ({
  JwtAuthGuard: jest.fn().mockImplementation(() => ({ canActivate: () => true })),
}));

const D = (iso: string) => new Date(iso);
const BASE = D('2024-03-01T00:00:00Z');
const LATER = D('2024-09-01T00:00:00Z');

function makeReport(patientId: string): BioBookInsightReport {
  const insight = new PersonalInsight({
    patientId, category: 'ACHIEVEMENT', title: 'Conquista', text: 'Você evoluiu.', strength: 'STRONG',
    evidences: ['Marco 1'], tags: ['saúde'],
  });
  const reflection = new HealthReflection({
    patientId, period: 'FULL_JOURNEY', periodLabel: 'Jornada completa', fromDate: BASE, toDate: LATER,
    evolution: 'Evolução positiva.', challenges: [], achievements: ['Marco 1'], nextSteps: ['Manter exames.'],
    overallSentiment: 'POSITIVE', eventCount: 5,
  });
  const goal = new PersonalGoal({
    patientId, category: 'METABOLIC', title: 'Melhorar saúde metabólica', description: 'Desc',
    targetDescription: 'HbA1c < 6.5%', progressPercent: 78, status: 'ON_TRACK',
    evidences: ['5 exames realizados'], startedAt: BASE,
  });
  const scorePoint = new HealthScorePoint({
    date: BASE, label: 'Março 2024', score: 72, trend: 'UP', delta: 5,
    breakdown: { adherence: 80, biomarker: 60, lifestyle: 70 },
  });
  const chapter = new CurrentChapter({
    patientId, chapterNumber: 2, chapterTitle: 'Construindo longevidade', description: 'Sua saúde em evolução.',
    focus: ['Manutenção metabólica'], startedAt: BASE, theme: 'LONGEVITY',
    progressInChapter: 65, nextMilestoneHint: 'Continue mantendo o acompanhamento.', daysInChapter: 185,
  });
  return new BioBookInsightReport({
    patientId, insights: [insight], reflections: [reflection], goals: [goal],
    scoreEvolution: [scorePoint], currentChapter: chapter,
  });
}

describe('BioBookInsightController', () => {
  let controller: BioBookInsightController;
  let service: jest.Mocked<BioBookInsightService>;

  beforeEach(() => {
    service = {
      analyze: jest.fn(),
      getReport: jest.fn(),
      getInsights: jest.fn(),
      getReflection: jest.fn(),
      getGoals: jest.fn(),
      getScoreEvolution: jest.fn(),
      getCurrentChapter: jest.fn(),
    } as unknown as jest.Mocked<BioBookInsightService>;
    controller = new BioBookInsightController(service);
  });

  describe('POST /bio-book-insight/analyze', () => {
    it('returns BioBookInsightResponseDto', () => {
      service.analyze.mockReturnValue(makeReport('p1'));
      const result = controller.analyze({ patientId: 'p1' });
      expect(result).toBeInstanceOf(BioBookInsightResponseDto);
      expect(result.patientId).toBe('p1');
    });

    it('reportId is truthy', () => {
      service.analyze.mockReturnValue(makeReport('p1'));
      const result = controller.analyze({ patientId: 'p1' });
      expect(result.reportId).toBeTruthy();
    });

    it('response contains all sub-sections', () => {
      service.analyze.mockReturnValue(makeReport('p1'));
      const result = controller.analyze({ patientId: 'p1' });
      expect(result.insights).toBeInstanceOf(InsightsResponseDto);
      expect(result.reflection).toBeInstanceOf(ReflectionResponseDto);
      expect(result.goals).toBeInstanceOf(GoalsResponseDto);
      expect(result.scoreEvolution).toBeInstanceOf(ScoreEvolutionResponseDto);
      expect(result.currentChapter).toBeInstanceOf(CurrentChapterResponseDto);
    });

    it('generatedAt is valid ISO string', () => {
      service.analyze.mockReturnValue(makeReport('p1'));
      const result = controller.analyze({ patientId: 'p1' });
      expect(() => new Date(result.generatedAt)).not.toThrow();
    });
  });

  describe('GET /bio-book-insight/insights/:patientId', () => {
    it('returns InsightsResponseDto', () => {
      service.getInsights.mockReturnValue(makeReport('p1'));
      const result = controller.getInsights('p1');
      expect(result).toBeInstanceOf(InsightsResponseDto);
      expect(result.totalInsights).toBe(1);
    });

    it('insight has all expected fields', () => {
      service.getInsights.mockReturnValue(makeReport('p1'));
      const result = controller.getInsights('p1');
      const i = result.insights[0];
      expect(i).toHaveProperty('id');
      expect(i).toHaveProperty('category', 'ACHIEVEMENT');
      expect(i).toHaveProperty('title');
      expect(i).toHaveProperty('text');
      expect(i).toHaveProperty('strength', 'STRONG');
      expect(i).toHaveProperty('evidences');
      expect(i).toHaveProperty('isActionable');
      expect(i).toHaveProperty('isPositive');
    });

    it('propagates NotFoundException', () => {
      service.getInsights.mockImplementation(() => { throw new NotFoundException(); });
      expect(() => controller.getInsights('x')).toThrow(NotFoundException);
    });
  });

  describe('GET /bio-book-insight/reflection/:patientId', () => {
    it('returns ReflectionResponseDto', () => {
      service.getReflection.mockReturnValue(makeReport('p1'));
      const result = controller.getReflection('p1');
      expect(result).toBeInstanceOf(ReflectionResponseDto);
      expect(result.totalReflections).toBe(1);
    });

    it('fullJourney is populated', () => {
      service.getReflection.mockReturnValue(makeReport('p1'));
      const result = controller.getReflection('p1');
      expect(result.fullJourney).toBeDefined();
      expect(result.fullJourney?.evolution).toBeTruthy();
    });

    it('reflection items have expected shape', () => {
      service.getReflection.mockReturnValue(makeReport('p1'));
      const result = controller.getReflection('p1');
      const r = result.reflections[0];
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('period', 'FULL_JOURNEY');
      expect(r).toHaveProperty('periodLabel');
      expect(r).toHaveProperty('evolution');
      expect(r).toHaveProperty('overallSentiment', 'POSITIVE');
      expect(r).toHaveProperty('eventCount', 5);
    });

    it('propagates NotFoundException', () => {
      service.getReflection.mockImplementation(() => { throw new NotFoundException(); });
      expect(() => controller.getReflection('x')).toThrow(NotFoundException);
    });
  });

  describe('GET /bio-book-insight/goals/:patientId', () => {
    it('returns GoalsResponseDto', () => {
      service.getGoals.mockReturnValue(makeReport('p1'));
      const result = controller.getGoals('p1');
      expect(result).toBeInstanceOf(GoalsResponseDto);
      expect(result.totalGoals).toBe(1);
    });

    it('goal has expected shape', () => {
      service.getGoals.mockReturnValue(makeReport('p1'));
      const result = controller.getGoals('p1');
      const g = result.goals[0];
      expect(g).toHaveProperty('id');
      expect(g).toHaveProperty('category', 'METABOLIC');
      expect(g).toHaveProperty('title');
      expect(g).toHaveProperty('progressPercent', 78);
      expect(g).toHaveProperty('status', 'ON_TRACK');
      expect(g).toHaveProperty('evidences');
    });

    it('propagates NotFoundException', () => {
      service.getGoals.mockImplementation(() => { throw new NotFoundException(); });
      expect(() => controller.getGoals('x')).toThrow(NotFoundException);
    });
  });

  describe('GET /bio-book-insight/score-evolution/:patientId', () => {
    it('returns ScoreEvolutionResponseDto', () => {
      service.getScoreEvolution.mockReturnValue(makeReport('p1'));
      const result = controller.getScoreEvolution('p1');
      expect(result).toBeInstanceOf(ScoreEvolutionResponseDto);
      expect(result.totalPoints).toBe(1);
    });

    it('has currentScore and currentLevel', () => {
      service.getScoreEvolution.mockReturnValue(makeReport('p1'));
      const result = controller.getScoreEvolution('p1');
      expect(result.currentScore).toBe(72);
      expect(result.currentLevel).toBeTruthy();
    });

    it('score point has all expected fields', () => {
      service.getScoreEvolution.mockReturnValue(makeReport('p1'));
      const result = controller.getScoreEvolution('p1');
      const p = result.points[0];
      expect(p).toHaveProperty('date');
      expect(p).toHaveProperty('label', 'Março 2024');
      expect(p).toHaveProperty('score', 72);
      expect(p).toHaveProperty('trend', 'UP');
      expect(p).toHaveProperty('breakdown');
      expect(p).toHaveProperty('levelLabel');
      expect(p.breakdown).toHaveProperty('adherence', 80);
      expect(p.breakdown).toHaveProperty('biomarker', 60);
      expect(p.breakdown).toHaveProperty('lifestyle', 70);
    });

    it('propagates NotFoundException', () => {
      service.getScoreEvolution.mockImplementation(() => { throw new NotFoundException(); });
      expect(() => controller.getScoreEvolution('x')).toThrow(NotFoundException);
    });
  });

  describe('GET /bio-book-insight/current-chapter/:patientId', () => {
    it('returns CurrentChapterResponseDto', () => {
      service.getCurrentChapter.mockReturnValue(makeReport('p1'));
      const result = controller.getCurrentChapter('p1');
      expect(result).toBeInstanceOf(CurrentChapterResponseDto);
      expect(result.hasCurrentChapter).toBe(true);
    });

    it('currentChapter has expected shape', () => {
      service.getCurrentChapter.mockReturnValue(makeReport('p1'));
      const result = controller.getCurrentChapter('p1');
      const c = result.currentChapter!;
      expect(c).toHaveProperty('chapterNumber', 2);
      expect(c).toHaveProperty('chapterTitle');
      expect(c).toHaveProperty('description');
      expect(c).toHaveProperty('theme', 'LONGEVITY');
      expect(c).toHaveProperty('focus');
      expect(c).toHaveProperty('progressInChapter', 65);
      expect(c).toHaveProperty('nextMilestoneHint');
      expect(c).toHaveProperty('daysInChapter', 185);
    });

    it('hasCurrentChapter false when no chapter', () => {
      const report = new BioBookInsightReport({ patientId: 'p1', insights: [], reflections: [], goals: [], scoreEvolution: [], currentChapter: null });
      service.getCurrentChapter.mockReturnValue(report);
      const result = controller.getCurrentChapter('p1');
      expect(result.hasCurrentChapter).toBe(false);
      expect(result.currentChapter).toBeUndefined();
    });

    it('propagates NotFoundException', () => {
      service.getCurrentChapter.mockImplementation(() => { throw new NotFoundException(); });
      expect(() => controller.getCurrentChapter('x')).toThrow(NotFoundException);
    });
  });
});
