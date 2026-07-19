export type ScenarioType =
  | 'WEIGHT_LOSS'
  | 'WEIGHT_GAIN'
  | 'EXERCISE_INCREASE'
  | 'ALCOHOL_REDUCTION'
  | 'SMOKING_CESSATION'
  | 'SLEEP_IMPROVEMENT'
  | 'DIETARY_CHANGE'
  | 'TREATMENT_ADHERENCE'
  | 'RISK_FACTOR_REMOVAL'
  | 'CUSTOM';

export type TimeHorizon = 'DAYS_30' | 'DAYS_90' | 'DAYS_180' | 'YEAR_1' | 'YEAR_2' | 'YEAR_5';

export const TIME_HORIZON_FACTOR: Record<TimeHorizon, number> = {
  DAYS_30: 0.15,
  DAYS_90: 0.35,
  DAYS_180: 0.55,
  YEAR_1: 0.75,
  YEAR_2: 0.88,
  YEAR_5: 1.0,
};

export const TIME_HORIZON_CONFIDENCE_PENALTY: Record<TimeHorizon, number> = {
  DAYS_30: 0.05,
  DAYS_90: 0.08,
  DAYS_180: 0.12,
  YEAR_1: 0.18,
  YEAR_2: 0.25,
  YEAR_5: 0.35,
};

export const TIME_HORIZON_LABEL: Record<TimeHorizon, string> = {
  DAYS_30: '30 dias',
  DAYS_90: '90 dias',
  DAYS_180: '180 dias',
  YEAR_1: '1 ano',
  YEAR_2: '2 anos',
  YEAR_5: '5 anos',
};

export interface ScenarioParameters {
  weightChangeKg?: number;
  targetLifestyle?: string;
  targetAlcohol?: string;
  riskFactorToRemove?: string;
  bmiDelta?: number;
  baseRiskAdjustment?: number;
  smokingOverride?: boolean;
  [key: string]: unknown;
}

export interface ScenarioEffect {
  bmiDelta: number;
  lifestyleOverride?: string;
  smokingOverride?: boolean;
  alcoholOverride?: string;
  baseRiskAdjustment: number;
  assumptions: string[];
  limitations: string[];
}

export interface ScenarioTemplate {
  scenarioType: ScenarioType;
  name: string;
  description: string;
  defaultParameters: ScenarioParameters;
  getEffect: (params: ScenarioParameters) => ScenarioEffect;
}

