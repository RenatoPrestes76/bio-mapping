# BioBoock API — Production Deployment Runbook

Este documento descreve o procedimento real e testado para colocar a API do BioBoock
em execução a partir da imagem publicada, assinada e atestada no GHCR.

Baseado em validação operacional real executada na Sprint BIOBOOCK-02 (commit `5c94ee2`,
digest `sha256:ff5fcc112dba86bf39b77cdd11bbb20be56af652e146b21a73141b551813d562`).

**Nunca coloque secrets reais neste arquivo.** Todo valor abaixo é placeholder.

---

## 1. Pré-requisitos

- Docker Engine + Docker Compose v2 (`docker compose`, não `docker-compose`).
- Acesso de leitura ao pacote GHCR `ghcr.io/renatoprestes76/bio-mapping/api` (público — não exige login para `pull`).
- PostgreSQL 17 acessível (o `docker-compose.yml` já sobe um; para banco gerenciado externo, ver seção 8).
- Para rodar migrations: Node.js 22 + pnpm, com o repositório clonado e `pnpm install` completo (dev+prod) — **não** dá para rodar migrations a partir do container de runtime (ver seção 8, é intencional).

## 2. Configuração de secrets

Secrets nunca vão para o Git nem para este documento. Defina via `.env` local (gitignored) ou via o mecanismo de secrets da plataforma de destino (Vercel envs, GitHub Actions secrets, systemd `EnvironmentFile`, etc.):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `JWT_SECRET` | Sim | Mínimo 32 caracteres. Gere com `openssl rand -hex 32`. |
| `REFRESH_TOKEN_SECRET` | Não | Opcional; vazio funciona (ver `apps/api/src/common/config/config.validation.ts` — não é validado como obrigatório). |
| `POSTGRES_PASSWORD` | Sim (se usando o Postgres do compose) | Senha do banco. |

## 3. Configuração de ambiente

| Variável | Default | Notas |
|---|---|---|
| `NODE_ENV` | `production` (fixo no compose) | Não sobrescrever. |
| `PORT` | `3000` | Porta interna do container; mapeada via compose. |
| `DATABASE_URL` | montada a partir de `POSTGRES_*` no compose | Para banco externo, definir diretamente. |
| `CORS_ORIGIN` | `*` | Lista separada por vírgula para restringir (ex.: `https://app.bioboock.com,https://staging.bioboock.com`). Com `*`, qualquer origem é aceita — não há `credentials`/cookies na API (100% Bearer token), então isso é seguro por padrão. Ver `apps/api/src/main.ts`. |

## 4. Login/autenticação no GHCR

O pacote é **público** — `docker pull` funciona sem autenticação:

```bash
docker pull ghcr.io/renatoprestes76/bio-mapping/api@sha256:<DIGEST>
```

Login só é necessário para *publicar* (feito pelo CI, não pelo operador).

## 5. Pull da imagem

**Sempre por digest, nunca por tag mutável** (`latest`/`master` podem mudar a qualquer novo push):

```bash
docker pull ghcr.io/renatoprestes76/bio-mapping/api@sha256:<DIGEST>
```

O digest de cada release fica registrado no commit da sprint correspondente e pode ser
reconfirmado consultando a API do GHCR (não requer autenticação, pacote público):

```bash
TOKEN=$(curl -s "https://ghcr.io/token?scope=repository:renatoprestes76/bio-mapping/api:pull" | jq -r .token)
curl -s -D - -o /dev/null -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.oci.image.index.v1+json" \
  "https://ghcr.io/v2/renatoprestes76/bio-mapping/api/manifests/master" | grep -i docker-content-digest
```

## 6. Validação do digest

```bash
docker image inspect ghcr.io/renatoprestes76/bio-mapping/api@sha256:<DIGEST> \
  --format '{{index .RepoDigests 0}}'
```

Deve ecoar a mesma referência `@sha256:...` — confirma que a imagem local corresponde
exatamente ao que foi assinado/atestado.

**Verificar a assinatura Cosign** (requer `cosign` instalado — não desabilitar esta etapa):

```bash
cosign verify \
  --certificate-identity-regexp="https://github.com/RenatoPrestes76/bio-mapping" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  ghcr.io/renatoprestes76/bio-mapping/api@sha256:<DIGEST>
```

## 7. Execução do Docker Compose

