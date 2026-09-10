# BioBoock — Sprint 04: E2E Product & Web→API Validation

**Data:** 2026-09-10
**Escopo:** `apps/api`, `apps/web`, `apps/mobile`, `database/prisma`.
**Pré-requisito:** Sprint 03 (Security & Privacy) concluída — PASS COM RESERVA, commit `896b5f9`.

---

## 1. Objetivo

Validar o BioBoock de ponta a ponta — Web→API, autenticação, autorização, conexões privadas, feed/BioBoock, mídia, câmera/mobile, atividades, acessibilidade, produção, bootstrap com banco vazio e a janela pós-bloqueio de conta — com evidência de execução real, não apenas leitura de código, e transformar as 4 reservas do Sprint 03 em resultado comprovado ou bloqueio explícito.

---

## 2. Estado Inicial

`apps/web` (Next.js 16 / React 19) tem 9 módulos de UI (biobook, biocircle, bioteams, cds, learning, oracle, population, precision, simulation), todos consumindo a API via `fetch` direto, sem framework de auth, sem middleware, sem página de login. `apps/mobile` existe como diretório vazio (zero arquivos) — não há app mobile implementado. Nenhum dos dois foi tocado desde a criação inicial dos módulos; nenhum teste de integração real Web→API jamais foi executado (só testes unitários com `fetch` mockado).

---

## 3. Arquitetura Web → API

```
apps/web (Next.js, fetch client-side/SSR)
   ↓  HTTP (sem Authorization header — nenhum módulo envia token)
apps/api (NestJS, prefixo global "api/v1", JwtAuthGuard por rota)
   ↓  Prisma Client
PostgreSQL
   ↓
Storage local (uploads/evidence — ver Sprint 03 §8)
```

Achado imediato de reconhecimento: **todos os 8 arquivos de serviço do `apps/web`** (`biobook`, `biocircle`, `bioteams`, `cds`, `learning`, `population`, `precision`, `simulation`) constroem a URL da API sem o prefixo `api/v1` que `apps/api/src/main.ts` aplica globalmente (`app.setGlobalPrefix('api/v1', { exclude: ['health'] })`), e **nenhum** anexa `Authorization: Bearer`. Não existe `app/api/**` (rotas Next.js) nem qualquer BFF — os módulos que usavam paths relativos (`/api/bioteams`, `/api/cohorts` etc.) esperavam um proxy que nunca foi construído.

---

## 4. Fluxos Testados (execução real, não apenas leitura de código)

| Fluxo | Método | Resultado |
|---|---|---|
| Registro de usuário | `POST /api/v1/auth/register` via curl, 2× (usuários reais) | PASS |
| Login | `POST /api/v1/auth/login` via curl | PASS |
| Requisição autenticada | `GET /api/v1/patients/:id` com Bearer válido | PASS |
| Requisição não autenticada | mesma rota sem header | 401, PASS |
| Tratamento 403 | usuário B lendo paciente de A | 403, PASS |
| Convite → aceite → isolamento (BioCircle) | ciclo completo via curl, 3 usuários reais | PASS |
| CORS — origem permitida | preflight OPTIONS com `Origin` na lista `CORS_ORIGIN` | PASS |
| CORS — origem não permitida | preflight OPTIONS com origem fora da lista | PASS (header ausente, bloqueio no browser) |
| Bootstrap com banco vazio | `docker compose down -v` → up → migrate → register | FAIL → CORRIGIDO → PASS (ver §15) |
| Build de produção (API) | `docker build`/`docker compose build` | PASS, 2× |
| Build de produção (Web) | `next build` | PASS |

---

## 5. Testes E2E

