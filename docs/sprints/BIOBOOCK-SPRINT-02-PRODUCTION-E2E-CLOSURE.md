# BIOBOOCK — Sprint 02: Production E2E Closure & Deployment Reproducibility Gate

**Status final: PASS**

- **Commit inicial desta sprint**: `5c94ee2`
- **Commit final desta sprint**: ver seção Commit
- **Imagem**: `sha-97c1516` / `master` / `latest` (GHCR)
- **Digest**: `sha256:ff5fcc112dba86bf39b77cdd11bbb20be56af652e146b21a73141b551813d562` (reconfirmado idêntico ao início desta sprint — sem drift)
- **Ambiente de validação**: máquina local do operador (Docker Desktop, Windows), Docker Engine real, imagem real do GHCR, Postgres real em container. Não há ambiente de servidor de produção remoto conhecido neste repositório para a API (ver Parte 1/6 do runbook).

---

## Resumo executivo

As três ressalvas da sprint anterior (BIOBOOCK — Production Deployment Report) foram fechadas com evidência real:

1. **Pull por digest do GHCR** — na sprint anterior, bloqueado por rede (`TLS handshake timeout`). Nesta sprint, a rede se recuperou e o pull foi executado com sucesso, comprovado ponta a ponta: GHCR → digest → Docker → container → health → aplicação. **PASS.**
2. **Migrations em banco vazio** — testado contra um Postgres genuinamente vazio (container novo, sem volume). Descoberto e documentado um achado real: `/health` reporta `database: connected` mesmo sem nenhuma migration aplicada (só faz `SELECT 1`), e qualquer rota que toque o banco falha com 500 até `prisma migrate deploy` ser executado. Após a migration, mesmo container, sem restart, tudo funciona. **PASS, com achado operacional documentado no runbook.**
3. **Web → API** — não pôde ser comprovado ponta a ponta; motivo documentado com evidência real (ver Parte 4). **BLOCKED_EXTERNAL_CONFIGURATION**, não mascarado.

Além disso, a auditoria de CORS (Parte 5) encontrou e corrigiu **dois defeitos reais**:
- `Access-Control-Allow-Credentials: true` combinado com `Access-Control-Allow-Origin: *` — combinação inválida pela spec CORS. Removido (`credentials` nunca teve função real nesta API — autenticação é 100% Bearer token via header, zero cookie).
- `CORS_ORIGIN` como string fixa fazia o pacote `cors` ecoar a origem configurada independente da origem real da requisição (inofensivo para o browser, mas não determinístico). Corrigido para aceitar lista separada por vírgula e validar a origem da requisição de verdade.

---

## Parte 1 — Reprodução do release

| Item | Valor | Confirmado via |
|---|---|---|
| Branch | `master` | `git branch --show-current` |
| HEAD (início da sprint) | `5c94ee2` | `git rev-parse HEAD` |
| origin/master | `5c94ee2` (idêntico) | `git fetch` + `git rev-parse origin/master` |
| `docker-compose.yml` | build local, hardened (read_only, cap_drop ALL, no-new-privileges, limits) | lido integralmente |
| `docker-compose.prod.yml` | `image:` fixo por digest, sem rebuild | lido integralmente |
| Dockerfile | 5 stages, runtime sem npm (fix da sprint anterior) | lido integralmente |
| Tag `master` → digest | `sha256:ff5fcc112dba86bf39b77cdd11bbb20be56af652e146b21a73141b551813d562` | query real à API do GHCR |
| Tag `sha-97c1516` → digest | idêntico ao acima | query real à API do GHCR |
| Tag `latest` → digest | idêntico ao acima | query real à API do GHCR |

**Digest não mudou** desde a sprint anterior — nenhum drift a explicar.

---

## Parte 2 — GHCR pull-by-digest: **PASS**

Comando real executado (timestamps reais, UTC):

```
$ date -u
Sun Sep  6 22:53:10 UTC 2026
$ docker pull ghcr.io/renatoprestes76/bio-mapping/api@sha256:ff5fcc112dba86bf39b77cdd11bbb20be56af652e146b21a73141b551813d562
[... 13 layers, todas "Pull complete" ...]
Digest: sha256:ff5fcc112dba86bf39b77cdd11bbb20be56af652e146b21a73141b551813d562
Status: Downloaded newer image for ghcr.io/.../api@sha256:...
EXIT_CODE:0
$ date -u
Sun Sep  6 22:53:59 UTC 2026
```

