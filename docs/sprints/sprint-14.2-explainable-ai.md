# Sprint 14.2 — Explainable AI (XAI)

Status: **proposta técnica para aprovação — nenhum código foi implementado ainda.**

## 0. Contexto

A Sprint 14.1 entregou a orquestração (`ClinicalContext` → `DecisionEngineService` → `DecisionProvider` → resultados) e já definiu um contrato `Explainability` inicial. A 14.2 não adiciona inteligência nova — torna auditável o que já existe. Este documento primeiro audita o que a 14.1 já cobre de cada objetivo da 14.2, depois propõe como estender (não duplicar) essa base.

## 1. Auditoria: T1–T8 vs. estado atual

| # | Objetivo | Status | Onde / o que falta |
|---|---|---|---|
| T1 | Explainability Domain (`modules/gaia/explainability/`) | **Não existe como domínio separado** | Hoje a lógica de explicabilidade é só um `interface` em `contracts/` + construção manual inline no `AegisWellnessProvider`. Não há Engine/Formatter/Builder. |
| T2 | Explainability Contract | **Parcial** | `Explainability` já tem `confidence, reasoning, evidence, sourceProvider (=Provider), generatedAt (=Timestamp), guidelineReferences, limitations, warnings`. Faltam `DecisionId` e `Metadata`. "Inputs Utilizados" já é coberto por `evidence: DataPointRef[]` — não precisa de campo novo. |
| T3 | Decision Trace | **Não existe** | `DecisionEngineResult`/`ProviderRunResult` (14.1) só guardam os arrays de saída, sem nenhum registro de etapas/tempos. |
| T4 | Provider Provenance | **Não existe** | `DecisionProvider` (14.1) só tem `name`/`domain` — falta `version`. Nenhum id de execução/correlação é gerado hoje. |
| T5 | Confidence Framework | **Não existe como objeto** | `confidence` é sempre `number \| null` hoje, em `PredictionOutput`, `InsightSignal` e `RecommendationCandidate`. |
| T6 | Decision Timeline | **Coincide com T3** | O desenho Input→Processing→Provider→Output→Explainability é a mesma estrutura de um `DecisionTrace.steps[]` — não deve virar um segundo conceito paralelo (ver Decisão 1). |
| T7 | Explainability Builder | **Não existe** | `AegisWellnessProvider.toPredictionOutput` monta o objeto `explainability: {...}` como literal manual — exatamente o padrão que o T7 pede pra eliminar. |
| T8 | Testes | Base sólida a estender | 14.1 já tem 23 testes cobrindo `decision-engine.service`, `clinical-context.builder` e `aegis-wellness.provider` com mocks — o padrão de teste (Nest `TestingModule`, providers mockados) se repete para os novos artefatos. |

**Conclusão da auditoria**: reaproveitar `contracts/explainability.interface.ts` (estender, não recriar), reaproveitar o padrão de pipeline do `DecisionEngineService` (instrumentar, não reescrever), e criar o domínio `modules/gaia/explainability/` como a camada que SABE MONTAR os objetos que os contratos já descrevem.

## 2. Decisões de design

1. **T6 (Decision Timeline) não vira uma estrutura própria** — os estágios Input→Processing→Provider→Output→Explainability são exatamente os `steps[]` de um `DecisionTrace` (T3). Implementar os dois separadamente duplicaria a mesma informação sob dois nomes.
2. **`InsightSignal` e `RecommendationCandidate` passam a ter `explainability: Explainability`**, no lugar dos campos soltos `evidence`/`confidence` que têm hoje — ficam simétricos a `PredictionOutput`, que já usa esse padrão desde a 14.1. Isso é o que torna "Todo Provider retorna Explainability" literalmente verdade para os 3 tipos de saída, não só previsões.
3. **`Explainability.confidence` deixa de ser `number | null` e passa a ser o objeto `Confidence`** (T5) — mudança de tipo deliberada, segura porque nada fora do pipeline em memória depende desse campo ainda (não há endpoint HTTP nem coluna de banco expondo esse shape hoje).
4. **Cálculo de `Confidence.level` e `completeness` é estrutural, não clínico**: `level` vem de faixas fixas sobre o `score` (ex: `<0.4 LOW / <0.7 MODERATE / <0.9 HIGH / else VERY_HIGH`), `completeness` vem da fração de seções do `ClinicalContext` com `available && items.length > 0`. Nenhuma interpretação médica de valores — só contagem/banding, o que respeita "nenhuma lógica clínica adicionada".
5. **Erros de um provider passam a ser contidos, não derrubar o pipeline**: hoje uma exceção dentro de `generateInsights`/`generateRecommendations`/`generatePredictions` propaga e quebra `runPipeline` inteiro. Para que `Provenance.executionStatus` possa valer `FAILED` de forma significativa, o `DecisionEngineService` passa a envolver cada chamada de provider em try/catch, registrando falha no trace em vez de propagar. Isso é aditivo (comportamento novo, não existia antes) — não há teste hoje que dependa do pipeline quebrar nesse cenário.
6. **`correlationId` = `DecisionTrace.traceId`** (um por chamada de `runPipeline`); **`executionId`** é único por provider dentro desse trace (`` `${traceId}:${providerName}` ``). Evita inventar dois conceitos de ID que na prática seriam o mesmo.

