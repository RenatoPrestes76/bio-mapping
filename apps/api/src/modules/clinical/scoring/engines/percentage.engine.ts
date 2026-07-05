import type { ScoringEngine, ScoringInput, ScoringResult, RiskLevel } from './scoring-engine.interface';

function classifyRisk(percentage: number): { classification: string; riskLevel: RiskLevel } {
  if (percentage >= 90) return { classification: 'Ótimo', riskLevel: 'LOW' };
  if (percentage >= 75) return { classification: 'Bom', riskLevel: 'LOW' };
  if (percentage >= 50) return { classification: 'Moderado', riskLevel: 'MODERATE' };
  if (percentage >= 25) return { classification: 'Abaixo do esperado', riskLevel: 'HIGH' };
  return { classification: 'Crítico', riskLevel: 'CRITICAL' };
}

export class PercentageEngine implements ScoringEngine {
  readonly name = 'percentage';

  calculate(input: ScoringInput): ScoringResult {
    const { answers, fields, sections } = input;
    const answerMap = new Map(answers.map((a) => [a.fieldId, a]));

    let totalNumerator = 0;
    let totalDenominator = 0;
    const sectionScores = sections
      .sort((a, b) => a.order - b.order)
      .map((section) => {
        const sectionFields = fields.filter((f) => f.sectionId === section.id);
        let num = 0;
        let den = 0;

        for (const field of sectionFields) {
          const answer = answerMap.get(field.id);
          const score = answer?.score ?? 0;
          const fieldMax = field.max ?? 10;
          const weight = field.scoringWeight ?? 1;
          num += (score / fieldMax) * weight;
          den += weight;
        }

        totalNumerator += num;
        totalDenominator += den;

        const sectionPct = den > 0 ? Math.round((num / den) * 100) : 0;
        const secScore = (num / (den || 1)) * 100;
        return { sectionId: section.id, sectionTitle: section.title, score: Math.round(secScore * 10) / 10, maxScore: 100, percentage: sectionPct };
      });

    const percentage = totalDenominator > 0 ? Math.round((totalNumerator / totalDenominator) * 100) : 0;
    const { classification, riskLevel } = classifyRisk(percentage);

    return { totalScore: percentage, maxScore: 100, percentage, classification, riskLevel, sectionScores };
  }
}