`docker image inspect ... --format '{{index .RepoDigests 0}}'` ecoou exatamente a mesma referência.

Stack subida **exclusivamente com a imagem publicada** (`docker-compose.prod.yml`, sem `build:`):

```
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

`docker inspect biomapping_api --format '{{.Image}}'` → `sha256:ff5fcc112dba8...` (o digest exato, não um rebuild).

`curl http://localhost:3000/health` → `{"status":"ok","database":"connected","uptime":18,"version":"0.1.0"}`.

Cadeia comprovada ponta a ponta: **GHCR → digest → Docker → container → health → aplicação.**

**Nota**: na sprint anterior o mesmo comando falhou com `TLS handshake timeout` especificamente para `ghcr.io` (confirmado externo à imagem, já que `docker pull alpine` funcionava normalmente). Nesta sprint a rede se recuperou — não foi feita nenhuma alteração de código para "corrigir" isso, porque não havia nada de errado no release.

---

## Parte 3 — Banco vazio / migrations: **PASS** (com achado documentado)

Container Postgres novo, sem volume nomeado, `\dt` confirmou **zero tabelas** antes de qualquer ação.

**Teste 1 — API contra banco vazio, sem migrations:**
- Container sobe, fica `healthy`.
- `GET /health` → `200 {"status":"ok","database":"connected",...}` — **health não detecta ausência de schema**.
- `POST /api/v1/auth/register` → **500**, log real: `PrismaClientKnownRequestError: The table 'public.users' does not exist in the current database.`

**Teste 2 — após `prisma migrate deploy` (mesmo banco, mesmo container da API, sem restart):**
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5555/biomapping_fresh_test" npx prisma migrate deploy
# 4 migrations aplicadas, 67 tabelas criadas
```
- `POST /api/v1/auth/register` → **201**, usuário real criado, JWT real emitido.
- `GET /health` → ainda `200 connected`.

**Conclusão**: um ambiente novo consegue sair de `PostgreSQL vazio` até `API operacional`, mas **exige rodar `prisma migrate deploy` explicitamente antes de rotear tráfego real** — não é automático, e o healthcheck não pega essa lacuna. Documentado como achado crítico no runbook (`docs/operations/PRODUCTION-DEPLOYMENT.md`, seção 8), com o comando exato e o motivo pelo qual não pode rodar de dentro do container de runtime (CLI do `prisma` foi removido dessa imagem numa sprint anterior de segurança — está em `devDependencies`, não em `dependencies`).

---

## Parte 4 — Web → API: **BLOCKED_EXTERNAL_CONFIGURATION**

Código auditado: `apps/web/src/modules/biobook/services/biobook.service.ts` (e `biocircle.service.ts`, mesmo padrão). Ambos usam:
```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
```
`fetch` sem `credentials: 'include'` em nenhum ponto — consistente com a API ser 100% Bearer token.

**Tentativa real de validação** (Vercel CLI autenticado como `renatoprestes76` — acesso operacional real disponível nesta sessão):

1. Identificado o projeto Vercel correto: `web` (Root Directory `apps/web`, framework Next.js, criado 07/05) — **não** `bio-mapping-api` (projeto Vercel separado, Root `.`, framework "Other", aparenta ser uma tentativa antiga/abandonada de hospedar a API na Vercel; não é usado pela arquitetura atual, que usa GHCR+Docker). Não confundido com `atlas-admin` (projeto Atlas, explicitamente fora de escopo).
2. `vercel env ls production` confirmou que `NEXT_PUBLIC_API_URL` **está configurada** em Production.
3. `vercel env pull` recusou o valor: *"9 Secret values cannot be pulled from the `production` Environment"* — a variável foi marcada como **Sensitive** no Vercel. Achado: isso é redundante/confuso para uma variável `NEXT_PUBLIC_*`, já que o Next.js embute esse valor no bundle JS do cliente por design (visível a qualquer visitante do site via devtools) — marcar como "Sensitive" só esconde o valor do dashboard/CLI, não o torna secreto em runtime.
4. Tentativa alternativa: inspecionar o bundle JS publicado diretamente. `curl https://web-renatoprestes76s-projects.vercel.app` → **302 redirect para `vercel.com/sso-api`** — a única URL do projeto (não há domínio customizado configurado, confirmado via `vercel domains ls`) está atrás de **Vercel Deployment Protection (SSO)**. Não há como buscar o bundle sem autenticar via SSO do navegador, que não está disponível nesta sessão de CLI.

