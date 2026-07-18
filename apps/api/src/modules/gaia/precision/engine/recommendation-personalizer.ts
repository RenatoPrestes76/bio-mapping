import type { LifestyleType, AlcoholConsumption, PersonalizedRiskLevel } from './risk-personalizer.js';

export type RecommendationCategory = 'NUTRITION' | 'EXERCISE' | 'MEDICATION' | 'MONITORING' | 'LIFESTYLE' | 'PREVENTIVE' | 'SPECIALIST_REFERRAL';
export type RecommendationPriority = 'LOW' | 'MODERATE' | 'HIGH' | 'URGENT';

export interface ProfileSnapshot {
  age?: number;
  sex?: string;
  bmi?: number;
  lifestyle?: LifestyleType;
  smoking?: boolean;
  alcohol?: AlcoholConsumption;
  pregnant?: boolean;
  menopausal?: boolean;
  familyHistory?: string[];
  conditions?: string[];
  riskLevel?: PersonalizedRiskLevel;
}

export interface RecommendationTemplate {
  id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  description: string;
  expectedBenefit: string;
  condition: (profile: ProfileSnapshot) => boolean;
  reason: (profile: ProfileSnapshot) => string;
}

export interface GeneratedRecommendation {
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  description: string;
  reason: string;
  expectedBenefit: string;
  personalized: boolean;
  templateId: string;
}

export interface PersonalizationRuleCondition {
  variable: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'includes' | 'not_includes';
  value: number | string | boolean;
}

export interface PersonalizationRuleDef {
  id: string;
  name: string;
  conditions: PersonalizationRuleCondition[];
  conjunction: 'AND' | 'OR';
  action: string;
  actionPayload?: Record<string, unknown>;
}

export function evaluateCondition(cond: PersonalizationRuleCondition, profile: ProfileSnapshot): boolean {
  const raw = (profile as Record<string, unknown>)[cond.variable];
  const value = raw as number | string | boolean | string[] | undefined;

  switch (cond.operator) {
    case 'gt': return typeof value === 'number' && value > (cond.value as number);
    case 'gte': return typeof value === 'number' && value >= (cond.value as number);
    case 'lt': return typeof value === 'number' && value < (cond.value as number);
    case 'lte': return typeof value === 'number' && value <= (cond.value as number);
    case 'eq': return value === cond.value;
    case 'includes': return Array.isArray(value) && value.some((v) => v.toLowerCase().includes(String(cond.value).toLowerCase()));
    case 'not_includes': return Array.isArray(value) && !value.some((v) => v.toLowerCase().includes(String(cond.value).toLowerCase()));
    default: return false;
  }
}

export function evaluatePersonalizationRule(rule: PersonalizationRuleDef, profile: ProfileSnapshot): boolean {
  const results = rule.conditions.map((c) => evaluateCondition(c, profile));
  return rule.conjunction === 'AND' ? results.every(Boolean) : results.some(Boolean);
}

export function applyPersonalizationRules(rules: PersonalizationRuleDef[], profile: ProfileSnapshot): PersonalizationRuleDef[] {
  return rules.filter((r) => evaluatePersonalizationRule(r, profile));
}