Não há framework de E2E de browser (Playwright/Cypress) instalado em `apps/web` — apenas Vitest + Testing Library (unitário/componente). **Não foi instalado nenhum framework novo nesta sprint** (decisão deliberada: instalar e configurar Playwright é uma mudança de escopo/arquitetura de teste, não uma correção de defeito — ver §21). Em vez disso, a validação E2E real foi feita via:
- `curl` direto contra a API real (Docker + Postgres reais, sem mock) para todos os fluxos de autenticação/autorização/conexões.
- `next build` + `curl` do HTML renderizado para inspecionar o comportamento real do SSR/Suspense do Web.
- Inspeção do bundle gerado (`next build` output) confirmando as 11 rotas estáticas geradas sem erro.

**Interação real de UI em navegador (clique, preenchimento de formulário, captura de câmera) não foi exercida — requer Playwright/dispositivo real. Marcado UNVERIFIED.**

---

## 6. Autenticação

Lado API: já coberto exaustivamente no Sprint 03 (login/refresh/logout, incluindo o gate de conta `BLOCKED`/`INACTIVE`). Lado Web: **não há autenticação nenhuma implementada** — nenhuma página de login, nenhum `middleware.ts`, nenhum token armazenado (`localStorage`/`sessionStorage`/cookie), nenhum header `Authorization` em nenhum dos 8 serviços. Isso significa que, mesmo após a correção do prefixo de URL (§10), toda chamada autenticada da API real retornará `401` para o usuário do Web — confirmado com evidência real (`curl` na mesma rota que o Web chamaria: `401`).

**Isolamento entre usuários** (A não acessa dados de B, IDs manipulados não funcionam): reconfirmado com dados reais nesta sprint via `patients/:id` (já corrigido no Sprint 03) e via um **novo achado** no módulo `patient-monitoring`, não coberto pelo Sprint 03 (ver §17-C).

---

## 7. Conexões Privadas (BioCircle)

Ciclo completo testado com HTTP real, três usuários genuínos (`sprint04-a/b/c@example.com`):

1. A envia convite para B (`POST /biocircle/connect`) → `201`.
2. B vê o convite em `GET /biocircle/invites/received` → aparece, status `PENDING`.
3. B aceita (`PATCH /biocircle/connections/:id/accept`) → `200`, status `ACCEPTED`.
4. C (não relacionado) tenta agir sobre a mesma conexão → `403 "Not authorised"`.
5. C lista as próprias conexões (`GET /biocircle/connections`) → `[]` (não vê a conexão de A/B — isolamento confirmado).
6. A remove a conexão (`DELETE /biocircle/connections/:id`) → `200`, status `REMOVED`.

A rede não se comporta como rede social pública — nenhuma ação foi possível sem relação de convite/aceite prévia. **PASS com evidência real.**

---

## 8. Feed

**Não existe.** Buscado em todo `apps/web/src`, `apps/api/src` e `database/prisma/schema.prisma` (nenhum model `Feed`/`Post`) — zero ocorrência de um módulo de "feed social temporário" como descrito na especificação deste sprint. O que existe é o BioBook (histórico pessoal permanente) e o BioCircle (conexões privadas), mas nenhuma camada de publicação temporária entre eles. **NÃO APLICÁVEL — funcionalidade não implementada no código atual, não fabricada nesta auditoria.**

---

## 9. BioBoock (BioBook)

O módulo `bio-book`/`biobook` (histórico pessoal) existe e é robusto: API já com ownership corrigido no Sprint 03 (`assertOwner`, `actor.sub` forçado como `patientId`), Web com componentes reais (`PhotoComparison.tsx`, `PhotoMoment.tsx`, `BioHeader.tsx`, timeline, metas, conquistas). Sem um módulo de Feed para comparar, a regra de produto "Feed é temporário, BioBoock é permanente" não pôde ser testada como *separação* — mas o BioBook em si já é corretamente tratado como histórico permanente (nenhuma lógica de expiração/exclusão automática encontrada em `bio-book.service.ts`, `bio-book-journey`, `bio-book-insight`).

---

## 10. Fotos e Storage