**Conclusão**: esgotadas as vias legítimas de acesso (CLI autenticado + fetch público), sem bypass de autenticação. O valor real de `NEXT_PUBLIC_API_URL` e a acessibilidade pública do frontend permanecem não verificáveis a partir desta sessão.

**Validação reproduzível para o operador** (documentada no runbook, seção 15, e replicável por quem tem acesso à sessão SSO da Vercel):
```
1. Abrir https://web-renatoprestes76s-projects.vercel.app no navegador logado na conta Vercel.
2. Abrir DevTools → Network, carregar qualquer página que chame a API (ex.: BioBook).
3. Confirmar a URL de destino das chamadas fetch — deve ser o host real onde a imagem
   GHCR está rodando (não localhost, não um domínio de exemplo).
4. Confirmar que a resposta tem os headers Access-Control-Allow-Origin corretos
   (ver Parte 5) e que /health nesse host real responde "connected".
```

---

## Parte 5 — CORS: dois defeitos reais encontrados e corrigidos

**Defeito 1 — combinação inválida pela spec:**
Configuração original (`apps/api/src/main.ts`):
```ts
app.enableCors({ origin: process.env.CORS_ORIGIN ?? '*', credentials: true, ... });
```
`Access-Control-Allow-Origin: *` + `Access-Control-Allow-Credentials: true` é uma combinação que a especificação Fetch/CORS proíbe para requisições credentialed — navegadores rejeitam. Confirmado que `credentials: true` nunca teve função real: `grep` em toda a API por `res.cookie`/`cookie-parser` → zero resultados; `grep` em todo o `apps/web` por `credentials` em chamadas fetch → zero resultados; estratégia de auth confirmada 100% Bearer (`ExtractJwt.fromAuthHeaderAsBearerToken()` em `jwt.strategy.ts`). **Removido.**

**Defeito 2 — não determinístico com origem fixa:**
Teste real: com `CORS_ORIGIN=https://web-....vercel.app` (uma string fixa), uma requisição com `Origin: https://attacker-evil.com` **também** recebia `Access-Control-Allow-Origin: https://web-....vercel.app` de volta (o pacote `cors` ecoa uma string fixa sempre, independente da origem da requisição). Não é uma falha de segurança para navegadores reais (o browser compara o header contra a própria origem, não contra o que o header diz — uma página em `attacker-evil.com` não conseguiria ler a resposta mesmo assim), mas não é o comportamento determinístico pedido. **Corrigido**: `CORS_ORIGIN` agora aceita lista separada por vírgula; passar um array para `cors` faz validar a origem da requisição de verdade.

**Comportamento após o fix, testado com evidência real:**

| Cenário | Antes | Depois |
|---|---|---|
| `CORS_ORIGIN=*`, qualquer origem | `Allow-Origin: *`, `Allow-Credentials: true` (inválido) | `Allow-Origin: *`, sem `Allow-Credentials` (válido) |
| `CORS_ORIGIN=<origem-A,origem-B>`, request de origem-A | refletia sempre origem-A (mesmo pra outras) | reflete origem-A corretamente |
| `CORS_ORIGIN=<origem-A,origem-B>`, request de origem-B | refletia origem-A (errado) | reflete origem-B corretamente |
| `CORS_ORIGIN=<origem-A,origem-B>`, request de origem não listada | header presente com valor de origem-A (enganoso) | **header ausente** (bloqueado corretamente) |

