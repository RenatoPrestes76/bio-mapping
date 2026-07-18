# Sprint 14.3 — Clinical Risk Engine

Status: **proposta técnica para aprovação — nenhum código foi implementado ainda.**

## 0. Contexto

A 14.1 entregou a orquestração (`ClinicalContext` → `DecisionEngineService` → `DecisionProvider`) e o `ScoringEngine` genérico (`modules/clinical/scoring`, já em produção via `assessments`). A 14.2 entregou a infraestrutura de transparência (`Explainability`, `Confidence`, `Provenance`, `DecisionTrace`, `ExplainabilityBuilder`). A 14.3 é a primeira sprint que soma as duas: um `ClinicalRiskProvider` que usa o `ScoringEngine` para calcular risco e a infra de explicabilidade da 14.2 para tornar esse cálculo auditável — **como um Provider a mais do GAIA**, não como lógica dentro do `DecisionEngineService`.

## 1. Auditoria

### 1.1 `modules/clinical/scoring` — o que já existe

| Componente | O que faz | Reaproveitamento na 14.3 |
|---|---|---|
| `ScoringEngine` (interface) + `ScoringInput`/`ScoringResult`/`RiskLevel` | Contrato: `calculate(input): result` sobre um formato de questionário (`answers[]` + `fields[]` + `sections[]` + `config?`). `RiskLevel = 'LOW' \| 'MODERATE' \| 'HIGH' \| 'CRITICAL'`. | **`RiskLevel` é reaproveitado tal como está** — não crio um novo tipo de nível de risco. |
| `WeightedSumEngine` / `PercentageEngine` | Score ponderado ou percentual normalizado por seção. | Não usados diretamente pela 14.3 (o piloto usa `risk-classification`), mas continuam disponíveis para futuros modelos. |
| `RiskClassificationEngine` | Roda `WeightedSumEngine` por baixo, depois classifica o percentual em faixas (`config.riskBands`, com bandas padrão se omitido). | **Este é o engine que o Metabolic Risk (T5) vai usar** — `ScoringService.calculate('risk-classification', input)`. |
| `ScoringService` | Registry `Map<string, ScoringEngine>` + `calculate(name, input)` + `listEngines()`. | **Chamado diretamente pelo `ClinicalRiskEngine`** — nenhuma cópia da lógica de scoring. |

Confirmado (via `tests/scoring.service.spec.ts`): os 3 engines e o registry funcionam exatamente como documentado na auditoria da 14.1, nada mudou.

### 1.2 Infra da 14.1/14.2 relevante

| Componente | Onde | Reaproveitamento |
|---|---|---|
| `ClinicalContext` (Patient/Vitals/Laboratory/Lifestyle/.../Wearables/...) | `gaia/contracts` | Fonte dos "peso, atividade, sono" citados no roadmap: `context.vitals` (peso/BMI), `context.wearables` (STEPS/SLEEP via oracle) |
| `DecisionProvider` (name/domain/version/supports/generateInsights/generateRecommendations/generatePredictions) | `gaia/contracts` | **Contrato que `ClinicalRiskProvider` implementa** — sem alterar a interface |
| `ExplainabilityBuilder` / `ExplainabilityEngine` | `gaia/explainability` | Única fábrica de `Explainability`; `computeConfidence`/`startTrace` reaproveitados sem alteração |
| `Explainability` (decisionId/confidence/reasoning/evidence/sourceProvider/generatedAt/guidelineReferences/limitations/warnings/metadata) | `gaia/contracts` | Embutido no `ClinicalRiskAssessment` (ver §3) |
| `Confidence` / `Provenance` / `DecisionTrace` | `gaia/contracts` | Reaproveitados como estão — nenhum campo novo necessário |
| `RecommendationCandidate` | `gaia/contracts` | **É o contrato que T7 pede para usar** — `ClinicalRiskProvider.generateRecommendations` devolve isso, não um tipo novo |
| `ClinicalInsightCategory` enum (`METABOLIC`, `CARDIOVASCULAR`, `COGNITIVE`, `NUTRITION`, `MENTAL_HEALTH`, `PREVENTIVE_CARE`, `MEDICATION_ADHERENCE`) | `database/prisma/schema.prisma` | **Criado na 14.1 "reservado para 14.3+", nunca usado até agora.** `METABOLIC` vira a `RiskCategory` do piloto — zero schema novo. |
| `AegisWellnessProvider` / `AegisSchedulerService` / serviços do `aegis` | `modules/aegis` | **Não tocados nesta sprint** — o novo provider é registrado ao lado, não dentro. |

