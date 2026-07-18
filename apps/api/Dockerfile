# =============================================================================
# Bio Mapping API — Multi-Stage Dockerfile
# =============================================================================
#
# Estratégia:
#   base       → Node 22 Alpine com corepack habilitado
#   deps       → Instala TODAS as dependências (dev + prod) para compilação
#   builder    → Gera Prisma Client (Wasm) + compila TypeScript → JavaScript
#   prod-deps  → Instala apenas dependências de produção
#   runtime    → Imagem final mínima (sem build tools, sem devDeps, não-root)
#
# Por que node:22-alpine em todos os stages (em vez de bookworm-slim):
#   1. O módulo nativo `argon2` deve ser compilado para a mesma libc do runtime.
#      Alpine usa musl; bookworm-slim usa glibc. Binários são incompatíveis.
#   2. Prisma 7 + @prisma/adapter-pg usa engine Wasm — sem dependência de glibc.
#   3. Resultado: imagem final < 250 MB vs ~400 MB com bookworm-slim.
#
# =============================================================================

ARG NODE_VERSION=22
ARG PNPM_VERSION=10.33.4

# -----------------------------------------------------------------------------
# Stage 1 — base
# Ponto de partida comum: corepack habilitado, sem ferramentas extras
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
RUN corepack enable

# -----------------------------------------------------------------------------
# Stage 2 — deps
# Instala TODAS as dependências (dev + prod).
# Ferramentas de compilação nativa (python3/make/g++) são necessárias para
# compilar argon2 e outros módulos nativos contra musl libc do Alpine.
# -----------------------------------------------------------------------------
FROM base AS deps
ARG PNPM_VERSION

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json           ./apps/api/
COPY database/package.json           ./database/
COPY packages/bioscore-engine/package.json ./packages/bioscore-engine/

RUN corepack prepare pnpm@${PNPM_VERSION} --activate && \
    pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 3 — builder
# Gera o Prisma Client (engine Wasm para driver adapters) e compila TypeScript.
# @bio/bioscore-engine é um workspace package sem publicação própria — precisa
# ser compilado (tsc) ANTES do build da api, que consome seu dist/ já pronto
# (ver package.json: main/exports apontam para ./dist, não para ./src).
# -----------------------------------------------------------------------------
FROM deps AS builder

COPY database/ ./database/
COPY packages/bioscore-engine/ ./packages/bioscore-engine/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @bio/database generate && \
    pnpm --filter @bio/bioscore-engine build && \
    pnpm --filter api build

# -----------------------------------------------------------------------------
# Stage 4 — prod-deps
# Instala somente dependências de produção (sem devDeps).
# Reutiliza a mesma base Alpine para garantir que binários nativos sejam
# compilados para musl — compatíveis com a imagem runtime Alpine.
# -----------------------------------------------------------------------------
FROM base AS prod-deps
ARG PNPM_VERSION

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json           ./apps/api/
COPY database/package.json           ./database/
COPY packages/bioscore-engine/package.json ./packages/bioscore-engine/

RUN corepack prepare pnpm@${PNPM_VERSION} --activate && \
    pnpm install --frozen-lockfile --prod

# -----------------------------------------------------------------------------
# Stage 5 — runtime  (imagem final)
# Alpine sem ferramentas de build. Non-root. Tini init. Healthcheck.
# Target: < 250 MB
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime

# OCI Labels — rastreabilidade e governança da imagem
# BUILD_DATE, GIT_SHA e VERSION são injetados pelo CI (docker build --build-arg)
ARG BUILD_DATE
ARG GIT_SHA
ARG VERSION=0.1.0

LABEL org.opencontainers.image.title="Bio Mapping API"
LABEL org.opencontainers.image.description="AI Health Platform — NestJS REST API"
LABEL org.opencontainers.image.vendor="Bio Mapping"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${GIT_SHA}"
LABEL org.opencontainers.image.licenses="Proprietary"
LABEL org.opencontainers.image.source="https://github.com/RenatoPrestes76/bio-mapping"
LABEL org.opencontainers.image.base.name="docker.io/library/node:22-alpine"

# tini: init process leve que repassa SIGTERM/SIGINT corretamente ao Node.
# curl: necessário para o probe do HEALTHCHECK.
RUN apk add --no-cache tini curl

# Usuário não-root dedicado (princípio do menor privilégio).
# Nunca executar a API como root em produção.
RUN addgroup -S biomapping && adduser -S -G biomapping biomapping

WORKDIR /app

# Diretório de uploads com permissão para o usuário não-root.
# Um volume Docker montado aqui herda esse ownership na primeira inicialização.
RUN mkdir -p /app/uploads && chown biomapping:biomapping /app/uploads

# ── Artefatos de produção ──────────────────────────────────────────────────

# node_modules de produção: raiz contém o virtual store pnpm (.pnpm/) e os
# poucos pacotes hoisted via public-hoist-pattern (.npmrc).
COPY --from=prod-deps --chown=biomapping:biomapping /app/node_modules ./node_modules

# pnpm NÃO faz hoist por padrão (sem shamefully-hoist) — cada pacote do
# workspace tem seu próprio node_modules com os symlinks reais para o virtual
# store (ex: apps/api/node_modules/@nestjs/core → ../../../node_modules/.pnpm/...).
# main.js roda de /app/apps/api/dist/main.js e a resolução do Node sobe o
# diretório até achar node_modules — sem este COPY, apps/api/node_modules
# nunca existe na imagem e o processo falha com "Cannot find module '@nestjs/core'".
COPY --from=prod-deps --chown=biomapping:biomapping /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps --chown=biomapping:biomapping /app/database/node_modules ./database/node_modules

# JavaScript compilado pelo NestJS CLI (tsc)
COPY --from=builder --chown=biomapping:biomapping /app/apps/api/dist ./apps/api/dist

# Prisma Client gerado: engine Wasm + tipos TypeScript.
# database/package.json exporta ./generated/client/index.js
COPY --from=builder --chown=biomapping:biomapping \
     /app/database/generated ./database/generated

# package.json do workspace @bio/database: necessário para resolução dos exports.
# O symlink node_modules/@bio/database aponta para ./database/ — este arquivo
# contém o campo "exports" que Node.js usa para localizar o Prisma Client.
COPY --chown=biomapping:biomapping database/package.json ./database/package.json

# @bio/bioscore-engine compilado (dist/ + package.json com exports para dist/).
# O JS emitido pela api usa require("@bio/bioscore-engine") (specifier não é
# reescrito pelo tsc) — em runtime isso resolve via node_modules/@bio/bioscore-engine
# (symlink do workspace pnpm) até este package.json, que agora aponta para dist/.
COPY --from=builder --chown=biomapping:biomapping \
     /app/packages/bioscore-engine/dist ./packages/bioscore-engine/dist
COPY --chown=biomapping:biomapping packages/bioscore-engine/package.json ./packages/bioscore-engine/package.json

USER biomapping

EXPOSE 3000

# HEALTHCHECK: valida que a API está operacional.
# --start-period=60s: aguarda NestJS + Prisma inicializarem antes da 1ª probe.
# O endpoint /health está excluído do prefixo api/v1 (ver main.ts).
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -fsS http://localhost:3000/health || exit 1

# Exec-form ENTRYPOINT via tini garante propagação correta de sinais POSIX.
# Fluxo: Docker → tini → node → NestJS shutdown hooks → graceful drain.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/main.js"]
