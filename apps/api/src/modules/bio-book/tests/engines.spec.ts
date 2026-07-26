import { TimelineNarrativeEngine } from '../engines/timeline-narrative.engine.js';
import { MilestoneRecognitionEngine } from '../engines/milestone-recognition.engine.js';
import { ChapterBuilderEngine } from '../engines/chapter-builder.engine.js';
import { BioBookSummaryEngine } from '../engines/bio-book-summary.engine.js';
import { NarrativeEvent } from '../entities/narrative-event.entity.js';
import { NarrativeChapter } from '../entities/narrative-chapter.entity.js';
import { HealthMilestone } from '../entities/health-milestone.entity.js';

const D = (iso: string) => new Date(iso);

function makeNarrativeEvent(overrides?: Partial<ConstructorParameters<typeof NarrativeEvent>[0]>): NarrativeEvent {
  return new NarrativeEvent({
    patientId: 'p1',
    eventType: 'LAB_RESULT',
    date: D('2024-03-01T00:00:00Z'),
    narrativeText: 'Evento teste',
    ...overrides,
  });
}

describe('TimelineNarrativeEngine', () => {
  const engine = new TimelineNarrativeEngine();

  const rawEvents = [
    { eventType: 'LAB_RESULT', date: '2024-03-01T00:00:00Z', severity: 'MODERATE', biomarkers: { hba1c: 7.2, glucose: 110 } },
    { eventType: 'DIAGNOSIS', date: '2024-04-01T00:00:00Z', severity: 'CRITICAL', conditionName: 'Diabetes Tipo 2' },
    { eventType: 'MEDICATION', date: '2024-04-05T00:00:00Z', severity: 'MILD', drugName: 'Metformina' },
    { eventType: 'CONSULTATION', date: '2024-05-01T00:00:00Z', severity: 'INFORMATIONAL', description: 'Retorno ambulatorial' },
    { eventType: 'HOSPITALIZATION', date: '2024-06-01T00:00:00Z', severity: 'SEVERE' },
    { eventType: 'GENOMIC_EVENT', date: '2024-07-01T00:00:00Z', severity: 'MODERATE' },
    { eventType: 'THERAPEUTIC_CHANGE', date: '2024-08-01T00:00:00Z', severity: 'MILD', drugName: 'Insulina' },
    { eventType: 'CLINICAL_RECOMMENDATION', date: '2024-09-01T00:00:00Z', severity: 'INFORMATIONAL' },
  ];

  it('converts raw events to NarrativeEvent instances', () => {
    const events = engine.toNarrativeEvents('p1', rawEvents);
    expect(events.length).toBe(8);
    expect(events[0]).toBeInstanceOf(NarrativeEvent);
  });

  it('maps event types correctly', () => {
    const events = engine.toNarrativeEvents('p1', rawEvents);
    expect(events[0].eventType).toBe('LAB_RESULT');
    expect(events[1].eventType).toBe('DIAGNOSIS');
    expect(events[2].eventType).toBe('MEDICATION_START');
    expect(events[4].eventType).toBe('HOSPITALIZATION');
    expect(events[5].eventType).toBe('GENOMIC_DISCOVERY');
    expect(events[6].eventType).toBe('THERAPEUTIC_CHANGE');
    expect(events[7].eventType).toBe('CLINICAL_RECOMMENDATION');
  });

  it('maps severity to significance', () => {
    const events = engine.toNarrativeEvents('p1', rawEvents);
    expect(events[0].significance).toBe('HIGH');    // MODERATE
    expect(events[1].significance).toBe('LANDMARK'); // CRITICAL
    expect(events[2].significance).toBe('MEDIUM');  // MILD
    expect(events[3].significance).toBe('LOW');     // INFORMATIONAL
  });

  it('builds human-readable narrative text for diagnosis', () => {
    const events = engine.toNarrativeEvents('p1', rawEvents);
    expect(events[1].narrativeText).toContain('Diabetes Tipo 2');
  });

  it('builds narrative text for lab result with markers', () => {
    const events = engine.toNarrativeEvents('p1', rawEvents);
    expect(events[0].narrativeText).toMatch(/hba1c|glucose/i);
  });

  it('builds narrative text for medication', () => {
    const events = engine.toNarrativeEvents('p1', rawEvents);
    expect(events[2].narrativeText).toContain('Metformina');
  });

  it('sortByDate returns chronological order', () => {
    const shuffled = [
      makeNarrativeEvent({ date: '2024-06-01T00:00:00Z' }),
      makeNarrativeEvent({ date: '2024-03-01T00:00:00Z' }),
      makeNarrativeEvent({ date: '2024-09-01T00:00:00Z' }),
    ];
    const sorted = engine.sortByDate(shuffled);
    expect(sorted[0].date.getUTCMonth()).toBe(2); // March
    expect(sorted[1].date.getUTCMonth()).toBe(5); // June
    expect(sorted[2].date.getUTCMonth()).toBe(8); // September
  });

  it('filterLandmarks returns only LANDMARK events', () => {
    const events = [
      makeNarrativeEvent({ significance: 'LANDMARK' }),
      makeNarrativeEvent({ significance: 'HIGH' }),
      makeNarrativeEvent({ significance: 'LOW' }),
    ];
    const landmarks = engine.filterLandmarks(events);
    expect(landmarks.length).toBe(1);
  });

  it('countByType counts each type correctly', () => {
    const events = [
      makeNarrativeEvent({ eventType: 'LAB_RESULT' }),
      makeNarrativeEvent({ eventType: 'LAB_RESULT' }),
      makeNarrativeEvent({ eventType: 'DIAGNOSIS' }),
    ];
    const counts = engine.countByType(events);
    expect(counts['LAB_RESULT']).toBe(2);
    expect(counts['DIAGNOSIS']).toBe(1);
  });

  it('handles empty events array', () => {
    expect(engine.toNarrativeEvents('p1', [])).toEqual([]);
    expect(engine.sortByDate([])).toEqual([]);
    expect(engine.filterLandmarks([])).toEqual([]);
    expect(engine.countByType([])).toEqual({});
  });
});

