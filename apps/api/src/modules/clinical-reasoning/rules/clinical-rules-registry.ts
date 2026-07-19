export interface BiomarkerCriterion {
  name: string;
  operator: '>=' | '<=' | '>' | '<' | '=';
  threshold: number;
  probabilityBoost: number;
}

export interface ClinicalReasoningRule {
  id: string;
  condition: string;
  icdCode: string;
  biomarkerCriteria: BiomarkerCriterion[];
  symptomCriteria: string[];
  riskFactors: string[];
  minCriteriaToPass: number;
  baseProbability: number;
  baseConfidence: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendations: string[];
}

export const CLINICAL_REASONING_RULES: ClinicalReasoningRule[] = [
  {
    id: 'cr-hypertension',
    condition: 'Hipertensão Arterial',
    icdCode: 'I10',
    biomarkerCriteria: [
      { name: 'systolic_bp', operator: '>=', threshold: 140, probabilityBoost: 0.35 },
      { name: 'pas', operator: '>=', threshold: 140, probabilityBoost: 0.35 },
      { name: 'diastolic_bp', operator: '>=', threshold: 90, probabilityBoost: 0.25 },
      { name: 'pad', operator: '>=', threshold: 90, probabilityBoost: 0.25 },
    ],
    symptomCriteria: ['cefaleia', 'tontura', 'headache', 'dizziness', 'visão turva'],
    riskFactors: ['smoking', 'obesity', 'sedentary', 'diabetes'],
    minCriteriaToPass: 1,
    baseProbability: 0.50,
    baseConfidence: 0.82,
    urgency: 'HIGH',
    recommendations: [
      'Modificação do estilo de vida: dieta DASH, redução de sódio (< 2g/dia), exercício aeróbico 150 min/semana',
      'Monitorar PA diariamente por 2 semanas antes de decisão terapêutica',
      'Considerar farmacoterapia anti-hipertensiva se PA ≥ 140/90 confirmada',
      'Avaliar lesão de órgão-alvo: ECG, creatinina, microalbuminúria',
    ],
  },
  {
    id: 'cr-diabetes-t2',
    condition: 'Diabetes Mellitus tipo 2',
    icdCode: 'E11',
    biomarkerCriteria: [
      { name: 'fasting_glucose', operator: '>=', threshold: 126, probabilityBoost: 0.45 },
      { name: 'glicemia', operator: '>=', threshold: 126, probabilityBoost: 0.45 },
      { name: 'hba1c', operator: '>=', threshold: 6.5, probabilityBoost: 0.45 },
    ],
    symptomCriteria: ['poliúria', 'polidipsia', 'fadiga', 'perda de peso', 'polyuria', 'polydipsia'],
    riskFactors: ['obesity', 'sedentary', 'diabetes', 'metabolic_syndrome'],
    minCriteriaToPass: 1,
    baseProbability: 0.45,
    baseConfidence: 0.85,
    urgency: 'HIGH',
    recommendations: [
      'Confirmar diagnóstico com segundo exame em dia diferente (glicemia ≥ 126 ou HbA1c ≥ 6,5%)',
      'Iniciar educação em diabetes e plano alimentar individualizado',
      'Atividade física regular: 150 min/semana de intensidade moderada',
      'Metformina como primeiro agente farmacológico se sem contraindicações',
      'Meta HbA1c < 7% para maioria dos adultos; individualizar conforme risco',
    ],
  },
  {
    id: 'cr-prediabetes',
    condition: 'Pré-diabetes',
    icdCode: 'R73',
    biomarkerCriteria: [
      { name: 'fasting_glucose', operator: '>=', threshold: 100, probabilityBoost: 0.30 },
      { name: 'glicemia', operator: '>=', threshold: 100, probabilityBoost: 0.30 },
      { name: 'hba1c', operator: '>=', threshold: 5.7, probabilityBoost: 0.30 },
    ],
    symptomCriteria: ['fadiga', 'resistência insulínica'],
    riskFactors: ['obesity', 'sedentary', 'diabetes'],
    minCriteriaToPass: 1,
    baseProbability: 0.40,
    baseConfidence: 0.78,
    urgency: 'MEDIUM',
    recommendations: [
      'Intervenção intensiva no estilo de vida: perda de 5-10% do peso',
      'Atividade física ≥ 150 min/semana',
      'Rastreamento anual com glicemia de jejum e HbA1c',
      'Considerar metformina em pacientes com alto risco de progressão',
    ],
  },
  {
    id: 'cr-dyslipidemia',
    condition: 'Dislipidemia',
    icdCode: 'E78',
    biomarkerCriteria: [
      { name: 'ldl', operator: '>=', threshold: 160, probabilityBoost: 0.40 },
      { name: 'hdl', operator: '<=', threshold: 40, probabilityBoost: 0.25 },
      { name: 'triglycerides', operator: '>=', threshold: 200, probabilityBoost: 0.30 },
      { name: 'triglicerideos', operator: '>=', threshold: 200, probabilityBoost: 0.30 },
      { name: 'colesterol_total', operator: '>=', threshold: 240, probabilityBoost: 0.25 },
    ],
    symptomCriteria: [],
    riskFactors: ['smoking', 'obesity', 'sedentary', 'diabetes'],
    minCriteriaToPass: 1,
    baseProbability: 0.50,
    baseConfidence: 0.88,
    urgency: 'HIGH',
    recommendations: [
      'Iniciar estatina de alta intensidade se LDL ≥ 190 mg/dL ou alto risco cardiovascular',
      'Meta de LDL < 70 mg/dL (alto risco) ou < 50 mg/dL (muito alto risco)',
      'Dieta cardioprotetora: reduzir gorduras saturadas, aumentar fibras e ômega-3',
      'Atividade física regular para elevar HDL e reduzir triglicerídeos',
      'Reavaliar perfil lipídico em 6-8 semanas após início do tratamento',
    ],
  },
  {
    id: 'cr-obesity',
    condition: 'Obesidade',
    icdCode: 'E66',
    biomarkerCriteria: [
      { name: 'bmi', operator: '>=', threshold: 30, probabilityBoost: 0.50 },
      { name: 'imc', operator: '>=', threshold: 30, probabilityBoost: 0.50 },
    ],
    symptomCriteria: ['apneia', 'dispneia', 'artralgia'],
    riskFactors: ['sedentary', 'high_calorie_diet'],
    minCriteriaToPass: 1,
    baseProbability: 0.45,
    baseConfidence: 0.90,
    urgency: 'MEDIUM',
    recommendations: [
      'Intervenção multicomponente: dieta hipocalórica + exercício + acompanhamento comportamental',
      'Meta de perda de peso: 5-10% inicial; 10-15% com farmacoterapia',
      'Avaliar comorbidades associadas (DM, HA, dislipidemia, apneia do sono)',
      'Considerar referência para cirurgia bariátrica se IMC ≥ 40 ou IMC ≥ 35 com comorbidades',
    ],
  },
  {
    id: 'cr-hypothyroidism',
    condition: 'Hipotireoidismo',
    icdCode: 'E03.9',
    biomarkerCriteria: [
      { name: 'tsh', operator: '>=', threshold: 4.5, probabilityBoost: 0.35 },
    ],
    symptomCriteria: ['fadiga', 'ganho de peso', 'intolerância ao frio', 'constipação', 'bradicardia', 'depressão'],
    riskFactors: ['diabetes', 'metabolic_syndrome'],
    minCriteriaToPass: 1,
    baseProbability: 0.40,
    baseConfidence: 0.75,
    urgency: 'MEDIUM',
    recommendations: [
      'Confirmar com TSH + T4 livre; considerar anticorpos anti-TPO se suspeita de Hashimoto',
      'Iniciar levotiroxina se TSH > 10 mUI/L ou sintomático com TSH 4.5-10',
      'Monitorar TSH a cada 6-8 semanas até estabilização',
      'Avaliar impacto metabólico: peso, glicemia, lipídeos, pressão arterial',
    ],
  },
  {
    id: 'cr-metabolic-syndrome',
    condition: 'Síndrome Metabólica',
    icdCode: 'E88.8',
    biomarkerCriteria: [
      { name: 'fasting_glucose', operator: '>=', threshold: 100, probabilityBoost: 0.20 },
      { name: 'glicemia', operator: '>=', threshold: 100, probabilityBoost: 0.20 },
      { name: 'triglycerides', operator: '>=', threshold: 150, probabilityBoost: 0.20 },
      { name: 'triglicerideos', operator: '>=', threshold: 150, probabilityBoost: 0.20 },
      { name: 'hdl', operator: '<=', threshold: 50, probabilityBoost: 0.15 },
    ],
    symptomCriteria: ['obesidade abdominal', 'resistência insulínica'],
    riskFactors: ['obesity', 'sedentary', 'smoking'],
    minCriteriaToPass: 2,
    baseProbability: 0.35,
    baseConfidence: 0.72,
    urgency: 'HIGH',
    recommendations: [
      'Intervenção multicomponente: perda de 7-10% do peso corporal',
      'Redução de carboidratos simples e gorduras saturadas',
      'Atividade física regular ≥ 150 min/semana',
      'Tratar cada componente individualmente (PA, glicemia, lipídeos)',
      'Monitorar PCR-ultrassensível como marcador de risco residual',
    ],
  },
  {
    id: 'cr-sedentary',
    condition: 'Sedentarismo',
    icdCode: 'Z72.3',
    biomarkerCriteria: [],
    symptomCriteria: ['dispneia ao esforço', 'fraqueza muscular', 'baixa capacidade funcional'],
    riskFactors: ['sedentary'],
    minCriteriaToPass: 1,
    baseProbability: 0.60,
    baseConfidence: 0.80,
    urgency: 'MEDIUM',
    recommendations: [
      'Progressão gradual para 150-300 min/semana de atividade aeróbica moderada',
      'Incluir treinamento de resistência muscular 2x/semana',
      'Reduzir tempo sedentário: pausas ativas a cada 30 minutos',
      'Avaliação de condicionamento físico basal (teste ergométrico se indicado)',
    ],
  },
  {
    id: 'cr-chronic-inflammation',
    condition: 'Inflamação Crônica de Baixo Grau',
    icdCode: 'R79.89',
    biomarkerCriteria: [
      { name: 'crp', operator: '>=', threshold: 2, probabilityBoost: 0.35 },
      { name: 'pcr', operator: '>=', threshold: 2, probabilityBoost: 0.35 },
    ],
    symptomCriteria: ['fadiga crônica', 'dor musculoesquelética difusa'],
    riskFactors: ['smoking', 'obesity', 'sedentary'],
    minCriteriaToPass: 1,
    baseProbability: 0.45,
    baseConfidence: 0.68,
    urgency: 'MEDIUM',
    recommendations: [
      'Adotar padrão alimentar anti-inflamatório (dieta mediterrânea)',
      'Aumentar atividade física: exercício reduz PCR em 30-40%',
      'Cessação do tabagismo imediata',
      'Investigar causa subjacente se PCR persistentemente elevada (autoimune, infecciosa)',
    ],
  },
  {
    id: 'cr-cardiovascular-risk',
    condition: 'Alto Risco Cardiovascular',
    icdCode: 'Z82.49',
    biomarkerCriteria: [
      { name: 'ldl', operator: '>=', threshold: 190, probabilityBoost: 0.30 },
      { name: 'systolic_bp', operator: '>=', threshold: 160, probabilityBoost: 0.30 },
      { name: 'pas', operator: '>=', threshold: 160, probabilityBoost: 0.30 },
    ],
    symptomCriteria: ['dor precordial', 'dispneia aos esforços', 'palpitações'],
    riskFactors: ['smoking', 'diabetes', 'obesity'],
    minCriteriaToPass: 1,
    baseProbability: 0.40,
    baseConfidence: 0.70,
    urgency: 'HIGH',
    recommendations: [
      'Calcular escore de risco cardiovascular (Framingham / SCORE 2)',
      'Metas lipídicas agressivas: LDL < 70 mg/dL (alto risco) / < 50 mg/dL (muito alto)',
      'Controle pressórico: meta PA < 130/80 mmHg',
      'Cessação do tabagismo e mudança de estilo de vida',
      'Avaliar antiagregação plaquetária conforme escore de risco',
    ],
  },
];
