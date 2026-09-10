# BioBoock — Sprint Extra: Production API & Web Connectivity Recovery

**Data:** 2026-09-10
**Escopo:** `apps/web` (bug de conectividade + mostrar/ocultar senha) — zero mudança em `apps/api`, zero migration, zero alteração de arquitetura de autenticação.
**Pré-requisitos:** Sprints 05 (`4562724`), 06 (`6b99c92`), 06.1 (`54e9bd4`), 07 (`ac0ec3b`).

---

## 1. Causa raiz

Duas causas distintas, confirmadas com evidência real (não leitura estática apenas):

### 1.1 Bug de código (corrigido nesta sprint)

`apps/web/src/lib/auth/config.ts`:
```ts
export const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/v1`;
```
O operador `??` só cai no fallback quando o valor é `null`/`undefined` — **não** quando é uma string vazia (`""`). Em Produção na Vercel, `NEXT_PUBLIC_API_URL` está definida mas com valor **vazio** (confirmado via `vercel env pull` autenticado nesta sessão). Isso produz `API_BASE = "/api/v1"` (URL relativa), e um `fetch()` executado server-side (dentro de uma Server Action, em Node/Vercel Functions — sem contexto de `document.baseURI` de browser) falha ao resolver essa URL, lançando uma exceção capturada pelo `catch` em `apiLogin()`/`apiRegister()` (`apps/web/src/lib/auth/api.ts`), que retorna `{ status: 0, message: 'Não foi possível conectar à API. Tente novamente.' }`. Como Server Actions sempre respondem HTTP 200 no nível do protocolo (o erro vai no corpo, não no status HTTP), isso bate exatamente com o sintoma relatado: HTTP 200 + corpo com mensagem de erro.

### 1.2 Confusão de infraestrutura (documentada, não é bug de código)

O projeto Vercel chamado **`bio-mapping-api`** (`bio-mapping-api-five.vercel.app`) **não é uma API NestJS** — é uma implantação **do próprio Web** (`apps/web`), porque esse projeto usa Root Directory `.` e herda o `vercel.json` da raiz do monorepo (`{"framework":"nextjs","buildCommand":"turbo run build --filter=web",...}`), que sempre builda e serve `apps/web`. Evidência real coletada nesta sessão:

```
GET https://bio-mapping-api-five.vercel.app/
→ HTTP 307, Location: /login?from=%2F   (comportamento do proxy.ts do Web)