describe('MilestoneRecognitionEngine', () => {
  const engine = new MilestoneRecognitionEngine();

  it('returns empty array for empty events', () => {
    expect(engine.recognize('p1', [])).toEqual([]);
  });

  it('detects FIRST_RECORD milestone for single event', () => {
    const events = [makeNarrativeEvent({ date: '2024-01-01T00:00:00Z' })];
    const ms = engine.recognize('p1', events);
    expect(ms.some((m) => m.milestoneType === 'FIRST_RECORD')).toBe(true);
  });

  it('detects HABIT_CONSISTENCY for 6+ events across 3+ months', () => {
    const events = [
      makeNarrativeEvent({ date: '2024-01-15T00:00:00Z' }),
      makeNarrativeEvent({ date: '2024-02-15T00:00:00Z' }),
      makeNarrativeEvent({ date: '2024-03-15T00:00:00Z' }),
      makeNarrativeEvent({ date: '2024-04-15T00:00:00Z' }),
      makeNarrativeEvent({ date: '2024-05-15T00:00:00Z' }),
      makeNarrativeEvent({ date: '2024-06-15T00:00:00Z' }),
    ];
    const ms = engine.recognize('p1', events);
    expect(ms.some((m) => m.milestoneType === 'HABIT_CONSISTENCY')).toBe(true);
  });

  it('does not detect HABIT_CONSISTENCY for less than 6 events', () => {
    const events = [
      makeNarrativeEvent({ date: '2024-01-15T00:00:00Z' }),
      makeNarrativeEvent({ date: '2024-02-15T00:00:00Z' }),
      makeNarrativeEvent({ date: '2024-03-15T00:00:00Z' }),
    ];
    const ms = engine.recognize('p1', events);
    expect(ms.some((m) => m.milestoneType === 'HABIT_CONSISTENCY')).toBe(false);
  });

  it('detects BIOMARKER_IMPROVEMENT for significant hba1c reduction', () => {
    const events = [
      new NarrativeEvent({
        patientId: 'p1', eventType: 'LAB_RESULT', date: '2024-01-01T00:00:00Z',
        narrativeText: 'Lab', metadata: { biomarkers: { hba1c: 9.0 } },
      }),
      new NarrativeEvent({
        patientId: 'p1', eventType: 'LAB_RESULT', date: '2024-06-01T00:00:00Z',
        narrativeText: 'Lab', metadata: { biomarkers: { hba1c: 6.5 } },
      }),
    ];
    const ms = engine.recognize('p1', events);
    expect(ms.some((m) => m.milestoneType === 'BIOMARKER_IMPROVEMENT')).toBe(true);
  });

  it('does not detect BIOMARKER_IMPROVEMENT for minimal change', () => {
    const events = [
      new NarrativeEvent({
        patientId: 'p1', eventType: 'LAB_RESULT', date: '2024-01-01T00:00:00Z',
        narrativeText: 'Lab', metadata: { biomarkers: { hba1c: 7.2 } },
      }),
      new NarrativeEvent({
        patientId: 'p1', eventType: 'LAB_RESULT', date: '2024-06-01T00:00:00Z',
        narrativeText: 'Lab', metadata: { biomarkers: { hba1c: 7.0 } },
      }),
    ];
    const ms = engine.recognize('p1', events);
    expect(ms.some((m) => m.milestoneType === 'BIOMARKER_IMPROVEMENT')).toBe(false);
  });

  it('detects RECOVERY_MILESTONE after hospitalization', () => {
    const events = [
      new NarrativeEvent({ patientId: 'p1', eventType: 'HOSPITALIZATION', date: '2024-03-01T00:00:00Z', narrativeText: 'Int.' }),
      new NarrativeEvent({ patientId: 'p1', eventType: 'CONSULTATION', date: '2024-03-15T00:00:00Z', narrativeText: 'Ret.' }),
    ];
    const ms = engine.recognize('p1', events);
    expect(ms.some((m) => m.milestoneType === 'RECOVERY_MILESTONE')).toBe(true);
  });

  it('detects DIAGNOSTIC_INSIGHT for genomic events', () => {
    const events = [
      makeNarrativeEvent({ eventType: 'GENOMIC_DISCOVERY', date: '2024-05-01T00:00:00Z' }),
    ];
    const ms = engine.recognize('p1', events);
    expect(ms.some((m) => m.milestoneType === 'DIAGNOSTIC_INSIGHT')).toBe(true);
  });

  it('milestones are sorted chronologically', () => {
    const events = [
      makeNarrativeEvent({ date: '2024-01-01T00:00:00Z' }),
      makeNarrativeEvent({ eventType: 'GENOMIC_DISCOVERY', date: '2024-06-01T00:00:00Z' }),
    ];
    const ms = engine.recognize('p1', events);
    for (let i = 1; i < ms.length; i++) {
      expect(ms[i].achievedAt.getTime()).toBeGreaterThanOrEqual(ms[i - 1].achievedAt.getTime());
    }
  });
});

