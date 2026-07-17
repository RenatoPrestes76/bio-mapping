# Sprint 14.1 — AI Decision Engine Foundation

Status: **proposta técnica para aprovação — nenhum código foi implementado ainda.**

## 0. Como ler este documento

Antes de propor qualquer tarefa, foi feita uma auditoria arquitetural completa dos módulos `modules/clinical/scoring` e `modules/clinical/evidence`, mais um levantamento de todo dado clínico já queryável no sistema (`aegis`, `vitals`, `biomarkers`, `patients`, `hippocrates`, `apollo`, `oracle`, `bioscore`, `pulse`). A conclusão central: **parte relevante da Sprint 14 já existe**, implementada de forma implícita dentro do módulo `aegis` (que hoje cobre insights, recomendações, metas e previsões — mas só para o domínio fitness/wearables) e do módulo `clinical/scoring` (motor de score genérico e plugável, já em produção via `assessments`). A Sprint 14.1 deve **orquestrar e generalizar** essa infraestrutura, não recriá-la.

Uma correção de rota importante: `modules/clinical/evidence` **não é** um motor de evidência científica. É armazenamento de anexos de uma avaliação clínica (fotos, PDFs, laudos escaneados, vídeos) vinculados a um `Assessment`. Semanticamente não tem relação com "qual literatura suporta esta recomendação" (objetivo 7 do roadmap). Isso é esclarecido na seção 3.

---

## 1. Auditoria: objetivos da Sprint 14 vs. estado atual

| # | Objetivo (roadmap) | Status | Onde |
|---|---|---|---|
| 1 | AI Decision Engine | **Parcial** | `aegis.InsightEngineService` + `aegis.PredictionsService` já interpretam séries temporais e produzem candidatos com `algorithm`/`explanation`. Mas: (a) domínio restrito a fitness/wearables (sono, FC, HRV, atividade, carga de treino, peso) — não toca vitals/biomarkers/medicamentos/histórico clínico; (b) thresholds hardcoded inline em cada método `analyzeX()`/`predictX()`, sem usar o `ScoringEngine` genérico já existente; (c) nenhuma agregação cross-módulo — cada service só lê `DailyMetrics`/`TrainingLoad` (dados de `pulse`), ignorando vitals/biomarkers/patients/hippocrates. |
| 2 | Explainable AI (XAI) | **Parcial** | `HealthInsight` e `HealthPrediction` já têm `algorithm`, `modelVersion`, `dataWindow`, `explanation`/`message`, `confidence` (só predictions). Falta: rastreabilidade estruturada de "quais registros exatos foram usados" (hoje é só `dataWindow: number`, não uma lista de IDs/valores), e não existe vínculo com evidência/literatura. |
| 3 | Clinical Risk Engine (Diabetes, Hipertensão, Obesidade, Sd. Metabólica, Risco CV, Declínio Cognitivo) | **Infra pronta, modelos inexistentes** | `ScoringEngine` (interface) + `WeightedSumEngine`/`PercentageEngine`/`RiskClassificationEngine` + `ScoringService` (registry por nome) já calculam score/classificação/risco a partir de um `ScoringInput` (respostas + campos + seções + config). Já usado em produção por `AssessmentsService` (`this.scoring.calculate(template.scoringEngine, ...)`). **Nenhum dos 6 modelos de risco clínico pedidos existe** — mas todos podem, em princípio, ser expressos como `AssessmentTemplate`s com `scoringEngine: 'risk-classification'` e `config.riskBands` customizado (é literalmente como escalas de risco clínico reais como FINDRISC/Framingham funcionam: perguntas ponderadas → faixa de risco). |
| 4 | Recommendation Engine | **Parcial** | `aegis.RecommendationService` funciona (regras `insightType → template` com `title/description/rationale/action`), mas as únicas categorias existentes (`InsightCategory`: SLEEP, HEART_RATE, HRV, TRAINING_LOAD, ACTIVITY, WEIGHT, BODY_COMPOSITION, RECOVERY, CARDIOVASCULAR) não cobrem Nutrição, Saúde Mental, Exames, Consultas, Vacinação, Mudança de hábitos pedidos no roadmap. |
| 5 | Prediction Layer (peso, glicemia, pressão, adesão, risco futuro) | **Parcial** | `aegis.PredictionsService` já faz regressão linear com `confidence`/`trend`/`riskLevel`/`explanation` para sono, FC de repouso, peso e risco de overtraining (`HealthPrediction` é genérico o bastante — `metric: string` — para aceitar novas métricas sem migration). Faltam os preditores clínicos pedidos: evolução glicêmica, pressão arterial, adesão ao tratamento. |
| 6 | Clinical Knowledge Base | **Não existe** | Os limiares que hoje decidem um insight (`changePct <= -0.20`, `sleepMinutes < 360`, `tsb < -30`, etc.) estão **hardcoded no código TypeScript** do `aegis`, não numa camada de conhecimento consultável/versionável. `AssessmentTemplate` é o candidato mais próximo (é config de questionário reutilizável), mas hoje não representa "diretriz clínica com fonte". |
| 7 | Evidência Científica (rastreabilidade de literatura) | **Não existe** | `clinical/evidence` é anexos de avaliação (arquivo enviado pelo usuário), não citação de literatura médica. É um módulo genuinamente diferente do que a Sprint 14.7 precisa — não há nada para reaproveitar aqui além do padrão arquitetural (`EvidenceStorageProvider` pluggable, se algum dia formos anexar PDFs de artigos). |

