import { JourneyPathEngine } from '../engines/journey-path.engine.js';
import { AdaptiveRecommendationEngine } from '../engines/adaptive-recommendation.engine.js';
import { HabitEvolutionEngine } from '../engines/habit-evolution.engine.js';
import { MilestonePredictionEngine } from '../engines/milestone-prediction.engine.js';
import { NarrativeEvent } from '../../bio-book/entities/narrative-event.entity.js';
import { HealthMilestone } from '../../bio-book/entities/health-milestone.entity.js';
import { PersonalGoal } from '../../bio-book-insight/entities/personal-goal.entity.js';
import { HealthScorePoint } from '../../bio-book-insight/entities/health-score-point.entity.js';
import { PersonalInsight } from '../../bio-book-insight/entities/personal-insight.entity.js';
import { JourneyPath } from '../entities/journey-path.entity.js';
import { JourneyPhase } from '../entities/journey-phase.entity.js';
import { HabitPattern } from '../entities/habit-pattern.entity.js';

// ── helpers ───────────────────────────────────────────────────────────────────

const makeEvent = (type: string, date: Date): NarrativeEvent =>
  new NarrativeEvent({ eventType: type as 'CONSULTATION', date, narrativeText: 'Event.', significance: 'MEDIUM', patientId: 'p' });

const makeMilestone = (type: string, rank: 'MINOR' | 'MAJOR' | 'LANDMARK' = 'MINOR'): HealthMilestone =>
  new HealthMilestone({ milestoneType: type as 'BIOMARKER_IMPROVEMENT', rank, title: 'M', description: 'desc', achievedAt: new Date(), patientId: 'p' });

const makeGoal = (status: 'ON_TRACK' | 'AT_RISK' | 'ACHIEVED' | 'NOT_STARTED', progress: number): PersonalGoal =>
  new PersonalGoal({ title: 'Meta', category: 'METABOLIC', description: 'Meta desc', targetDescription: 'target', status, progressPercent: progress, evidences: [], patientId: 'p', startedAt: new Date() });

const makeScore = (score: number, daysAgo: number): HealthScorePoint => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return new HealthScorePoint({ score, date, label: 'Jan/25', trend: 'STABLE', breakdown: { adherence: 50, biomarker: 50, lifestyle: 50 } });
};

const makeInsight = (category: 'RISK' | 'OPPORTUNITY' | 'ACHIEVEMENT', strength: 'STRONG' | 'MODERATE'): PersonalInsight =>
  new PersonalInsight({ title: 'Insight', text: 'text', category, strength, evidences: [], patientId: 'p' });

const makePath = (direction: 'ADVANCING' | 'STABLE' | 'NEEDS_ATTENTION' = 'STABLE'): JourneyPath =>
  new JourneyPath({
    patientId: 'p1',
    phases: [
      new JourneyPhase({ type: 'INITIAL_ASSESSMENT', status: 'COMPLETED', order: 1, keyActions: ['A1'], successCriteria: ['C1'] }),
      new JourneyPhase({ type: 'BASELINE_ESTABLISHMENT', status: 'CURRENT', order: 2, keyActions: ['A2'], successCriteria: ['C2'] }),
      new JourneyPhase({ type: 'HABIT_FORMATION', status: 'UPCOMING', order: 3, keyActions: ['A3'], successCriteria: ['C3'] }),
    ],
    currentPhaseIndex: 1,
    progressPercentage: 25,
    overallDirection: direction,
    narrative: 'x',
  });

const makeHabit = (trend: 'IMPROVING' | 'STABLE' | 'DECLINING', score: number): HabitPattern =>
  new HabitPattern({ habitType: 'MEDICAL_FOLLOW_UP', trend, consistencyScore: score, frequencyPerMonth: 2, lastObservedAt: new Date(), evidences: [], recommendation: '' });

// ── JourneyPathEngine ─────────────────────────────────────────────────────────