describe('ChapterBuilderEngine', () => {
  const engine = new ChapterBuilderEngine();

  it('returns empty for no events', () => {
    expect(engine.build([], [])).toEqual([]);
  });

  it('builds at least one chapter for any events', () => {
    const events = [makeNarrativeEvent()];
    const chapters = engine.build(events, []);
    expect(chapters.length).toBeGreaterThanOrEqual(1);
    expect(chapters[0]).toBeInstanceOf(NarrativeChapter);
  });

  it('first chapter always has INITIAL_BASELINE theme', () => {
    const events = [
      makeNarrativeEvent({ date: '2024-01-01T00:00:00Z' }),
      makeNarrativeEvent({ date: '2024-02-01T00:00:00Z' }),
    ];
    const chapters = engine.build(events, []);
    expect(chapters[0].theme).toBe('INITIAL_BASELINE');
  });

  it('splits into multiple chapters on large gap (>90 days)', () => {
    const events = [
      makeNarrativeEvent({ date: '2024-01-01T00:00:00Z' }),
      makeNarrativeEvent({ date: '2024-05-01T00:00:00Z' }),
      makeNarrativeEvent({ date: '2024-05-15T00:00:00Z' }),
    ];
    const chapters = engine.build(events, []);
    expect(chapters.length).toBeGreaterThanOrEqual(2);
  });

  it('chapter numbers are sequential starting at 1', () => {
    const events = [
      makeNarrativeEvent({ date: '2024-01-01T00:00:00Z' }),
      makeNarrativeEvent({ date: '2024-05-01T00:00:00Z' }),
    ];
    const chapters = engine.build(events, []);
    chapters.forEach((c, i) => expect(c.number).toBe(i + 1));
  });

  it('assigns RECOVERY theme when hospitalization present', () => {
    const events = [
      makeNarrativeEvent({ date: '2024-01-01T00:00:00Z' }),
      makeNarrativeEvent({ eventType: 'HOSPITALIZATION', date: '2024-05-01T00:00:00Z', significance: 'HIGH' }),
    ];
    const chapters = engine.build(events, []);
    const recoveryChapter = chapters.find((c) => c.theme === 'RECOVERY');
    expect(recoveryChapter).toBeDefined();
  });

  it('chapters have non-empty summary', () => {
    const events = [makeNarrativeEvent(), makeNarrativeEvent()];
    const chapters = engine.build(events, []);
    expect(chapters[0].summary).toBeTruthy();
  });

  it('produces max 5 chapters regardless of event count', () => {
    const dates = [
      '2023-01-01', '2023-04-01', '2023-07-01', '2023-10-01',
      '2024-01-01', '2024-04-01', '2024-07-01', '2024-10-01',
    ].map((d, i) => makeNarrativeEvent({ date: `${d}T00:00:00Z`, significance: 'LOW' }));
    const chapters = engine.build(dates, []);
    expect(chapters.length).toBeLessThanOrEqual(5);
  });
});

