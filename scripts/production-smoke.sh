#!/usr/bin/env bash
# production-smoke.sh — Smoke test mínimo contra a API do BioBoock implantada.
#
# Uso: ./scripts/production-smoke.sh [BASE_URL]
#   BASE_URL default: http://localhost:3000
#
# Falha (exit != 0) se qualquer verificação crítica falhar. Nunca imprime o valor
# completo de tokens/secrets — só confirma presença/formato.

set -uo pipefail

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    printf '[PASS] %s (esperado=%s, obtido=%s)\n' "$name" "$expected" "$actual"
    PASS=$((PASS+1))
  else
    printf '[FAIL] %s (esperado=%s, obtido=%s)\n' "$name" "$expected" "$actual"
    FAIL=$((FAIL+1))
  fi
}

echo "=== Smoke test: $BASE_URL ==="

HEALTH_BODY=$(curl -s "$BASE_URL/health")
HEALTH_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/health")
check "GET /health status" "200" "$HEALTH_STATUS"
case "$HEALTH_BODY" in
  *'"database":"connected"'*) printf '[PASS] /health reporta database connected\n'; PASS=$((PASS+1)) ;;
  *) printf '[FAIL] /health não reporta database connected — body: %s\n' "$HEALTH_BODY"; FAIL=$((FAIL+1)) ;;
esac

DOCS_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/docs")
check "GET /docs status" "200" "$DOCS_STATUS"

# Email único por execução — não deixa lixo cumulativo com o mesmo endereço.
TEST_EMAIL="smoke-$(date +%s)-$$@example.com"
REGISTER_STATUS=$(curl -s -o /tmp/smoke_register.json -w '%{http_code}' -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"SmokeTest123!\",\"name\":\"Smoke Test\"}")
check "POST /api/v1/auth/register status" "201" "$REGISTER_STATUS"

LOGIN_STATUS=$(curl -s -o /tmp/smoke_login.json -w '%{http_code}' -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"SmokeTest123!\"}")
check "POST /api/v1/auth/login status" "200" "$LOGIN_STATUS"
if grep -q '"accessToken"' /tmp/smoke_login.json 2>/dev/null; then
  printf '[PASS] login retornou accessToken (valor não impresso)\n'; PASS=$((PASS+1))
else
  printf '[FAIL] login não retornou accessToken\n'; FAIL=$((FAIL+1))
fi
rm -f /tmp/smoke_register.json /tmp/smoke_login.json

PROTECTED_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/v1/users/me")
check "GET rota protegida sem token" "401" "$PROTECTED_STATUS"

NOTFOUND_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/v1/does-not-exist")
check "GET rota inexistente" "404" "$NOTFOUND_STATUS"

echo "=== Resultado: $PASS PASS / $FAIL FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
