import { PersonalInsight } from '../entities/personal-insight.entity.js';
import { HealthReflection } from '../entities/health-reflection.entity.js';
import { PersonalGoal } from '../entities/personal-goal.entity.js';
import { HealthScorePoint } from '../entities/health-score-point.entity.js';
import type { ScoreTrend } from '../entities/health-score-point.entity.js';
import { CurrentChapter } from '../entities/current-chapter.entity.js';
import { BioBookInsightReport } from '../entities/bio-book-insight-report.entity.js';

const D = (iso: string) => new Date(iso);
const BASE = D('2024-03-01T00:00:00Z');
const LATER = D('2024-09-01T00:00:00Z');

// ── PersonalInsight ────────────────────────────────────────────────────────────

describe('PersonalInsight', () => {
  const make = (overrides?: Partial<ConstructorParameters<typeof PersonalInsight>[0]>) =>
    new PersonalInsight({
      patientId: 'p1',
      category: 'EVOLUTION',
      title: 'Test insight',
      text: 'Evolução detectada.',
      ...overrides,
    });

  it('assigns defaults', () => {
    const i = make();
    expect(i.strength).toBe('MODERATE');
    expect(i.evidences).toEqual([]);
    expect(i.tags).toEqual([]);
    expect(i.id).toMatch(/^ins-/);
  });

  it('isActionable returns true for OPPORTUNITY and RISK', () => {
    expect(make({ category: 'OPPORTUNITY' }).isActionable()).toBe(true);
    expect(make({ category: 'RISK' }).isActionable()).toBe(true);
    expect(make({ category: 'EVOLUTION' }).isActionable()).toBe(false);
    expect(make({ category: 'ACHIEVEMENT' }).isActionable()).toBe(false);
  });

  it('isPositive returns true for ACHIEVEMENT and EVOLUTION', () => {
    expect(make({ category: 'ACHIEVEMENT' }).isPositive()).toBe(true);
    expect(make({ category: 'EVOLUTION' }).isPositive()).toBe(true);
    expect(make({ category: 'RISK' }).isPositive()).toBe(false);
    expect(make({ category: 'PATTERN' }).isPositive()).toBe(false);
  });

  it('isStrong returns true for STRONG and VERY_STRONG', () => {
    expect(make({ strength: 'STRONG' }).isStrong()).toBe(true);
    expect(make({ strength: 'VERY_STRONG' }).isStrong()).toBe(true);
    expect(make({ strength: 'MODERATE' }).isStrong()).toBe(false);
    expect(make({ strength: 'WEAK' }).isStrong()).toBe(false);
  });

  it('toSummary has expected shape', () => {
    const i = make({ category: 'CORRELATION', strength: 'STRONG' });
    const s = i.toSummary();
    expect(s).toHaveProperty('id');
    expect(s).toHaveProperty('category', 'CORRELATION');
    expect(s).toHaveProperty('title');
    expect(s).toHaveProperty('strength', 'STRONG');
  });

  it('generates unique ids', () => {
    const a = make();
    const b = make();
    expect(a.id).not.toBe(b.id);
  });
});

// ── HealthReflection ──────────────────────────────────────────────────────────

describe('HealthReflection', () => {
  const make = (overrides?: Partial<ConstructorParameters<typeof HealthReflection>[0]>) =>
    new HealthReflection({
      patientId: 'p1',
      period: 'MONTHLY',
      periodLabel: 'Março 2024',
      fromDate: BASE,
      toDate: LATER,
      evolution: 'Período de evolução positiva.',
      ...overrides,
    });

  it('assigns defaults', () => {
    const r = make();
    expect(r.challenges).toEqual([]);
    expect(r.achievements).toEqual([]);
    expect(r.nextSteps).toEqual([]);
    expect(r.overallSentiment).toBe('NEUTRAL');
    expect(r.eventCount).toBe(0);
  });

  it('durationDays computes correctly', () => {
    const r = make();
    const expected = Math.ceil((LATER.getTime() - BASE.getTime()) / 86_400_000);
    expect(r.durationDays()).toBe(expected);
  });

  it('isPositive returns true only for POSITIVE sentiment', () => {
    expect(make({ overallSentiment: 'POSITIVE' }).isPositive()).toBe(true);
    expect(make({ overallSentiment: 'NEUTRAL' }).isPositive()).toBe(false);
    expect(make({ overallSentiment: 'CHALLENGING' }).isPositive()).toBe(false);
  });

  it('hasChallenges returns true when challenges present', () => {
    expect(make({ challenges: ['Desafio 1'] }).hasChallenges()).toBe(true);
    expect(make({ challenges: [] }).hasChallenges()).toBe(false);
  });

  it('toSummary has expected shape', () => {
    const r = make({ overallSentiment: 'POSITIVE', achievements: ['M1', 'M2'] });
    const s = r.toSummary();
    expect(s).toHaveProperty('period', 'MONTHLY');
    expect(s).toHaveProperty('sentiment', 'POSITIVE');
    expect(s).toHaveProperty('achievementCount', 2);
  });
});