describe('BioBookSummaryEngine', () => {
  const engine = new BioBookSummaryEngine();

  const events = [
    makeNarrativeEvent({ date: '2024-01-01T00:00:00Z', eventType: 'CONSULTATION' }),
    makeNarrativeEvent({ date: '2024-03-01T00:00:00Z', eventType: 'LAB_RESULT', significance: 'HIGH' }),
    makeNarrativeEvent({ date: '2024-06-01T00:00:00Z', eventType: 'DIAGNOSIS', significance: 'LANDMARK' }),
  ];
  const chapters = [
    new NarrativeChapter({ number: 1, theme: 'INITIAL_BASELINE', startDate: D('2024-01-01T00:00:00Z'), endDate: D('2024-06-01T00:00:00Z'), events }),
  ];
  const milestones = [
    new HealthMilestone({ patientId: 'p1', milestoneType: 'FIRST_RECORD', title: 'Início', description: 'Primeiro registro', achievedAt: D('2024-01-01T00:00:00Z'), rank: 'MINOR' }),
    new HealthMilestone({ patientId: 'p1', milestoneType: 'BIOMARKER_IMPROVEMENT', title: 'Melhora HbA1c', description: 'HbA1c reduziu', achievedAt: D('2024-06-01T00:00:00Z'), rank: 'LANDMARK' }),
  ];

  it('generates a summary object with all required fields', () => {
    const summary = engine.generate('p1', events, chapters, milestones);
    expect(summary).toHaveProperty('headline');
    expect(summary).toHaveProperty('overview');
    expect(summary).toHaveProperty('keyAchievements');
    expect(summary).toHaveProperty('currentStatus');
    expect(summary).toHaveProperty('nextSteps');
    expect(summary).toHaveProperty('positiveCount');
    expect(summary).toHaveProperty('concernCount');
    expect(summary).toHaveProperty('totalChapters');
    expect(summary).toHaveProperty('totalMilestones');
    expect(summary).toHaveProperty('journeyDurationDays');
  });

  it('keyAchievements comes from milestone titles', () => {
    const summary = engine.generate('p1', events, chapters, milestones);
    expect(summary.keyAchievements.length).toBeGreaterThanOrEqual(1);
    expect(summary.keyAchievements[0]).toBeTruthy();
  });

  it('headline mentions landmark milestones when present', () => {
    const summary = engine.generate('p1', events, chapters, milestones);
    expect(summary.headline).toMatch(/capítulo|marco/i);
  });

  it('totalChapters and totalMilestones match inputs', () => {
    const summary = engine.generate('p1', events, chapters, milestones);
    expect(summary.totalChapters).toBe(1);
    expect(summary.totalMilestones).toBe(2);
  });

  it('journeyDurationDays matches span of events', () => {
    const summary = engine.generate('p1', events, chapters, milestones);
    const expected = Math.ceil((D('2024-06-01T00:00:00Z').getTime() - D('2024-01-01T00:00:00Z').getTime()) / 86_400_000);
    expect(summary.journeyDurationDays).toBe(expected);
  });

  it('nextSteps is a non-empty array', () => {
    const summary = engine.generate('p1', events, chapters, milestones);
    expect(Array.isArray(summary.nextSteps)).toBe(true);
    expect(summary.nextSteps.length).toBeGreaterThan(0);
  });

  it('generates summary for empty events', () => {
    const summary = engine.generate('p1', [], [], []);
    expect(summary.totalChapters).toBe(0);
    expect(summary.journeyDurationDays).toBe(0);
  });
});