---

## 2. Componentes existentes a reutilizar integralmente

- **`ScoringEngine` / `ScoringService`** (`modules/clinical/scoring`) — motor determinístico plugável (`WeightedSumEngine`, `PercentageEngine`, `RiskClassificationEngine`), registry por nome, já testado e em produção. Base do Clinical Risk Engine (14.3): cada doença vira um `AssessmentTemplate` + `config.riskBands`, não um novo motor.
- **`AssessmentTemplate` / `AssessmentSection` / `AssessmentField` / `Assessment` / `AssessmentAnswer`** (schema.prisma) — estrutura de input padronizada que o `ScoringEngine` já consome. Reaproveitável tal como está para representar questionários de risco clínico.
- **`HealthInsight` / `Recommendation` / `UserGoal` / `GoalHistory` / `HealthPrediction`** (schema.prisma, hoje "propriedade" do `aegis`) — já implementam o ciclo insight → recomendação → meta, e uma tabela de previsão com `riskLevel`/`confidence`/`explanation`/`algorithm`. Nenhuma tabela nova equivalente deve ser criada.
- **`aegis.InsightEngineService` / `PredictionsService` / `RecommendationService`** — o padrão `analyzeX(): InsightCandidate[]` / `predictX(): PredictionCandidate[]` / `RECOMMENDATION_RULES` é sólido e deve ser **generalizado**, não descartado nem duplicado num novo módulo paralelo.
- **Repositórios de dados de entrada já existentes**, todos com métodos por `patientId`: `VitalsRepository`, `BiomarkersService`, `MedicationRepository`/`AllergyRepository` (hippocrates), `EnrollmentRepository`/`TaskRepository`/`ClinicalNoteRepository` (apollo — adesão/hábitos), `NormalizedHealthDataRepository`/`HealthSourceRepository` (oracle — wearables), `BioscoreRepository`/`SleepMetricsRepository`/etc. (bioscore/pulse — métricas computadas).

## 3. Extensões necessárias (evoluir, não recriar)

- **`InsightCategory`** (enum): renomeado para `WellnessInsightCategory` (rename puro — mesmos valores, `ALTER TYPE ... RENAME`, sem perda de dado). Um novo enum `ClinicalInsightCategory`, independente, é criado do zero — ver seção 6.
- **`RECOMMENDATION_RULES`** (hoje um `Record` hardcoded em `recommendation.service.ts`): extrair para uma fonte de dados consultável — isso É o embrião pedido no objetivo 6 (Clinical Knowledge Base), não um módulo novo do zero.
- **`aegis.PredictionsService`**: adicionar novos `predictX(): PredictionCandidate[]` (glicemia, pressão arterial, adesão ao tratamento) seguindo o padrão já existente — mesma arquitetura, mais implementações.
- **`ScoringEngine`**: nenhuma mudança de contrato. Clinical Risk Engine (14.3) consome via templates com `scoringEngine: 'risk-classification'`.