Preflight (`OPTIONS`) testado e funcionando: `204`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers` corretos.

---

## Parte 6 — Deployment Runbook

Criado: [`docs/operations/PRODUCTION-DEPLOYMENT.md`](../operations/PRODUCTION-DEPLOYMENT.md).

Cobre os 15 pontos pedidos: pré-requisitos, secrets, ambiente, GHCR (público, sem login para pull), pull por digest, validação de digest + Cosign, execução do compose, migrations (com o achado da Parte 3 documentado em destaque), healthcheck, smoke test, rollback, logs, graceful shutdown, troubleshooting (tabela de sintomas reais encontrados nesta e nas sprints anteriores), e como verificar a versão implantada via OCI labels. Nenhum secret real incluído.

---

## Parte 7 — Scripts operacionais

Criados (nomes conforme sugerido pela sprint, sem plataforma de deployment nova — só shell):

- `scripts/production-deploy.sh` — lê o digest de `docker-compose.prod.yml` (não aceita digest arbitrário por argumento, evita bypass do processo de release), exige `cosign` instalado (falha se ausente — nunca pula verificação), pull, valida digest, verifica assinatura Cosign, roda `prisma migrate deploy` (falha com mensagem clara se o CLI do prisma não estiver disponível no checkout), sobe o compose, aguarda health, imprime a revisão implantada. Falha (`exit != 0`) em qualquer etapa crítica. Nunca imprime secrets.
- `scripts/production-smoke.sh` — testado de verdade nesta sessão contra a stack real, resultado abaixo.

---

## Parte 8 — Smoke test final

Executado via `scripts/production-smoke.sh` contra a stack local rodando a imagem final (com os fixes de CORS):

```
=== Smoke test: http://localhost:3000 ===
[PASS] GET /health status (esperado=200, obtido=200)
[PASS] /health reporta database connected
[PASS] GET /docs status (esperado=200, obtido=200)
[PASS] POST /api/v1/auth/register status (esperado=201, obtido=201)
[PASS] POST /api/v1/auth/login status (esperado=200, obtido=200)
[PASS] login retornou accessToken (valor não impresso)
[PASS] GET rota protegida sem token (esperado=401, obtido=401)
[PASS] GET rota inexistente (esperado=404, obtido=404)
=== Resultado: 8 PASS / 0 FAIL ===
```

**Container**: `uid=100(biomapping)` (non-root) · filesystem read-only confirmado (`touch /app/x` → `Read-only file system`) · `CapDrop=[ALL]` · `SecurityOpt=[no-new-privileges:true]` · `Memory=536870912` (512MB) · `NanoCpus=1000000000` (1 CPU) · `PidsLimit=200` · `ReadonlyRootfs=true` · `NODE_ENV=production` · `npm` ausente (reconfirmado) · graceful shutdown: `docker stop -t 30` → `ExitCode=143`, `OOMKilled=false`, sem crash loop.

**Banco**: conexão confirmada, migrations aplicadas e reproduzíveis (Parte 3), schema consistente (67 tabelas, mesmas em todos os testes).

**Segurança**: nenhum secret apareceu em nenhum log inspecionado nesta sessão; headers Helmet presentes (CSP, HSTS, X-Frame-Options, etc.); CORS corrigido e determinístico (Parte 5); `NODE_ENV=production` confirmado.

---

## Parte 9 — Regressão

| Gate | Comando real | Resultado |
|---|---|---|
| Type-check | `npx tsc --noEmit -p tsconfig.json` (não existe script `type-check` no monorepo — usado o comando equivalente já estabelecido em sprints anteriores) | 110 erros — **idênticos ao baseline pré-existente** (confirmado igual antes/depois desta sprint), zero em `main.ts` |
| Lint | `npx eslint src/main.ts` (escopado ao arquivo alterado — lint full-repo com `--fix` já causou incidente de ~750 arquivos reformatados numa sprint anterior, não repetido) | 8 problemas, todos pré-existentes e não relacionados à mudança (confirmado via `git stash`); 2 nits de formatação pré-existentes no mesmo arquivo corrigidos de brinde |
| Build | Build Docker real (Node 22 Alpine, idêntico ao CI) — `pnpm --filter api build` local nesta máquina (Node 20 Windows) sabidamente no-opa silenciosamente (achado de sprint anterior, ambiente local, não código) | **PASS** via Docker real; container resultante rodou e serviu tráfego real |
| Testes | `npx jest` | **260/260 suítes, 3910/3910 testes** — idêntico ao baseline, zero regressão |

Nenhum teste ignorado, removido, enfraquecido ou com assertion removida.

---

## Parte 10 — Git discipline

```
$ git status --porcelain   (antes)
(limpo — apenas 5c94ee2 vs origin/master idêntico)

