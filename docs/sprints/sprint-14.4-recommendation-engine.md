# Sprint 14.4 — Recommendation Engine

Status: **proposta técnica para aprovação — nenhum código foi implementado ainda.**

## 0. Contexto

Hoje, cada `DecisionProvider` (`aegis-wellness`, `clinical-risk`) monta sua própria lista de `RecommendationCandidate[]` e ela vai direto para `ProviderRunResult.recommendations` — sem merge, sem dedup, sem ordenação entre providers. A 14.4 insere uma camada entre "o que os Providers sugerem" e "o que o pipeline entrega", sem mexer em quem produz os candidatos.

## 1. Auditoria

| Pergunta | Resposta |
|---|---|
| Quem produz recomendações hoje? | `AegisWellnessProvider.generateRecommendations` e `ClinicalRiskProvider.generateRecommendations` — cada um devolve `RecommendationCandidate[]` já em `gaia/contracts` desde a 14.1/14.2. |
| Onde são criadas? | Dentro de cada provider (`toRecommendationCandidate`), a partir de dado que já é deles (aegis: `Recommendation` do Prisma; clinical-risk: `ClinicalRiskAssessment.recommendations`). |
| Quais contratos já existem? | `RecommendationCandidate` (recommendationId/provider/priority/category/title/description/rationale/actions/explainability) — **não muda**. `ProviderRunResult.recommendations: RecommendationCandidate[]` por provider, sem consolidação — é isso que a 14.4 adiciona. `Explainability`/`Confidence` (14.2) e o padrão Builder (14.2/14.3) — reaproveitados para o `RecommendationSet`. |
| O que pode ser reaproveitado? | Tudo. `RecommendationCandidate` fica exatamente como está (R3 confirma isso — Providers continuam devolvendo só isso). `ExplainabilityBuilder`/`ExplainabilityEngine` (14.2) constroem a `Explainability` do `RecommendationSet`. O padrão Registry (`ScoringService` → `ClinicalRiskRegistry` → agora `RecommendationRegistry`) se repete. |

**Achado da auditoria que muda o design**: os dois providers usam granularidades diferentes em `category` — `aegis-wellness` usa `'WELLNESS'` (nível de domínio), `clinical-risk` usa `assessment.riskCategory` (ex: `'METABOLIC'`, nível de doença). O `RecommendationRegistry` (R5) precisa aceitar registro em qualquer granularidade — não force os dois a um único nível.

**Também confirmado**: `InsightPriority` (Prisma) já tem 4 níveis — `INFORMATIVO < ATENCAO < IMPORTANTE < ALTA_PRIORIDADE` — e é exatamente o que os dois providers já usam em `RecommendationCandidate.priority` (`ClinicalRiskProvider.priorityFromRiskLevel` mapeia `CRITICAL/HIGH/MODERATE/LOW` pra esses 4 valores). O Prioritizer da 14.4 (R7) não precisa de um vocabulário novo — só precisa **ranquear** o que já existe.

## 2. Decisões de design

1. **`RecommendationCandidate` não muda** (R3) — zero campo novo, zero tipo redundante.
2. **Deduplicação por conceito, não por igualdade de texto.** O exemplo do roadmap ("Aumentar atividade física" vs. "Aumente a prática de exercícios") não compartilha palavras — comparar strings literalmente não resolve. Uso um dicionário pequeno e explícito de sinônimos → conceito canônico (`atividade física|exercício` → `activity`; `sono|dormir` → `sleep`; etc.), determinístico e auditável, sem IA/NLP.
3. **Prioritizer reaproveita os valores de prioridade já emitidos pelos providers** (`INFORMATIVO`/`ATENCAO`/`IMPORTANTE`/`ALTA_PRIORIDADE`, e também aceita `LOW`/`MEDIUM`/`HIGH`/`CRITICAL` como sinônimos em inglês) — ranqueia por uma tabela fixa de 4 níveis, sem inventar um enum novo obrigatório.
4. **`RecommendationRegistry` guarda estratégias por `domain: string`**, e `domain` é comparado contra `RecommendationCandidate.category` **como está** — funciona tanto para `'WELLNESS'` (aegis) quanto `'METABOLIC'` (clinical-risk), sem forçar granularidade única. Nesta sprint, a única coisa que uma `RecommendationStrategy` carrega é `priorityWeight` (desempate na ordenação) — infraestrutura pronta pra Laboratory/Medication/Nutrition, sem lógica nova por domínio ainda.
5. **`RecommendationSet.explainability.confidence` não vem do `ClinicalContext`** (diferente de 14.2/14.3) — a consolidação de recomendações é um processo determinístico sobre candidatos já prontos, não uma leitura de dado clínico. `score = 1`, `factors: ['agregação determinística']`, `missingInformation: []` (hints explícitos pro `ExplainabilityEngine`, sem derivação automática de completude).
6. **`DecisionEngineService.runPipeline` é estendido, não substituído** — mesmo padrão da 14.2 (que já adicionou trace/provenance de forma aditiva sobre o `runPipeline` da 14.1). Adiciono `recommendationSet: RecommendationSet` ao `DecisionEngineResult` e uma chamada ao `RecommendationEngine` no fim do método, depois de coletar todos os `results`. Nenhum campo existente muda de tipo; nenhum teste que já passa hoje faz `toEqual` no objeto inteiro (todos checam campos específicos) — risco de regressão é baixo e será validado no R10.
7. **Providers continuam devolvendo `recommendations` por provider em `ProviderRunResult`** (não removo esse campo) — o `RecommendationSet` é um campo **adicional** no resultado consolidado, não uma substituição. Isso preserva 100% de compatibilidade com quem já lê `result.results[i].recommendations` hoje.

