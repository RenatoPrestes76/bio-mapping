import type { NarrativeEvent } from './narrative-event.entity.js';
import type { HealthMilestone } from './health-milestone.entity.js';

export type ChapterTheme =
  | 'INITIAL_BASELINE'
  | 'METABOLIC_CHANGE'
  | 'EVOLUTION_PERFORMANCE'
  | 'LONGEVITY'
  | 'RECOVERY'
  | 'OPTIMIZATION'
  | 'STABILITY';

const CHAPTER_TITLES: Record<ChapterTheme, { title: string; subtitle: string }> = {
  INITIAL_BASELINE: {
    title: 'Primeiros Registros',
    subtitle: 'O início da sua jornada de saúde',
  },
  METABOLIC_CHANGE: {
    title: 'Mudança Metabólica',
    subtitle: 'Transformações e novos desafios identificados',
  },
  EVOLUTION_PERFORMANCE: {
    title: 'Evolução e Performance',
    subtitle: 'Sua saúde em ascensão',
  },
  LONGEVITY: {
    title: 'Longevidade',
    subtitle: 'Construindo uma saúde duradoura',
  },
  RECOVERY: {
    title: 'Recuperação e Superação',
    subtitle: 'Reestabelecendo o equilíbrio',
  },
  OPTIMIZATION: {
    title: 'Otimização',
    subtitle: 'Refinando e melhorando cada indicador',
  },
  STABILITY: {
    title: 'Estabilidade',
    subtitle: 'Mantendo o controle com consistência',
  },
};

export class NarrativeChapter {
  readonly number: number;
  readonly title: string;
  readonly subtitle: string;
  readonly theme: ChapterTheme;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly events: NarrativeEvent[];
  readonly milestones: HealthMilestone[];
  readonly summary: string;
  readonly keyInsight: string;
  readonly highlights: string[];

  constructor(params: {
    number: number;
    theme: ChapterTheme;
    startDate: Date;
    endDate: Date;
    events?: NarrativeEvent[];
    milestones?: HealthMilestone[];
    summary?: string;
    keyInsight?: string;
    highlights?: string[];
  }) {
    this.number = params.number;
    this.theme = params.theme;
    this.title = CHAPTER_TITLES[params.theme].title;
    this.subtitle = CHAPTER_TITLES[params.theme].subtitle;
    this.startDate = params.startDate;
    this.endDate = params.endDate;
    this.events = params.events ?? [];
    this.milestones = params.milestones ?? [];
    this.summary = params.summary ?? '';
    this.keyInsight = params.keyInsight ?? '';
    this.highlights = params.highlights ?? [];
  }

  durationDays(): number {
    return Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / 86_400_000);
  }

  significantEventCount(): number {
    return this.events.filter((e) => e.isSignificant()).length;
  }

  hasLandmarkMilestone(): boolean {
    return this.milestones.some((m) => m.isLandmark());
  }

  toSummary(): { number: number; title: string; eventCount: number; milestoneCount: number } {
    return {
      number: this.number,
      title: this.title,
      eventCount: this.events.length,
      milestoneCount: this.milestones.length,
    };
  }
}
