# Bio Mapping — Infraestrutura Docker

Documentação da estratégia de containerização do projeto Bio Mapping (Sprint 3.5 — FORTRESS).

---

## Visão Geral

O Dockerfile utiliza **build multi-stage** para separar completamente as fases de compilação e execução. A imagem final carrega apenas o mínimo necessário para rodar a API em produção.

```
node:22-alpine
  ├── base        → corepack habilitado
  ├── deps        → todas as dependências (dev + prod)
  ├── builder     → Prisma Client gerado + TypeScript compilado
  ├── prod-deps   → somente dependências de produção
  └── runtime     → imagem final (< 250 MB, non-root, tini)
```

---

## Decisões Técnicas

### Por que `node:22-alpine` em todos os stages?

O requisito original preferia `node:22-bookworm-slim` (Debian), mas há uma restrição técnica incompatível com o objetivo de tamanho:

| Critério | Alpine | Bookworm-slim |
|---|---|---|
| Tamanho da base | ~72 MB | ~230 MB |
| Tamanho da imagem final | **~200–230 MB** | ~380–420 MB |
| libc | musl | glibc |
| Prisma 7 + driver adapters | ✅ (engine Wasm) | ✅ |
| `argon2` (módulo nativo) | Compilado para musl | Compilado para glibc |

**Problema crítico:** O módulo `argon2` é um addon nativo (C++). Binários compilados para glibc (bookworm-slim) não rodam em musl (Alpine) e vice-versa. Para usar Alpine como runtime, **todos os stages de instalação de deps também devem usar Alpine** — garantindo que os binários nativos sejam compilados para a mesma libc.

**Prisma 7 com driver adapters:** Usando `@prisma/adapter-pg`, o Prisma executa as queries diretamente via o driver `pg` (JavaScript), sem precisar de um binário nativo do query engine. O engine é carregado como WebAssembly — 100% compatível com Alpine.

### Por que `tini` como init process?

Quando Docker inicia um container, o PID 1 recebe os sinais do SO. Node.js não foi projetado para ser PID 1: ele não faz o reaping de processos zumbis (filhos adotados) corretamente. O `tini` é um init process mínimo que:

1. Repassa `SIGTERM`/`SIGINT` corretamente para o processo filho (Node.js)
2. Faz o reaping de processos zumbis
3. Permite que o NestJS execute seus shutdown hooks antes de encerrar

Fluxo de shutdown: `Docker stop` → `SIGTERM` → `tini` → `Node.js` → `NestJS onModuleDestroy hooks` → drain de conexões → `process.exit(0)`

### Por que `enableShutdownHooks()` no NestJS?

O método `app.enableShutdownHooks()` em `main.ts` faz o NestJS escutar os sinais `SIGTERM` e `SIGINT`. Ao receber esses sinais, o framework:

1. Chama todos os `onModuleDestroy()` registrados
2. Fecha conexões com o banco de dados (Prisma)
3. Encerra gracefully sem deixar requests pendentes sem resposta

Sem isso, o container seria finalizado abruptamente ao receber `SIGTERM`.

### Usuário não-root

A imagem final nunca executa como `root`. O usuário `biomapping` (UID dinâmico, sem shell) é criado com `adduser -S` (system user) e o diretório `/app` pertence a ele. Isso:

- Reduz o blast radius em caso de comprometimento do processo
- Impede que a aplicação modifique arquivos do sistema
- É requisito em ambientes Kubernetes com PodSecurityPolicy `runAsNonRoot: true`

---

## Estrutura da Imagem Final

```
/app/
├── apps/api/dist/          # JavaScript compilado (NestJS)
├── database/
│   ├── package.json        # exports do workspace @bio/database
│   └── node_modules/
│       └── .prisma/client/ # Prisma Client gerado (Wasm engine)
├── node_modules/           # dependências de produção (pnpm virtual store)
└── uploads/                # volume Docker montado aqui
```

**Não presentes na imagem:**
- `apps/api/src/` — código TypeScript (compilado e descartado)
- `node_modules/**/*.spec.*` — testes
- devDependencies (TypeScript, Jest, ESLint, etc.)
- `.env` — variáveis de ambiente (injetadas pelo Docker Compose / K8s)
- Ferramentas de build (python3, make, g++)

---

