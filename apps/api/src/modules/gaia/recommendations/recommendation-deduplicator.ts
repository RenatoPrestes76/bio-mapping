import { Injectable } from '@nestjs/common';
import { RecommendationCandidate } from '../contracts';
import { MergedRecommendation, RecommendationSource } from './recommendation.types';

/**
 * Dicionário de conceitos canônicos (Sprint 14.4, Diretriz 2) — determinístico,
 * auditável, testável. Nada de NLP/IA: só padrões de texto explícitos.
 * "Aumentar atividade física" / "Aumente a prática de exercícios" / "Caminhar
 * mais" / "Mover-se mais" caem todos em `increase-physical-activity`.
 */
const CONCEPT_GROUPS: ReadonlyArray<{ concept: string; patterns: RegExp[] }> = [
  {
    concept: 'increase-physical-activity',
    patterns: [/atividade\s+f[ií]sica/i, /pr[aá]tica\s+de\s+exerc[ií]cios?/i, /exerc[ií]cios?/i, /caminhar/i, /mover-?se/i],
  },
  {
    concept: 'improve-sleep-quality',
    patterns: [/sono/i, /dormir/i],
  },
  {
    concept: 'nutritional-follow-up',
    patterns: [/nutri[cç][aã]o/i, /nutricional/i, /alimenta[cç][aã]o/i],
  },
  {
    concept: 'seek-medical-evaluation',
    patterns: [/profissional\s+de\s+sa[uú]de/i, /avalia[cç][aã]o\s+cl[ií]nica/i, /m[eé]dico/i],
  },
  {
    concept: 'maintain-current-habits',
    patterns: [/manter.*h[aá]bitos/i, /h[aá]bitos\s+atuais/i],
  },
  {
    concept: 'periodic-reassessment',
    patterns: [/reavalia[cç][aã]o\s+peri[oó]dica/i],
  },
];

function detectConcept(text: string): string | null {
  for (const group of CONCEPT_GROUPS) {
    if (group.patterns.some((pattern) => pattern.test(text))) return group.concept;
  }
  return null;
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'recommendation';
}

interface CandidateGroup {
  concept: string | null;
  items: RecommendationCandidate[];
}

/**
 * Agrupa candidatos pelo mesmo conceito canônico e mescla (Sprint 14.4, R6).
 * Candidatos sem conceito reconhecido nunca se fundem com outro (concept
 * `null` nunca casa consigo mesmo) — evita falso-positivo de duplicata.
 * Preserva TODAS as origens em `sources[]` (Diretriz 7) — nenhuma
 * Explainability é descartada na fusão.
 */
@Injectable()
export class RecommendationDeduplicator {
  deduplicate(candidates: RecommendationCandidate[]): MergedRecommendation[] {
    const groups: CandidateGroup[] = [];

    for (const candidate of candidates) {
      const concept = detectConcept(`${candidate.title} ${candidate.actions.join(' ')}`);
      const existing = concept ? groups.find((g) => g.concept === concept) : undefined;

      if (existing) {
        existing.items.push(candidate);
      } else {
        groups.push({ concept, items: [candidate] });
      }
    }

    return groups.map((group) => this.mergeGroup(group));
  }

  private mergeGroup(group: CandidateGroup): MergedRecommendation {
    const [primary] = group.items;
    const actions = Array.from(new Set(group.items.flatMap((item) => item.actions)));
    const sources: RecommendationSource[] = group.items.map((item) => ({
      provider: item.provider,
      recommendationId: item.recommendationId,
      explainability: item.explainability,
    }));

    return {
      ...primary,
      recommendationId: group.concept ?? slugify(primary.title),
      actions,
      sources,
    };
  }
}