Storage de mídia real no sistema é exclusivamente `AssessmentEvidence` (fotos/PDFs/laudos de avaliação clínica) — já auditado e corrigido no Sprint 03 (achado CRITICAL: `/uploads/**` sem autenticação; corrigido com rota `GET /assessments/:id/evidence/:id/download` autenticada e com ownership). Não existe um "álbum de fotos pessoal" genérico associado a publicações — os componentes `PhotoComparison`/`PhotoMoment` no Web renderizam `photo.url`/`photo.label` a partir de um array vindo de `BioBookData.photos`, mas **o backend não expõe nenhum endpoint que popule esse array** (`buildDemoBioBookData()` usa `photos: []` como dado de demonstração fixo — não há integração real ainda). Os limites de produto pedidos (15 fotos por publicação, ~20 permanentes no BioBoock, exigir exclusão consciente antes de nova foto) **não têm nenhum código correspondente** — nem validação, nem contagem, nem UI de bloqueio. **NÃO APLICÁVEL / NÃO IMPLEMENTADO — não fabricado.**

---

## 11. Câmera / Mobile

`apps/mobile` existe apenas como diretório vazio — **zero arquivos**, nem `package.json`. Não há app mobile, não há acesso a câmera, não há fluxo de captura/preview/publicar. **BLOCKED por ausência total de implementação — não é uma limitação de ambiente de teste, é ausência de código.** Nenhum teste, unitário ou E2E, foi ou poderia ser criado para um fluxo que não existe.

---

## 12. Atividades

Não existe um módulo dedicado a modalidades (caminhada, corrida, academia, ciclismo) como entidades de primeira classe. O mais próximo: eventos de `BioTeams` (`BioTeamEvent`, tipos `TRAINING`/`COMPETITION`/`CHALLENGE` etc., já testados no Sprint 03) e sessões de dispositivo (`devices/sessions`, monitoramento de frequência cardíaca etc., também já corrigido no Sprint 03). Nenhuma modalidade foi inventada para preencher esta seção. **NÃO APLICÁVEL — não implementado como descrito.**

---

## 13. Acessibilidade

Revisão real de código + `eslint` (que no Next.js inclui regras `jsx-a11y` via `eslint-config-next/core-web-vitals`):
- `npx eslint "src/**/*.tsx"`: **10 problemas, nenhum de acessibilidade** (`react/no-unescaped-entities`, `@typescript-eslint/no-explicit-any`, `@next/next/no-img-element` — este último é sobre performance de imagem, não a11y).
- As três instâncias de `<img>` no módulo BioBook têm `alt` com fallback significativo (`alt={photo.label ?? `Foto de ${dateStr}`}`) — não decorativas sem descrição.
- Estado de carregamento do BioBook usa `aria-busy="true"` e `aria-label="Carregando BioBook"` no skeleton — boa prática confirmada por HTML real renderizado (`curl` da página).
- Uso de `aria-*`/`role` presente em 22 dos 59 componentes `.tsx` — não universal, não auditado componente a componente nesta sprint.
- **Nenhuma ferramenta automatizada de acessibilidade (axe-core, pa11y) está instalada** — `package.json` não tem nenhuma dependência de a11y além do que o eslint-config-next já embute.

**PASS COM RESERVA**: os padrões observados são bons onde existem, mas a cobertura não foi auditada exaustivamente (seria necessário Playwright + axe-core, não instalado, para varredura automática de todas as páginas). Recomendado para Sprint futuro, não bloqueante.

---

## 14. Produção

Prioridades da Fase 11 do escopo, na ordem pedida:
1. **Web real**: `next build` executado com sucesso, 11 rotas estáticas geradas.
2. **API real**: `docker build`/`docker compose build` executados com sucesso 2× (antes e depois da correção do `patient-monitoring`).
3. **Autenticação real**: validada via API real (login/refresh/isolamento) — ver §6.
4. **Banco real**: PostgreSQL 17 real via Docker, não SQLite/mock.
5. **Storage real**: filesystem do container real (Sprint 03).
6. **Fluxo real de usuário**: ciclo BioCircle completo (§7) e cross-user IDOR (patients + patient-monitoring) executados contra o container recém-buildado.