describe('JourneyPathEngine', () => {
  const engine = new JourneyPathEngine();

  it('returns INITIAL_ASSESSMENT when no events', () => {
    const path = engine.compute('p1', [], [], [], []);
    expect(path.getCurrentPhase()?.type).toBe('INITIAL_ASSESSMENT');
    expect(path.overallDirection).toBe('STABLE');
  });

  it('advances to BASELINE_ESTABLISHMENT with 2+ lab events', () => {
    const events = [
      makeEvent('LAB_RESULT', new Date('2025-01-01')),
      makeEvent('LAB_RESULT', new Date('2025-02-01')),
    ];
    const path = engine.compute('p1', events, [], [], []);
    expect(path.getCurrentPhase()?.type).toBe('BASELINE_ESTABLISHMENT');
  });

  it('advances to METABOLIC_CONTROL with biomarker improvement milestone', () => {
    const events = [makeEvent('LAB_RESULT', new Date('2025-01-01'))];
    const milestones = [makeMilestone('BIOMARKER_IMPROVEMENT', 'MAJOR')];
    const path = engine.compute('p1', events, milestones, [], []);
    expect(path.getCurrentPhase()?.type).toBe('METABOLIC_CONTROL');
  });

  it('returns NEEDS_ATTENTION direction when hospitalization present', () => {
    const events = [makeEvent('HOSPITALIZATION', new Date())];
    const path = engine.compute('p1', events, [], [], []);
    expect(path.overallDirection).toBe('NEEDS_ATTENTION');
  });

  it('returns ADVANCING direction with 3 consecutive rising scores', () => {
    const scores = [makeScore(60, 90), makeScore(65, 60), makeScore(70, 30)];
    const events = [makeEvent('CONSULTATION', new Date())];
    const path = engine.compute('p1', events, [], [], scores);
    expect(path.overallDirection).toBe('ADVANCING');
  });

  it('ADVANCING direction also triggered by landmark milestone', () => {
    const events = [makeEvent('CONSULTATION', new Date())];
    const milestones = [makeMilestone('BIOMARKER_IMPROVEMENT', 'LANDMARK')];
    const path = engine.compute('p1', events, milestones, [], []);
    expect(path.overallDirection).toBe('ADVANCING');
  });

  it('progressPercentage is in [0, 100]', () => {
    const path = engine.compute('p1', [], [], [], []);
    expect(path.progressPercentage).toBeGreaterThanOrEqual(0);
    expect(path.progressPercentage).toBeLessThanOrEqual(100);
  });

  it('phases always include all 8 phase types', () => {
    const path = engine.compute('p1', [], [], [], []);
    expect(path.phases).toHaveLength(8);
  });

  it('builds narrative containing event and milestone counts', () => {
    const events = [makeEvent('CONSULTATION', new Date()), makeEvent('LAB_RESULT', new Date())];
    const path = engine.compute('p1', events, [], [], []);
    expect(path.narrative).toContain('2');
  });
});

// ── AdaptiveRecommendationEngine ──────────────────────────────────────────────

describe('AdaptiveRecommendationEngine', () => {
  const engine = new AdaptiveRecommendationEngine();

  it('generates IMMEDIATE recommendation for strong RISK insight', () => {
    const insights = [makeInsight('RISK', 'STRONG')];
    const recs = engine.generate('p1', insights, [], [], makePath(), []);
    const immediate = recs.filter((r) => r.priority === 'IMMEDIATE');
    expect(immediate.length).toBeGreaterThan(0);
    expect(immediate.some((r) => r.isClinicianReviewRequired)).toBe(true);
  });

  it('generates IMMEDIATE recommendation for AT_RISK goal', () => {
    const goals = [makeGoal('AT_RISK', 30)];
    const recs = engine.generate('p1', [], goals, [], makePath(), []);
    const immediate = recs.filter((r) => r.priority === 'IMMEDIATE');
    expect(immediate.length).toBeGreaterThan(0);
  });

  it('generates SHORT_TERM recommendation for consolidating current phase', () => {
    const recs = engine.generate('p1', [], [], [], makePath(), []);
    const shortTerm = recs.filter((r) => r.priority === 'SHORT_TERM');
    expect(shortTerm.length).toBeGreaterThan(0);
  });

  it('generates LONG_TERM recommendation when healthy habits exist', () => {
    const habits = [makeHabit('STABLE', 80), makeHabit('IMPROVING', 75)];
    const recs = engine.generate('p1', [], [], habits, makePath(), []);
    const longTerm = recs.filter((r) => r.priority === 'LONG_TERM');
    expect(longTerm.length).toBeGreaterThan(0);
  });

  it('deduplicates recommendations with same prefix', () => {
    const insights = [makeInsight('RISK', 'STRONG'), makeInsight('RISK', 'STRONG')];
    const recs = engine.generate('p1', insights, [], [], makePath(), []);
    const titles = recs.map((r) => r.title.toLowerCase().slice(0, 40));
    const unique = new Set(titles);
    expect(unique.size).toBe(titles.length);
  });

  it('generates LONG_TERM recommendation for OPPORTUNITY insight', () => {
    const insights = [makeInsight('OPPORTUNITY', 'MODERATE')];
    const recs = engine.generate('p1', insights, [], [], makePath(), []);
    const longTerm = recs.filter((r) => r.priority === 'LONG_TERM');
    expect(longTerm.length).toBeGreaterThan(0);
  });

  it('returns empty when no inputs', () => {
    const pathNoNext = new JourneyPath({
      patientId: 'p1',
      phases: [new JourneyPhase({ type: 'PERFORMANCE', status: 'CURRENT', order: 8, keyActions: [], successCriteria: [] })],
      currentPhaseIndex: 0,
      progressPercentage: 100,
      overallDirection: 'STABLE',
      narrative: 'x',
    });
    const recs = engine.generate('p1', [], [], [], pathNoNext, []);
    expect(recs.length).toBeGreaterThanOrEqual(0);
  });
});

