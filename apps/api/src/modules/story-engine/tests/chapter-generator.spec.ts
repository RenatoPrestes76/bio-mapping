import { generateChapters, computeGenerationKey } from '../generators/chapter-generator.js';
import type { ChapterGeneratorInput } from '../generators/chapter-generator.js';

const BASE_INPUT: ChapterGeneratorInput = {
  userId: 'user-1',
  decisions: [],
  pathways: [],
  timelineEvents: [],
  trends: [],
};

const DECISION = {
  id: 'd1',
  priority: 'HIGH',
  status: 'OPEN',
  createdAt: new Date('2025-01-15'),
  ruleId: 'HYPERTENSION_UNCONTROLLED',
};

const PATHWAY_ACTIVE = {
  id: 'p1',
  status: 'ACTIVE',
  title: 'Controle de Peso',
  createdAt: new Date('2025-01-10'),
  completedAt: null,
};

const PATHWAY_COMPLETED = {
  id: 'p2',
  status: 'COMPLETED',
  title: 'Jornada Glicêmica',
  createdAt: new Date('2025-02-01'),
  completedAt: new Date('2025-04-01'),
};

const TREND_IMPROVING = {
  id: 't1',
  metric: 'bmi',
  trendType: 'IMPROVING',
  direction: 'DECREASING',
  startDate: new Date('2025-02-01'),
  endDate: null,
  summary: 'IMC em melhora contínua',
};

const TREND_STABLE = {
  id: 't2',
  metric: 'blood_pressure',
  trendType: 'STABLE',
  direction: 'STABLE',
  startDate: new Date('2025-03-01'),
  endDate: null,
  summary: 'Pressão arterial estável',
};

const TREND_WORSENING = {
  id: 't3',
  metric: 'glycemic',
  trendType: 'WORSENING',
  direction: 'INCREASING',
  startDate: new Date('2025-01-01'),
  endDate: null,
  summary: 'Glicemia em piora',
};