// ── PersonalGoal ──────────────────────────────────────────────────────────────

describe('PersonalGoal', () => {
  const make = (overrides?: Partial<ConstructorParameters<typeof PersonalGoal>[0]>) =>
    new PersonalGoal({
      patientId: 'p1',
      category: 'METABOLIC',
      title: 'Melhorar HbA1c',
      description: 'Atingir HbA1c abaixo de 6.5%.',
      targetDescription: 'HbA1c < 6.5%',
      startedAt: BASE,
      ...overrides,
    });

  it('assigns defaults', () => {
    const g = make();
    expect(g.progressPercent).toBe(0);
    expect(g.status).toBe('NOT_STARTED');
    expect(g.evidences).toEqual([]);
  });

  it('clamps progressPercent to [0, 100]', () => {
    expect(make({ progressPercent: -10 }).progressPercent).toBe(0);
    expect(make({ progressPercent: 150 }).progressPercent).toBe(100);
    expect(make({ progressPercent: 75 }).progressPercent).toBe(75);
  });

  it('isCompleted returns true for ACHIEVED or 100%', () => {
    expect(make({ status: 'ACHIEVED' }).isCompleted()).toBe(true);
    expect(make({ progressPercent: 100 }).isCompleted()).toBe(true);
    expect(make({ progressPercent: 50 }).isCompleted()).toBe(false);
  });

  it('isAtRisk and isOnTrack work correctly', () => {
    expect(make({ status: 'AT_RISK' }).isAtRisk()).toBe(true);
    expect(make({ status: 'ON_TRACK' }).isOnTrack()).toBe(true);
    expect(make({ status: 'NOT_STARTED' }).isAtRisk()).toBe(false);
    expect(make({ status: 'PAUSED' }).isOnTrack()).toBe(false);
  });

  it('toSummary has expected shape', () => {
    const g = make({ progressPercent: 78, status: 'ON_TRACK' });
    const s = g.toSummary();
    expect(s).toHaveProperty('title');
    expect(s).toHaveProperty('category', 'METABOLIC');
    expect(s).toHaveProperty('progressPercent', 78);
    expect(s).toHaveProperty('status', 'ON_TRACK');
  });
});

// ── HealthScorePoint ──────────────────────────────────────────────────────────

describe('HealthScorePoint', () => {
  const make = (score: number, trend: ScoreTrend = 'STABLE') =>
    new HealthScorePoint({ date: BASE, label: 'Março 2024', score, trend });

  it('clamps score to [0, 100] and rounds', () => {
    expect(make(-5).score).toBe(0);
    expect(make(150).score).toBe(100);
    expect(make(72.7).score).toBe(73);
  });

  it('isImproving and isDeclining respond correctly', () => {
    expect(make(70, 'UP').isImproving()).toBe(true);
    expect(make(70, 'DOWN').isDeclining()).toBe(true);
    expect(make(70, 'STABLE').isImproving()).toBe(false);
    expect(make(70, 'STABLE').isDeclining()).toBe(false);
  });

  it('levelLabel returns correct label', () => {
    expect(make(90).levelLabel()).toBe('Excelente');
    expect(make(75).levelLabel()).toBe('Bom');
    expect(make(60).levelLabel()).toBe('Regular');
    expect(make(45).levelLabel()).toBe('Atenção');
    expect(make(30).levelLabel()).toBe('Crítico');
  });

  it('breakdown defaults to 0 when not provided', () => {
    const p = make(65);
    expect(p.breakdown.adherence).toBe(0);
    expect(p.breakdown.biomarker).toBe(0);
    expect(p.breakdown.lifestyle).toBe(0);
  });

  it('stores breakdown when provided', () => {
    const p = new HealthScorePoint({ date: BASE, label: 'Test', score: 75, breakdown: { adherence: 80, biomarker: 60, lifestyle: 70 } });
    expect(p.breakdown.adherence).toBe(80);
    expect(p.breakdown.biomarker).toBe(60);
    expect(p.breakdown.lifestyle).toBe(70);
  });
});

// ── CurrentChapter ────────────────────────────────────────────────────────────