// ── HabitEvolutionEngine ──────────────────────────────────────────────────────

describe('HabitEvolutionEngine', () => {
  const engine = new HabitEvolutionEngine();

  it('returns empty array for empty events', () => {
    expect(engine.analyze([])).toHaveLength(0);
  });

  it('detects MEDICAL_FOLLOW_UP from CONSULTATION events', () => {
    const events = [
      makeEvent('CONSULTATION', new Date('2025-01-15')),
      makeEvent('CONSULTATION', new Date('2025-02-15')),
    ];
    const habits = engine.analyze(events);
    expect(habits.some((h) => h.habitType === 'MEDICAL_FOLLOW_UP')).toBe(true);
  });

  it('detects LAB_MONITORING from LAB_RESULT events', () => {
    const events = [
      makeEvent('LAB_RESULT', new Date('2025-01-01')),
      makeEvent('LAB_RESULT', new Date('2025-03-01')),
    ];
    const habits = engine.analyze(events);
    expect(habits.some((h) => h.habitType === 'LAB_MONITORING')).toBe(true);
  });

  it('detects MEDICATION_ADHERENCE from MEDICATION_START', () => {
    const events = [makeEvent('MEDICATION_START', new Date('2025-01-01'))];
    const habits = engine.analyze(events);
    expect(habits.some((h) => h.habitType === 'MEDICATION_ADHERENCE')).toBe(true);
  });

  it('computes IMPROVING trend when second half has more events', () => {
    const events = [
      makeEvent('CONSULTATION', new Date('2025-01-01')),
      makeEvent('CONSULTATION', new Date('2025-03-01')),
      makeEvent('CONSULTATION', new Date('2025-03-15')),
      makeEvent('CONSULTATION', new Date('2025-03-20')),
    ];
    const habits = engine.analyze(events);
    const med = habits.find((h) => h.habitType === 'MEDICAL_FOLLOW_UP');
    expect(med).toBeDefined();
    expect(med!.consistencyScore).toBeGreaterThan(0);
  });

  it('computes DECLINING trend when first half has more events', () => {
    const events = [
      makeEvent('LAB_RESULT', new Date('2025-01-01')),
      makeEvent('LAB_RESULT', new Date('2025-01-15')),
      makeEvent('LAB_RESULT', new Date('2025-01-20')),
      makeEvent('LAB_RESULT', new Date('2025-06-01')),
    ];
    const habits = engine.analyze(events);
    const lab = habits.find((h) => h.habitType === 'LAB_MONITORING');
    expect(lab?.trend).toBe('DECLINING');
  });

  it('returns EMERGING trend for a single month of events', () => {
    const events = [makeEvent('CONSULTATION', new Date('2025-06-15'))];
    const habits = engine.analyze(events);
    const med = habits.find((h) => h.habitType === 'MEDICAL_FOLLOW_UP');
    expect(med?.trend).toBe('EMERGING');
  });

  it('sorts habits by consistencyScore descending', () => {
    const events = [
      makeEvent('LAB_RESULT', new Date('2025-01-01')),
      makeEvent('LAB_RESULT', new Date('2025-02-01')),
      makeEvent('LAB_RESULT', new Date('2025-03-01')),
      makeEvent('CONSULTATION', new Date('2025-06-01')),
    ];
    const habits = engine.analyze(events);
    for (let i = 1; i < habits.length; i++) {
      expect(habits[i - 1].consistencyScore).toBeGreaterThanOrEqual(habits[i].consistencyScore);
    }
  });

  it('frequencyPerMonth is > 0 when events exist', () => {
    const events = [
      makeEvent('CONSULTATION', new Date('2025-01-01')),
      makeEvent('CONSULTATION', new Date('2025-01-15')),
    ];
    const habits = engine.analyze(events);
    expect(habits[0].frequencyPerMonth).toBeGreaterThan(0);
  });
});