GET https://bio-mapping-api-five.vercel.app/api/v1/health
→ HTTP 404 (página 404 genérica da Vercel — nenhuma rota NestJS existe ali)
```

Esse projeto já havia sido identificado como órfão/não usado na Sprint 02 (`docs/sprints/BIOBOOCK-SPRINT-02-PRODUCTION-E2E-CLOSURE.md`, Parte 4), mas nunca foi removido nem renomeado — daí a confusão em achar que era a API.

Os dois aliases adicionais mencionados (`bio-mapping-api-git-master-...` e `bio-mapping-30kjhauza-...`) são deployments de branch/preview do **mesmo** projeto órfão, protegidos por Vercel Deployment Protection (SSO) — testados nesta sessão, ambos retornam `302` para `vercel.com/sso-api`. Não são uma API separada.

---

## 2. Descoberta de infraestrutura (Fase 1)

Auditoria completa por evidência (não suposição):

- `vercel.json` (raiz): configura build do Next.js (`apps/web`) — não há `apps/api/vercel.json` nem qualquer adaptador serverless para o NestJS.
- `.github/workflows/docker-ci.yml`: builda a imagem da API, escaneia (Trivy/Docker Scout), gera SBOM, publica no **GHCR** e assina (Cosign). **Não faz deploy em servidor nenhum** — termina no push da imagem.
- `docker-compose.prod.yml`: aponta para a imagem já publicada por digest — uso documentado como **manual** (`docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`, a ser executado pelo operador em algum host).
- `docs/operations/PRODUCTION-DEPLOYMENT.md`: runbook de 15 passos, todos os valores são **placeholders explícitos** ("Nunca coloque secrets reais neste arquivo"). Não referencia nenhum host real.
- Git history: nenhum commit menciona Render, Railway, Fly.io, VPS, nginx ou qualquer outro provedor de hospedagem para a API. Todos os commits com "deploy" no histórico (`cdf7541`, `93d83cb`, `51eca3d`, `19a9089`, `ecbaba4`, `408c26e`, `03b8e4e`) são exclusivamente sobre o deploy do **Web** na Vercel.
- `vercel project ls` (CLI autenticado como `renatoprestes76`): confirma 8 projetos na conta; nenhum além de `web` e o órfão `bio-mapping-api` está relacionado a este repositório.

**Conclusão objetiva: Cenário B.** Não existe, e nunca existiu, uma API NestJS publicamente acessível para o BioBoock. A imagem está publicada, assinada e pronta (GHCR, digest `sha256:ff5fcc112dba86bf...`), mas nunca foi colocada para rodar em um host publicamente alcançável.

Por instrução explícita desta sprint ("REGRA ZERO — não inventar infraestrutura"), **nenhum servidor, domínio ou IP foi inventado**, e nenhum deploy improvisado foi executado. Provisionar um host real (VPS/Render/Railway/Fly.io) exigiria credenciais de uma conta de nuvem que não estão disponíveis nesta sessão — fora do que pode ser resolvido só com os recursos já existentes no projeto.

---

## 3. Correção aplicada

### 3.1 `apps/web/src/lib/auth/config.ts`
String vazia agora é tratada como "não configurada", caindo no mesmo fallback que `undefined`:
```ts
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiHost = configuredApiUrl && configuredApiUrl.trim() !== '' ? configuredApiUrl : 'http://localhost:3000';
export const API_BASE = `${apiHost}/api/v1`;
```
Isso corrige o bug em si (comportamento determinístico e correto para qualquer valor futuro de `NEXT_PUBLIC_API_URL`), mas **não resolve sozinho** a conectividade em produção — falta o host real (ver §2 e Bloqueios).

### 3.2 Mostrar/ocultar senha
Novo componente `apps/web/src/components/ui/PasswordField.tsx`: campo de senha com botão de alternância independente (`type` `password` ↔ `text`), estado inicial sempre oculto, `aria-label` dinâmico ("Mostrar senha"/"Ocultar senha"), `aria-pressed`, ícone SVG inline (sem dependência nova), touch target de 44px (`w-11`). Nunca copia para clipboard, nunca persiste o valor.

Aplicado em:
- `apps/web/src/app/login/LoginForm.tsx` — campo Senha.
- `apps/web/src/app/signup/SignupForm.tsx` — campos Senha e Confirmar senha, **cada um com seu próprio estado** (alternar um não afeta o outro — verificado em teste).

Nenhuma alteração no backend, na validação, ou nos Server Actions em si — só a apresentação do campo.

### 3.3 Vercel — nenhuma alteração feita
Deliberadamente **não** alterei `NEXT_PUBLIC_API_URL` na Vercel (nem para um valor novo, nem removendo a variável): não há valor correto conhecido para colocar ali (§2). Alterá-la para qualquer coisa sem um host real seria "apontar para uma URL falsa", explicitamente proibido pela Regra Zero desta sprint. O projeto órfão `bio-mapping-api` também não foi renomeado/removido — ação opcional, de baixo valor imediato, e o foco desta sprint foi conectividade real, não housekeeping do dashboard Vercel.

---

## 4. Fluxo Web → API (preservado, Sprint 05/06.1 intacto)

```
Browser
  → Web (Server Action: loginAction/signupAction)
  → lib/auth/api.ts (apiLogin/apiRegister) → fetch(`${API_BASE}/api/v1/auth/login|register`)
  → API NestJS real (POST /api/v1/auth/login | /api/v1/auth/register)
  → sessão (accessToken + refreshToken)
  → cookies httpOnly (lib/auth/session.ts: bb_at, bb_rt, bb_rm)
  → BFF (/api/proxy/[...path]) para todas as chamadas autenticadas subsequentes
  → BioBoock (/biobook)
