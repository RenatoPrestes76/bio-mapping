import { NarrativeEvent } from '../entities/narrative-event.entity.js';
import { HealthMilestone } from '../entities/health-milestone.entity.js';
import { NarrativeChapter } from '../entities/narrative-chapter.entity.js';
import { HealthNarrative } from '../entities/health-narrative.entity.js';

const BASE_DATE = new Date('2024-03-01T00:00:00Z');
const LATER_DATE = new Date('2024-06-01T00:00:00Z');

function makeEvent(overrides?: Partial<ConstructorParameters<typeof NarrativeEvent>[0]>): NarrativeEvent {
  return new NarrativeEvent({
    patientId: 'p1',
    eventType: 'LAB_RESULT',
    date: BASE_DATE,
    narrativeText: 'Resultado laboratorial registrado.',
    ...overrides,
  });
}

function makeMilestone(overrides?: Partial<ConstructorParameters<typeof HealthMilestone>[0]>): HealthMilestone {
  return new HealthMilestone({
    patientId: 'p1',
    milestoneType: 'BIOMARKER_IMPROVEMENT',
    title: 'Melhora HbA1c',
    description: 'HbA1c reduziu 15%.',
    achievedAt: BASE_DATE,
    ...overrides,
  });
}

describe('NarrativeEvent', () => {
  it('assigns defaults', () => {
    const e = makeEvent();
    expect(e.significance).toBe('LOW');
    expect(e.chapterNumber).toBe(1);
    expect(e.metadata).toEqual({});
  });

  it('parses date from string', () => {
    const e = makeEvent({ date: '2024-03-01T00:00:00Z' });
    expect(e.date).toBeInstanceOf(Date);
    expect(e.date.getUTCFullYear()).toBe(2024);
    expect(e.date.getUTCMonth()).toBe(2);
  });

  it('isLandmark returns true only for LANDMARK significance', () => {
    expect(makeEvent({ significance: 'LANDMARK' }).isLandmark()).toBe(true);
    expect(makeEvent({ significance: 'HIGH' }).isLandmark()).toBe(false);
    expect(makeEvent({ significance: 'LOW' }).isLandmark()).toBe(false);
  });

  it('isSignificant returns true for HIGH and LANDMARK', () => {
    expect(makeEvent({ significance: 'HIGH' }).isSignificant()).toBe(true);
    expect(makeEvent({ significance: 'LANDMARK' }).isSignificant()).toBe(true);
    expect(makeEvent({ significance: 'MEDIUM' }).isSignificant()).toBe(false);
    expect(makeEvent({ significance: 'LOW' }).isSignificant()).toBe(false);
  });

  it('daysSince returns positive number', () => {
    const e = makeEvent({ date: BASE_DATE });
    const ref = new Date(BASE_DATE.getTime() + 10 * 86_400_000);
    expect(e.daysSince(ref)).toBe(10);
  });

  it('generates unique ids', () => {
    const a = makeEvent();
    const b = makeEvent();
    expect(a.id).not.toBe(b.id);
  });
});

describe('HealthMilestone', () => {
  it('assigns defaults', () => {
    const m = makeMilestone();
    expect(m.rank).toBe('MINOR');
    expect(m.id).toMatch(/^ms-/);
  });

  it('computes improvementPercent when from/to given', () => {
    const m = makeMilestone({ fromValue: 100, toValue: 80 });
    expect(m.improvementPercent).toBe(20);
  });

  it('improvementPercent undefined when fromValue is 0', () => {
    const m = makeMilestone({ fromValue: 0, toValue: 50 });
    expect(m.improvementPercent).toBeUndefined();
  });

  it('isLandmark returns true only for LANDMARK', () => {
    expect(makeMilestone({ rank: 'LANDMARK' }).isLandmark()).toBe(true);
    expect(makeMilestone({ rank: 'MAJOR' }).isLandmark()).toBe(false);
    expect(makeMilestone({ rank: 'MINOR' }).isLandmark()).toBe(false);
  });

  it('toSummary returns expected shape', () => {
    const m = makeMilestone({ rank: 'MAJOR' });
    const s = m.toSummary();
    expect(s).toHaveProperty('title');
    expect(s).toHaveProperty('description');
    expect(s).toHaveProperty('rank', 'MAJOR');
    expect(s).toHaveProperty('achievedAt');
  });
});