## 4. Novos módulos a criar (14.1) e módulos futuros (14.2+)

**Nesta sprint (14.1)** — só o essencial para orquestrar o que já existe, com o `aegis` **generalizado como provedor**, não substituído:

| Módulo/artefato | Responsabilidade | Por quê é novo |
|---|---|---|
| `modules/gaia/contracts/*` | Interfaces puras (sem implementação de lógica clínica): `ClinicalContext`, `DecisionProvider`, `Explainability`, `RecommendationCandidate`, `PredictionOutput`. | É o "Contratos/Interfaces" pedido explicitamente na sua conclusão — hoje não existe um shape comum entre insight/recomendação/previsão. |
| `modules/gaia/clinical-context.builder.ts` | Agrega dado de vitals/biomarkers/hippocrates/apollo/oracle/bioscore num único `ClinicalContext` por paciente. Só leitura, nenhum cálculo clínico. | Não existe hoje nenhuma agregação cross-módulo — cada service do `aegis` só lê `DailyMetrics`/`TrainingLoad`. |
| `modules/gaia/decision-engine.service.ts` | Registry de `DecisionProvider`s (mesmo padrão do `ScoringService`: `Map<string, DecisionProvider>`) + `runPipeline(patientId)` que chama os providers registrados e agrega o resultado. | É o orquestrador central pedido — mas **delega**, não recalcula nada. |
| `modules/aegis/providers/aegis-wellness.provider.ts` | Adapter que implementa `DecisionProvider`, chamando por dentro o `InsightEngineService`/`PredictionsService`/`RecommendationService` **exatamente como são hoje**, só traduzindo a saída para os contratos genéricos do `gaia`. | Isso É a generalização do `aegis` pedida — zero reescrita de lógica, só um adapter fino por cima do que já existe. |

**Futuro (14.2–14.7, fora do escopo desta sprint)** — citados aqui só para deixar claro que o desenho de 14.1 já reserva o lugar deles, sem construí-los agora:
- `ClinicalRiskProvider` (14.3) — novo `DecisionProvider`, usa `ScoringService` internamente.
- `modules/gaia/knowledge-base` (14.6) — passa a alimentar `RECOMMENDATION_RULES` e os thresholds do `aegis` via dado versionado em vez de hardcode.
- `modules/clinical/scientific-evidence` (14.7, nome deliberadamente distinto de `clinical/evidence`, que já significa "anexo") — popula `Explainability.evidenceRefs`, que em 14.1 existe no contrato mas fica sempre vazio/opcional.

## 5. Impacto arquitetural

- **Nenhuma migration destrutiva.** Tudo é aditivo: novos valores de enum, novas tabelas, novo módulo. `aegis`, `clinical/scoring` e `clinical/evidence` continuam funcionando exatamente como hoje.
- **Colisão de nome a evitar**: "Evidence" já está em uso (anexos). O módulo da Sprint 14.7 precisa de um nome diferente (`ScientificEvidence`/`ClinicalReference`) para não confundir os dois conceitos em código, DB e Swagger.
- **`aegis` muda de papel, não de API**: passa a ser uma *fonte* consumida pelo `gaia/decision-engine` (insights/previsões de wearables), mas o `AegisController` e seus endpoints atuais (`/aegis/dashboard`, `/aegis/insights`, etc.) continuam ativos sem breaking changes — o app mobile/frontend que já os consome não precisa mudar.
- **Risco de escopo**: como o "Clinical Risk Engine" (14.3) é só configuração sobre o `ScoringEngine` existente, existe a tentação de pular direto pra lá. Mantendo a ordem 14.1 → 14.2 → 14.3 evitamos construir modelos de risco sem um orquestrador e um contrato de explicabilidade por baixo — o que geraria retrabalho quando 14.3 precisar "explicar" um score.

## 6. Decisões confirmadas