**Conclusão da auditoria**: toda a infraestrutura necessária já existe. A 14.3 não precisa estender nenhum contrato da 14.1/14.2 — só consumir. A única peça genuinamente nova é o domínio `modules/clinical/risk/` e o modelo piloto.

## 2. Decisões de design

1. **`ClinicalRiskAssessment.confidence` não duplica cálculo** — é o mesmo objeto `Confidence` já presente em `explainability.confidence` (mesma referência). O contrato pede os dois campos por nome; a implementação evita duas fontes de verdade.
2. **`RiskScore` = `ScoringResult.percentage`** (0–100), não `totalScore`/`maxScore` brutos — é o valor normalizado e comparável entre modelos diferentes.
3. **`Confidence.score` não é o `RiskScore`.** Confiança mede "quão completos são os dados usados", não "quão arriscado é o paciente" — misturar os dois seria uma inferência clínica indevida. `Confidence.score` = fração das capabilities do `ClinicalContext` que o modelo declara como relevantes E que estavam de fato disponíveis (ex: modelo usa `vitals`+`wearables`; se só `vitals` tinha dado, confidence score = 0.5). Puramente estrutural, calculado pelo `ClinicalRiskEngine` reaproveitando `ExplainabilityEngine.computeConfidence`.
4. **`ClinicalRiskAssessment.decisionTrace` é um trace próprio da avaliação** (não o mesmo do pipeline inteiro) — construído via `ExplainabilityEngine.startTrace()`/`DecisionTraceBuilder`, reaproveitando os `DecisionStage` já existentes (`PROVIDER` para a chamada ao ScoringEngine, `EXPLAINABILITY` para a montagem do resultado). Nenhum valor novo é adicionado ao enum `DecisionStage`.
5. **`RiskCategory` = `ClinicalInsightCategory`** (o enum já existe, reservado desde a 14.1). O piloto usa `METABOLIC`; nenhum enum novo é criado.
6. **Tradução ClinicalContext → ScoringInput fica no `ClinicalRiskModel` (por doença), não no Engine genérico.** `ClinicalRiskEngine` não sabe o que é "BMI" ou "passos" — só sabe pedir a um `ClinicalRiskModel` para montar um `ScoringInput` e despachar pro `ScoringService`. Isso é o que permite adicionar Diabetes/Cardiovascular/Cognitivo depois sem tocar no Engine.
7. **`generatePredictions` do `ClinicalRiskProvider` devolve `[]` nesta sprint** — previsões de risco são Sprint 14.5. Não é lógica faltando, é escopo definido.
8. **Uma única `Explainability` por avaliação de risco, reaproveitada no insight E na recomendação derivados dela** — evita duas explicações divergentes para a mesma decisão.

## 3. Contrato — `ClinicalRiskAssessment` (`modules/clinical/risk/clinical-risk.types.ts`)

```ts
import { ClinicalInsightCategory } from '@bio/database';
import { RiskLevel } from '../scoring/engines/scoring-engine.interface'; // reaproveitado, não redefinido
import { Confidence, DecisionTrace, Explainability } from '../../gaia/contracts';

export interface ClinicalRiskAssessment {
  riskId: string;
  riskCategory: ClinicalInsightCategory;
  riskScore: number;              // 0–100, = ScoringResult.percentage
  riskLevel: RiskLevel;
  confidence: Confidence;         // === explainability.confidence (mesma referência)
  explainability: Explainability;
  decisionTrace: DecisionTrace;
  recommendations: string[];      // textos-base; viram RecommendationCandidate no provider
  metadata: Record<string, unknown>;
}
```