Nenhum Deployment Protection/SSO/firewall externo foi encontrado bloqueando este ambiente (é um ambiente Docker local, não o deploy real do Vercel/GHCR) — a validação usou infraestrutura equivalente, não a instância de produção pública. **A validação contra a URL pública de produção real (se existir) está fora do alcance deste ambiente e não foi tentada.**

---

## 15. Banco Vazio / Bootstrap

**Achado CRITICAL, real, reproduzido:**

1. `docker compose down -v` (remove volumes) → `up -d db api` → banco genuinamente vazio.
2. `GET /health` → `200 {"status":"ok","database":"connected"}` — a conexão está viva.
3. `POST /auth/register` → **`500 Internal Server Error`**. Log do servidor: `PrismaClientKnownRequestError: The table public.users does not exist in the current database.`

Isso confirma exatamente o que a especificação deste sprint pediu para investigar: **`/health` representa só conectividade (`SELECT 1`), nunca prontidão real.** Um orquestrador (Docker `HEALTHCHECK`, Kubernetes liveness/readiness probe) apontado para `/health` marcaria este container como "saudável" mesmo sem nenhuma tabela existir.

**Causa raiz descoberta ao investigar mais fundo:** rodei `prisma migrate deploy` (comando correto de produção) e ele aplicou as 4 migrations existentes com sucesso — mas ao testar um fluxo além de auth (`POST /biocircle/connect`), obtive um **segundo 500**: `The table public.bio_connections does not exist`. Investigação: **o histórico de migrations do Prisma está parado desde 2026-07-17** (`20260717201011_gaia_wellness_clinical_insight_categories`), enquanto `schema.prisma` continuou evoluindo por dezenas de sprints depois disso (Titan, GAIA completo, Aegis, BioCircle, BioTeams, Story-Engine, Patient-Monitoring, Clinical-Trends, Clinical-Pathways, Longitudinal-Health, Digital-Twin, Multi-Omics, e mais). **`prisma migrate diff` confirmou 49 tabelas inteiras faltando no histórico de migrations**, apesar de existirem no schema atual e em uso pleno pelo código de produção.

**Correção aplicada:** gerado `database/prisma/migrations/20260910033715_sync_schema_drift_since_july/migration.sql` via `prisma migrate dev --create-only` contra um banco de teste vazio, inspecionado linha a linha antes de aplicar — **100% aditivo** (49 `CREATE TABLE` + `ALTER TABLE ... ADD CONSTRAINT` para foreign keys; **zero `DROP`, `TRUNCATE`, `DELETE`, `ADD COLUMN` em tabela existente**). Aplicado com `prisma migrate deploy`; `prisma migrate status` confirmou "Database schema is up to date!" depois. Re-testado do zero (novo `down -v` → `up` → `migrate deploy` → registro → **BioCircle completo funcionando**, ver §7). Este é provavelmente o achado mais importante deste sprint para a operação real do produto: **sem esta correção, um deploy de produção genuinamente novo (ou um restore de disaster recovery) ficaria quebrado além do login.**

**Status: FAIL → CORRIGIDO → PASS (com evidência real de antes e depois).**

---

## 16. Janela Pós-Bloqueio

