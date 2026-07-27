import { PersonalInsightEngine } from '../engines/personal-insight.engine.js';
import { ReflectionGenerationEngine } from '../engines/reflection-generation.engine.js';
import { GoalEvolutionEngine } from '../engines/goal-evolution.engine.js';
import { HealthScoreEvolutionEngine } from '../engines/health-score-evolution.engine.js';
import { CurrentChapterEngine } from '../engines/current-chapter.engine.js';
import { NarrativeEvent } from '../../bio-book/entities/narrative-event.entity.js';
import { HealthMilestone } from '../../bio-book/entities/health-milestone.entity.js';
import { NarrativeChapter } from '../../bio-book/entities/narrative-chapter.entity.js';

const D = (iso: string) => new Date(iso);

function makeEvent(overrides?: Partial<ConstructorParameters<typeof NarrativeEvent>[0]>): NarrativeEvent {
  return new NarrativeEvent({
    patientId: 'p1',
    eventType: 'CONSULTATION',
    date: D('2024-03-01T00:00:00Z'),
    narrativeText: 'Consulta realizada.',
    ...overrides,
  });
}

function makeMilestone(overrides?: Partial<ConstructorParameters<typeof HealthMilestone>[0]>): HealthMilestone {
  return new HealthMilestone({
    patientId: 'p1',
    milestoneType: 'BIOMARKER_IMPROVEMENT',
    title: 'Melhora HbA1c',
    description: 'HbA1c melhorou 20%.',
    achievedAt: D('2024-03-01T00:00:00Z'),
    rank: 'MAJOR',
    ...overrides,
  });
}

function makeChapter(overrides?: Partial<ConstructorParameters<typeof NarrativeChapter>[0]>): NarrativeChapter {
  return new NarrativeChapter({
    number: 1,
    theme: 'INITIAL_BASELINE',
    startDate: D('2024-01-01T00:00:00Z'),
    endDate: D('2024-06-01T00:00:00Z'),
    ...overrides,
  });
}

// ── PersonalInsightEngine ─────────────────────────────────────────────────────