describe('NarrativeChapter', () => {
  const makeChapter = () =>
    new NarrativeChapter({
      number: 1,
      theme: 'INITIAL_BASELINE',
      startDate: BASE_DATE,
      endDate: LATER_DATE,
    });

  it('assigns title and subtitle from theme', () => {
    const c = makeChapter();
    expect(c.title).toBe('Primeiros Registros');
    expect(c.subtitle).toBeTruthy();
  });

  it('durationDays returns correct number', () => {
    const c = makeChapter();
    const days = Math.ceil((LATER_DATE.getTime() - BASE_DATE.getTime()) / 86_400_000);
    expect(c.durationDays()).toBe(days);
  });

  it('significantEventCount counts HIGH and LANDMARK events', () => {
    const events = [
      makeEvent({ significance: 'HIGH' }),
      makeEvent({ significance: 'LANDMARK' }),
      makeEvent({ significance: 'LOW' }),
    ];
    const c = new NarrativeChapter({ number: 1, theme: 'OPTIMIZATION', startDate: BASE_DATE, endDate: LATER_DATE, events });
    expect(c.significantEventCount()).toBe(2);
  });

  it('hasLandmarkMilestone returns true when landmark present', () => {
    const ms = [makeMilestone({ rank: 'LANDMARK' })];
    const c = new NarrativeChapter({ number: 1, theme: 'STABILITY', startDate: BASE_DATE, endDate: LATER_DATE, milestones: ms });
    expect(c.hasLandmarkMilestone()).toBe(true);
  });

  it('toSummary shape is correct', () => {
    const c = makeChapter();
    const s = c.toSummary();
    expect(s).toHaveProperty('number', 1);
    expect(s).toHaveProperty('title');
    expect(s).toHaveProperty('eventCount', 0);
    expect(s).toHaveProperty('milestoneCount', 0);
  });

  it('all chapter themes map to a title', () => {
    const themes = [
      'INITIAL_BASELINE', 'METABOLIC_CHANGE', 'EVOLUTION_PERFORMANCE',
      'LONGEVITY', 'RECOVERY', 'OPTIMIZATION', 'STABILITY',
    ] as const;
    for (const theme of themes) {
      const c = new NarrativeChapter({ number: 1, theme, startDate: BASE_DATE, endDate: LATER_DATE });
      expect(c.title).toBeTruthy();
    }
  });
});

describe('HealthNarrative', () => {
  const makeNarrative = () => {
    const events = [
      makeEvent({ date: LATER_DATE }),
      makeEvent({ date: BASE_DATE }),
    ];
    const ms = [makeMilestone()];
    const chapter = new NarrativeChapter({ number: 1, theme: 'INITIAL_BASELINE', startDate: BASE_DATE, endDate: LATER_DATE });

    return new HealthNarrative({
      patientId: 'p1',
      chapters: [chapter],
      milestones: ms,
      events,
      summary: {
        headline: 'Test',
        overview: 'Test overview',
        keyAchievements: [],
        currentStatus: 'OK',
        nextSteps: [],
        positiveCount: 2,
        concernCount: 0,
        totalChapters: 1,
        totalMilestones: 1,
        journeyDurationDays: 90,
      },
    });
  };

  it('sorts events chronologically on construction', () => {
    const n = makeNarrative();
    expect(n.events[0].date.getTime()).toBeLessThan(n.events[1].date.getTime());
  });

  it('getTimeline returns sorted events', () => {
    const n = makeNarrative();
    const tl = n.getTimeline();
    expect(tl.length).toBe(2);
    expect(tl[0].date.getTime()).toBeLessThanOrEqual(tl[1].date.getTime());
  });

  it('getChapterByNumber finds correct chapter', () => {
    const n = makeNarrative();
    expect(n.getChapterByNumber(1)).toBeDefined();
    expect(n.getChapterByNumber(99)).toBeUndefined();
  });

  it('getMilestonesByType filters correctly', () => {
    const n = makeNarrative();
    expect(n.getMilestonesByType('BIOMARKER_IMPROVEMENT').length).toBe(1);
    expect(n.getMilestonesByType('FIRST_RECORD').length).toBe(0);
  });

  it('getLatestChapter returns last chapter', () => {
    const n = makeNarrative();
    expect(n.getLatestChapter()?.number).toBe(1);
  });

  it('getLandmarkMilestones filters by rank', () => {
    const events = [makeEvent()];
    const ms = [
      makeMilestone({ rank: 'LANDMARK' }),
      makeMilestone({ rank: 'MAJOR' }),
    ];
    const chapter = new NarrativeChapter({ number: 1, theme: 'INITIAL_BASELINE', startDate: BASE_DATE, endDate: BASE_DATE });
    const n = new HealthNarrative({
      patientId: 'p1', chapters: [chapter], milestones: ms, events,
      summary: { headline: '', overview: '', keyAchievements: [], currentStatus: '', nextSteps: [], positiveCount: 0, concernCount: 0, totalChapters: 1, totalMilestones: 2, journeyDurationDays: 0 },
    });
    expect(n.getLandmarkMilestones().length).toBe(1);
  });

  it('spanDays returns 0 for single event', () => {
    const chapter = new NarrativeChapter({ number: 1, theme: 'INITIAL_BASELINE', startDate: BASE_DATE, endDate: BASE_DATE });
    const n = new HealthNarrative({
      patientId: 'p1', chapters: [chapter], milestones: [], events: [makeEvent()],
      summary: { headline: '', overview: '', keyAchievements: [], currentStatus: '', nextSteps: [], positiveCount: 0, concernCount: 0, totalChapters: 1, totalMilestones: 0, journeyDurationDays: 0 },
    });
    expect(n.spanDays()).toBe(0);
  });
});