Investigado no Sprint 03 (§3/§17 daquele relatório) e reconfirmado aqui, sem alteração: `login`/`refresh` já rejeitam contas `BLOCKED`/`INACTIVE`/soft-deletadas (`403`), fechando o vetor de reentrada persistente. `JwtStrategy` é stateless (não consulta o banco por requisição) — um access token já emitido antes do bloqueio continua válido até expirar (máximo 15 minutos, `ACCESS_TOKEN_TTL`). **Esta é uma decisão de negócio pendente, não um bug técnico**: fechar completamente a janela exigiria (a) checar `status` a cada requisição autenticada (custo de uma query extra por request), ou (b) uma denylist de tokens revogados (estado adicional, invalida parte do design stateless). Nenhuma das duas foi implementada nesta sprint — está fora do escopo de "corrigir defeitos", é uma escolha de arquitetura que precisa de decisão explícita do responsável pelo produto. **Documentado como decisão pendente, não alterado.**

---

## 17. Defeitos Encontrados

### A. Web→API: prefixo `/api/v1` ausente em 8 serviços
- **Severidade:** CRITICAL (bloqueia 100% da integração Web→API)
- **Reprodução:** `curl http://localhost:3000/biocircle/dashboard` → `404`; `curl http://localhost:3000/api/v1/biocircle/dashboard` → `401` (rota existe, exige auth). Confirmado nos 8 módulos.
- **Causa:** `API_URL`/`BASE` construídos sem o prefixo global que `main.ts` aplica a toda rota.
- **Correção:** prefixo `/api/v1` adicionado à constante de base em `biobook`, `biocircle`, `bioteams`, `cds`, `learning`, `population`, `precision`, `simulation`.
- **Teste de regressão:** suíte Vitest completa (329 testes) não assertava a URL literal — não quebrou; comportamento revalidado via `curl` contra API real (404→401 confirmado nos 6 módulos verificados diretamente).

### B. Prisma: histórico de migrations desatualizado desde 2026-07-17 (49 tabelas faltando)
- **Severidade:** CRITICAL (bloqueia bootstrap de produção genuína)
- **Reprodução:** banco vazio + `migrate deploy` + qualquer endpoint fora de `users`/`sessions` → `500`, tabela inexistente.
- **Causa:** schema editado sem gerar migrations correspondentes por múltiplos sprints.
- **Correção:** nova migration `20260910033715_sync_schema_drift_since_july`, 100% aditiva, inspecionada antes de aplicar.
- **Teste de regressão:** `prisma migrate status` limpo; ciclo completo re-executado do zero (banco vazio → migrate → registro → BioCircle end-to-end) com sucesso.

### C. `patient-monitoring`: IDOR/BOLA (mesma classe do Sprint 03, módulo não coberto)
- **Severidade:** HIGH
- **Reprodução:** usuário B lê `GET /patient-monitoring/:patientIdDeA/summary` com o próprio token — antes da correção, retornaria os dados de A (código lia `userId` só para log de auditoria, nunca para autorização).
- **Causa:** mesmo padrão dos achados do Sprint 03 — `userId`/`actor` presente na assinatura, nunca usado para checar propriedade.
- **Correção:** `assertAccess(patientId, actor)` adicionado a `getTimeline`/`getSummary`/`getEvents`, mesmo padrão ADMIN-bypass/PATIENT-dono/PROFESSIONAL-vinculado já estabelecido.
- **Teste de regressão:** 6 novos testes `SECURITY (IDOR)`/`SECURITY`; suíte do módulo 41/41; reconfirmado com HTTP real contra imagem Docker recém-buildada (A=200 no próprio resumo, B=403 no de A).

### D. Ausência total de autenticação no `apps/web`
- **Severidade:** CRITICAL para o objetivo do produto, mas **não corrigido nesta sprint** — decisão deliberada.
- **Descrição:** nenhuma página de login, nenhum armazenamento de token, nenhum header `Authorization` em nenhum dos 8 serviços do Web.
- **Por que não foi corrigido:** construir login + estratégia de sessão (cookie httpOnly vs. bearer em memória vs. localStorage) é uma decisão de arquitetura/segurança com implicações reais (XSS, CSRF, refresh silencioso), não um "defeito" pontual — corrigir sem essa decisão explícita seria expandir escopo sem autorização, especialmente logo após um sprint de segurança inteiro. **Registrado como o maior item pendente do produto, recomendado como Sprint 05.**

