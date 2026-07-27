import { JourneyPhase } from '../entities/journey-phase.entity.js';
import { JourneyPath } from '../entities/journey-path.entity.js';
import { AdaptiveRecommendation } from '../entities/adaptive-recommendation.entity.js';
import { HabitPattern } from '../entities/habit-pattern.entity.js';
import { MilestonePrediction } from '../entities/milestone-prediction.entity.js';
import { JourneyReport } from '../entities/journey-report.entity.js';

// ── JourneyPhase ─────────────────────────────────────────────────────────────

describe('JourneyPhase', () => {
  const makePhase = (status: 'COMPLETED' | 'CURRENT' | 'UPCOMING' | 'FUTURE') =>
    new JourneyPhase({
      type: 'METABOLIC_CONTROL',
      status,
      order: 4,
      keyActions: ['Ação 1', 'Ação 2'],
      successCriteria: ['Critério 1'],
    });

  it('exposes label and description from metadata', () => {
    const p = makePhase('CURRENT');
    expect(p.label).toBe('Controle Metabólico');
    expect(p.description).toBeTruthy();
    expect(p.estimatedDurationWeeks).toBe(16);
  });

  it('isCurrent() true when status is CURRENT', () => {
    expect(makePhase('CURRENT').isCurrent()).toBe(true);
    expect(makePhase('COMPLETED').isCurrent()).toBe(false);
  });

  it('isCompleted() true when status is COMPLETED', () => {
    expect(makePhase('COMPLETED').isCompleted()).toBe(true);
    expect(makePhase('FUTURE').isCompleted()).toBe(false);
  });

  it('isAhead() true for UPCOMING or FUTURE', () => {
    expect(makePhase('UPCOMING').isAhead()).toBe(true);
    expect(makePhase('FUTURE').isAhead()).toBe(true);
    expect(makePhase('CURRENT').isAhead()).toBe(false);
    expect(makePhase('COMPLETED').isAhead()).toBe(false);
  });
});

// ── JourneyPath ──────────────────────────────────────────────────────────────

describe('JourneyPath', () => {
  const makePhase = (status: 'COMPLETED' | 'CURRENT' | 'UPCOMING' | 'FUTURE', type: string) =>
    new JourneyPhase({
      type: type as 'INITIAL_ASSESSMENT',
      status,
      order: 1,
      keyActions: [],
      successCriteria: [],
    });

  const makePath = () =>
    new JourneyPath({
      patientId: 'p1',
      phases: [
        makePhase('COMPLETED', 'INITIAL_ASSESSMENT'),
        makePhase('COMPLETED', 'BASELINE_ESTABLISHMENT'),
        makePhase('CURRENT', 'HABIT_FORMATION'),
        makePhase('UPCOMING', 'METABOLIC_CONTROL'),
        makePhase('FUTURE', 'CONSOLIDATION'),
      ],
      currentPhaseIndex: 2,
      progressPercentage: 40,
      overallDirection: 'ADVANCING',
      narrative: 'Jornada ativa.',
    });

  it('getCurrentPhase() returns the CURRENT phase', () => {
    const path = makePath();
    expect(path.getCurrentPhase()?.type).toBe('HABIT_FORMATION');
  });

  it('getNextPhase() returns the UPCOMING phase', () => {
    const path = makePath();
    expect(path.getNextPhase()?.type).toBe('METABOLIC_CONTROL');
  });

  it('getCompletedPhases() returns only COMPLETED phases', () => {
    const path = makePath();
    expect(path.getCompletedPhases()).toHaveLength(2);
  });

  it('getUpcomingPhases() returns UPCOMING and FUTURE phases', () => {
    const path = makePath();
    expect(path.getUpcomingPhases()).toHaveLength(2);
  });

  it('getPhaseByType() finds phase by type', () => {
    const path = makePath();
    expect(path.getPhaseByType('CONSOLIDATION')).toBeDefined();
    expect(path.getPhaseByType('PERFORMANCE')).toBeUndefined();
  });

  it('isAdvancing() returns true when direction is ADVANCING', () => {
    expect(makePath().isAdvancing()).toBe(true);
  });

  it('needsAttention() returns true when direction is NEEDS_ATTENTION', () => {
    const path = new JourneyPath({
      patientId: 'p1',
      phases: [],
      currentPhaseIndex: 0,
      progressPercentage: 0,
      overallDirection: 'NEEDS_ATTENTION',
      narrative: 'x',
    });
    expect(path.needsAttention()).toBe(true);
    expect(makePath().needsAttention()).toBe(false);
  });

  it('clamps currentPhaseIndex to valid range', () => {
    const path = new JourneyPath({
      patientId: 'p1',
      phases: [makePhase('CURRENT', 'INITIAL_ASSESSMENT')],
      currentPhaseIndex: 99,
      progressPercentage: 50,
      overallDirection: 'STABLE',
      narrative: 'x',
    });
    expect(path.currentPhaseIndex).toBe(0);
  });

  it('clamps progressPercentage to [0, 100]', () => {
    const over = new JourneyPath({
      patientId: 'p1',
      phases: [],
      currentPhaseIndex: 0,
      progressPercentage: 150,
      overallDirection: 'STABLE',
      narrative: 'x',
    });
    expect(over.progressPercentage).toBe(100);

    const under = new JourneyPath({
      patientId: 'p1',
      phases: [],
      currentPhaseIndex: 0,
      progressPercentage: -5,
      overallDirection: 'STABLE',
      narrative: 'x',
    });
    expect(under.progressPercentage).toBe(0);
  });
});