describe('CurrentChapter', () => {
  const make = (overrides?: Partial<ConstructorParameters<typeof CurrentChapter>[0]>) =>
    new CurrentChapter({
      patientId: 'p1',
      chapterNumber: 2,
      chapterTitle: 'Construindo longevidade',
      description: 'Sua saúde em ascensão',
      focus: ['Manutenção metabólica', 'Saúde preventiva'],
      startedAt: BASE,
      theme: 'LONGEVITY',
      ...overrides,
    });

  it('assigns defaults', () => {
    const c = make();
    expect(c.progressInChapter).toBe(0);
    expect(c.daysInChapter).toBe(0);
    expect(c.nextMilestoneHint).toBeTruthy();
  });

  it('clamps progressInChapter to [0, 100]', () => {
    expect(make({ progressInChapter: -5 }).progressInChapter).toBe(0);
    expect(make({ progressInChapter: 150 }).progressInChapter).toBe(100);
    expect(make({ progressInChapter: 65 }).progressInChapter).toBe(65);
  });

  it('isInProgress returns true when progress < 100', () => {
    expect(make({ progressInChapter: 50 }).isInProgress()).toBe(true);
    expect(make({ progressInChapter: 100 }).isInProgress()).toBe(false);
    expect(make({ progressInChapter: 0 }).isInProgress()).toBe(true);
  });

  it('toSummary has expected shape', () => {
    const c = make({ progressInChapter: 65 });
    const s = c.toSummary();
    expect(s).toHaveProperty('chapterNumber', 2);
    expect(s).toHaveProperty('chapterTitle');
    expect(s).toHaveProperty('theme', 'LONGEVITY');
    expect(s).toHaveProperty('progressInChapter', 65);
    expect(s).toHaveProperty('focus');
  });
});

// ── BioBookInsightReport ──────────────────────────────────────────────────────

describe('BioBookInsightReport', () => {
  function makeReport() {
    const insights = [
      new PersonalInsight({ patientId: 'p1', category: 'ACHIEVEMENT', title: 'A', text: 'T', strength: 'STRONG' }),
      new PersonalInsight({ patientId: 'p1', category: 'RISK', title: 'R', text: 'T', strength: 'WEAK' }),
    ];
    const goals = [
      new PersonalGoal({ patientId: 'p1', category: 'METABOLIC', title: 'G', description: 'D', targetDescription: 'TD', progressPercent: 100, status: 'ACHIEVED', startedAt: BASE }),
    ];
    const scorePoints = [
      new HealthScorePoint({ date: LATER, label: 'Sept', score: 80, trend: 'UP' }),
      new HealthScorePoint({ date: BASE, label: 'Mar', score: 65, trend: 'STABLE' }),
    ];
    const chapter = new CurrentChapter({ patientId: 'p1', chapterNumber: 1, chapterTitle: 'T', description: 'D', focus: [], startedAt: BASE, theme: 'STABILITY' });

    return new BioBookInsightReport({
      patientId: 'p1',
      insights,
      reflections: [],
      goals,
      scoreEvolution: scorePoints,
      currentChapter: chapter,
    });
  }

  it('sorts scoreEvolution chronologically', () => {
    const r = makeReport();
    expect(r.scoreEvolution[0].date.getTime()).toBeLessThan(r.scoreEvolution[1].date.getTime());
  });

  it('getInsightsByCategory filters correctly', () => {
    const r = makeReport();
    expect(r.getInsightsByCategory('ACHIEVEMENT').length).toBe(1);
    expect(r.getInsightsByCategory('RISK').length).toBe(1);
    expect(r.getInsightsByCategory('EVOLUTION').length).toBe(0);
  });

  it('getStrongInsights returns STRONG and VERY_STRONG', () => {
    const r = makeReport();
    expect(r.getStrongInsights().length).toBe(1);
  });

  it('getLatestScorePoint returns chronologically last', () => {
    const r = makeReport();
    expect(r.getLatestScorePoint()?.score).toBe(80);
  });

  it('getEarliestScorePoint returns chronologically first', () => {
    const r = makeReport();
    expect(r.getEarliestScorePoint()?.score).toBe(65);
  });

  it('totalScoreGain computes correctly', () => {
    const r = makeReport();
    expect(r.totalScoreGain()).toBe(15);
  });

  it('getCompletedGoals filters ACHIEVED goals', () => {
    const r = makeReport();
    expect(r.getCompletedGoals().length).toBe(1);
  });

  it('getFullJourneyReflection returns undefined for empty reflections', () => {
    const r = makeReport();
    expect(r.getFullJourneyReflection()).toBeUndefined();
  });

  it('totalScoreGain returns 0 when scoreEvolution is empty', () => {
    const r = new BioBookInsightReport({ patientId: 'p1', insights: [], reflections: [], goals: [], scoreEvolution: [], currentChapter: null });
    expect(r.totalScoreGain()).toBe(0);
  });
});