```bash
cp .env.example .env   # preencher com valores reais, nunca commitar
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

`docker-compose.prod.yml` substitui o `build:` do serviço `api` por `image:` apontando
para o digest fixo — **nenhum rebuild local ocorre**, a imagem executada é exatamente
a publicada/assinada.

## 8. Migrations

**Achado operacional real (validado nesta sprint): o CLI do `prisma` foi removido da imagem
de runtime** (motivo: reduzir CVEs na imagem final — `prisma` era uma `dependency` de
`database/package.json`, movido para `devDependency`; a imagem final só instala `--prod`).
Isso significa:

- ❌ `docker exec biomapping_api npx prisma migrate deploy` — **não funciona** (binário ausente).
- ✅ Migrations devem rodar de um ambiente com devDependencies instaladas (CI runner, ou
  máquina do operador com o repo clonado), apontando `DATABASE_URL` para o Postgres de destino:

```bash
cd database
DATABASE_URL="postgresql://user:pass@host:5432/dbname" npx prisma migrate deploy
```

**Testado nesta sprint contra um Postgres genuinamente vazio**: as 4 migrations existentes
aplicam-se limpo, criam as 67 tabelas do schema atual, e a API passa a atender requisições
que dependem do banco (register/login) sem precisar reiniciar o container.

⚠️ **Achado crítico de segurança operacional**: `GET /health` retorna
`{"status":"ok","database":"connected"}` **mesmo com o banco completamente vazio/sem
migrations** — o healthcheck só faz `SELECT 1`, não verifica schema. Um deploy que suba o
container sem rodar `migrate deploy` primeiro vai passar no healthcheck e ainda assim
falhar com 500 em qualquer rota que toque o banco (`PrismaClientKnownRequestError: The
table 'public.users' does not exist`, reproduzido nesta sprint). **Sempre rode `migrate
deploy` antes de rotear tráfego real para uma instância nova.**

## 9. Healthcheck

```bash
curl -f http://localhost:3000/health
# {"status":"ok","database":"connected","uptime":<n>,"version":"0.1.0"}
```

O `HEALTHCHECK` do Dockerfile já faz isso automaticamente (`--start-period=60s`).
Ver ressalva da seção 8 — health verde não substitui confirmar migrations aplicadas.

## 10. Smoke test

Ver `scripts/production-smoke.sh` (Parte 7). Cobre: `/health`, `/docs`, registro,
login, rota protegida sem token (401), rota inexistente (404).

## 11. Rollback

Como o deploy é só troca de `image:` por digest, rollback é trivial e não requer rebuild:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
# editar docker-compose.prod.yml para o digest anterior conhecido-bom, ou:
docker run ... ghcr.io/renatoprestes76/bio-mapping/api@sha256:<DIGEST_ANTERIOR>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Mantenha um registro dos últimos digests validados (ex.: no changelog de cada sprint de
release) para rollback rápido. **Rollback nunca deve incluir rollback de migrations**
destrutivo sem revisão manual — migrations do Prisma não são automaticamente reversíveis.

## 12. Logs

```bash
docker compose logs -f api
```

Logs são JSON estruturado (Winston) — `context`, `level`, `message`, `timestamp`.
Erros HTTP aparecem via `HttpExceptionFilter` com `stack` incluído.

## 13. Graceful shutdown

```bash
docker compose stop api   # ou: docker stop <container>
```

Fluxo: `docker stop` → `SIGTERM` → `tini` (PID 1) → NestJS `onModuleDestroy` hooks →
drena conexões Prisma → `process.exit(0)`. `stop_grace_period: 30s` no compose evita
`SIGKILL` prematuro. Validado nesta sprint: `docker stop -t 30` retorna exit code 143
(SIGTERM limpo), sem OOM, sem crash loop.

## 14. Troubleshooting

| Sintoma | Causa provável | Verificação |
|---|---|---|
| `/health` OK mas toda rota autenticada dá 500 | Migrations não aplicadas | `docker exec <db> psql -U postgres -d <db> -c "\dt"` — deve listar ~67 tabelas |
| `docker pull` trava/`TLS handshake timeout` para `ghcr.io` | Problema de rede local/rede do host, não do release | Testar `docker pull alpine` (deve funcionar); se `ghcr.io` especificamente falhar, é rede, não a imagem |
| CORS bloqueando o frontend | `CORS_ORIGIN` não inclui a origem do frontend | Testar: `curl -D - -o /dev/null <api>/health -H "Origin: <origem-do-front>"` — deve refletir `Access-Control-Allow-Origin` |
| Cosign `sign`/`attest` falha com "could not parse reference" | Nome de imagem com maiúsculas (bug já corrigido no workflow, commit `97c1516`) | Confirmar `IMAGE_NAME` normalizado para minúsculas no workflow |

## 15. Como verificar a versão implantada

```bash
docker inspect <container> --format '{{json .Config.Labels}}' | jq .
# org.opencontainers.image.revision = SHA completo do commit de origem
```

Ou via registry, sem precisar do container rodando:

```bash
docker buildx imagetools inspect ghcr.io/renatoprestes76/bio-mapping/api:master \
  --format '{{json .Image.Config.Labels}}'
```
