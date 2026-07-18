import { Injectable } from '@nestjs/common';
import { RecommendationCandidate } from '../contracts';
import { RecommendationRegistry } from './recommendation-registry';

/**
 * Ranks conhecidos hoje: os 4 níveis de InsightPriority (Prisma) e seus
 * sinônimos em inglês (Sprint 14.4, Diretriz 4 — reaproveita o vocabulário
 * já emitido pelos providers, não inventa um novo). Provider → priority →
 * Prioritizer → rank: mudar esta tabela nunca exige tocar em nenhum
 * provider.
 */
const PRIORITY_RANK: Record<string, number> = {
  ALTA_PRIORIDADE: 4,
  CRITICAL: 4,
  IMPORTANTE: 3,
  HIGH: 3,
  ATENCAO: 2,
  MEDIUM: 2,
  INFORMATIVO: 1,
  LOW: 1,
};

function rankOf(priority: string): number {
  return PRIORITY_RANK[priority.toUpperCase()] ?? 0;
}

@Injectable()
export class RecommendationPrioritizer {
  constructor(private readonly registry: RecommendationRegistry) {}

  /**
   * Ordena do maior pro menor rank. Em empate, usa o priorityWeight da
   * RecommendationStrategy registrada pro category do candidato (0 se
   * nenhuma estratégia estiver registrada) como desempate.
   */
  sort<T extends RecommendationCandidate>(candidates: T[]): T[] {
    return [...candidates].sort((a, b) => {
      const rankDiff = rankOf(b.priority) - rankOf(a.priority);
      if (rankDiff !== 0) return rankDiff;
      return this.weightOf(b.category) - this.weightOf(a.category);
    });
  }

  highestPriority(candidates: RecommendationCandidate[]): string {
    if (candidates.length === 0) return 'LOW';
    return candidates.reduce(
      (highest, candidate) => (rankOf(candidate.priority) > rankOf(highest) ? candidate.priority : highest),
      candidates[0].priority,
    );
  }

  breakdown(candidates: RecommendationCandidate[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    for (const candidate of candidates) {
      breakdown[candidate.priority] = (breakdown[candidate.priority] ?? 0) + 1;
    }
    return breakdown;
  }

  private weightOf(category: string): number {
    return this.registry.resolveForCategory(category)?.priorityWeight ?? 0;
  }
}