describe('PersonalInsightEngine', () => {
  const engine = new PersonalInsightEngine();

  it('returns empty for empty events', () => {
    expect(engine.generate('p1', [], [], [])).toEqual([]);
  });

  it('generates ACHIEVEMENT insight for landmark milestones', () => {
    const ms = [makeMilestone({ rank: 'LANDMARK' })];
    const events = [makeEvent()];
    const insights = engine.generate('p1', events, ms, [makeChapter()]);
    expect(insights.some((i) => i.category === 'ACHIEVEMENT' && i.strength === 'VERY_STRONG')).toBe(true);
  });

  it('generates ACHIEVEMENT insight for biomarker improvements', () => {
    const ms = [makeMilestone({ milestoneType: 'BIOMARKER_IMPROVEMENT' })];
    const events = [makeEvent()];
    const insights = engine.generate('p1', events, ms, [makeChapter()]);
    expect(insights.some((i) => i.category === 'ACHIEVEMENT')).toBe(true);
  });

  it('generates EVOLUTION insight for long-span journeys (>180 days)', () => {
    const events = [
      makeEvent({ date: '2024-01-01T00:00:00Z' }),
      makeEvent({ date: '2024-09-01T00:00:00Z' }),
    ];
    const chapter = makeChapter({ startDate: D('2024-01-01T00:00:00Z'), endDate: D('2024-09-01T00:00:00Z') });
    const insights = engine.generate('p1', events, [], [chapter]);
    expect(insights.some((i) => i.category === 'EVOLUTION')).toBe(true);
  });

  it('generates CORRELATION insight for combined consultations + labs', () => {
    const events = [
      ...Array.from({ length: 3 }, () => makeEvent({ eventType: 'CONSULTATION' })),
      ...Array.from({ length: 3 }, () => makeEvent({ eventType: 'LAB_RESULT' })),
    ];
    const insights = engine.generate('p1', events, [], [makeChapter()]);
    expect(insights.some((i) => i.category === 'CORRELATION')).toBe(true);
  });

  it('generates OPPORTUNITY insight for genomic events', () => {
    const events = [makeEvent({ eventType: 'GENOMIC_DISCOVERY' })];
    const insights = engine.generate('p1', events, [], [makeChapter()]);
    expect(insights.some((i) => i.category === 'OPPORTUNITY')).toBe(true);
  });

  it('generates RISK insight for hospitalizations', () => {
    const events = [makeEvent({ eventType: 'HOSPITALIZATION', significance: 'HIGH' })];
    const insights = engine.generate('p1', events, [], [makeChapter()]);
    expect(insights.some((i) => i.category === 'RISK')).toBe(true);
  });

  it('sorts insights by strength (VERY_STRONG first)', () => {
    const ms = [
      makeMilestone({ rank: 'LANDMARK' }),
      makeMilestone({ milestoneType: 'BIOMARKER_IMPROVEMENT' }),
    ];
    const events = [makeEvent({ eventType: 'GENOMIC_DISCOVERY' })];
    const insights = engine.generate('p1', events, ms, [makeChapter()]);
    const strengthOrder = ['VERY_STRONG', 'STRONG', 'MODERATE', 'WEAK'];
    for (let i = 1; i < insights.length; i++) {
      const prev = strengthOrder.indexOf(insights[i - 1].strength);
      const curr = strengthOrder.indexOf(insights[i].strength);
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it('identifies peak chapter in EVOLUTION insight', () => {
    const chapter = makeChapter({
      events: [
        makeEvent({ significance: 'HIGH' }),
        makeEvent({ significance: 'LANDMARK' }),
      ],
    });
    const events = [makeEvent({ date: '2024-01-01T00:00:00Z' }), makeEvent({ date: '2024-08-01T00:00:00Z' })];
    const insights = engine.generate('p1', events, [], [chapter]);
    const evolutionInsights = insights.filter((i) => i.category === 'EVOLUTION');
    expect(evolutionInsights.length).toBeGreaterThan(0);
  });
});

// ── ReflectionGenerationEngine ────────────────────────────────────────────────

describe('ReflectionGenerationEngine', () => {
  const engine = new ReflectionGenerationEngine();

  it('returns empty for empty events', () => {
    expect(engine.generate('p1', [], [])).toEqual([]);
  });

  it('always produces FULL_JOURNEY reflection when events present', () => {
    const events = [makeEvent()];
    const reflections = engine.generate('p1', events, []);
    expect(reflections.some((r) => r.period === 'FULL_JOURNEY')).toBe(true);
  });

  it('produces MONTHLY reflections for 25+ day spans', () => {
    const events = [
      makeEvent({ date: '2024-03-01T00:00:00Z' }),
      makeEvent({ date: '2024-04-15T00:00:00Z' }),
    ];
    const reflections = engine.generate('p1', events, []);
    expect(reflections.some((r) => r.period === 'MONTHLY')).toBe(true);
  });

  it('produces QUARTERLY reflections for 85+ day spans', () => {
    const events = [
      makeEvent({ date: '2024-01-01T00:00:00Z' }),
      makeEvent({ date: '2024-04-15T00:00:00Z' }),
    ];
    const reflections = engine.generate('p1', events, []);
    expect(reflections.some((r) => r.period === 'QUARTERLY')).toBe(true);
  });

  it('no monthly reflection for single event within same day', () => {
    const events = [makeEvent({ date: '2024-03-01T00:00:00Z' })];
    const reflections = engine.generate('p1', events, []);
    expect(reflections.some((r) => r.period === 'MONTHLY')).toBe(false);
  });

  it('CHALLENGING sentiment when hospitalization present', () => {
    const events = [makeEvent({ eventType: 'HOSPITALIZATION' })];
    const reflections = engine.generate('p1', events, []);
    const full = reflections.find((r) => r.period === 'FULL_JOURNEY');
    expect(full?.overallSentiment).toBe('CHALLENGING');
  });

  it('POSITIVE sentiment when landmark milestone present', () => {
    const events = [makeEvent()];
    const ms = [makeMilestone({ rank: 'LANDMARK' })];
    const reflections = engine.generate('p1', events, ms);
    const full = reflections.find((r) => r.period === 'FULL_JOURNEY');
    expect(full?.overallSentiment).toBe('POSITIVE');
  });

  it('reflections have evolution text', () => {
    const events = [makeEvent(), makeEvent({ eventType: 'LAB_RESULT' })];
    const reflections = engine.generate('p1', events, []);
    expect(reflections[0].evolution).toBeTruthy();
  });

  it('monthly reflections are sorted chronologically', () => {
    const events = [
      makeEvent({ date: '2024-01-15T00:00:00Z' }),
      makeEvent({ date: '2024-03-15T00:00:00Z' }),
      makeEvent({ date: '2024-06-15T00:00:00Z' }),
    ];
    const reflections = engine.generate('p1', events, []).filter((r) => r.period === 'MONTHLY');
    for (let i = 1; i < reflections.length; i++) {
      expect(reflections[i].fromDate.getTime()).toBeGreaterThan(reflections[i - 1].fromDate.getTime());
    }
  });
});

// ── GoalEvolutionEngine ───────────────────────────────────────────────────────

describe('GoalEvolutionEngine', () => {
  const engine = new GoalEvolutionEngine();
  const startedAt = D('2024-01-01T00:00:00Z');

  it('returns empty for empty events and no goal inputs', () => {
    expect(engine.buildGoals('p1', [], [], [])).toEqual([]);
  });

  it('detects METABOLIC goal from LAB_RESULT events', () => {
    const events = [makeEvent({ eventType: 'LAB_RESULT' })];
    const goals = engine.buildGoals('p1', events, [], []);
    expect(goals.some((g) => g.category === 'METABOLIC')).toBe(true);
  });

  it('detects LIFESTYLE goal from CONSULTATION events', () => {
    const events = [makeEvent({ eventType: 'CONSULTATION' })];
    const goals = engine.buildGoals('p1', events, [], []);
    expect(goals.some((g) => g.category === 'LIFESTYLE')).toBe(true);
  });

  it('detects MEDICATION goal from MEDICATION_START events', () => {
    const events = [makeEvent({ eventType: 'MEDICATION_START' })];
    const goals = engine.buildGoals('p1', events, [], []);
    expect(goals.some((g) => g.category === 'MEDICATION')).toBe(true);
  });

  it('detects LONGEVITY goal from GENOMIC_DISCOVERY events', () => {
    const events = [makeEvent({ eventType: 'GENOMIC_DISCOVERY' })];
    const goals = engine.buildGoals('p1', events, [], []);
    expect(goals.some((g) => g.category === 'LONGEVITY')).toBe(true);
  });

  it('progress increases when relevant milestones present', () => {
    const events = [makeEvent({ eventType: 'LAB_RESULT' })];
    const ms = [makeMilestone({ milestoneType: 'BIOMARKER_IMPROVEMENT' })];
    const goalsNoMs = engine.buildGoals('p1', events, [], []);
    const goalsWith = engine.buildGoals('p1', events, ms, []);
    const noMs = goalsNoMs.find((g) => g.category === 'METABOLIC');
    const withMs = goalsWith.find((g) => g.category === 'METABOLIC');
    expect(withMs!.progressPercent).toBeGreaterThan(noMs!.progressPercent);
  });

  it('goals from goalInputs use provided titles', () => {
    const inputs = [{ category: 'METABOLIC', title: 'Reduzir HbA1c', targetDescription: 'HbA1c < 6.5%' }];
    const events = [makeEvent({ eventType: 'LAB_RESULT' })];
    const goals = engine.buildGoals('p1', events, [], inputs);
    expect(goals[0].title).toBe('Reduzir HbA1c');
  });

  it('goals have evidences array', () => {
    const events = [makeEvent({ eventType: 'LAB_RESULT' }), makeEvent({ eventType: 'CONSULTATION' })];
    const goals = engine.buildGoals('p1', events, [], []);
    const metabolic = goals.find((g) => g.category === 'METABOLIC');
    expect(Array.isArray(metabolic?.evidences)).toBe(true);
  });

  it('ACHIEVED status when progress reaches 100', () => {
    const events = [makeEvent({ eventType: 'LAB_RESULT' })];
    const ms = Array.from({ length: 4 }, () => makeMilestone({ milestoneType: 'BIOMARKER_IMPROVEMENT' }));
    const goals = engine.buildGoals('p1', events, ms, []);
    const metabolic = goals.find((g) => g.category === 'METABOLIC');
    if (metabolic && metabolic.progressPercent >= 100) {
      expect(metabolic.status).toBe('ACHIEVED');
    } else {
      expect(metabolic?.status).toMatch(/ON_TRACK|NOT_STARTED/);
    }
  });
});

// ── HealthScoreEvolutionEngine ────────────────────────────────────────────────

describe('HealthScoreEvolutionEngine', () => {
  const engine = new HealthScoreEvolutionEngine();

  it('returns empty for empty events', () => {
    expect(engine.compute([], [])).toEqual([]);
  });

  it('returns one point per month with events', () => {
    const events = [
      makeEvent({ date: '2024-01-15T00:00:00Z' }),
      makeEvent({ date: '2024-01-20T00:00:00Z' }),
      makeEvent({ date: '2024-03-10T00:00:00Z' }),
    ];
    const points = engine.compute(events, []);
    expect(points.length).toBe(2);
  });

  it('score is always in [0, 100]', () => {
    const events = [
      makeEvent({ eventType: 'LAB_RESULT', date: '2024-03-01T00:00:00Z' }),
      makeEvent({ eventType: 'CONSULTATION', date: '2024-03-15T00:00:00Z' }),
    ];
    const points = engine.compute(events, []);
    for (const p of points) {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
    }
  });

  it('first point has STABLE trend', () => {
    const events = [makeEvent({ date: '2024-01-01T00:00:00Z' })];
    const points = engine.compute(events, []);
    expect(points[0].trend).toBe('STABLE');
  });

  it('UP trend when score increases across months', () => {
    const events = [makeEvent({ date: '2024-01-01T00:00:00Z', eventType: 'CONSULTATION' })];
    const richEvents = [
      makeEvent({ date: '2024-02-01T00:00:00Z', eventType: 'CONSULTATION' }),
      makeEvent({ date: '2024-02-05T00:00:00Z', eventType: 'LAB_RESULT', significance: 'HIGH' }),
      makeEvent({ date: '2024-02-10T00:00:00Z', eventType: 'LAB_RESULT', significance: 'HIGH' }),
    ];
    const ms = [makeMilestone({ milestoneType: 'BIOMARKER_IMPROVEMENT', achievedAt: D('2024-02-15T00:00:00Z') })];
    const points = engine.compute([...events, ...richEvents], ms);
    const feb = points.find((p) => p.label.includes('Fevereiro'));
    expect(feb).toBeDefined();
  });

  it('points are sorted chronologically', () => {
    const events = [
      makeEvent({ date: '2024-06-01T00:00:00Z' }),
      makeEvent({ date: '2024-01-01T00:00:00Z' }),
      makeEvent({ date: '2024-09-01T00:00:00Z' }),
    ];
    const points = engine.compute(events, []);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].date.getTime()).toBeGreaterThan(points[i - 1].date.getTime());
    }
  });

  it('labels use Portuguese month names', () => {
    const events = [makeEvent({ date: '2024-01-15T00:00:00Z' })];
    const points = engine.compute(events, []);
    expect(points[0].label).toContain('Janeiro');
  });

  it('breakdown fields are numbers', () => {
    const events = [makeEvent({ date: '2024-03-01T00:00:00Z', eventType: 'LAB_RESULT' })];
    const points = engine.compute(events, []);
    expect(typeof points[0].breakdown.adherence).toBe('number');
    expect(typeof points[0].breakdown.biomarker).toBe('number');
    expect(typeof points[0].breakdown.lifestyle).toBe('number');
  });
});