1. **Dois enums separados, não um só.** `WellnessInsightCategory` (rename de `InsightCategory`, mesmos valores) continua exclusivo do domínio wearable/fitness. `ClinicalInsightCategory` é um enum novo e independente — sem overlap, sem contrato comum forçado agora. Valores propostos para o novo enum (nenhum é consumido por lógica nesta sprint — é só o tipo, reservado para 14.3/14.4):
   ```prisma
   enum ClinicalInsightCategory {
     METABOLIC             // diabetes, obesidade, síndrome metabólica
     CARDIOVASCULAR
     COGNITIVE
     NUTRITION
     MENTAL_HEALTH
     PREVENTIVE_CARE       // exames, consultas, vacinação
     MEDICATION_ADHERENCE
   }
   ```
   Ele entra no schema **sem** ligar a nenhum model ainda (nenhum `HealthInsight`-like clínico é criado em 14.1) — é só o tipo existindo, pronto para a 14.3 usar.

2. **Regras hardcoded do `aegis` permanecem como estão.** Nenhuma migração de `RECOMMENDATION_RULES`/thresholds nesta sprint. Fica 100% para a 14.6, numa migração única e auditável.

3. **Escopo confirmado: zero lógica clínica.** 14.1 entrega orquestração, contratos, registry e testes de infraestrutura — nenhum cálculo de risco, nenhuma nova categoria de recomendação em uso, nenhuma regra nova.

4. **`aegis` é o núcleo histórico do Decision Engine, não um concorrente dele.** A generalização acontece por **adapter** (`AegisWellnessProvider` implementa `DecisionProvider` chamando os services do `aegis` sem alterá-los), não por reescrita. `AegisController` e os crons do `AegisSchedulerService` continuam existindo; a única mudança de comportamento (não de lógica) é que `AegisSchedulerService.runAllForPatient` passa a delegar para `DecisionEngineService.runPipeline(patientId, { providers: ['aegis-wellness'] })` em vez de chamar os 4 services diretamente — mesmo resultado, agora passando pelo pipeline genérico.

---

## 7. Plano de implementação incremental (14.1)

### 7.1 Layout de arquivos

```
apps/api/src/modules/gaia/
  contracts/
    clinical-context.interface.ts       # ClinicalContext, DataWindow
    explainability.interface.ts         # Explainability, DataPointRef
    decision-provider.interface.ts      # DecisionProvider
    recommendation-candidate.interface.ts
    prediction-output.interface.ts
    index.ts                            # barrel export
  clinical-context.builder.ts           # agrega dado dos módulos existentes (só leitura)
  decision-engine.service.ts            # registry + runPipeline()
  gaia.module.ts                        # exporta DecisionEngineService, importa módulos de dado
  tests/
    clinical-context.builder.spec.ts
    decision-engine.service.spec.ts

apps/api/src/modules/aegis/
  providers/
    aegis-wellness.provider.ts          # NOVO — adapter implements DecisionProvider
  tests/
    aegis-wellness.provider.spec.ts     # NOVO
  aegis.module.ts                       # MODIFICADO — registra o provider no DecisionEngineService
  schedulers/aegis-scheduler.service.ts # MODIFICADO — runAllForPatient delega ao pipeline
```

### 7.2 Contratos (esboço — a forma exata pode mudar na implementação, mas a intenção é esta)

```ts
// contracts/explainability.interface.ts
export interface DataPointRef {
  source: string;         // ex: 'vitals', 'oracle.normalizedHealthData', 'pulse.dailyMetrics'
  field: string;
  value: unknown;
  recordedAt?: Date;
}

export interface Explainability {
  algorithm: string;
  modelVersion: string;
  confidence: number | null;
  dataUsed: DataPointRef[];
  reasoning: string;
  evidenceRefs: string[];   // sempre [] em 14.1 — populado a partir da 14.7
}

// contracts/clinical-context.interface.ts
export interface ClinicalContext {
  patientId: string;
  window: { from: Date; to: Date };
  vitals: VitalRecordSummary[];
  biomarkers: BiomarkerSummary[];
  medications: MedicationSummary[];
  allergies: AllergySummary[];
  adherence: AdherenceSummary | null;      // de apollo (enrollments/tasks)
  wearableTimeline: WearableMetricSummary[]; // de oracle/pulse
  computedScores: ComputedScoreSummary[];    // de bioscore
}

// contracts/decision-provider.interface.ts
export interface DecisionProvider {
  readonly name: string;                 // ex: 'aegis-wellness'
  readonly domain: 'WELLNESS' | 'CLINICAL';
  supports(context: ClinicalContext): boolean;
  generateInsights(context: ClinicalContext): Promise<unknown[]>;
  generateRecommendations(context: ClinicalContext, insights: unknown[]): Promise<RecommendationCandidate[]>;
  generatePredictions(context: ClinicalContext): Promise<PredictionOutput[]>;
}
```

