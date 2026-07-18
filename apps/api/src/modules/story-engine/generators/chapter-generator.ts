import { MEDICAL_FOLLOWUP_MIN, METRIC_LABEL } from '../constants/chapter-rules.constants.js';

export interface DecisionInput {
  id: string;
  priority: string;
  status: string;
  createdAt: Date;
  ruleId: string;
}

export interface PathwayInput {
  id: string;
  status: string;
  title: string;
  createdAt: Date;
  completedAt?: Date | null;
}

export interface TimelineEventInput {
  id: string;
  eventType: string;
  severity: string;
  title: string;
  occurredAt: Date;
}

export interface TrendInput {
  id: string;
  metric: string;
  trendType: string;
  direction: string;
  startDate: Date;
  endDate?: Date | null;
  summary: string;
}

export interface ChapterGeneratorInput {
  userId: string;
  decisions: DecisionInput[];
  pathways: PathwayInput[];
  timelineEvents: TimelineEventInput[];
  trends: TrendInput[];
}

export interface ChapterCandidate {
  userId: string;
  title: string;
  subtitle?: string;
  chapterType: string;
  summary: string;
  startDate: Date;
  endDate?: Date;
  metadata: Record<string, unknown>;
}

function groupByMonth(items: { createdAt: Date }[]): Record<string, { createdAt: Date }[]> {
  const result: Record<string, { createdAt: Date }[]> = {};
  for (const item of items) {
    const key = `${item.createdAt.getFullYear()}-${String(item.createdAt.getMonth() + 1).padStart(2, '0')}`;
    (result[key] ??= []).push(item);
  }
  return result;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function computeGenerationKey(candidate: ChapterCandidate): string {
  const m = candidate.metadata;
  switch (candidate.chapterType) {
    case 'FIRST_ASSESSMENT':
      return `${candidate.userId}:FIRST_ASSESSMENT`;
    case 'TRANSFORMATION':
      return `${candidate.userId}:TRANSFORMATION:${m.metric}`;
    case 'MILESTONE':
      return `${candidate.userId}:MILESTONE:${m.metric}`;
    case 'MEDICAL_FOLLOW_UP':
      return `${candidate.userId}:MEDICAL_FOLLOW_UP:${candidate.startDate.getFullYear()}-${candidate.startDate.getMonth() + 1}`;
    case 'ACHIEVEMENT':
      return `${candidate.userId}:ACHIEVEMENT:${m.pathwayId}`;
    case 'RECOVERY':
      return `${candidate.userId}:RECOVERY:${m.pathwayId}`;
    default:
      return `${candidate.userId}:${candidate.chapterType}:${candidate.startDate.getTime()}`;
  }
}

export function generateChapters(input: ChapterGeneratorInput): ChapterCandidate[] {
  const { userId } = input;
  const candidates: ChapterCandidate[] = [];

  // ── Rule 1: FIRST_ASSESSMENT ─────────────────────────────────────────────
  const allDates: Date[] = [
    ...input.decisions.map((d) => d.createdAt),
    ...input.timelineEvents.map((e) => e.occurredAt),
    ...input.pathways.map((p) => p.createdAt),
  ];

  if (allDates.length > 0) {
    const earliest = new Date(Math.min(...allDates.map((d) => d.getTime())));
    candidates.push({
      userId,
      title: 'O Início da Jornada',
      subtitle: 'Primeira avaliação registrada',
      chapterType: 'FIRST_ASSESSMENT',
      summary: 'Marco inicial da jornada de saúde e transformação.',
      startDate: earliest,
      metadata: { generationKey: `${userId}:FIRST_ASSESSMENT` },
    });
  }

  // ── Rule 2: TRANSFORMATION — one per IMPROVING trend ─────────────────────
  for (const trend of input.trends.filter((t) => t.trendType === 'IMPROVING')) {
    const label = METRIC_LABEL[trend.metric] ?? trend.metric;
    const candidate: ChapterCandidate = {
      userId,
      title: `Transformação: ${label}`,
      subtitle: trend.summary,
      chapterType: 'TRANSFORMATION',
      summary: `Tendência de melhora detectada em ${label.toLowerCase()}.`,
      startDate: trend.startDate,
      endDate: trend.endDate ?? undefined,
      metadata: { metric: trend.metric, direction: trend.direction },
    };
    candidate.metadata.generationKey = computeGenerationKey(candidate);
    candidates.push(candidate);
  }

  // ── Rule 3: MILESTONE — one per STABLE trend ─────────────────────────────
  for (const trend of input.trends.filter((t) => t.trendType === 'STABLE')) {
    const label = METRIC_LABEL[trend.metric] ?? trend.metric;
    const candidate: ChapterCandidate = {
      userId,
      title: `Estabilidade: ${label}`,
      subtitle: trend.summary,
      chapterType: 'MILESTONE',
      summary: `Indicador de ${label.toLowerCase()} mantido estável.`,
      startDate: trend.startDate,
      metadata: { metric: trend.metric },
    };
    candidate.metadata.generationKey = computeGenerationKey(candidate);
    candidates.push(candidate);
  }

  // ── Rule 4: MEDICAL_FOLLOW_UP — per month with >= threshold decisions ────
  const byMonth = groupByMonth(input.decisions);
  for (const [monthKey, decisions] of Object.entries(byMonth)) {
    if (decisions.length < MEDICAL_FOLLOWUP_MIN) continue;
    const [year, month] = monthKey.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const label = formatMonthYear(startDate);
    const candidate: ChapterCandidate = {
      userId,
      title: `Acompanhamento Clínico — ${label}`,
      chapterType: 'MEDICAL_FOLLOW_UP',
      summary: `${decisions.length} decisões clínicas registradas em ${label}.`,
      startDate,
      endDate: new Date(year, month, 0),
      metadata: { decisionCount: decisions.length, monthKey },
    };
    candidate.metadata.generationKey = computeGenerationKey(candidate);
    candidates.push(candidate);
  }

  // ── Rule 5: ACHIEVEMENT — per completed pathway ───────────────────────────
  for (const pathway of input.pathways.filter((p) => p.status === 'COMPLETED')) {
    const candidate: ChapterCandidate = {
      userId,
      title: pathway.title || 'Protocolo Concluído',
      chapterType: 'ACHIEVEMENT',
      summary: 'Protocolo de saúde concluído com sucesso.',
      startDate: pathway.createdAt,
      endDate: pathway.completedAt ?? undefined,
      metadata: { pathwayId: pathway.id },
    };
    candidate.metadata.generationKey = computeGenerationKey(candidate);
    candidates.push(candidate);
  }

  // ── Rule 6: RECOVERY — per completed pathway after WORSENING trend ────────
  const hasWorsening = input.trends.some((t) => t.trendType === 'WORSENING');
  if (hasWorsening) {
    const completedPathways = input.pathways.filter((p) => p.status === 'COMPLETED');
    for (const pathway of completedPathways) {
      const candidate: ChapterCandidate = {
        userId,
        title: `Recuperação: ${pathway.title || 'Protocolo'}`,
        chapterType: 'RECOVERY',
        summary: 'Protocolo concluído após período de atenção clínica.',
        startDate: pathway.createdAt,
        endDate: pathway.completedAt ?? undefined,
        metadata: { pathwayId: pathway.id },
      };
      candidate.metadata.generationKey = computeGenerationKey(candidate);
      candidates.push(candidate);
    }
  }

  return candidates;
}