## 3. Contratos novos/estendidos (`modules/gaia/contracts/`)

```ts
// confidence.interface.ts
export type ConfidenceLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

export interface Confidence {
  score: number;                  // 0..1
  level: ConfidenceLevel;
  factors: string[];              // ex: "dataWindow: 7 dias", "3 fontes consultadas"
  missingInformation: string[];   // ex: "Missing Labs"
  dataQuality: number | null;     // 0..1
  completeness: number | null;    // 0..1 — fração de capabilities do ClinicalContext com dado
}

// provenance.interface.ts
export type ExecutionStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface Provenance {
  providerName: string;
  providerVersion: string;
  executionTimeMs: number;
  executionStatus: ExecutionStatus;
  executionId: string;
  correlationId: string;
}

// decision-trace.interface.ts
export type DecisionStage = 'CLINICAL_CONTEXT' | 'DECISION_ENGINE' | 'PROVIDER' | 'RECOMMENDATION' | 'EXPLAINABILITY';

export interface DecisionTraceStep {
  stage: DecisionStage;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  status: ExecutionStatus;
  detail?: string;
}

export interface DecisionTrace {
  traceId: string;
  patientId: string;
  steps: DecisionTraceStep[];
}

// explainability.interface.ts (ESTENDIDO)
export interface Explainability {
  decisionId: string;            // NOVO
  confidence: Confidence;        // TIPO ALTERADO (era number | null)
  reasoning: string;
  evidence: DataPointRef[];
  sourceProvider: string;
  generatedAt: Date;
  guidelineReferences: string[];
  limitations: string[];
  warnings: string[];
  metadata: Record<string, unknown>; // NOVO
}
```

`ProviderRunResult`/`DecisionEngineResult` (`decision-engine-result.interface.ts`) ganham os campos de auditoria:

```ts
export interface ProviderRunResult {
  provider: string;
  provenance: Provenance;          // NOVO
  insights: InsightSignal[];
  recommendations: RecommendationCandidate[];
  predictions: PredictionOutput[];
}

export interface DecisionEngineResult {
  patientId: string;
  generatedAt: Date;
  providersRun: string[];
  results: ProviderRunResult[];
  trace: DecisionTrace;            // NOVO
}
```

`InsightSignal`/`RecommendationCandidate` trocam `evidence`/`confidence` soltos por `explainability: Explainability` (decisão 2 acima). `DecisionProvider` ganha `readonly version: string`.

## 4. Domínio novo — `modules/gaia/explainability/`

| Arquivo | Responsabilidade | Usado por |
|---|---|---|
| `explainability.types.ts` | Tipos internos do domínio (ex: input do builder) — barrel dos contracts relevantes | Builder, Engine |
| `explainability-builder.ts` — `ExplainabilityBuilder` | API fluente para montar UM `Explainability` a partir de partes (`withReasoning`, `withEvidence`, `withConfidenceScore`, `withWarning`, `withLimitation`, `withMetadata`). `.build()` delega o cálculo de `Confidence` ao Engine. Providers usam isso em vez de montar `{...}` na mão. | `AegisWellnessProvider` (substitui a construção manual) |
| `explainability-engine.ts` — `ExplainabilityEngine` | Lógica computacional: `computeConfidence(score, context)` → `Confidence`; `buildProvenance(provider, timing, ids)` → `Provenance`; `startTrace(patientId)` / `recordStep(trace, stage, fn)` → `DecisionTrace`. | Builder (confidence), `DecisionEngineService` (provenance + trace) |
| `explainability-formatter.ts` — `ExplainabilityFormatter` | Formatação pura: `toSummary(explainability): string` (resumo legível), `toAuditLine(trace): string`. Não altera dado, só apresentação — usado por logs/debug nesta sprint (nenhum endpoint HTTP novo). | Logging interno |
| `index.ts` | Barrel | — |

