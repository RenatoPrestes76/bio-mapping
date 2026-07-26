import type { ClinicalRecommendationItem } from '../entities/clinical-decision.entity.js';
import type { ClinicalAlert } from '../entities/clinical-alert.entity.js';

const URGENCY_SCORE: Record<string, number> = {
  IMMEDIATE: 100,
  SHORT_TERM: 70,
  LONG_TERM: 40,
  ROUTINE: 10,
};

const EVIDENCE_SCORE: Record<string, number> = {
  A: 40,
  B: 30,
  C: 20,
  D: 10,
};

const ALERT_SEVERITY_SCORE: Record<string, number> = {
  CRITICAL: 100,
  HIGH: 75,
  MODERATE: 50,
  LOW: 25,
  INFORMATIONAL: 10,
};

function computeRecommendationScore(rec: ClinicalRecommendationItem): number {
  const urgency = URGENCY_SCORE[rec.urgency] ?? 10;
  const evidence = EVIDENCE_SCORE[rec.evidenceLevel ?? 'D'] ?? 10;
  const confidence = rec.confidenceContribution;
  return urgency * 0.4 + evidence * 0.3 + confidence * 0.3;
}

export interface RankedRecommendation {
  recommendation: ClinicalRecommendationItem;
  rank: number;
  score: number;
  rationale: string;
}

export class DecisionRankingEngine {
  rankRecommendations(recommendations: ClinicalRecommendationItem[]): RankedRecommendation[] {
    const scored = recommendations.map((rec) => ({
      recommendation: rec,
      score: computeRecommendationScore(rec),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.map((item, idx) => ({
      recommendation: item.recommendation,
      rank: idx + 1,
      score: Math.round(item.score),
      rationale: this.buildRationale(item.recommendation, item.score),
    }));
  }

  rankAlerts(alerts: ClinicalAlert[]): ClinicalAlert[] {
    return [...alerts].sort((a, b) => {
      const scoreA = ALERT_SEVERITY_SCORE[a.severity] ?? 0;
      const scoreB = ALERT_SEVERITY_SCORE[b.severity] ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.generatedAt.getTime() - a.generatedAt.getTime();
    });
  }

  getTopN(recommendations: ClinicalRecommendationItem[], n: number): ClinicalRecommendationItem[] {
    return this.rankRecommendations(recommendations)
      .slice(0, n)
      .map((r) => r.recommendation);
  }

  getCriticalFirst(recommendations: ClinicalRecommendationItem[]): ClinicalRecommendationItem[] {
    const immediate = recommendations.filter((r) => r.urgency === 'IMMEDIATE');
    const shortTerm = recommendations.filter((r) => r.urgency === 'SHORT_TERM');
    const rest = recommendations.filter((r) => r.urgency !== 'IMMEDIATE' && r.urgency !== 'SHORT_TERM');
    return [...immediate, ...shortTerm, ...rest];
  }

  private buildRationale(rec: ClinicalRecommendationItem, score: number): string {
    const parts: string[] = [];
    parts.push(`Urgency: ${rec.urgency}`);
    if (rec.evidenceLevel) parts.push(`Evidence: Grade ${rec.evidenceLevel}`);
    parts.push(`Confidence: ${rec.confidenceContribution}%`);
    parts.push(`Overall score: ${Math.round(score)}`);
    return parts.join(' | ');
  }
}