## Healthcheck

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -fsS http://localhost:3000/health || exit 1
```

O endpoint `GET /health` retorna:

```json
{
  "status": "ok",
  "database": "connected",
  "uptime": 42,
  "version": "0.1.0"
}
```

Em caso de falha no banco de dados, retorna HTTP 503 com `"status": "error"`.

O `--start-period=60s` garante que o container não seja marcado como unhealthy durante a inicialização do NestJS (que inclui conexão ao banco, migrations check e bootstrap dos módulos).

---

## OCI Labels

```dockerfile
LABEL org.opencontainers.image.title="Bio Mapping API"
LABEL org.opencontainers.image.description="AI Health Platform — NestJS REST API"
LABEL org.opencontainers.image.vendor="Bio Mapping"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${GIT_SHA}"
LABEL org.opencontainers.image.licenses="Proprietary"
LABEL org.opencontainers.image.source="https://github.com/RenatoPrestes76/bio-mapping"
```

Os valores dinâmicos (`VERSION`, `BUILD_DATE`, `GIT_SHA`) são injetados pelo CI via `--build-arg` e aparecem nos metadados da imagem publicada no registry.

---

## Segurança em Runtime (docker-compose)

Além das proteções na imagem, o `docker-compose.yml` aplica isolamento adicional no container:

| Configuração | Valor | Efeito |
|---|---|---|
| `read_only: true` | — | Filesystem da imagem é somente-leitura; `/app/uploads` e `/tmp` são as únicas exceções |
| `tmpfs: /tmp` | `50m, noexec, nosuid` | `/tmp` in-memory, sem exec de binários |
| `cap_drop: ALL` | — | Remove todas as Linux Capabilities (a API não precisa de nenhuma) |
| `security_opt: no-new-privileges` | `true` | Processo não pode elevar seus próprios privilégios via setuid |
| `deploy.resources.limits` | `1 CPU, 512 MB RAM` | Impede que um bug ou ataque consuma recursos do host |
| `pids_limit: 200` | — | Previne fork bombs |
| `stop_grace_period: 30s` | — | Aguarda NestJS drenar conexões antes do SIGKILL |

---

## CI/CD — GitHub Actions

O workflow `.github/workflows/docker-ci.yml` executa automaticamente em push para `develop`/`master` e em PRs para `master`:

```
push/PR
  └── build-and-scan
        ├── docker buildx build (local, sem push)
        ├── Trivy: scan CRITICAL/HIGH (falha se CVE fixável encontrado)
        ├── upload SARIF → GitHub Security tab
        ├── Docker Scout: CVEs + recomendações de base image (OBRIGATÓRIO)
        ├── Syft: geração de SBOM em SPDX-JSON (30 dias de retenção)
        ├── push para ghcr.io (somente develop/master, após scans aprovados)
        ├── Cosign: assinatura keyless via Sigstore OIDC (sem secrets)
        └── Cosign attest: SBOM anexado à imagem no registry
  └── compose-validate
        └── docker compose config (valida sintaxe)
```

**Secrets necessários no repositório GitHub:**

| Secret | Obrigatório | Descrição |
|---|---|---|
| `DOCKERHUB_USERNAME` | Sim | Usuário Docker Hub (conta gratuita suficiente) |
| `DOCKERHUB_TOKEN` | Sim | Personal Access Token do Docker Hub (read-only) |
| `GITHUB_TOKEN` | Automático | Gerado pelo Actions, usado para GHCR e SARIF |

**Cosign — verificar uma imagem assinada:**
```bash
cosign verify \
  --certificate-identity-regexp="https://github.com/RenatoPrestes76/bio-mapping" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  ghcr.io/renatoprestes76/bio-mapping/api:latest
```

**Dependabot (`.github/dependabot.yml`):**
- Cria PRs automáticos toda segunda-feira às 06h (horário de Brasília)
- Agrupa por ecossistema: NestJS, Prisma, TypeScript, Testing
- Cobre: npm (monorepo), Dockerfile (base image), GitHub Actions

---

## SBOM — Software Bill of Materials

O Syft gera um inventário completo de todos os pacotes presentes na imagem:

```bash
# Inspecionar o SBOM da última build
docker buildx imagetools inspect \
  ghcr.io/renatoprestes76/bio-mapping/api:latest \
  --format '{{ json .SBOM }}'
```

O SBOM em formato SPDX-JSON está disponível como:
1. **Workflow artifact** — disponível por 30 dias na aba Actions
2. **OCI attestation** — anexado à imagem no registry via `cosign attest`

---

## Antes × Depois (Sprint 3.5 — FORTRESS)

| Aspecto | Antes | Depois |
|---|---|---|
| Base image | `node:20-alpine` | `node:22-alpine` (LTS) |
| Stages | 2 (builder + runner) | 5 (base, deps, builder, prod-deps, runtime) |
| Usuário | `root` | `biomapping` (non-root) |
| Init process | — | `tini` (reaping + signal forwarding) |
| HEALTHCHECK | — | `GET /health` com DB check |
| OCI Labels | — | Completo (title, version, revision, created...) |
| Graceful shutdown | — | `enableShutdownHooks()` + `stop_grace_period: 30s` |
| Uploads | — | Volume Docker `uploads_data` |
| CI/CD | — | Trivy + Docker Scout (obrigatório) + Syft SBOM + Cosign sign |
| SBOM | — | SPDX-JSON via Syft, anexado ao registry |
| Assinatura de imagem | — | Cosign keyless via Sigstore OIDC |
| Dependabot | — | npm + Docker + Actions (toda segunda-feira) |
| `read_only` filesystem | — | Sim (`/tmp` tmpfs, `/app/uploads` volume) |
| Linux Capabilities | — | `cap_drop: ALL` |
| `no-new-privileges` | — | Sim |
| Limites de recursos | — | 1 CPU, 512 MB RAM, 200 PIDs |
| devDeps na imagem final | Sim (pnpm reinstalava tudo) | Não (`prod-deps` stage separado) |
| pnpm na imagem final | Sim | Não (copiamos node_modules prontos) |
| Build tools na imagem final | Sim | Não (removidos no runtime stage) |

---

## Como Usar

### Build local

```bash
# Build simples
docker compose build

# Build com metadados do commit atual
BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
GIT_SHA=$(git rev-parse --short HEAD) \
docker compose build
```

### Run

```bash
# Copiar e preencher as variáveis de ambiente
cp .env.example .env

# Subir banco + API
docker compose up -d

# Verificar healthcheck
curl http://localhost:3000/health

# Acompanhar logs
docker compose logs -f api
```

### Inspecionar metadados da imagem

```bash
docker inspect biomapping_api | jq '.[0].Config.Labels'
```

### Vulnerabilidades (Trivy local)

```bash
# Instalar: https://aquasecurity.github.io/trivy/
trivy image biomapping-api:latest --severity CRITICAL,HIGH --ignore-unfixed
```