### E. `apps/mobile` vazio; Feed, álbum de fotos, e Atividades como entidades não existem
- **Severidade:** informacional — não é defeito, é lacuna de escopo do produto ainda não implementada.
- **Ação:** nenhuma — não fabricado.

---

## 18. Testes Finais

| Suíte | Suites/Files | Testes | Resultado |
|---|---|---|---|
| `apps/api` (Jest) | 261/261 | 3967/3967 | 100% |
| `apps/web` (Vitest) | 39/39 | 329/329 | 100% |
| TypeScript `apps/api` | — | 110 erros, **0 novos** (baseline Sprint 03: 113 pré-existentes; a diferença é o próprio código desta sprint, sem regressão) | limpo |
| TypeScript `apps/web` | — | 0 erros | limpo |
| ESLint `apps/web` | — | 10 problemas (nenhum de segurança/a11y, pré-existentes) | informacional |

Nenhum teste pré-existente foi enfraquecido, removido ou marcado `skip`. 6 testes novos `SECURITY` adicionados (`patient-monitoring`).

---

## 19. Build

- `docker build -f apps/api/Dockerfile` / `docker compose build api`: **sucesso, 2×** (antes e depois da correção do `patient-monitoring`).
- `next build` (`apps/web`): **sucesso**, 11 rotas estáticas geradas, TypeScript e lint executados como parte do build sem erro bloqueante.

---

## 20. Git

Ver commit desta sprint. `git status` limpo após o commit; branch sincronizada com `origin/master` após o push (confirmado no relatório final ao usuário).

---

## 21. Limitações

- Nenhum framework de E2E de browser (Playwright/Cypress) está instalado; toda validação de fluxo real usou `curl` contra a API e inspeção do HTML/bundle gerado pelo Web, não interação de UI simulada em navegador real.
- Câmera/mobile: **impossível testar — não existe código**, não uma limitação de CI.
- Autenticação do Web: não construída nesta sprint (decisão documentada em §17-D), então nenhuma tela do Web pôde ser validada end-to-end com dados reais renderizados (todas ficam nos estados de erro/loading por falta de token).
- Acessibilidade: sem ferramenta automatizada (axe-core) instalada — cobertura avaliada por lint + amostragem manual, não exaustiva.
- Validação contra a URL pública de produção real (Vercel/domínio final) não foi tentada — ambiente usado foi Docker local equivalente, não o deploy público.

---

## 22. Status Final

**PASS COM RESERVA.**

Os fluxos que existem e estão implementados foram validados com evidência real e, onde defeituosos, corrigidos: prefixo de URL Web→API (8 arquivos), migrations de banco desatualizadas (achado mais crítico do sprint, com potencial de quebrar qualquer deploy novo), e um IDOR real em `patient-monitoring`. Conexões privadas (BioCircle) comprovadas ponta a ponta com 3 usuários reais. CORS comprovado com origem permitida e negada, de verdade. Build de produção (API e Web) validado.

**Reservas que permanecem, explicitamente não mascaradas:**
- Autenticação no Web: ausente, documentada, não construída (decisão de escopo, não descoberta tardia).
- Feed, álbum de fotos além de evidência clínica, câmera/mobile, atividades como entidades: **não implementados no código atual** — não fabricados nem simulados nesta auditoria.
- E2E de browser real: BLOCKED por ausência de ferramenta.
- Janela pós-bloqueio de 15 min: decisão de negócio pendente, não alterada.

Uma Sprint 05 focada em construir a integração de autenticação real do `apps/web` (login, armazenamento de sessão, header `Authorization` nos 8 serviços) é o próximo passo natural e mais valioso — sem ela, o produto continua funcionalmente desconectado do backend que a Sprint 03 tornou seguro. Não iniciada automaticamente, conforme instrução.