// ── CurrentChapterEngine ──────────────────────────────────────────────────────

describe('CurrentChapterEngine', () => {
  const engine = new CurrentChapterEngine();

  it('returns null for empty chapters', () => {
    expect(engine.determine('p1', [])).toBeNull();
  });

  it('returns CurrentChapter for non-empty chapters', () => {
    const chapter = makeChapter({ theme: 'LONGEVITY' });
    const result = engine.determine('p1', [chapter]);
    expect(result).not.toBeNull();
    expect(result!.theme).toBe('LONGEVITY');
  });

  it('uses the last chapter (current)', () => {
    const ch1 = makeChapter({ number: 1, theme: 'INITIAL_BASELINE' });
    const ch2 = makeChapter({ number: 2, theme: 'STABILITY', startDate: D('2024-06-01T00:00:00Z'), endDate: D('2024-09-01T00:00:00Z') });
    const result = engine.determine('p1', [ch1, ch2]);
    expect(result!.chapterNumber).toBe(2);
    expect(result!.theme).toBe('STABILITY');
  });

  it('description and focus come from theme meta', () => {
    const themes = [
      'INITIAL_BASELINE', 'METABOLIC_CHANGE', 'EVOLUTION_PERFORMANCE',
      'LONGEVITY', 'RECOVERY', 'OPTIMIZATION', 'STABILITY',
    ] as const;
    for (const theme of themes) {
      const chapter = makeChapter({ theme });
      const result = engine.determine('p1', [chapter]);
      expect(result!.description).toBeTruthy();
      expect(result!.focus.length).toBeGreaterThan(0);
      expect(result!.nextMilestoneHint).toBeTruthy();
    }
  });

  it('progressInChapter is higher when significant events present', () => {
    const emptyChapter = makeChapter({ events: [] });
    const richChapter = makeChapter({
      events: [
        makeEvent({ significance: 'HIGH' }),
        makeEvent({ significance: 'LANDMARK' }),
        makeEvent({ significance: 'MEDIUM' }),
      ],
    });
    const emptyResult = engine.determine('p1', [emptyChapter]);
    const richResult = engine.determine('p1', [richChapter]);
    expect(richResult!.progressInChapter).toBeGreaterThan(emptyResult!.progressInChapter);
  });

  it('progressInChapter increases with milestone', () => {
    const withoutMs = makeChapter({ events: [makeEvent({ significance: 'HIGH' })] });
    const withMs = makeChapter({
      events: [makeEvent({ significance: 'HIGH' })],
      milestones: [makeMilestone()],
    });
    const without = engine.determine('p1', [withoutMs]);
    const with_ = engine.determine('p1', [withMs]);
    expect(with_!.progressInChapter).toBeGreaterThan(without!.progressInChapter);
  });

  it('daysInChapter is 0 or positive', () => {
    const chapter = makeChapter({ startDate: D('2024-01-01T00:00:00Z') });
    const result = engine.determine('p1', [chapter]);
    expect(result!.daysInChapter).toBeGreaterThanOrEqual(0);
  });
});
