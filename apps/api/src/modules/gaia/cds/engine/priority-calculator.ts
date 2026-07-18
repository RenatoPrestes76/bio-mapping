import type { CdsPriority, RuleMatchResult } from './rule-engine.js';

export interface PriorityBand {
  priority: CdsPriority;
  minScore: number;
  maxScore: number;
  color: string;
  slaHours: number;
  defaultRecommendation: string;
}

export const PRIORITY_BANDS: PriorityBand[] = [
  {
    priority: 'LOW',
    minScore: 0, maxScore: 24,
    color: '#22c55e',
    slaHours: 720,
    defaultRecommendation: 'Acompanhamento de rotina. Próxima consulta agendada.',
  },
  {
    priority: 'MODERATE',
    minScore: 25, maxScore: 49,
    color: '#eab308',
    slaHours: 168,
    defaultRecommendation: 'Acompanhamento em até 7 dias recomendado.',
  },
  {
    priority: 'HIGH',
    minScore: 50, maxScore: 74,
    color: '#f97316',
    slaHours: 48,
    defaultRecommendation: 'Avaliação médica necessária em até 48 horas.',
  },
  {
    priority: 'URGENT',
    minScore: 75, maxScore: 89,
    color: '#ef4444',
    slaHours: 4,
    defaultRecommendation: 'Atendimento urgente necessário em até 4 horas.',
  },
  {
    priority: 'CRITICAL',
    minScore: 90, maxScore: 100,
    color: '#7f1d1d',
    slaHours: 1,
    defaultRecommendation: 'Atenção clínica imediata necessária.',
  },
];

const PRIORITY_SCORE: Record<CdsPriority, number> = {
  LOW: 10,
  MODERATE: 35,
  HIGH: 60,
  URGENT: 80,
  CRITICAL: 95,
};

export function determinePriority(score: number): CdsPriority {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped >= 90) return 'CRITICAL';
  if (clamped >= 75) return 'URGENT';
  if (clamped >= 50) return 'HIGH';
  if (clamped >= 25) return 'MODERATE';
  return 'LOW';
}

export function getPriorityBand(priority: CdsPriority): PriorityBand {
  return PRIORITY_BANDS.find((b) => b.priority === priority) ?? PRIORITY_BANDS[0];
}

export function calculatePriorityScore(matchedRules: RuleMatchResult[], baseScore = 0): number {
  if (matchedRules.length === 0) return Math.min(baseScore, 100);

  // Highest single rule anchors the score; additional matches add bonus
  const maxRulePriority = matchedRules.reduce<CdsPriority>(
    (max, r) => PRIORITY_SCORE[r.priority] > PRIORITY_SCORE[max] ? r.priority : max,
    'LOW',
  );

  const anchorScore = PRIORITY_SCORE[maxRulePriority];

  // Each additional matched rule adds a small bonus (max +10 total)
  const additionalBonus = Math.min((matchedRules.length - 1) * 2, 10);

  return Math.min(anchorScore + additionalBonus + baseScore, 100);
}

export function requiresMedicalReview(priority: CdsPriority): boolean {
  return priority === 'HIGH' || priority === 'URGENT' || priority === 'CRITICAL';
}