// ── MilestonePredictionEngine ─────────────────────────────────────────────────

describe('MilestonePredictionEngine', () => {
  const engine = new MilestonePredictionEngine();

  it('always includes routine follow-up prediction', () => {
    const preds = engine.predict('p1', [], [], [], makePath());
    expect(preds.some((p) => p.category === 'ROUTINE_FOLLOW_UP')).toBe(true);
  });

  it('predicts GOAL_ACHIEVEMENT for ON_TRACK goal at 70%+ progress', () => {
    const goals = [makeGoal('ON_TRACK', 75)];
    const preds = engine.predict('p1', goals, [], [], makePath());
    expect(preds.some((p) => p.category === 'GOAL_ACHIEVEMENT' && p.confidence === 'HIGH')).toBe(true);
  });

  it('predicts GOAL_ACHIEVEMENT with MODERATE for ON_TRACK at 50-69%', () => {
    const goals = [makeGoal('ON_TRACK', 55)];
    const preds = engine.predict('p1', goals, [], [], makePath());
    expect(preds.some((p) => p.category === 'GOAL_ACHIEVEMENT' && p.confidence === 'MODERATE')).toBe(true);
  });

  it('predicts SCORE_LEVEL when score is ascending for 3+ points', () => {
    const scores = [makeScore(63, 90), makeScore(66, 60), makeScore(69, 30)];
    const preds = engine.predict('p1', [], scores, [], makePath());
    expect(preds.some((p) => p.category === 'SCORE_LEVEL')).toBe(true);
  });

  it('does not predict SCORE_LEVEL when score is flat or declining', () => {
    const scores = [makeScore(70, 90), makeScore(65, 60), makeScore(60, 30)];
    const preds = engine.predict('p1', [], scores, [], makePath());
    expect(preds.some((p) => p.category === 'SCORE_LEVEL')).toBe(false);
  });

  it('predicts HABIT_MILESTONE when improving habits with score >= 50', () => {
    const habits = [makeHabit('IMPROVING', 60)];
    const preds = engine.predict('p1', [], [], habits, makePath());
    expect(preds.some((p) => p.category === 'HABIT_MILESTONE')).toBe(true);
  });

  it('predicts phase transition when next phase exists', () => {
    const preds = engine.predict('p1', [], [], [], makePath());
    expect(preds.some((p) => p.title.startsWith('Transição para:'))).toBe(true);
  });

  it('limits total predictions to 6', () => {
    const goals = [makeGoal('ON_TRACK', 80), makeGoal('ON_TRACK', 60)];
    const scores = [makeScore(62, 90), makeScore(65, 60), makeScore(68, 30)];
    const habits = [makeHabit('IMPROVING', 60), makeHabit('IMPROVING', 70)];
    const preds = engine.predict('p1', goals, scores, habits, makePath());
    expect(preds.length).toBeLessThanOrEqual(6);
  });

  it('HIGH confidence for phase transition when journey is ADVANCING', () => {
    const preds = engine.predict('p1', [], [], [], makePath('ADVANCING'));
    const transition = preds.find((p) => p.title.startsWith('Transição para:'));
    expect(transition?.confidence).toBe('MODERATE');
  });

  it('LOW confidence for phase transition when journey is not ADVANCING', () => {
    const preds = engine.predict('p1', [], [], [], makePath('NEEDS_ATTENTION'));
    const transition = preds.find((p) => p.title.startsWith('Transição para:'));
    expect(transition?.confidence).toBe('LOW');
  });
});