// ── AdaptiveRecommendation ───────────────────────────────────────────────────

describe('AdaptiveRecommendation', () => {
  const makeRec = (priority: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM') =>
    new AdaptiveRecommendation({
      patientId: 'p1',
      area: 'MONITORING',
      priority,
      title: 'Consulta urgente',
      rationale: 'Risco identificado',
      actions: ['Agendar consulta'],
      evidenceBasis: ['Hospitalização recente'],
      isClinicianReviewRequired: priority === 'IMMEDIATE',
    });

  it('generates a unique id', () => {
    const r1 = makeRec('IMMEDIATE');
    const r2 = makeRec('IMMEDIATE');
    expect(r1.id).not.toBe(r2.id);
  });

  it('isUrgent() true only for IMMEDIATE', () => {
    expect(makeRec('IMMEDIATE').isUrgent()).toBe(true);
    expect(makeRec('SHORT_TERM').isUrgent()).toBe(false);
    expect(makeRec('LONG_TERM').isUrgent()).toBe(false);
  });

  it('isLongTerm() true only for LONG_TERM', () => {
    expect(makeRec('LONG_TERM').isLongTerm()).toBe(true);
    expect(makeRec('IMMEDIATE').isLongTerm()).toBe(false);
  });

  it('toSummary() contains title and area', () => {
    const s = makeRec('IMMEDIATE').toSummary();
    expect(s.title).toBe('Consulta urgente');
    expect(s.area).toBe('MONITORING');
    expect(s.priority).toBe('IMMEDIATE');
  });
});

// ── HabitPattern ─────────────────────────────────────────────────────────────

describe('HabitPattern', () => {
  const makeHabit = (trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'EMERGING', score: number) =>
    new HabitPattern({
      habitType: 'MEDICAL_FOLLOW_UP',
      trend,
      consistencyScore: score,
      frequencyPerMonth: 2,
      lastObservedAt: new Date(),
      evidences: ['2 consultas registradas'],
      recommendation: 'Manter ritmo.',
    });

  it('exposes label from HABIT_LABELS', () => {
    const h = makeHabit('STABLE', 70);
    expect(h.label).toBe('Consultas médicas');
  });

  it('clamps consistencyScore to [0, 100]', () => {
    const over = new HabitPattern({
      habitType: 'LAB_MONITORING',
      trend: 'STABLE',
      consistencyScore: 150,
      frequencyPerMonth: 1,
      lastObservedAt: new Date(),
      evidences: [],
      recommendation: '',
    });
    expect(over.consistencyScore).toBe(100);

    const under = new HabitPattern({
      habitType: 'LAB_MONITORING',
      trend: 'STABLE',
      consistencyScore: -10,
      frequencyPerMonth: 1,
      lastObservedAt: new Date(),
      evidences: [],
      recommendation: '',
    });
    expect(under.consistencyScore).toBe(0);
  });

  it('isHealthy() true when score >= 60 and trend is IMPROVING or STABLE', () => {
    expect(makeHabit('IMPROVING', 60).isHealthy()).toBe(true);
    expect(makeHabit('STABLE', 75).isHealthy()).toBe(true);
    expect(makeHabit('DECLINING', 80).isHealthy()).toBe(false);
    expect(makeHabit('STABLE', 59).isHealthy()).toBe(false);
  });

  it('needsAttention() true when DECLINING or score < 40', () => {
    expect(makeHabit('DECLINING', 70).needsAttention()).toBe(true);
    expect(makeHabit('STABLE', 30).needsAttention()).toBe(true);
    expect(makeHabit('STABLE', 50).needsAttention()).toBe(false);
  });

  it('isEmerging() true when trend is EMERGING', () => {
    expect(makeHabit('EMERGING', 20).isEmerging()).toBe(true);
    expect(makeHabit('STABLE', 20).isEmerging()).toBe(false);
  });

  it('toSummary() returns structured object', () => {
    const s = makeHabit('STABLE', 70).toSummary();
    expect(s.habitType).toBe('MEDICAL_FOLLOW_UP');
    expect(s.label).toBe('Consultas médicas');
    expect(s.trend).toBe('STABLE');
    expect(s.consistencyScore).toBe(70);
  });
});

// ── MilestonePrediction ───────────────────────────────────────────────────────

describe('MilestonePrediction', () => {
  const makePred = (confidence: 'LOW' | 'MODERATE' | 'HIGH') =>
    new MilestonePrediction({
      patientId: 'p1',
      title: 'Meta atingida',
      description: 'Progresso excelente.',
      category: 'GOAL_ACHIEVEMENT',
      estimatedTimeframe: 'Próximas 4 semanas',
      confidence,
      requiredActions: ['Manter rotina'],
      basisDescription: 'Meta 80% concluída.',
    });

  it('generates unique id', () => {
    const p1 = makePred('HIGH');
    const p2 = makePred('HIGH');
    expect(p1.id).not.toBe(p2.id);
  });

  it('isHighConfidence() true only for HIGH', () => {
    expect(makePred('HIGH').isHighConfidence()).toBe(true);
    expect(makePred('MODERATE').isHighConfidence()).toBe(false);
    expect(makePred('LOW').isHighConfidence()).toBe(false);
  });

  it('isRoutine() true for ROUTINE_FOLLOW_UP category', () => {
    const routine = new MilestonePrediction({
      patientId: 'p1',
      title: 'Consulta',
      description: 'Acompanhamento.',
      category: 'ROUTINE_FOLLOW_UP',
      estimatedTimeframe: '2 semanas',
      confidence: 'HIGH',
      requiredActions: [],
      basisDescription: '',
    });
    expect(routine.isRoutine()).toBe(true);
    expect(makePred('HIGH').isRoutine()).toBe(false);
  });

  it('toSummary() returns structured object', () => {
    const s = makePred('HIGH').toSummary();
    expect(s.title).toBe('Meta atingida');
    expect(s.confidence).toBe('HIGH');
    expect(s.category).toBe('GOAL_ACHIEVEMENT');
  });
});

// ── JourneyReport ─────────────────────────────────────────────────────────────

describe('JourneyReport', () => {
  const makeRec = (priority: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM', title: string) =>
    new AdaptiveRecommendation({
      patientId: 'p1',
      area: 'MONITORING',
      priority,
      title,
      rationale: 'rationale',
      actions: [],
      evidenceBasis: [],
      isClinicianReviewRequired: false,
    });

  const makeHabit = (healthy: boolean) =>
    new HabitPattern({
      habitType: 'MEDICAL_FOLLOW_UP',
      trend: healthy ? 'STABLE' : 'DECLINING',
      consistencyScore: healthy ? 70 : 20,
      frequencyPerMonth: 2,
      lastObservedAt: new Date(),
      evidences: [],
      recommendation: '',
    });

  const makePred = (confidence: 'LOW' | 'MODERATE' | 'HIGH') =>
    new MilestonePrediction({
      patientId: 'p1',
      title: 'Marco',
      description: 'desc',
      category: 'GOAL_ACHIEVEMENT',
      estimatedTimeframe: '4 semanas',
      confidence,
      requiredActions: [],
      basisDescription: '',
    });

  const makePath = () =>
    new JourneyPath({
      patientId: 'p1',
      phases: [
        new JourneyPhase({ type: 'INITIAL_ASSESSMENT', status: 'CURRENT', order: 1, keyActions: [], successCriteria: [] }),
        new JourneyPhase({ type: 'BASELINE_ESTABLISHMENT', status: 'UPCOMING', order: 2, keyActions: [], successCriteria: [] }),
      ],
      currentPhaseIndex: 0,
      progressPercentage: 0,
      overallDirection: 'STABLE',
      narrative: 'Start.',
    });

  it('sorts recommendations by priority (IMMEDIATE first)', () => {
    const report = new JourneyReport({
      patientId: 'p1',
      journeyPath: makePath(),
      recommendations: [
        makeRec('LONG_TERM', 'Long'),
        makeRec('IMMEDIATE', 'Urgent'),
        makeRec('SHORT_TERM', 'Short'),
      ],
      habitPatterns: [],
      milestonePredictions: [],
    });
    expect(report.recommendations[0].priority).toBe('IMMEDIATE');
    expect(report.recommendations[1].priority).toBe('SHORT_TERM');
    expect(report.recommendations[2].priority).toBe('LONG_TERM');
  });

  it('getImmediateRecommendations() filters correctly', () => {
    const report = new JourneyReport({
      patientId: 'p1',
      journeyPath: makePath(),
      recommendations: [makeRec('IMMEDIATE', 'A'), makeRec('SHORT_TERM', 'B')],
      habitPatterns: [],
      milestonePredictions: [],
    });
    expect(report.getImmediateRecommendations()).toHaveLength(1);
    expect(report.getImmediateRecommendations()[0].title).toBe('A');
  });

  it('getHealthyHabits() and getHabitsNeedingAttention() filter correctly', () => {
    const report = new JourneyReport({
      patientId: 'p1',
      journeyPath: makePath(),
      recommendations: [],
      habitPatterns: [makeHabit(true), makeHabit(false)],
      milestonePredictions: [],
    });
    expect(report.getHealthyHabits()).toHaveLength(1);
    expect(report.getHabitsNeedingAttention()).toHaveLength(1);
  });

  it('getHighConfidencePredictions() returns only HIGH confidence', () => {
    const report = new JourneyReport({
      patientId: 'p1',
      journeyPath: makePath(),
      recommendations: [],
      habitPatterns: [],
      milestonePredictions: [makePred('HIGH'), makePred('LOW'), makePred('MODERATE')],
    });
    expect(report.getHighConfidencePredictions()).toHaveLength(1);
  });

  it('getNextStep() returns first IMMEDIATE recommendation title when available', () => {
    const report = new JourneyReport({
      patientId: 'p1',
      journeyPath: makePath(),
      recommendations: [makeRec('IMMEDIATE', 'Urgente: agir agora')],
      habitPatterns: [],
      milestonePredictions: [],
    });
    expect(report.getNextStep()).toBe('Urgente: agir agora');
  });

  it('getNextStep() falls back to next phase label when no IMMEDIATE recs', () => {
    const report = new JourneyReport({
      patientId: 'p1',
      journeyPath: makePath(),
      recommendations: [makeRec('SHORT_TERM', 'Short')],
      habitPatterns: [],
      milestonePredictions: [],
    });
    const step = report.getNextStep();
    expect(step).toContain('Linha de Base');
  });

  it('getNextStep() returns fallback message when no phase ahead', () => {
    const path = new JourneyPath({
      patientId: 'p1',
      phases: [new JourneyPhase({ type: 'PERFORMANCE', status: 'CURRENT', order: 8, keyActions: [], successCriteria: [] })],
      currentPhaseIndex: 0,
      progressPercentage: 100,
      overallDirection: 'ADVANCING',
      narrative: 'x',
    });
    const report = new JourneyReport({
      patientId: 'p1',
      journeyPath: path,
      recommendations: [],
      habitPatterns: [],
      milestonePredictions: [],
    });
    expect(report.getNextStep()).toContain('Manter');
  });

  it('generates a stable id containing patientId', () => {
    const r = new JourneyReport({
      patientId: 'patient-x',
      journeyPath: makePath(),
      recommendations: [],
      habitPatterns: [],
      milestonePredictions: [],
    });
    expect(r.id).toContain('patient-x');
  });
});