`RecommendationCandidate` e `PredictionOutput` generalizam `RecommendationTemplate`/`PredictionCandidate` já existentes no `aegis`, incluindo um campo `explainability: Explainability` em vez dos campos soltos atuais (`algorithm`, `explanation`, `confidence` cada um por conta própria).

### 7.3 Tarefas, em ordem

| # | Tarefa | Entrega | Critério de aceite |
|---|---|---|---|
| T1 | Schema: rename `InsightCategory` → `WellnessInsightCategory` + criar `ClinicalInsightCategory` (enum solto, sem FK) | Migration única, aditiva/rename | `pnpm --filter @bio/database migrate:dev` roda sem prompt de perda de dado; todas as referências a `InsightCategory` no código são atualizadas para `WellnessInsightCategory` |
| T2 | Criar `modules/gaia/contracts/*` | Interfaces puras, sem lógica | Compila; nenhum import de Prisma/services dentro dos contratos (contratos não devem depender de infra) |
| T3 | Criar `ClinicalContextBuilder` | Agrega dado dos repositórios já existentes (vitals, biomarkers, hippocrates, apollo, oracle, bioscore) num `ClinicalContext` | Teste unitário com todos os repositórios mockados; nenhum cálculo além de mapear/agrupar dado bruto |
| T4 | Criar `DecisionEngineService` (registry + `runPipeline`) | Mesmo padrão do `ScoringService`: `Map<string, DecisionProvider>`, `registerProvider`, `runPipeline(patientId, {providers?})` | Teste unitário com um `DecisionProvider` fake registrado — pipeline chama `supports`→`generateInsights`→`generateRecommendations`→`generatePredictions` na ordem certa e agrega o resultado |
| T5 | Criar `AegisWellnessProvider` (adapter) | Implementa `DecisionProvider`, delega 100% para `InsightEngineService`/`PredictionsService`/`RecommendationService` existentes, sem alterá-los | Teste unitário comprova que a saída do provider é a mesma informação que os services originais já produziam, só no shape novo |
| T6 | Registrar o provider: `AegisModule` passa a injetar `DecisionEngineService` e chamar `registerProvider(aegisWellnessProvider)` no boot | `gaia.module.ts` exportado e importado por `AegisModule` (ou por `AppModule`, a definir na implementação) | `DecisionEngineService.listProviders()` retorna `['aegis-wellness']` em teste de integração do módulo |
| T7 | `AegisSchedulerService.runAllForPatient` passa a chamar `DecisionEngineService.runPipeline` | Ajuste pontual, sem duplicar lógica | Todos os testes existentes de `aegis-scheduler.service.spec.ts` (e os demais specs do `aegis`) continuam passando **sem modificação de expectativas** — comportamiento idêntico, só muda o caminho da chamada |
| T8 | Testes de infraestrutura adicionais | `decision-engine.service.spec.ts`, `clinical-context.builder.spec.ts`, `aegis-wellness.provider.spec.ts` | Cobertura equivalente ao padrão já usado no projeto (ver módulos `clinical/scoring`, `aegis`) |
| T9 | `pnpm --filter api build` + suíte completa (`pnpm test`) | — | 0 erros de TS, 100% dos testes existentes (hoje 100 suítes / 1133 testes) continuam passando, mais os novos specs |

### 7.4 Fora de escopo nesta sprint (explicitamente adiado)

Novos `DecisionProvider`s (clínico, exames, interoperabilidade), população de `ClinicalInsightCategory` em qualquer model, migração de `RECOMMENDATION_RULES`, qualquer cálculo de score de doença, `evidenceRefs` populado, endpoints HTTP novos (o `AegisController` atual é suficiente — não há necessidade de expor o `DecisionEngineService` diretamente via API nesta sprint).

---

Aguardando aprovação para iniciar a implementação da 14.1 conforme este plano.