```

Nenhum arquivo de sessão, BFF, `proxy.ts`, `RolesGuard` ou JWT foi tocado. `API_BASE` continua sendo o único ponto de configuração da URL real da API, exatamente como estabelecido na Sprint 05.

---

## 5. Login

Validado localmente (única API real alcançável nesta sessão — ver Bloqueios para produção):
- Login com credencial válida (usuário comum e ADMIN) → `200`, tokens emitidos.
- Sessão estabelecida via cookies httpOnly, BFF funcionando (`/api/proxy/users`, `/api/proxy/profiles/*`).
- Mostrar/ocultar senha: campo inicia oculto, alterna para `text` e volta para `password` corretamente (testado via componente e renderização real).

## 6. Cadastro

- `POST /auth/register` real → `201`, `role: PATIENT` (nunca `ADMIN` por padrão), auto-login.
- Onboarding (criação de perfil) funcionando após cadastro.
- Mostrar/ocultar senha nos dois campos (Senha, Confirmar senha), independentes — confirmado que alternar um não afeta o outro.

## 7. Segurança

- Senha nunca aparece em URL, log, console ou está persistida em `localStorage`/`sessionStorage` — o toggle só troca o atributo `type` do `<input>` já existente, sem duplicar o valor em outro lugar.
- Cookies de sessão continuam `httpOnly`, `Secure` em produção, `SameSite=lax` — inalterado.
- JWT/refresh token não expostos além do necessário — inalterado.
- BFF continua sendo o único caminho para chamadas autenticadas do client — inalterado.
- Isolamento entre usuários: validado com duas contas reais e descartáveis (ver §9) — cada uma só enxerga o próprio perfil; endpoint administrativo (`GET /users`) retorna `403` para ambas.
- ADMIN: login real com a conta administrativa existente, `GET /api/proxy/users` retorna `200` com a lista completa; usuário comum recebe `403`; requisição sem token recebe `401` em `/api/proxy/users` e `307` (redirect para login) em `/admin`.

---

## 8. Testes

- `apps/web`: `npx vitest run` → **387/387 testes, 50/50 arquivos** (baseline Sprint 07: 385/385 — +2 testes novos, mostrar/ocultar senha em Login e Signup).
- `apps/web`: `npx tsc --noEmit` → zero erros.
- `apps/web`: `npx next build` → sucesso, 18 rotas (mesmo total da Sprint 07).
- `apps/api`: `npx jest --silent` → **3973/3973 testes, 261/261 suítes** (API não tocada nesta sprint, resultado idêntico ao baseline).

---

## 9. Produção — testes reais executados

- `GET https://bio-mapping-api-five.vercel.app/` → `307` (confirma que não é a API).
- `GET https://bio-mapping-api-five.vercel.app/api/v1/health` → `404` (confirma ausência de rota NestJS).
- `GET https://bio-mapping-api-five.vercel.app-git-master-...` e `...-30kjhauza-...` → `302` para `vercel.com/sso-api` (protegidos por Deployment Protection, não testáveis publicamente).
- `vercel env pull` (projeto `web`, autenticado): confirmou `NEXT_PUBLIC_API_URL=""` em Produção.

**Não foi possível testar o fluxo completo de login/cadastro contra o domínio real do Web em produção**, porque isso exigiria uma API real publicamente alcançável, que não existe (§2). Testar o Web de produção contra o bug corrigido não mudaria o resultado — o fallback (`http://localhost:3000`) não é alcançável a partir dos servidores da Vercel de qualquer forma. Isso está registrado como bloqueio (§13), não mascarado como sucesso.

Toda a validação funcional real (login, cadastro, refresh, logout, admin, isolamento, mostrar/ocultar senha) foi feita contra a API rodando localmente via Docker (`biomapping_api`/`biomapping_db`, já em execução nesta sessão desde o atendimento anterior) — a única instância real acessível.

---

## 10. Vercel — o que foi descoberto

| Projeto | URL de produção | O que realmente é |
|---|---|---|
| `web` | `web-renatoprestes76s-projects.vercel.app` | O Web BioBoock real (`apps/web`). `NEXT_PUBLIC_API_URL` = `""` (vazio) em Produção. |
| `bio-mapping-api` | `bio-mapping-api-five.vercel.app` | **Órfão** — builda `apps/web` via `vercel.json` da raiz (Root Directory `.`), não é uma API. Já documentado como não usado desde a Sprint 02. |

Nenhuma alteração foi feita em nenhum dos dois projetos (nem renomeação, nem env vars, nem remoção) — decisão deliberada, ver §3.3.

---

## 11. Documentação

- Criado: este arquivo.

---

## 12. Git

Ver seção final do relatório de entrega (commit/SHA local/SHA remoto/working tree).

---

## 13. Reservas

1. `NEXT_PUBLIC_API_URL` continua vazia em Produção na Vercel — o código agora trata isso corretamente (fallback previsível), mas isso **não torna o login em produção funcional**, porque o fallback (`localhost:3000`) não é alcançável a partir da infraestrutura da Vercel. É preciso um host real para a API.
2. O projeto Vercel órfão `bio-mapping-api` continua existindo e continua confuso (nome sugere API, mas serve o Web) — recomendo removê-lo ou renomeá-lo quando conveniente, mas isso é administrativo/opcional, não foi executado nesta sprint para não introduzir risco em infraestrutura compartilhada sem necessidade.

## 14. Bloqueios

1. **Não existe, hoje, nenhuma API NestJS do BioBoock publicamente acessível.** A imagem Docker está pronta, publicada, assinada e verificada no GHCR (`ghcr.io/renatoprestes76/bio-mapping/api@sha256:ff5fcc112dba86bf...`), mas nunca foi colocada para rodar em um servidor com IP/domínio público. Isso é um bloqueio **exclusivamente externo** (falta de infraestrutura de hospedagem) — não é algo que o código deste repositório possa resolver sozinho, e a Regra Zero desta sprint proíbe inventar ou improvisar essa infraestrutura. Login e cadastro em produção continuarão retornando erro de conexão até que: (a) a imagem seja implantada em algum host real (seguindo `docs/operations/PRODUCTION-DEPLOYMENT.md`), e (b) `NEXT_PUBLIC_API_URL` no projeto `web` da Vercel seja atualizada para apontar para esse host.

---

## 15. Status Final

**PASS COM RESERVA.** Todo o código e configuração do lado do Web estão corretos e prontos (bug de conectividade corrigido, mostrar/ocultar senha implementado, zero regressão, testes/TypeScript/build limpos, arquitetura de autenticação da Sprint 05/06.1 intacta). O bloqueio restante é exclusivamente externo: a ausência de um host de produção real para a API NestJS.
