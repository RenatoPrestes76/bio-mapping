import type { ScoringEngine, ScoringInput, ScoringResult, RiskLevel } from './scoring-engine.interface';

function classifyRisk(percentage: number): { classification: string; riskLevel: RiskLevel } {
  if (percentage >= 80) return { classification: 'Excelente', riskLevel: 'LOW' };
  if (percentage >= 60) return { classification: 'Bom', riskLevel: 'LOW' };
  if (percentage >= 40) return { classification: 'Regular', riskLevel: 'MODERATE' };
  if (percentage >= 20) return { classification: 'Ruim', riskLevel: 'HIGH' };
  return { classification: 'Crítico', riskLevel: 'CRITICAL' };
}

export class WeightedSumEngine implements ScoringEngine {
  readonly name = 'weighted-sum';

  calculate(input: ScoringInput): ScoringResult {
    const { answers, fields, sections } = input;

    const answerMap = new Map(answers.map((a) => [a.fieldId, a]));

    let totalScore = 0;
    let maxScore = 0;
    const sectionScores = sections
      .sort((a, b) => a.order - b.order)
      .map((section) => {
        const sectionFields = fields.filter((f) => f.sectionId === section.id);
        let secScore = 0;
        let secMax = 0;

        for (const field of sectionFields) {
          const weight = field.scoringWeight ?? 1;
          const answer = answerMap.get(field.id);
          const score = answer?.score ?? 0;
          const fieldMax = field.max ?? 10;

          secScore += score * weight;
          secMax += fieldMax * weight;
        }

        totalScore += secScore;
        maxScore += secMax;

        const percentage = secMax > 0 ? Math.round((secScore / secMax) * 100) : 0;
        return { sectionId: section.id, sectionTitle: section.title, score: secScore, maxScore: secMax, percentage };
      });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const { classification, riskLevel } = classifyRisk(percentage);

    return { totalScore, maxScore, percentage, classification, riskLevel, sectionScores };
  }
}