## 3. Contrato — `RecommendationSet` (`modules/gaia/recommendations/recommendation.types.ts`)

```ts
import { ClinicalContext, Explainability, RecommendationCandidate } from '../contracts';

export interface RecommendationStrategy {
  readonly domain: string;        // comparado contra RecommendationCandidate.category
  readonly name: string;
  readonly priorityWeight: number; // desempate — default 0
}

export interface RecommendationSet {
  recommendations: RecommendationCandidate[]; // final: deduplicado + ordenado
  summary: string;
  priority: string;                            // maior prioridade presente no set
  explainability: Explainability;
  metadata: Record<string, unknown>;           // ex: { candidatesReceived, duplicatesRemoved }
}
```

## 4. Domínio novo — `modules/gaia/recommendations/`

| Arquivo | Responsabilidade |
|---|---|
| `recommendation.types.ts` | `RecommendationSet`, `RecommendationStrategy` (acima) |
| `recommendation-registry.ts` — `RecommendationRegistry` | `Map<string, RecommendationStrategy>` + `register`/`get`/`list` — mesmo padrão do `ClinicalRiskRegistry` |
| `recommendation-deduplicator.ts` — `RecommendationDeduplicator` | Agrupa candidatos por conceito canônico (dicionário de sinônimos, decisão 2) e mescla `actions` dos que caem no mesmo grupo |
| `recommendation-prioritizer.ts` — `RecommendationPrioritizer` | Ordena por rank de prioridade (4 níveis, decisão 3), com `priorityWeight` da `RecommendationStrategy` como desempate |
| `recommendation-builder.ts` — `RecommendationBuilder` | Única fábrica de `RecommendationSet` — monta `Explainability` via `ExplainabilityBuilder` (nunca objeto à mão), mesmo padrão de `ClinicalRiskBuilder` |
| `recommendation-engine.ts` — `RecommendationEngine` | `consolidate(candidates, context): RecommendationSet` — orquestra dedup → priorização → build. Não conhece nenhum provider nem doença. |
| `recommendation-engine.module.ts` | Wiring Nest |
| `tests/` | R10 |

## 5. Integração com o pipeline (R9)

`DecisionEngineService.runPipeline` (extensão aditiva, decisão 6): depois do loop de providers, `RecommendationEngine.consolidate(results.flatMap(r => r.recommendations), context)` é chamado uma vez, e o `RecommendationSet` resultante entra em `DecisionEngineResult.recommendationSet`. `GaiaModule` passa a importar `RecommendationEngineModule` e injetar `RecommendationEngine` no `DecisionEngineService`.

```
Provider (aegis-wellness)     ──┐
  → RecommendationCandidate[]   │
Provider (clinical-risk)      ──┼──► RecommendationEngine.consolidate()
  → RecommendationCandidate[]   │        → dedup → priorização → RecommendationSet
                               ──┘
```

Nenhum Provider muda: eles continuam devolvendo `RecommendationCandidate[]` do jeito que já devolvem hoje (R3, R9 "apenas adaptar a forma como são entregues" — na prática, nem isso muda, já estão no formato certo).

## 6. Plano de implementação incremental

| # | Tarefa | Critério de aceite |
|---|---|---|
| D1 | `recommendation.types.ts` | Compila; `RecommendationCandidate` importado de `gaia/contracts`, não redefinido |
| D2 | `recommendation-registry.ts` | Testes: register/get/list, múltiplos domains, priorityWeight default 0 |
| D3 | `recommendation-deduplicator.ts` | Testes: exemplo do roadmap ("atividade física" vs "prática de exercícios") vira 1 recomendação com actions mescladas; candidatos sem conceito reconhecido nunca se fundem entre si |
| D4 | `recommendation-prioritizer.ts` | Testes: ordena ALTA_PRIORIDADE > IMPORTANTE > ATENCAO > INFORMATIVO; aceita CRITICAL/HIGH/MEDIUM/LOW como sinônimos; usa priorityWeight do registry como desempate |
| D5 | `recommendation-builder.ts` + `recommendation-engine.ts` | Teste: `consolidate()` chama dedup → prioritizer → builder nessa ordem; `RecommendationSet.explainability` construída via `ExplainabilityBuilder` |
| D6 | Estender `DecisionEngineResult`/`DecisionEngineService` (decisão 6) | `runPipeline` retorna `recommendationSet` populado; testes existentes de `decision-engine.service.spec.ts` e `clinical-risk.integration.spec.ts` atualizados para prover `RecommendationEngine` no `TestingModule` (mesmo padrão de atualização já usado na transição 14.1→14.2) |
| D7 | Rodar suíte completa | 100% dos testes existentes (113 suítes/1241 hoje) + novos testes do domínio recommendations, todos verdes; nenhuma linha de `modules/aegis/services/*` ou `modules/clinical/risk/{clinical-risk-engine,clinical-risk.builder,models}.ts` alterada |

## 7. Critérios de aceite (checklist do roadmap)

✅ Recommendation Engine funcional (D5) · ✅ Recommendation Registry (D2) · ✅ Recommendation Prioritizer (D4) · ✅ Recommendation Deduplicator (D3) · ✅ RecommendationSet (D1+D5) · ✅ Todos os Providers retornando só RecommendationCandidates (já é o caso — R3 confirmado na auditoria) · ✅ Zero mudança nas regras do Aegis · ✅ Zero mudança no Clinical Risk (motor/builder/models intocados — só o pipeline por fora) · ✅ Zero regressão · ✅ Testes aprovados (D6+D7).

---

Aguardando aprovação para iniciar a implementação (D1–D7) conforme este plano.