export const BUILT_IN_TEMPLATES: RecommendationTemplate[] = [
  {
    id: 'tpl-001',
    category: 'NUTRITION',
    priority: 'HIGH',
    title: 'Controle de carboidratos simples',
    description: 'Reduzir consumo de açúcares e carboidratos refinados. Priorizar alimentos de baixo índice glicêmico.',
    expectedBenefit: 'Melhora do controle glicêmico e redução do risco de diabetes tipo 2.',
    condition: (p) => !!(p.familyHistory?.some((h) => h.toLowerCase().includes('diabetes')) || (p.bmi && p.bmi >= 25)),
    reason: (p) => {
      const parts: string[] = [];
      if (p.familyHistory?.some((h) => h.toLowerCase().includes('diabetes'))) parts.push('histórico familiar de diabetes');
      if (p.bmi && p.bmi >= 25) parts.push(`IMC elevado (${p.bmi.toFixed(1)})`);
      return parts.join(' + ');
    },
  },
  {
    id: 'tpl-002',
    category: 'EXERCISE',
    priority: 'HIGH',
    title: 'Programa de atividade física aeróbica',
    description: 'Iniciar programa de atividade aeróbica de 150 min/semana. Caminhada rápida, natação ou ciclismo.',
    expectedBenefit: 'Redução do risco cardiovascular, controle de peso e melhora do humor.',
    condition: (p) => p.lifestyle === 'SEDENTARY' || p.lifestyle === 'LIGHTLY_ACTIVE',
    reason: (p) => `Estilo de vida ${p.lifestyle === 'SEDENTARY' ? 'sedentário' : 'pouco ativo'} identificado`,
  },
  {
    id: 'tpl-003',
    category: 'LIFESTYLE',
    priority: 'URGENT',
    title: 'Cessação do tabagismo',
    description: 'Encaminhar para programa de cessação do tabagismo. Considerar terapia de reposição de nicotina.',
    expectedBenefit: 'Redução significativa do risco cardiovascular e pulmonar.',
    condition: (p) => !!p.smoking,
    reason: () => 'Tabagismo ativo identificado no perfil',
  },
  {
    id: 'tpl-004',
    category: 'MONITORING',
    priority: 'HIGH',
    title: 'Monitoramento pressão arterial',
    description: 'Verificar pressão arterial semanalmente. Registrar medidas em diário.',
    expectedBenefit: 'Detecção precoce de hipertensão e controle de risco cardiovascular.',
    condition: (p) => !!(p.familyHistory?.some((h) => h.toLowerCase().includes('hypertension') || h.toLowerCase().includes('hipertensão')) || (p.age && p.age >= 45)),
    reason: (p) => {
      const parts: string[] = [];
      if (p.familyHistory?.some((h) => h.toLowerCase().includes('hypertension') || h.toLowerCase().includes('hipertensão'))) parts.push('histórico familiar de hipertensão');
      if (p.age && p.age >= 45) parts.push(`idade ${p.age} anos`);
      return parts.join(' + ');
    },
  },
  {
    id: 'tpl-005',
    category: 'NUTRITION',
    priority: 'MODERATE',
    title: 'Suplementação de Vitamina D',
    description: 'Avaliar dosagem sérica de vitamina D e considerar suplementação conforme indicação médica.',
    expectedBenefit: 'Melhora da saúde óssea, imunidade e redução do risco de doenças crônicas.',
    condition: (p) => !!(p.age && p.age >= 50) || !!p.menopausal,
    reason: (p) => {
      if (p.menopausal) return 'Período menopáusico identificado';
      return `Idade ${p.age} anos — maior risco de deficiência de Vitamina D`;
    },
  },
  {
    id: 'tpl-006',
    category: 'PREVENTIVE',
    priority: 'HIGH',
    title: 'Rastreamento cardiovascular',
    description: 'Solicitar perfil lipídico completo, ECG e avaliação cardiológica.',
    expectedBenefit: 'Identificação precoce de risco cardiovascular e oportunidade de intervenção.',
    condition: (p) => !!(p.familyHistory?.some((h) => h.toLowerCase().includes('cardiovascular') || h.toLowerCase().includes('heart')) && (p.age && p.age >= 40)),
    reason: (p) => `Histórico familiar cardiovascular + idade ${p.age} anos`,
  },
  {
    id: 'tpl-007',
    category: 'NUTRITION',
    priority: 'MODERATE',
    title: 'Redução do consumo de álcool',
    description: 'Reduzir consumo para no máximo 1 dose/dia. Priorizar dias sem álcool.',
    expectedBenefit: 'Melhora da função hepática, redução do risco cardiovascular e metabólico.',
    condition: (p) => p.alcohol === 'MODERATE' || p.alcohol === 'HEAVY',
    reason: (p) => `Consumo de álcool ${p.alcohol === 'HEAVY' ? 'elevado' : 'moderado'} identificado`,
  },
  {
    id: 'tpl-008',
    category: 'SPECIALIST_REFERRAL',
    priority: 'HIGH',
    title: 'Encaminhamento endocrinológico',
    description: 'Avaliação especializada considerando risco metabólico elevado.',
    expectedBenefit: 'Diagnóstico preciso e plano terapêutico individualizado.',
    condition: (p) => p.riskLevel === 'HIGH' || p.riskLevel === 'VERY_HIGH',
    reason: (p) => `Risco personalizado ${p.riskLevel} — avaliação especializada necessária`,
  },
];

export function generateRecommendations(profile: ProfileSnapshot, customRules?: PersonalizationRuleDef[]): GeneratedRecommendation[] {
  const fromTemplates = BUILT_IN_TEMPLATES
    .filter((tpl) => tpl.condition(profile))
    .map((tpl): GeneratedRecommendation => ({
      category: tpl.category,
      priority: tpl.priority,
      title: tpl.title,
      description: tpl.description,
      reason: tpl.reason(profile),
      expectedBenefit: tpl.expectedBenefit,
      personalized: true,
      templateId: tpl.id,
    }));

  const priorityOrder: RecommendationPriority[] = ['URGENT', 'HIGH', 'MODERATE', 'LOW'];
  return fromTemplates.sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));
}