## 4. Domínio novo — `modules/clinical/risk/`

| Arquivo | Responsabilidade |
|---|---|
| `clinical-risk.types.ts` | `ClinicalRiskAssessment` (acima) + interface `ClinicalRiskModel` (abaixo) |
| `clinical-risk.registry.ts` — `ClinicalRiskRegistry` | `Map<string, ClinicalRiskModel>` + `register`/`get`/`list` — mesmo padrão do `ScoringService` |
| `clinical-risk.builder.ts` — `ClinicalRiskBuilder` | Fluent builder que monta `ClinicalRiskAssessment`, delegando `Confidence`/trace ao `ExplainabilityEngine` (T6 — nenhum objeto montado à mão) |
| `clinical-risk-engine.ts` — `ClinicalRiskEngine` | `assess(model, context): ClinicalRiskAssessment` — pede `ScoringInput` ao model, chama `ScoringService.calculate`, monta o resultado via Builder |
| `models/metabolic-risk.model.ts` | Implementação piloto de `ClinicalRiskModel` (T5) |
| `clinical-risk.provider.ts` — `ClinicalRiskProvider` | `implements DecisionProvider` — o ponto de integração com o GAIA (T8) |
| `clinical-risk.module.ts` | Wiring Nest: registra `ClinicalRiskRegistry`, `ClinicalRiskEngine`, `MetabolicRiskModel`, `ClinicalRiskProvider`; importa `GaiaModule` |
| `tests/` | T9 |

```ts
// clinical-risk.types.ts (trecho do ClinicalRiskModel)
export interface ClinicalRiskModel {
  readonly category: ClinicalInsightCategory;
  readonly name: string;                    // ex: 'metabolic-risk-v1'
  readonly scoringEngineName: string;       // ex: 'risk-classification'
  readonly requiredCapabilities: Array<keyof ClinicalContext>; // ex: ['vitals', 'wearables'] — usado pra Confidence
  buildScoringInput(context: ClinicalContext): ScoringInput;
  buildRecommendations(result: ScoringResult, context: ClinicalContext): string[];
}
```

## 5. Piloto — Metabolic Risk (T5)

Reaproveita exatamente os sinais que já chegam via `ClinicalContext`:

- **BMI** — `context.vitals.items` (mais recente) → bucket simples: 18.5–24.9 → score 10; 25–29.9 ou 18.5-alt → score 6; ≥30 ou <18.5 → score 2.
- **Atividade** — `context.wearables.items` filtrado por `metricType='STEPS'`, média do período → ≥8000/dia → 10; ≥5000 → 6; <5000 → 2.
- **Sono** — `context.wearables.items` filtrado por `metricType='SLEEP'`, média → ≥420min(7h) → 10; ≥360min(6h) → 6; <360 → 2.

Quando um sinal está ausente, o campo recebe score neutro (5) — a ausência já fica registrada via `Confidence.missingInformation` (auto-derivado pelo `ExplainabilityEngine`, reaproveitado sem mudança). Os 3 viram um `ScoringInput` de 1 seção ("Fatores de Risco Metabólico") despachado para `ScoringService.calculate('risk-classification', input)` com as bandas **padrão** do engine (sem customização nesta sprint — mantém o piloto simples).

`buildRecommendations` (T7), baseado em `result.riskLevel`:
- `HIGH`/`CRITICAL` → "Recomendar avaliação clínica presencial", "Incentivar atividade física regular", "Sugerir acompanhamento nutricional"
- `MODERATE` → "Incentivar atividade física regular", "Monitorar peso e sono"
- `LOW` → "Manter hábitos atuais", "Reavaliação periódica recomendada"

Regras deliberadamente simples e substituíveis — o objetivo desta sprint é provar a arquitetura, não a precisão clínica (fica explícito no código com um comentário de versão/piloto).

## 6. Integração com GAIA (T8)

`ClinicalRiskProvider implements DecisionProvider`:

- `name = 'clinical-risk'`, `domain = 'CLINICAL'`, `version = '1.0.0'`
- `supports(context)`: `true` sempre nesta sprint (sem gating por dado disponível — a ausência já é capturada via `Confidence`)
- `generateInsights(context)`: para cada `ClinicalRiskModel` registrado (só `metabolic-risk-v1` nesta sprint), chama `ClinicalRiskEngine.assess()` e mapeia o `ClinicalRiskAssessment` para `InsightSignal` (reaproveitando a **mesma** `explainability` já construída — `title`/`category`/`priority` derivados de `riskCategory`/`riskLevel`, `riskId`/`riskScore` preservados em `explainability.metadata`)
- `generateRecommendations(context, insights)`: recalcula as mesmas avaliações (determinístico, sem I/O — diferente do `aegis`, que re-consulta o banco; aqui não há necessidade de persistência) e mapeia `recommendations: string[]` para `RecommendationCandidate[]`, reaproveitando a mesma `explainability`
- `generatePredictions(context)`: `[]` (decisão 7)

Registro: `ClinicalRiskModule` importa `GaiaModule`, injeta `DecisionEngineService` e chama `registerProvider(clinicalRiskProvider)` no `onModuleInit` — **exatamente o padrão já usado pelo `AegisModule`** (`OnModuleInit`), nenhum mecanismo novo. `AppModule` passa a importar `ClinicalRiskModule`. O `aegis` continua registrado do mesmo jeito, sem nenhuma alteração — o pipeline passa a rodar os dois providers (ordem de registro: `aegis-wellness`, depois `clinical-risk`).

## 7. Plano de implementação incremental

| # | Tarefa | Critério de aceite |
|---|---|---|
| R1 | `clinical-risk.types.ts`: `ClinicalRiskAssessment` + `ClinicalRiskModel` | Compila; importa `RiskLevel` de `clinical/scoring`, não redefine |
| R2 | `clinical-risk.registry.ts`: `ClinicalRiskRegistry` (register/get/list) | Teste unitário: registra 1 modelo, lista, recupera por category |
| R3 | `clinical-risk.builder.ts` + `clinical-risk-engine.ts` | `ClinicalRiskEngine.assess()` testado com um `ClinicalRiskModel` fake e `ScoringService` real — confirma que `ScoringService.calculate` é chamado, não reimplementado |
| R4 | `models/metabolic-risk.model.ts` | Testes unitários de `buildScoringInput`/`buildRecommendations` para os buckets de BMI/atividade/sono, incluindo o caso de dado ausente (score neutro) |
| R5 | `clinical-risk.provider.ts` + `clinical-risk.module.ts` | Testes com `DecisionEngineService` real: `generateInsights`/`generateRecommendations` retornam os shapes corretos; `generatePredictions` retorna `[]` |
| R6 | Registrar `ClinicalRiskModule` em `AppModule` | `DecisionEngineService.listProviders()` retorna `['aegis-wellness', 'clinical-risk']` em teste de integração |
| R7 | Rodar suíte completa | 100% dos testes existentes (107 suítes/1190 hoje) + novos testes do domínio risk, todos verdes; nenhuma linha de `modules/aegis/services/*` alterada |

## 8. Critérios de aceite (checklist do roadmap)

✅ ClinicalRiskProvider integrado ao GAIA (R5+R6) · ✅ Clinical Risk Registry funcional (R2) · ✅ Clinical Risk Contract definido (R1) · ✅ Metabolic Risk implementado (R4) · ✅ Explainability completa para riscos (R3, via ExplainabilityBuilder) · ✅ Recommendations geradas pelo Provider (R4+R5, contrato `RecommendationCandidate`) · ✅ Zero alteração nas regras do Aegis (nenhum arquivo em `modules/aegis/services` tocado) · ✅ Zero regressão · ✅ Testes existentes aprovados · ✅ Novos testes cobrindo Registry/Engine/Builder/Provider/Explainability/Recommendation/Pipeline/Integração (R2–R6).

---

Aguardando aprovação para iniciar a implementação (R1–R7) conforme este plano.
