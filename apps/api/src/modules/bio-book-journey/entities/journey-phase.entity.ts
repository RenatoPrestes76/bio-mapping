export type PhaseType =
  | 'INITIAL_ASSESSMENT'
  | 'BASELINE_ESTABLISHMENT'
  | 'HABIT_FORMATION'
  | 'METABOLIC_CONTROL'
  | 'CONSOLIDATION'
  | 'OPTIMIZATION'
  | 'LONGEVITY_FOCUS'
  | 'PERFORMANCE';

export type PhaseStatus = 'COMPLETED' | 'CURRENT' | 'UPCOMING' | 'FUTURE';

const PHASE_META: Record<PhaseType, { label: string; description: string; estimatedDurationWeeks: number }> = {
  INITIAL_ASSESSMENT: {
    label: 'Avaliação Inicial',
    description: 'Primeiros registros e compreensão do estado atual de saúde.',
    estimatedDurationWeeks: 4,
  },
  BASELINE_ESTABLISHMENT: {
    label: 'Linha de Base',
    description: 'Estabelecimento do histórico clínico inicial e identificação de áreas de atenção.',
    estimatedDurationWeeks: 8,
  },
  HABIT_FORMATION: {
    label: 'Formação de Hábitos',
    description: 'Construção de rotinas consistentes de acompanhamento e cuidados de saúde.',
    estimatedDurationWeeks: 12,
  },
  METABOLIC_CONTROL: {
    label: 'Controle Metabólico',
    description: 'Foco ativo no controle de indicadores metabólicos e ajustes terapêuticos.',
    estimatedDurationWeeks: 16,
  },
  CONSOLIDATION: {
    label: 'Consolidação de Hábitos',
    description: 'Sedimentação das conquistas e manutenção dos indicadores dentro das metas.',
    estimatedDurationWeeks: 12,
  },
  OPTIMIZATION: {
    label: 'Otimização e Performance',
    description: 'Refinamento de cada indicador rumo à saúde ideal e máxima qualidade de vida.',
    estimatedDurationWeeks: 16,
  },
  LONGEVITY_FOCUS: {
    label: 'Foco em Longevidade',
    description: 'Investimento em saúde preventiva, dados de longo prazo e prevenção de riscos.',
    estimatedDurationWeeks: 24,
  },
  PERFORMANCE: {
    label: 'Performance e Bem-Estar Avançado',
    description: 'Excelência em saúde sustentada com acompanhamento de alta performance.',
    estimatedDurationWeeks: 52,
  },
};

export class JourneyPhase {
  readonly type: PhaseType;
  readonly status: PhaseStatus;
  readonly label: string;
  readonly description: string;
  readonly estimatedDurationWeeks: number;
  readonly order: number;
  readonly keyActions: string[];
  readonly successCriteria: string[];

  constructor(params: {
    type: PhaseType;
    status: PhaseStatus;
    order: number;
    keyActions?: string[];
    successCriteria?: string[];
  }) {
    this.type = params.type;
    this.status = params.status;
    this.order = params.order;
    this.label = PHASE_META[params.type].label;
    this.description = PHASE_META[params.type].description;
    this.estimatedDurationWeeks = PHASE_META[params.type].estimatedDurationWeeks;
    this.keyActions = params.keyActions ?? [];
    this.successCriteria = params.successCriteria ?? [];
  }

  isCurrent(): boolean {
    return this.status === 'CURRENT';
  }

  isCompleted(): boolean {
    return this.status === 'COMPLETED';
  }

  isAhead(): boolean {
    return this.status === 'UPCOMING' || this.status === 'FUTURE';
  }
}
