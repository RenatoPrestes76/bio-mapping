import { CurrentChapter } from '../entities/current-chapter.entity.js';
import type { NarrativeChapter } from '../../bio-book/entities/narrative-chapter.entity.js';
import type { ChapterTheme } from '../../bio-book/entities/narrative-chapter.entity.js';

const THEME_META: Record<
  ChapterTheme,
  { description: string; focus: string[]; nextMilestoneHint: string }
> = {
  INITIAL_BASELINE: {
    description: 'Estabelecendo a base da jornada de saúde',
    focus: ['Registro dos primeiros dados', 'Criação do histórico inicial', 'Compreensão do estado de saúde atual'],
    nextMilestoneHint: 'Continue registrando exames e consultas para construir seu histórico inicial.',
  },
  METABOLIC_CHANGE: {
    description: 'Navegando mudanças metabólicas e novos diagnósticos',
    focus: ['Controle metabólico', 'Adaptação terapêutica', 'Monitoramento de indicadores-chave'],
    nextMilestoneHint: 'A próxima melhora em biomarcadores metabólicos é o próximo grande marco.',
  },
  EVOLUTION_PERFORMANCE: {
    description: 'Consolidando ganhos e evoluindo em performance de saúde',
    focus: ['Otimização de indicadores', 'Manutenção dos progressos', 'Expansão do acompanhamento'],
    nextMilestoneHint: 'Manter a consistência é o caminho para o próximo marco de conquista.',
  },
  LONGEVITY: {
    description: 'Construindo longevidade com dados e precisão',
    focus: ['Saúde preventiva', 'Dados genômicos e de longo prazo', 'Manutenção metabólica'],
    nextMilestoneHint: 'Incorporar dados genômicos e de longevidade aprofundará seu Bio-Book.',
  },
  RECOVERY: {
    description: 'Superando desafios e retomando o equilíbrio',
    focus: ['Recuperação clínica', 'Retorno ao acompanhamento regular', 'Prevenção de recidivas'],
    nextMilestoneHint: 'Retomar a consistência de consultas e exames é o próximo marco de recuperação.',
  },
  OPTIMIZATION: {
    description: 'Refinando cada indicador rumo à saúde ideal',
    focus: ['Ajustes terapêuticos finos', 'Redução de fatores de risco', 'Personalização do plano'],
    nextMilestoneHint: 'Cada ajuste terapêutico monitorado por exame traz você mais perto da meta.',
  },
  STABILITY: {
    description: 'Mantendo a estabilidade com acompanhamento consistente',
    focus: ['Manutenção do controle clínico', 'Prevenção proativa', 'Qualidade de vida sustentada'],
    nextMilestoneHint: 'A consistência contínua pode elevar este período a um marco de longevidade.',
  },
};

export class CurrentChapterEngine {
  determine(patientId: string, chapters: NarrativeChapter[]): CurrentChapter | null {
    if (!chapters.length) return null;

    const latest = chapters[chapters.length - 1];
    const meta = THEME_META[latest.theme];
    const now = new Date();
    const daysInChapter = Math.ceil((now.getTime() - latest.startDate.getTime()) / 86_400_000);

    const progressInChapter = this.computeProgress(latest);

    return new CurrentChapter({
      patientId,
      chapterNumber: latest.number,
      chapterTitle: latest.title,
      description: meta.description,
      focus: meta.focus,
      startedAt: latest.startDate,
      theme: latest.theme,
      progressInChapter,
      nextMilestoneHint: meta.nextMilestoneHint,
      daysInChapter: Math.max(0, daysInChapter),
    });
  }

  private computeProgress(chapter: NarrativeChapter): number {
    if (!chapter.events.length) return 10;

    const significantRatio = chapter.events.length > 0
      ? chapter.significantEventCount() / chapter.events.length
      : 0;
    const hasMilestones = chapter.milestones.length > 0;
    const hasLandmark = chapter.hasLandmarkMilestone();

    let progress = 30 + Math.round(significantRatio * 40);
    if (hasMilestones) progress += 15;
    if (hasLandmark) progress += 15;

    return Math.min(99, progress);
  }
}