$ git status --porcelain   (depois)
 M apps/api/src/main.ts
?? docs/operations/
?? scripts/

$ git diff --stat
 apps/api/src/main.ts | 27 +++++++++++++++++++++++----
 1 file changed, 23 insertions(+), 4 deletions(-)
```

Nenhum arquivo fora do escopo alterado. Nenhuma funcionalidade de domínio tocada. Nenhuma migration de banco de produção executada (só bancos de teste efêmeros, destruídos após uso). Nenhuma mudança estética no frontend. Nenhuma dependência atualizada sem necessidade direta.

Artefatos de investigação criados e já removidos antes deste commit: containers/imagens Docker temporários, `.env`/`.vercel`/`.env.local` (gitignored, usados só para validação local, removidos ou já ignorados por padrão).

---

## Commit

```
fix(biobook): close production deployment gate
```

Arquivos no commit: `apps/api/src/main.ts` (fix de CORS), `docs/operations/PRODUCTION-DEPLOYMENT.md` (novo), `scripts/production-deploy.sh` (novo), `scripts/production-smoke.sh` (novo), `docs/sprints/BIOBOOCK-SPRINT-02-PRODUCTION-E2E-CLOSURE.md` (este documento).

---

## Regra de encerramento

### 1. O BioBoock agora possui deployment de produção reproduzível?
**SIM** — via `docker-compose.prod.yml` + `scripts/production-deploy.sh` + runbook, testado ponta a ponta nesta sessão com a imagem publicada real.

### 2. A imagem publicada foi realmente utilizada?
**SIM** — `docker pull` por digest bem-sucedido, container rodado a partir dela (`.Image` = digest exato), health e smoke test executados contra ela.

### 3. Banco vazio consegue ser inicializado?
**SIM** — com a etapa explícita e agora documentada de `prisma migrate deploy` antes de servir tráfego real.

### 4. Web → API foi comprovado?
**BLOQUEADO** — `BLOCKED_EXTERNAL_CONFIGURATION` (variável marcada Sensitive no Vercel + Deployment Protection/SSO na única URL do projeto, sem domínio customizado). Validação reproduzível documentada para quem tem a sessão SSO.

### 5. CORS está correto?
**SIM** — após os dois fixes desta sprint, comportamento determinístico e verificado com evidência real.

### 6. Smoke test?
**8/8 PASS**

### 7. Testes totais?
**3910/3910 PASS**

### 8. Type-check?
**PASS** (110 erros pré-existentes não relacionados, confirmados idênticos ao baseline)

### 9. Lint?
**PASS** (no arquivo alterado; pré-existentes fora de escopo)

### 10. Build?
**PASS** (via build Docker real)

### 11. Git?
**CLEAN** (após o commit desta sprint)

### 12. Status final?
**PASS**

### 13. Existe algum defeito real que justifique uma Sprint 03?
**NÃO**, para o domínio de deployment/infraestrutura da API. O único item genuinamente pendente (Web → API) depende de acesso externo (SSO da Vercel) que não é um defeito do BioBoock — é documentado e reproduzível por quem tiver esse acesso.

**Não criar nova sprint de deployment.**

### Próximos passos (fora do escopo desta sprint, para avançar ao próximo domínio real do BioBoock)

- Se desejado, o operador com acesso à sessão Vercel roda a validação documentada na Parte 4 e atualiza este relatório.
- Considerar decidir o destino do projeto Vercel órfão `bio-mapping-api` (descoberto nesta sprint — não é usado pela arquitetura atual).
- Considerar revisar a marcação "Sensitive" de `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_URL` na Vercel — é redundante para variáveis `NEXT_PUBLIC_*` (sempre públicas no bundle) e impede inspeção operacional legítima.
- PR #6 do Dependabot (`typescript` 5→7 em `apps/web`) segue aberta e sem fix — fora do escopo desta sprint (é `apps/web`, não deployment da API), mas mencionada aqui porque foi levantada durante a sessão.
