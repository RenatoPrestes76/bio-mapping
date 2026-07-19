import { ClinicalCitation } from '../entities/clinical-citation.entity.js';

export const BUILT_IN_CITATIONS: ClinicalCitation[] = [
  // Statins → rule-card-002 (dyslipidemia) + gl-sbdc-2017, gl-esc-2021
  new ClinicalCitation({
    id: 'cite-statin-card002',
    evidenceId: 'ev-statin-meta-2022',
    clinicalRuleId: 'rule-card-002',
    guidelineId: 'gl-sbdc-2017',
    context: 'Suporte científico para recomendação de estatina em dislipidemia: redução de 22% em eventos vasculares por mmol/L de LDL-C reduzido.',
    confidence: 0.98,
  }),

  new ClinicalCitation({
    id: 'cite-statin-esc2021',
    evidenceId: 'ev-statin-meta-2022',
    guidelineId: 'gl-esc-2021-cv-prevention',
    context: 'ESC 2021 recommends statin therapy as cornerstone of LDL-C reduction, supported by large meta-analytic evidence.',
    confidence: 0.97,
  }),

  // Metformin → rule-endo-001 (diabetes) + gl-sbd-2022, gl-ada-2024
  new ClinicalCitation({
    id: 'cite-metformin-endo001',
    evidenceId: 'ev-metformin-cochrane-2023',
    clinicalRuleId: 'rule-endo-001',
    guidelineId: 'gl-sbd-2022',
    context: 'Cochrane review confirma metformina como primeiro agente farmacológico em DM2: HbA1c -1.1%, sem hipoglicemia, benefício cardiovascular.',
    confidence: 0.96,
  }),

  new ClinicalCitation({
    id: 'cite-metformin-ada2024',
    evidenceId: 'ev-metformin-cochrane-2023',
    guidelineId: 'gl-ada-2024',
    context: 'ADA 2024 Standards of Care recommends metformin as preferred initial pharmacological agent for T2DM.',
    confidence: 0.95,
  }),

  // Exercise → rule-exer-001 + gl-who-pa-2020
  new ClinicalCitation({
    id: 'cite-exercise-exer001',
    evidenceId: 'ev-exercise-cardio-meta-2021',
    clinicalRuleId: 'rule-exer-001',
    guidelineId: 'gl-who-pa-2020',
    context: 'Meta-análise de 81 ECRs confirma reduções de mortalidade com exercício regular; suporta recomendação de 150 min/semana.',
    confidence: 0.93,
  }),

  // Mediterranean diet → rule-infla-001 + gl-esc-2021
  new ClinicalCitation({
    id: 'cite-mediterr-infla001',
    evidenceId: 'ev-mediterranean-meta-2019',
    clinicalRuleId: 'rule-infla-001',
    guidelineId: 'gl-esc-2021-cv-prevention',
    context: 'Dieta mediterrânea reduz marcadores inflamatórios (PCR, IL-6) e mortalidade cardiovascular em 28%. Base para padrão anti-inflamatório.',
    confidence: 0.90,
  }),

  // DASH diet → rule-card-001 (hypertension) + gl-sbc-2020
  new ClinicalCitation({
    id: 'cite-dash-card001',
    evidenceId: 'ev-dash-hypertension-sr-2020',
    clinicalRuleId: 'rule-card-001',
    guidelineId: 'gl-sbc-2020',
    context: 'Dieta DASH reduz PA sistólica em 6.74 mmHg e diastólica em 3.54 mmHg; recomendada como intervenção de estilo de vida para hipertensão.',
    confidence: 0.94,
  }),

  // Omega-3 → rule-card-002 (dyslipidemia)
  new ClinicalCitation({
    id: 'cite-omega3-card002',
    evidenceId: 'ev-omega3-cardio-meta-2021',
    clinicalRuleId: 'rule-card-002',
    context: 'Ômega-3 em altas doses reduz triglicerídeos em 25-30% e eventos cardiovasculares maiores em 25%; adjuvante na dislipidemia.',
    confidence: 0.82,
  }),

  // Sleep → rule-sleep-001 + gl-aasm-2023
  new ClinicalCitation({
    id: 'cite-sleep-sleep001',
    evidenceId: 'ev-sleep-cardio-sr-2021',
    clinicalRuleId: 'rule-sleep-001',
    guidelineId: 'gl-aasm-2023',
    context: 'Revisão sistemática documenta risco cardiovascular aumentado com sono <6h. Suporta recomendação de 7-8h/noite e higiene do sono.',
    confidence: 0.88,
  }),

  // Dietary fiber → rule-endo-001, rule-nutr-001
  new ClinicalCitation({
    id: 'cite-fiber-endo001',
    evidenceId: 'ev-fiber-glycemic-meta-2020',
    clinicalRuleId: 'rule-endo-001',
    context: 'Fibra alimentar (5g/dia a mais) reduz HbA1c em 0.21% e glicemia de jejum em 6.3 mg/dL; componente essencial no manejo do DM2.',
    confidence: 0.87,
  }),

  new ClinicalCitation({
    id: 'cite-fiber-nutr001',
    evidenceId: 'ev-fiber-glycemic-meta-2020',
    clinicalRuleId: 'rule-nutr-001',
    guidelineId: 'gl-ms-guia-2014',
    context: 'Consumo de fibra suportado pelo Guia Alimentar Brasileiro: alimentos in natura ricos em fibras auxiliam no controle glicêmico.',
    confidence: 0.85,
  }),

  // SPRINT → rule-card-001 + gl-sbc-2020
  new ClinicalCitation({
    id: 'cite-sprint-card001',
    evidenceId: 'ev-sprint-2015',
    clinicalRuleId: 'rule-card-001',
    guidelineId: 'gl-sbc-2020',
    context: 'SPRINT demonstra que controle intensivo da PA (<120 mmHg) reduz eventos cardiovasculares em 25% e mortalidade em 27% em alto risco.',
    confidence: 0.91,
  }),

  // ACCORD → rule-endo-001 + gl-ada-2024
  new ClinicalCitation({
    id: 'cite-accord-endo001',
    evidenceId: 'ev-accord-2008',
    clinicalRuleId: 'rule-endo-001',
    guidelineId: 'gl-ada-2024',
    context: 'ACCORD sustenta metas individualizadas de HbA1c: controle muito intensivo (<6%) aumenta mortalidade em DM2 com alto risco CV.',
    confidence: 0.89,
  }),

  // PREDIMED → rule-metab-001 (metabolic syndrome) + gl-esc-2021
  new ClinicalCitation({
    id: 'cite-predimed-metab001',
    evidenceId: 'ev-predimed-2013',
    clinicalRuleId: 'rule-metab-001',
    guidelineId: 'gl-esc-2021-cv-prevention',
    context: 'PREDIMED: dieta mediterrânea reduz eventos cardiovasculares em 30%, benefício relevante na síndrome metabólica.',
    confidence: 0.90,
  }),

  // Smoking → rule-card-001, rule-metab-001
  new ClinicalCitation({
    id: 'cite-smoking-card001',
    evidenceId: 'ev-smoking-cv-cohort-2019',
    clinicalRuleId: 'rule-card-001',
    context: 'Tabagismo aumenta risco de DAC em 2.3×; cessação reduz risco em 50% em 5 anos. Determinante modificável prioritário.',
    confidence: 0.91,
  }),

  // Sedentary → rule-exer-001
  new ClinicalCitation({
    id: 'cite-sedentary-exer001',
    evidenceId: 'ev-sedentary-mortality-cohort-2020',
    clinicalRuleId: 'rule-exer-001',
    guidelineId: 'gl-who-pa-2020',
    context: 'Cada hora adicional de sedentarismo associada a 7% de aumento na mortalidade. Fundamenta recomendação de reduzir tempo sedentário.',
    confidence: 0.86,
  }),

  // Resistance training → rule-endo-002, rule-exer-001
  new ClinicalCitation({
    id: 'cite-resistance-endo002',
    evidenceId: 'ev-resistance-insulin-rct-2021',
    clinicalRuleId: 'rule-endo-002',
    context: 'Treinamento de resistência melhora sensibilidade à insulina (HOMA-IR -0.88) e HbA1c (-0.48%) em pré-diabetes e DM2.',
    confidence: 0.85,
  }),

  // HbA1c microvascular → rule-endo-001 + gl-sbd-2022
  new ClinicalCitation({
    id: 'cite-hba1c-endo001',
    evidenceId: 'ev-hba1c-microvascular-rct-2018',
    clinicalRuleId: 'rule-endo-001',
    guidelineId: 'gl-sbd-2022',
    context: 'Controle intensivo da HbA1c (<7%) reduz complicações microvasculares: retinopatia (-22%), nefropatia (-20%), neuropatia (-14%).',
    confidence: 0.92,
  }),

  // Obesity interventions → rule-nutr-001, rule-metab-001
  new ClinicalCitation({
    id: 'cite-obesity-nutr001',
    evidenceId: 'ev-obesity-interventions-meta-2022',
    clinicalRuleId: 'rule-nutr-001',
    guidelineId: 'gl-ms-guia-2014',
    context: 'Intervenções multicomponente (dieta + exercício + comportamento) alcançam perda de 5.6 kg em 12 meses; base para tratamento da obesidade.',
    confidence: 0.88,
  }),

  new ClinicalCitation({
    id: 'cite-obesity-metab001',
    evidenceId: 'ev-obesity-interventions-meta-2022',
    clinicalRuleId: 'rule-metab-001',
    context: 'Perda de peso de 7-10% essencial no manejo da síndrome metabólica; suportada por meta-análise de 112 ECRs.',
    confidence: 0.87,
  }),

  // CRP → rule-infla-001
  new ClinicalCitation({
    id: 'cite-crp-infla001',
    evidenceId: 'ev-crp-cardiac-cohort-2018',
    clinicalRuleId: 'rule-infla-001',
    context: 'PCR-us >3 mg/L prediz eventos cardiovasculares independentemente (HR 1.58). Fundamenta monitoramento de PCR na inflamação crônica.',
    confidence: 0.84,
  }),

  // TSH → rule-endo-001 (indirect - metabolic risk)
  new ClinicalCitation({
    id: 'cite-tsh-endo001',
    evidenceId: 'ev-tsh-metabolic-cohort-2020',
    clinicalRuleId: 'rule-endo-001',
    context: 'Hipotireoidismo subclínico aumenta risco de DM2 em 17% e síndrome metabólica. Avaliação de TSH relevante no contexto metabólico.',
    confidence: 0.72,
  }),
];