describe('generateChapters', () => {
  it('returns empty array when no source data', () => {
    const result = generateChapters(BASE_INPUT);
    expect(result).toHaveLength(0);
  });

  it('creates FIRST_ASSESSMENT when decisions exist', () => {
    const result = generateChapters({ ...BASE_INPUT, decisions: [DECISION] });
    const chapter = result.find((c) => c.chapterType === 'FIRST_ASSESSMENT');
    expect(chapter).toBeDefined();
    expect(chapter!.title).toBe('O Início da Jornada');
    expect(chapter!.startDate).toEqual(DECISION.createdAt);
  });

  it('creates FIRST_ASSESSMENT when timeline events exist', () => {
    const input = {
      ...BASE_INPUT,
      timelineEvents: [{ id: 'e1', eventType: 'INSIGHT_GENERATED', severity: 'LOW', title: 'Teste', occurredAt: new Date('2025-01-05') }],
    };
    const result = generateChapters(input);
    expect(result.some((c) => c.chapterType === 'FIRST_ASSESSMENT')).toBe(true);
  });

  it('uses earliest date across all sources for FIRST_ASSESSMENT', () => {
    const input: ChapterGeneratorInput = {
      ...BASE_INPUT,
      decisions: [DECISION], // Jan 15
      pathways: [{ ...PATHWAY_ACTIVE, createdAt: new Date('2025-01-05') }], // Jan 5 — earlier
    };
    const result = generateChapters(input);
    const firstAssessment = result.find((c) => c.chapterType === 'FIRST_ASSESSMENT');
    expect(firstAssessment!.startDate).toEqual(new Date('2025-01-05'));
  });

  it('creates TRANSFORMATION chapter for IMPROVING trend', () => {
    const result = generateChapters({ ...BASE_INPUT, trends: [TREND_IMPROVING] });
    const chapter = result.find((c) => c.chapterType === 'TRANSFORMATION');
    expect(chapter).toBeDefined();
    expect(chapter!.title).toContain('IMC');
    expect(chapter!.startDate).toEqual(TREND_IMPROVING.startDate);
  });

  it('creates MILESTONE chapter for STABLE trend', () => {
    const result = generateChapters({ ...BASE_INPUT, trends: [TREND_STABLE] });
    const chapter = result.find((c) => c.chapterType === 'MILESTONE');
    expect(chapter).toBeDefined();
    expect(chapter!.title).toContain('Pressão Arterial');
  });

  it('creates MEDICAL_FOLLOW_UP when decisions >= 3 in same month', () => {
    const decisions = [
      { ...DECISION, id: 'd1', createdAt: new Date('2025-03-05') },
      { ...DECISION, id: 'd2', createdAt: new Date('2025-03-12') },
      { ...DECISION, id: 'd3', createdAt: new Date('2025-03-20') },
    ];
    const result = generateChapters({ ...BASE_INPUT, decisions });
    expect(result.some((c) => c.chapterType === 'MEDICAL_FOLLOW_UP')).toBe(true);
  });

  it('does not create MEDICAL_FOLLOW_UP when decisions < 3 in month', () => {
    const decisions = [
      { ...DECISION, id: 'd1', createdAt: new Date('2025-03-05') },
      { ...DECISION, id: 'd2', createdAt: new Date('2025-03-20') },
    ];
    const result = generateChapters({ ...BASE_INPUT, decisions });
    expect(result.some((c) => c.chapterType === 'MEDICAL_FOLLOW_UP')).toBe(false);
  });

  it('creates ACHIEVEMENT chapter for completed pathway', () => {
    const result = generateChapters({ ...BASE_INPUT, pathways: [PATHWAY_COMPLETED] });
    const chapter = result.find((c) => c.chapterType === 'ACHIEVEMENT');
    expect(chapter).toBeDefined();
    expect(chapter!.title).toBe('Jornada Glicêmica');
    expect(chapter!.endDate).toEqual(PATHWAY_COMPLETED.completedAt);
  });

  it('does not create ACHIEVEMENT for active pathway', () => {
    const result = generateChapters({ ...BASE_INPUT, pathways: [PATHWAY_ACTIVE] });
    expect(result.some((c) => c.chapterType === 'ACHIEVEMENT')).toBe(false);
  });

  it('creates RECOVERY when worsening trend + completed pathway exist', () => {
    const result = generateChapters({
      ...BASE_INPUT,
      trends: [TREND_WORSENING],
      pathways: [PATHWAY_COMPLETED],
    });
    expect(result.some((c) => c.chapterType === 'RECOVERY')).toBe(true);
  });

  it('does not create RECOVERY without worsening trend', () => {
    const result = generateChapters({ ...BASE_INPUT, pathways: [PATHWAY_COMPLETED] });
    expect(result.some((c) => c.chapterType === 'RECOVERY')).toBe(false);
  });

  it('embeds generationKey in every candidate metadata', () => {
    const result = generateChapters({ ...BASE_INPUT, decisions: [DECISION], trends: [TREND_IMPROVING] });
    for (const c of result) {
      expect(c.metadata.generationKey).toBeDefined();
      expect(typeof c.metadata.generationKey).toBe('string');
    }
  });
});

describe('computeGenerationKey', () => {
  it('returns stable key for FIRST_ASSESSMENT', () => {
    const c = { userId: 'u1', chapterType: 'FIRST_ASSESSMENT', startDate: new Date(), title: '', chapterType2: '', summary: '', metadata: {} };
    const key = computeGenerationKey({ ...c, chapterType: 'FIRST_ASSESSMENT', metadata: {} });
    expect(key).toBe('u1:FIRST_ASSESSMENT');
  });

  it('includes metric for TRANSFORMATION', () => {
    const key = computeGenerationKey({
      userId: 'u1', chapterType: 'TRANSFORMATION', title: '', summary: '', startDate: new Date(),
      metadata: { metric: 'bmi' },
    });
    expect(key).toBe('u1:TRANSFORMATION:bmi');
  });

  it('includes metric for MILESTONE', () => {
    const key = computeGenerationKey({
      userId: 'u1', chapterType: 'MILESTONE', title: '', summary: '', startDate: new Date(),
      metadata: { metric: 'blood_pressure' },
    });
    expect(key).toBe('u1:MILESTONE:blood_pressure');
  });

  it('includes pathwayId for ACHIEVEMENT', () => {
    const key = computeGenerationKey({
      userId: 'u1', chapterType: 'ACHIEVEMENT', title: '', summary: '', startDate: new Date(),
      metadata: { pathwayId: 'p123' },
    });
    expect(key).toBe('u1:ACHIEVEMENT:p123');
  });
});