export const BUILT_IN_SCENARIOS: ScenarioTemplate[] = [
  {
    scenarioType: 'WEIGHT_LOSS',
    name: 'Perda de peso',
    description: 'Simula o impacto da redução de peso corporal',
    defaultParameters: { weightChangeKg: 5 },
    getEffect: (params) => {
      const kg = Math.abs(params.weightChangeKg ?? 5);
      const bmiDelta = -(kg / 3.06);
      return {
        bmiDelta,
        baseRiskAdjustment: -0.02 * Math.min(kg / 5, 2),
        assumptions: [
          'Adesão alta ao plano alimentar',
          'Sem novas comorbidades',
          `Redução de ${kg}kg mantida no horizonte temporal`,
        ],
        limitations: [
          'Baseado em altura média estimada',
          'Não considera efeito plateau',
          'Não considera variações metabólicas individuais',
        ],
      };
    },
  },
  {
    scenarioType: 'WEIGHT_GAIN',
    name: 'Ganho de peso',
    description: 'Simula o impacto do aumento de peso corporal',
    defaultParameters: { weightChangeKg: 5 },
    getEffect: (params) => {
      const kg = Math.abs(params.weightChangeKg ?? 5);
      return {
        bmiDelta: kg / 3.06,
        baseRiskAdjustment: 0.02 * Math.min(kg / 5, 2),
        assumptions: ['Sem mudança no estilo de vida durante o período'],
        limitations: [
          'Composição corporal (gordura vs. músculo) não modelada',
          'Estimativa baseada exclusivamente em variação de IMC',
        ],
      };
    },
  },
  {
    scenarioType: 'EXERCISE_INCREASE',
    name: 'Aumento de atividade física',
    description: 'Simula o impacto de adotar prática regular de exercícios',
    defaultParameters: { targetLifestyle: 'MODERATELY_ACTIVE' },
    getEffect: (params) => ({
      bmiDelta: -0.3,
      lifestyleOverride: (params.targetLifestyle as string | undefined) ?? 'MODERATELY_ACTIVE',
      baseRiskAdjustment: -0.05,
      assumptions: [
        'Adesão sustentada ao programa de exercícios',
        '≥150 min/semana de atividade aeróbica moderada',
      ],
      limitations: [
        'Sem considerar lesões ou limitações físicas',
        'Benefício estimado para população geral sem comorbidades restritivas',
      ],
    }),
  },
  {
    scenarioType: 'ALCOHOL_REDUCTION',
    name: 'Redução do consumo de álcool',
    description: 'Simula o impacto da redução ou cessação do consumo de álcool',
    defaultParameters: { targetAlcohol: 'NONE' },
    getEffect: (params) => ({
      bmiDelta: -0.2,
      alcoholOverride: (params.targetAlcohol as string | undefined) ?? 'NONE',
      baseRiskAdjustment: -0.04,
      assumptions: ['Cessação ou redução sustentada durante o horizonte temporal'],
      limitations: [
        'Síndrome de abstinência não modelada',
        'Variação individual de resposta não considerada',
      ],
    }),
  },
  {
    scenarioType: 'SMOKING_CESSATION',
    name: 'Cessação do tabagismo',
    description: 'Simula o impacto da parada completa do tabagismo',
    defaultParameters: {},
    getEffect: () => ({
      bmiDelta: 0.5,
      smokingOverride: false,
      baseRiskAdjustment: -0.10,
      assumptions: [
        'Cessação completa e mantida',
        'Ganho de peso típico pós-cessação incluído (+0.5 IMC estimado)',
      ],
      limitations: [
        'Risco de recaída não modelado',
        'Benefício cardiovascular total é gradual (3–5 anos)',
      ],
    }),
  },
  {
    scenarioType: 'SLEEP_IMPROVEMENT',
    name: 'Melhora da qualidade do sono',
    description: 'Simula o impacto de melhorar a qualidade e duração do sono',
    defaultParameters: {},
    getEffect: () => ({
      bmiDelta: -0.2,
      baseRiskAdjustment: -0.04,
      assumptions: [
        '≥7 horas de sono de qualidade por noite',
        'Melhora mantida ao longo do horizonte temporal',
      ],
      limitations: [
        'Qualidade do sono não quantificada no perfil atual',
        'Mecanismo estimado indiretamente via marcadores metabólicos',
      ],
    }),
  },
  {
    scenarioType: 'DIETARY_CHANGE',
    name: 'Mudança alimentar',
    description: 'Simula o impacto de adotar uma alimentação mais saudável',
    defaultParameters: {},
    getEffect: () => ({
      bmiDelta: -0.5,
      baseRiskAdjustment: -0.03,
      assumptions: [
        'Dieta mediterrânea ou similar com redução calórica moderada',
        'Adesão ≥80% ao longo do horizonte temporal',
      ],
      limitations: [
        'Tipo específico de dieta não definido no perfil atual',
        'Micronutrientes e biomarcadores não modelados',
      ],
    }),
  },
  {
    scenarioType: 'TREATMENT_ADHERENCE',
    name: 'Melhora na adesão ao tratamento',
    description: 'Simula o impacto de aumentar a adesão ao tratamento prescrito',
    defaultParameters: {},
    getEffect: () => ({
      bmiDelta: 0,
      baseRiskAdjustment: -0.08,
      assumptions: [
        'Adesão ≥90% às medicações e intervenções prescritas',
        'Sem novas interações medicamentosas',
      ],
      limitations: [
        'Efeito baseado em taxa de adesão estimada — medicações específicas não modeladas',
        'Não considera resistência farmacológica individual',
      ],
    }),
  },
  {
    scenarioType: 'RISK_FACTOR_REMOVAL',
    name: 'Remoção de fator de risco',
    description: 'Análise hipotética do impacto da ausência de um fator de risco familiar',
    defaultParameters: { riskFactorToRemove: '' },
    getEffect: (params) => ({
      bmiDelta: 0,
      baseRiskAdjustment: -0.05,
      assumptions: [
        `Fator de risco "${params.riskFactorToRemove ?? 'não especificado'}" desconsiderado nesta análise`,
        'Todos os outros fatores permanecem inalterados',
      ],
      limitations: [
        'Análise hipotética — fatores genéticos hereditários não são removíveis',
        'Exclusivamente para fins comparativos e educativos',
      ],
    }),
  },
  {
    scenarioType: 'CUSTOM',
    name: 'Cenário personalizado',
    description: 'Permite configurar parâmetros personalizados de simulação',
    defaultParameters: {},
    getEffect: (params) => ({
      bmiDelta: (params.bmiDelta as number) ?? 0,
      lifestyleOverride: params.targetLifestyle as string | undefined,
      smokingOverride: params.smokingOverride as boolean | undefined,
      alcoholOverride: params.targetAlcohol as string | undefined,
      baseRiskAdjustment: (params.baseRiskAdjustment as number) ?? 0,
      assumptions: ['Parâmetros definidos manualmente pelo usuário'],
      limitations: ['Validade e adequação clínica dependem dos parâmetros informados'],
    }),
  },
];

export function getScenarioTemplate(scenarioType: ScenarioType): ScenarioTemplate | null {
  return BUILT_IN_SCENARIOS.find((s) => s.scenarioType === scenarioType) ?? null;
}

export function estimateConfidence(
  dataCompleteness: number,
  timeHorizon: TimeHorizon,
  hasMissingCriticalData: boolean,
): number {
  const base = 0.93;
  const completenessFactor = dataCompleteness * 0.08;
  const timePenalty = TIME_HORIZON_CONFIDENCE_PENALTY[timeHorizon];
  const missingPenalty = hasMissingCriticalData ? 0.10 : 0;
  return Math.max(0.40, Math.min(0.99, base + completenessFactor - timePenalty - missingPenalty));
}
