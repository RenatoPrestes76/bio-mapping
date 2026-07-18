import { Explainability } from '../contracts/explainability.interface';
import { RecommendationCandidate } from '../contracts/recommendation-candidate.interface';

/**
 * category conhecidos como Domain (Sprint 14.4, Diretriz 1). Qualquer outro
 * valor de RecommendationCandidate.category é tratado como Topic. Isso
 * projeta o Registry para as duas dimensões (Domain/Topic) sem precisar
 * alterar RecommendationCandidate (contrato da 14.1) — quando ele ganhar
 * campos próprios de domain/topic no futuro, só classifyCategory() muda.
 */
export const KNOWN_RECOMMENDATION_DOMAINS = new Set([
  'WELLNESS',
  'CLINICAL',
  'LABORATORY',
  'FHIR',
  'NUTRITION',
]);

export interface CategoryClassification {
  domain: string | null;
  topic: string | null;
}

export function classifyCategory(category: string): CategoryClassification {
  const upper = category.toUpperCase();
  if (KNOWN_RECOMMENDATION_DOMAINS.has(upper)) {
    return { domain: upper, topic: null };
  }
  return { domain: null, topic: upper };
}

/**
 * Estratégia registrável por domínio e/ou tópico (Sprint 14.4, R5/Diretriz 1).
 * Nesta sprint só carrega priorityWeight (desempate) — infraestrutura pronta
 * pra Laboratory/Medication/Nutrition, sem lógica nova por domínio ainda.
 */
export interface RecommendationStrategy {
  readonly domain: string; // '*' = qualquer domínio, usado com topic específico
  readonly topic?: string; // omitido = estratégia de domínio inteiro
  readonly name: string;
  readonly priorityWeight: number;
}

/**
 * Uma origem preservada de uma recomendação mesclada (Sprint 14.4, Diretriz
 * 7) — a deduplicação nunca descarta explainability; cada provider que
 * contribuiu pro mesmo conceito fica registrado aqui.
 */
export interface RecommendationSource {
  provider: string;
  recommendationId: string; // id original (instável) do provider, preservado para rastreabilidade
  explainability: Explainability;
}

/**
 * RecommendationCandidate + rastro de todas as origens que foram mescladas
 * nele (Sprint 14.4, Diretriz 3/7). `recommendationId` aqui é o id ESTÁVEL
 * (conceito canônico ou slug do título), não o UUID aleatório do provider —
 * esse fica preservado em cada `sources[].recommendationId`.
 */
export interface MergedRecommendation extends RecommendationCandidate {
  sources: RecommendationSource[];
}

export interface RecommendationSetStatistics {
  candidatesReceived: number;
  duplicatesRemoved: number;
  highestPriority: string;
  priorityBreakdown: Record<string, number>;
}

/**
 * Agregado final do Recommendation Engine (Sprint 14.4, R8/Diretriz 5).
 */
export interface RecommendationSet {
  recommendations: MergedRecommendation[];
  summary: string;
  statistics: RecommendationSetStatistics;
  explainability: Explainability;
  metadata: Record<string, unknown>;
  generatedAt: Date;
  providerCount: number;
}