## 5. Onde o `DecisionEngineService` muda

`runPipeline` passa a: (a) abrir um `DecisionTrace` via `ExplainabilityEngine.startTrace`, (b) envolver cada etapa (contexto, cada provider, cada geração de insight/recomendação/previsão) com `recordStep` (start/end/status), (c) capturar exceção de provider como step `FAILED` em vez de propagar, (d) anexar `Provenance` a cada `ProviderRunResult`, (e) devolver `trace` no `DecisionEngineResult`. Nenhuma chamada às services do `aegis` muda — só o que envolve essas chamadas.

`AegisWellnessProvider` ganha `readonly version = '1.0.0'` e suas 3 funções `toX()` passam a usar `ExplainabilityBuilder` para montar `explainability` (incluindo em `toInsightSignal`/`toRecommendationCandidate`, que hoje não têm nenhum). As chamadas para `insightEngine`/`recommendationService`/`predictionsService` — a lógica do `aegis` propriamente dita — **não mudam uma linha**.

## 6. Impacto e risco

- **Nenhuma migration de banco** — tudo isso vive em memória no pipeline (nenhum destes objetos é persistido ainda).
- **Mudança de tipo em campos que só o pipeline em memória usa** (`Explainability.confidence`, `InsightSignal`/`RecommendationCandidate.evidence+confidence` → `explainability`) — sem consumidores externos hoje (nenhum controller HTTP expõe essas interfaces), risco de regressão real é zero, mas **os 3 testes de `aegis-wellness.provider.spec.ts` da 14.1 vão precisar ser atualizados** (as asserções `toEqual({... confidence: null})` hoje esperam o shape antigo) — isso é esperado e faz parte do T8, não uma regressão.
- **Contenção de erro no `runPipeline`** é um comportamento novo (não existia). Não quebra nenhum teste existente porque nenhum teste hoje simula um provider lançando exceção.
- **Zero alteração em `InsightEngineService`/`RecommendationService`/`PredictionsService`/`GoalsService`** — a regra de negócio do `aegis` permanece intocada, conforme exigido.

## 7. Plano de implementação incremental

| # | Tarefa | Critério de aceite |
|---|---|---|
| E1 | Criar `Confidence`, `Provenance`, `DecisionTrace` em `contracts/` + estender `Explainability` (+decisionId, +metadata, confidence→Confidence) | Compila; nenhum import de Prisma/serviços nos contratos |
| E2 | Trocar `evidence`/`confidence` por `explainability: Explainability` em `InsightSignal` e `RecommendationCandidate`; adicionar `version` a `DecisionProvider` | Compila (com erros esperados no `aegis-wellness.provider.ts` até E4) |
| E3 | Criar `modules/gaia/explainability/` (types, builder, engine, formatter, index) | Testes unitários do Builder e do Engine cobrindo: confidence banding, provenance assembly, trace start/record/finish |
| E4 | Atualizar `AegisWellnessProvider`: `version`, usar `ExplainabilityBuilder` nas 3 funções `toX()`, sem tocar nas chamadas a `insightEngine`/`recommendationService`/`predictionsService` | `aegis-wellness.provider.spec.ts` atualizado — mesmos cenários de antes, novas asserções no shape `explainability` |
| E5 | Instrumentar `DecisionEngineService.runPipeline`: trace, provenance por provider, contenção de erro | `decision-engine.service.spec.ts` estendido: novo teste "um provider lança exceção → outro provider continua rodando, trace registra FAILED" |
| E6 | Rodar suíte completa | 100% dos testes existentes (104 suítes/1156 hoje) + novos testes do domínio explainability, todos verdes |

## 8. Critérios de aceite (checklist do roadmap)

✅ Todo Provider retorna Explainability (via E2+E4, para os 3 tipos de saída) · ✅ Todo resultado possui Confidence (objeto, via E1) · ✅ Todo resultado possui Provenance (via E1+E5) · ✅ Todo resultado possui Decision Trace (via E1+E5) · ✅ Nenhuma lógica clínica adicionada (banding/completeness são estruturais, não médicos) · ✅ Nenhuma regra do Aegis alterada (E4 só troca a construção do objeto de saída) · ✅ Zero regressão funcional (contenção de erro é aditiva) · ✅ Testes existentes continuam aprovados · ✅ Novos testes para XAI adicionados (E3+E4+E5).

---

Aguardando aprovação para iniciar a implementação (E1–E6) conforme este plano.
