export type CdsPriority = 'LOW' | 'MODERATE' | 'HIGH' | 'URGENT' | 'CRITICAL';
export type RuleOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'contains';

export interface RuleCondition {
  variable: string;
  operator: RuleOperator;
  value: number | string;
}

export interface CdsRuleDefinition {
  id: string;
  name: string;
  conditions: RuleCondition[];
  conjunction: 'AND' | 'OR';
  priority: CdsPriority;
  recommendation: string;
  evidenceLevel: string;
}

export interface RuleMatchResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  priority: CdsPriority;
  recommendation: string;
  evidenceLevel: string;
  matchedConditions: RuleCondition[];
}

export type ClinicalVariables = Record<string, number | string | boolean>;

export function evaluateCondition(cond: RuleCondition, variables: ClinicalVariables): boolean {
  const raw = variables[cond.variable];
  if (raw === undefined || raw === null) return false;

  const varNum = typeof raw === 'number' ? raw : parseFloat(String(raw));
  const condNum = typeof cond.value === 'number' ? cond.value : parseFloat(String(cond.value));

  switch (cond.operator) {
    case 'gt': return !isNaN(varNum) && !isNaN(condNum) && varNum > condNum;
    case 'gte': return !isNaN(varNum) && !isNaN(condNum) && varNum >= condNum;
    case 'lt': return !isNaN(varNum) && !isNaN(condNum) && varNum < condNum;
    case 'lte': return !isNaN(varNum) && !isNaN(condNum) && varNum <= condNum;
    case 'eq': return String(raw) === String(cond.value);
    case 'neq': return String(raw) !== String(cond.value);
    case 'contains': return String(raw).toLowerCase().includes(String(cond.value).toLowerCase());
    default: return false;
  }
}

export function evaluateRule(rule: CdsRuleDefinition, variables: ClinicalVariables): RuleMatchResult {
  const condResults = rule.conditions.map((c) => ({ cond: c, matched: evaluateCondition(c, variables) }));

  const matched = rule.conjunction === 'OR'
    ? condResults.some((r) => r.matched)
    : condResults.every((r) => r.matched);

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    matched,
    priority: rule.priority,
    recommendation: rule.recommendation,
    evidenceLevel: rule.evidenceLevel,
    matchedConditions: matched ? condResults.filter((r) => r.matched).map((r) => r.cond) : [],
  };
}

export function applyRules(rules: CdsRuleDefinition[], variables: ClinicalVariables): RuleMatchResult[] {
  return rules.map((rule) => evaluateRule(rule, variables)).filter((r) => r.matched);
}

// Built-in default rules — always applied when no tenant-specific rules override
export const DEFAULT_RULES: CdsRuleDefinition[] = [
  {
    id: 'builtin-001',
    name: 'Suspeita de Diabetes Tipo 2',
    conditions: [
      { variable: 'hba1c', operator: 'gte', value: 6.5 },
      { variable: 'bmi', operator: 'gte', value: 30 },
    ],
    conjunction: 'AND',
    priority: 'HIGH',
    recommendation: 'Encaminhar para avaliação médica. Considerar diagnóstico de diabetes tipo 2.',
    evidenceLevel: 'A',
  },
  {
    id: 'builtin-002',
    name: 'Pré-diabetes com Sedentarismo',
    conditions: [
      { variable: 'hba1c', operator: 'gte', value: 5.7 },
      { variable: 'physicalActivityLevel', operator: 'lte', value: 1 },
    ],
    conjunction: 'AND',
    priority: 'MODERATE',
    recommendation: 'Modificação do estilo de vida e acompanhamento trimestral.',
    evidenceLevel: 'B',
  },
  {
    id: 'builtin-003',
    name: 'Hipertensão Estágio 2',
    conditions: [
      { variable: 'systolicBp', operator: 'gte', value: 160 },
    ],
    conjunction: 'AND',
    priority: 'URGENT',
    recommendation: 'Avaliação médica imediata para hipertensão estágio 2.',
    evidenceLevel: 'A',
  },
  {
    id: 'builtin-004',
    name: 'Risco Cardiovascular Elevado',
    conditions: [
      { variable: 'systolicBp', operator: 'gte', value: 140 },
      { variable: 'cholesterol', operator: 'gte', value: 240 },
    ],
    conjunction: 'AND',
    priority: 'HIGH',
    recommendation: 'Avaliação cardiológica urgente recomendada.',
    evidenceLevel: 'A',
  },
  {
    id: 'builtin-005',
    name: 'Sobrepeso',
    conditions: [
      { variable: 'bmi', operator: 'gte', value: 25 },
    ],
    conjunction: 'AND',
    priority: 'MODERATE',
    recommendation: 'Orientação nutricional e aumento de atividade física.',
    evidenceLevel: 'B',
  },
  {
    id: 'builtin-006',
    name: 'Hipoglicemia Grave',
    conditions: [
      { variable: 'glucose', operator: 'lt', value: 54 },
    ],
    conjunction: 'AND',
    priority: 'CRITICAL',
    recommendation: 'Atenção imediata. Hipoglicemia grave detectada.',
    evidenceLevel: 'A',
  },
  {
    id: 'builtin-007',
    name: 'Obesidade Grau III',
    conditions: [
      { variable: 'bmi', operator: 'gte', value: 40 },
    ],
    conjunction: 'AND',
    priority: 'HIGH',
    recommendation: 'Encaminhar para equipe multidisciplinar de controle de peso.',
    evidenceLevel: 'A',
  },
  {
    id: 'builtin-008',
    name: 'Bradicardia',
    conditions: [
      { variable: 'heartRate', operator: 'lt', value: 50 },
    ],
    conjunction: 'AND',
    priority: 'URGENT',
    recommendation: 'Avaliação médica imediata — bradicardia significativa.',
    evidenceLevel: 'B',
  },
];
