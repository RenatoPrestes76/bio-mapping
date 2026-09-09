#!/usr/bin/env bash
# production-deploy.sh — Deploy da imagem assinada do BioBoock API (GHCR, por digest).
#
# Lê o digest de docker-compose.prod.yml (fonte única de verdade) — não aceita um
# digest arbitrário via argumento, para não permitir bypass do processo de release
# (o digest correto é o que foi commitado após Trivy/Cosign passarem no CI).
#
# Uso: ./scripts/production-deploy.sh
# Requer: docker, docker compose v2, cosign. Rodar a partir da raiz do repo, com
# `database/` tendo devDependencies instaladas (pnpm install completo) para migrations.
#
# Falha (exit != 0) em qualquer etapa crítica. Nunca imprime secrets.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

log()  { printf '[deploy] %s\n' "$1"; }
fail() { printf '[deploy][ERRO] %s\n' "$1" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || fail "docker não encontrado no PATH."
docker compose version >/dev/null 2>&1 || fail "docker compose (v2) não encontrado."
command -v cosign >/dev/null 2>&1 || fail "cosign não encontrado — verificação de assinatura é obrigatória, não pulamos essa etapa. Instale: https://docs.sigstore.dev/cosign/system_config/installation/"

[ -f docker-compose.prod.yml ] || fail "docker-compose.prod.yml não encontrado — rode a partir da raiz do repo."
[ -f .env ] || fail ".env não encontrado. Copie .env.example para .env e preencha os valores reais (nunca comitados)."

IMAGE_REF=$(grep -E '^\s*image:' docker-compose.prod.yml | sed -E 's/^\s*image:\s*//')
[ -n "$IMAGE_REF" ] || fail "Não foi possível extrair a referência de imagem de docker-compose.prod.yml."
log "Imagem alvo (fonte: docker-compose.prod.yml): $IMAGE_REF"

case "$IMAGE_REF" in
  *@sha256:*) : ;;
  *) fail "IMAGE_REF não é uma referência por digest imutável (@sha256:...). Recusando deploy por tag mutável." ;;
esac

log "Pull da imagem (por digest)…"
docker pull "$IMAGE_REF" || fail "Falha no pull. Se for timeout de TLS/rede para ghcr.io especificamente (teste 'docker pull alpine' para comparar), é limitação de rede local, não do release — tente novamente ou de outra rede."

ACTUAL_DIGEST=$(docker image inspect "$IMAGE_REF" --format '{{index .RepoDigests 0}}')
log "Digest confirmado localmente: $ACTUAL_DIGEST"
[ "$ACTUAL_DIGEST" = "$IMAGE_REF" ] || fail "Digest da imagem baixada não corresponde a IMAGE_REF esperado."

log "Verificando assinatura Cosign (keyless, Sigstore OIDC)…"
cosign verify \
  --certificate-identity-regexp="https://github.com/RenatoPrestes76/bio-mapping" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  "$IMAGE_REF" > /dev/null || fail "Assinatura Cosign inválida ou ausente. NÃO prosseguindo — nunca fazemos bypass dessa verificação."
log "Assinatura Cosign válida."

if [ -x "database/node_modules/.bin/prisma" ]; then
  log "Rodando migrations (prisma migrate deploy)…"
  ( cd database && npx prisma migrate deploy ) || fail "Falha ao aplicar migrations. Não subimos a API contra um schema desatualizado."
  log "Migrations aplicadas."
else
  fail "CLI do prisma não encontrado em database/node_modules/.bin — rode 'pnpm install' completo (dev+prod) neste checkout antes do deploy. O CLI do prisma foi removido da imagem de runtime de propósito (reduz CVEs); migrations rodam daqui, não de dentro do container."
fi

log "Subindo stack (docker compose, imagem publicada, sem rebuild)…"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d || fail "docker compose up falhou."

log "Aguardando healthcheck…"
for i in $(seq 1 30); do
  if curl -fsS "http://localhost:${PORT:-3000}/health" > /dev/null 2>&1; then
    log "Health OK."
    curl -s "http://localhost:${PORT:-3000}/health"; echo
    break
  fi
  [ "$i" -eq 30 ] && fail "Health não respondeu após 30 tentativas."
  sleep 2
done

log "Deploy concluído. Versão implantada:"
docker inspect biomapping_api --format '{{json .Config.Labels}}' | grep -o '"org.opencontainers.image.revision":"[^"]*"'
