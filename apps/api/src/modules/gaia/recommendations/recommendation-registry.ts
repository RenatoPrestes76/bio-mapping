import { Injectable } from '@nestjs/common';
import { classifyCategory, RecommendationStrategy } from './recommendation.types';

const ANY_DOMAIN = '*';

/**
 * Registry de estratégias de recomendação (Sprint 14.4, R5) — mesmo padrão
 * de ClinicalRiskRegistry/ScoringService: Map por chave + registro
 * dinâmico. Chave composta domain:topic permite registrar tanto por
 * domínio inteiro (topic omitido) quanto por tópico específico
 * (domain='*'), sem forçar as duas dimensões a existir sempre.
 */
@Injectable()
export class RecommendationRegistry {
  private readonly strategies = new Map<string, RecommendationStrategy>();

  register(strategy: RecommendationStrategy): void {
    this.strategies.set(this.keyFor(strategy.domain, strategy.topic), strategy);
  }

  get(domain: string, topic?: string): RecommendationStrategy | undefined {
    return this.strategies.get(this.keyFor(domain, topic));
  }

  /**
   * Resolve a estratégia pra um RecommendationCandidate.category tal como
   * ele existe hoje (só domain OU só topic, nunca os dois — ver
   * classifyCategory). Quando o contrato ganhar as duas dimensões
   * separadas, só este método muda; a estrutura do Map não precisa mudar.
   */
  resolveForCategory(category: string): RecommendationStrategy | undefined {
    const { domain, topic } = classifyCategory(category);
    if (domain) return this.get(domain);
    if (topic) return this.get(ANY_DOMAIN, topic);
    return undefined;
  }

  list(): RecommendationStrategy[] {
    return [...this.strategies.values()];
  }

  private keyFor(domain: string, topic?: string): string {
    return `${domain}:${topic ?? '*'}`;
  }
}
