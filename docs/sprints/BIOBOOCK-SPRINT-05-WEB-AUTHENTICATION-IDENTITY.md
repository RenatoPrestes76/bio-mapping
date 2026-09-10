# BioBoock — Sprint 05: Web Authentication & Identity Integration

**Data:** 2026-09-10
**Escopo:** `apps/web` (integração de identidade) — `apps/api` não foi alterado nesta sprint.
**Pré-requisitos:** Sprint 03 (Security & Privacy, PASS COM RESERVA, `896b5f9`) e Sprint 04 (E2E Product & Web→API, PASS COM RESERVA, `ba017a8`), que identificou a lacuna que esta sprint fecha: *"O `apps/web` não possui autenticação real integrada à API."*

---

## 1. Objetivo

Fazer a identidade do usuário atravessar toda a arquitetura — login → sessão → Web → credencial → API → autorização → dados do usuário — usando o mecanismo de autenticação **já existente** na API (JWT Bearer + refresh token, auditado e corrigido nos Sprints 03/04), sem inventar um segundo sistema de auth.

---

## 2. Arquitetura Encontrada

**API** (`apps/api/src/modules/identity/auth`): JWT Bearer stateless, access token de 15 min, refresh token opaco (SHA-256 hash persistido, rotacionado a cada uso), `POST /auth/login`, `POST /auth/refresh`, `DELETE /auth/logout`, `GET /users/me`. Zero suporte a cookie do lado da API — 100% Bearer via header, por design (comentário no próprio `main.ts`, já documentado no Sprint 04).

**Web** (`apps/web`): Next.js 16 (App Router), React 19. Achado decisivo desta sprint, só percebido ao ler o código de verdade (não assumido): **os 9 módulos de página são Client Components** (`"use client"`), e os 8 serviços (`biobook`, `biocircle`, `bioteams`, `cds`, `learning`, `population`, `precision`, `simulation`) fazem `fetch` **no navegador**. Isso significa que um cookie `httpOnly` (a forma correta de guardar token sem expor a XSS) não pode ser lido por esse código nem seria reenviado automaticamente para a origem da API real (outro domínio). A conclusão prática, documentada na doc oficial do Next 16 bundlada no projeto (`node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md`) e no `AGENTS.md` deste app (*"This is NOT the Next.js you know... Read the relevant guide before writing any code"*): era preciso um padrão **BFF (Backend for Frontend)**, não apenas gravar um cookie e torcer.

Também descoberto ao consultar a doc oficial (não a partir de conhecimento prévio, que estaria desatualizado): `middleware.ts` foi **renomeado para `proxy.ts`** no Next.js 16 (`middleware` está deprecated), com API e comportamento default (Node.js runtime) diferentes do que versões anteriores documentam.

**Banco**: `User.status` (ACTIVE/INACTIVE/BLOCKED), `Session` (refresh tokens hasheados, rotação, `rememberMe`), `Profile`/`Patient` — nenhum alterado. Nenhuma migration nova foi necessária: o mecanismo de autenticação já suportava tudo que esta sprint precisava.

---

## 3. Mecanismo de Autenticação Existente

Confirmado por leitura de código, não assumido: `AuthController`/`AuthService` (Sprint 03 já testou exaustivamente: login rejeita `BLOCKED`/`INACTIVE`, refresh rotaciona e revoga o token anterior, `JwtStrategy` é stateless). Nenhuma mudança foi feita nesses arquivos. Esta sprint apenas construiu o lado que faltava: o Web falando com esse mecanismo já existente.

---

## 4. Contrato Web/API

| Aspecto | Decisão |
|---|---|
| Login | `POST /auth/login` da API real, chamado só por um Server Action (`app/login/actions.ts`) — nunca do browser diretamente. |
| Credencial | Os tokens da API (`accessToken`, `refreshToken`) são guardados em **cookies `httpOnly` do próprio Next.js** (`bb_at`, `bb_rt`), nunca expostos a JS do navegador. A API continua 100% Bearer — o Web é quem gerencia a ponte. |
| Persistência | Cookies `httpOnly`, `Secure` (só em produção — `NODE_ENV==='production'`), `SameSite=lax`, `path=/`. `bb_at` expira em 900s (espelha o access token real); `bb_rt` em 30 ou 90 dias (espelha `rememberMe`). |
| Renovação | Sim — ver §12 (Refresh). Um novo Route Handler (`/api/proxy/[...path]`) tenta renovar silenciosamente uma vez quando a API responde 401. |
| Logout | Server Action que chama `DELETE /auth/logout` (revoga o refresh token no banco) e limpa os cookies locais. |
| Expiração | O Web nunca decide isso sozinho — deixa a API real rejeitar (401) e reage: tenta renovar uma vez; se falhar, limpa a sessão. |

---

## 5. Implementação

Nenhum framework de autenticação novo foi instalado (Auth.js, Clerk, etc.) — a API já é o provedor de identidade; adicionar uma segunda camada de auth seria exatamente o "segundo sistema paralelo" que a regra fundamental desta sprint proibiu.

Arquivos novos, todos em `apps/web/src`:

- `lib/auth/config.ts` — nomes de cookies, TTLs (espelham os da API).
- `lib/auth/api.ts` — chamadas finas para `/auth/login`, `/auth/refresh`, `/auth/logout`, `/users/me` da API real.
- `lib/auth/session.ts` — leitura/escrita dos cookies `httpOnly` (só chamável de Server Actions/Route Handlers — Server Components não podem escrever cookies, conforme a doc oficial do Next).
- `proxy.ts` (renomeado de `middleware.ts` no Next 16) — checagem **otimista** (só presença do cookie) para redirecionar `/login` ↔ páginas protegidas. Mantido propositalmente barato (sem chamar a API), seguindo a recomendação oficial: Proxy roda em toda navegação, inclusive prefetch.
- `app/api/proxy/[...path]/route.ts` — o BFF de verdade: lê o cookie `httpOnly` no servidor, anexa `Authorization: Bearer`, repassa para a API real, e tenta renovar uma vez em caso de 401. É o único lugar onde o token realmente circula.
- `app/login/actions.ts`, `app/login/page.tsx`, `app/login/LoginForm.tsx` — login via Server Action + `useActionState`, no padrão recomendado pela própria doc do Next 16.
- `components/UserMenu.tsx` — mostra identidade (via `/api/proxy/users/me`) e botão de logout; adicionado ao `layout.tsx` raiz.
- Os 8 serviços do Web (`biobook`, `biocircle`, `bioteams`, `cds`, `learning`, `population`, `precision`, `simulation`): `API_BASE`/`API_URL` trocado de `${NEXT_PUBLIC_API_URL}/api/v1` (Sprint 04) para `/api/proxy` (mesma origem do Web) — nenhuma outra linha desses arquivos foi tocada.

---

## 6. Sessão

Cookies `httpOnly` são a fonte única da sessão — nunca `localStorage`/`sessionStorage` (evita roubo via XSS, já que JS não consegue lê-los). `verifySession`/identidade é sempre resolvida a partir do cookie no servidor (`getSessionTokens()`), nunca de um valor decidido no client.

---

## 7. Token/Cookie

| Cookie | Conteúdo | httpOnly | Secure | SameSite | Expira |
|---|---|---|---|---|---|
| `bb_at` | access token real da API | sim | só em produção | lax | 900s (15 min) |
| `bb_rt` | refresh token real da API | sim | só em produção | lax | 30d / 90d (`rememberMe`) |
| `bb_rm` | `"1"`/`"0"` — lembra a escolha de `rememberMe` para a renovação silenciosa manter a duração certa | sim | só em produção | lax | igual a `bb_rt` |

Nenhum dado sensível (senha, cookie de terceiros) é logado — os serviços de auth do Web só logam erros genéricos (mesma disciplina do Sprint 03 para a API).

---

## 8. Proteção de Rotas

`proxy.ts`: rota protegida sem `bb_at`/`bb_rt` → redireciona para `/login?from=<rota>`; `/login` com sessão já presente → redireciona para `/biobook`. **Comprovado com `curl` real** contra o dev server e contra `next start` (produção): `307` com `Location: /login?from=%2Fbiobook` em ambos os modos.

Defesa em profundidade: mesmo que a checagem otimista do Proxy fosse contornada, toda chamada de dado real passa por `/api/proxy/*`, que independentemente rejeita com `401` sem cookie de sessão — a segurança de verdade nunca depende só do redirect de navegação (consistente com o aviso da própria doc do Next: *"Always verify credentials before granting access. Do not rely on proxy alone."*).

---

## 9. Identidade

`UserMenu` busca `GET /api/proxy/users/me`, que a API resolve **exclusivamente a partir do token validado** (`@CurrentUser()` no backend, nunca de um `userId` vindo do client) — comprovado com evidência real: chamado com o token de "Sprint05 A", retornou exatamente os dados de A (`id`, `email`, `name`, `role`), nunca aceitando um id diferente.

---

## 10. Autorização

Inalterada — a API continua sendo a única fonte de verdade de autorização (todos os 14 achados dos Sprints 03/04 continuam em vigor, não foram tocados). O Web nunca decide quem pode acessar o quê; só repassa a identidade validada.

---

## 11. Isolamento entre Usuários (evidência real)

Dois usuários reais (`sprint05-a@example.com`, `sprint05-b@example.com`) criados via `POST /auth/register`. A criou um `Patient` privado. Testado através do **próprio caminho Web→API** (`/api/proxy/*`, não a API diretamente):

| Chamada | Resultado |
|---|---|
| A lê o próprio paciente via `/api/proxy/patients/:id` | `200`, dados corretos |
| B tenta ler o paciente de A via `/api/proxy/patients/:id` (mesmo id) | `403 "Acesso negado a este paciente"` |
| Chamada sem cookie nenhum | `401`, a API real nem chega a ser contatada |

---

## 12. Logout

Server Action `logoutAction`: chama `DELETE /auth/logout` com o refresh token (revoga no banco) e limpa os 3 cookies. **Reproduzido com evidência real**: revogado o refresh token de A via a mesma chamada que o action faz; uma tentativa seguinte de usar esse token (via `/api/proxy/*`, simulando um cookie roubado pós-logout) recebeu `401`, e a resposta limpou os cookies (`Set-Cookie` com `Expires` no passado) — a revogação é real no servidor, não só um "esquecimento" client-side.

---

## 13. Refresh / Reload

`ACCESS_TOKEN_MAX_AGE_SECONDS = 900` (15 min) — sem renovação automática, qualquer sessão de uso normal cairia a cada 15 minutos. **Reproduzido com evidência real**: um cookie `bb_at` inválido + `bb_rt` válido, chamado via `/api/proxy/*`, foi renovado silenciosamente (a rota chamou `/auth/refresh` da API, recebeu tokens novos, gravou `Set-Cookie` atualizado, **repetiu a chamada original e retornou 200 com o dado certo** — tudo em uma única requisição do ponto de vista do navegador). F5/reload continua funcionando pois o cookie sobrevive a reloads (só é limpo em logout ou refresh-falho).

---

## 14. Erros de Autenticação

| Cenário | Comportamento |
|---|---|
| Credencial inválida | Mensagem genérica da API ("Credenciais inválidas") — não distingue e-mail inexistente de senha errada (anti-enumeração, herdado da API, Sprint 03). |
| Conta bloqueada/inativa | Mensagem da API ("Conta bloqueada ou inativa") repassada sem mascarar — achado do Sprint 03 agora visível no formulário de login. |
| API indisponível/timeout | `apiLogin` captura a exceção e retorna mensagem genérica ("Não foi possível conectar à API. Tente novamente.") — nunca expõe stack trace/detalhe interno. |
| 429 (rate limit de login, 5/15min) | Mensagem da API repassada como está. |
| Sessão expirada em uso | `401` da API → `/api/proxy` tenta renovar; se falhar, `401` final + cookies limpos — a próxima navegação cai no Proxy e volta para `/login`. |

---

## 15. Segurança

- Token **nunca** em `localStorage`/`sessionStorage`/variável global — só em cookie `httpOnly` (inacessível a JS, portanto a um ataque XSS).
- Nenhum secret de servidor em `NEXT_PUBLIC_*` — a única variável pública é a URL base da API (não é segredo).
- `Secure` ligado automaticamente em produção (`NODE_ENV==='production'`) — testado nos dois branches via teste unitário dedicado.
- `SameSite=lax` — mitiga CSRF básico (cookie não é enviado em navegação cross-site de terceiros iniciando requisições state-changing).
- `userId`/identidade **nunca** decidida no client — sempre resolvida no servidor a partir do token (ver §9, §11).
- Senha nunca persiste em nenhum lugar do Web (só passa pelo `FormData` do submit, direto para o Server Action, que a envia à API e descarta).
- `/api/proxy/[...path]` só repassa `Content-Type` do request original ao forward — não copia headers arbitrários do client para a API real, nem da API para o client além do necessário.

---

## 16. CORS

Não alterado (Sprint 04 já validou nos dois sentidos). Como o Web agora fala com a API **só do servidor** (`/api/proxy/*` roda no Node do Next, nunca no browser), a superfície de CORS real é ainda menor do que antes — o navegador só faz requisições same-origin para o próprio Web. Nenhuma regressão testada: suíte Vitest completa (362/362) roda sem tocar CORS.

---

## 17. Testes Automatizados

Vitest é o que este projeto já usa (Playwright/Cypress continuam ausentes — não instalados nesta sprint, conforme a regra "não fabricar infraestrutura enorme só para simular um PASS"). **32 testes novos**, 6 arquivos:

- `lib/auth/session.test.ts` (7) — grava/lê/limpa cookies corretamente, `secure` correto em produção vs. dev, `maxAge` maior com `rememberMe`.
- `app/login/actions.test.ts` (7) — `loginAction`/`logoutAction`: sucesso, credencial inválida, conta bloqueada, `rememberMe`, revogação no logout.
- `proxy.test.ts` (6) — redireciona sem sessão, preserva `?from=`, deixa passar com sessão, `/login` acessível sem sessão e redireciona com sessão.
- `app/api/proxy/[...path]/route.test.ts` (6) — 401 sem cookie sem nem chamar a API, `Authorization: Bearer` anexado corretamente, renovação silenciosa em 401 (com retry e cookies atualizados), sessão limpa quando o refresh também falha, sem tentativa de refresh sem refresh token.
- `app/login/LoginForm.test.tsx` (4) — campos, `type=password`, mensagens de erro (credencial inválida e conta bloqueada) exibidas de verdade.
- `components/UserMenu.test.tsx` (4) — oculto em `/login`, identidade buscada via `/api/proxy/users/me`, oculto quando a sessão é inválida, botão de logout presente.

**Regra de evidência aplicada**: os testes acima são `PASS — executado e comprovado` (Vitest real, com mocks de `next/headers`/`next/navigation` porque essas APIs exigem contexto de requisição do Next.js real, indisponível em ambiente de teste puro — o comportamento *interno* de cada função foi verificado de verdade, não simulado). O fluxo completo de submissão de formulário num navegador real (clique → Server Action → cookie → redirect) é `UNVERIFIED` sem Playwright — mitigado com testes de integração reais via `curl` contra a API e o Web rodando de verdade (ver §11, §12, §13, §19), que comprovam exatamente a mesma cadeia de chamadas que o formulário dispararia, só sem o clique físico.

---

## 18. Regressão

| Suíte | Resultado |
|---|---|
| `apps/api` (Jest) | 261/261 suítes, 3967/3967 testes — **inalterado**, nenhum arquivo de `apps/api` foi tocado nesta sprint |
| `apps/web` (Vitest) | 45/45 arquivos, **362/362 testes** (era 39/329 no Sprint 04 — +6 arquivos, +33 testes: 32 novos + 1 pela correção de lint) |
| TypeScript `apps/web` | 0 erros |
| ESLint `apps/web` | 14 problemas, todos pré-existentes em arquivos não tocados nesta sprint (hooks `useBioCircle`/`useBioTeams`/`useCds`/`useStory`, páginas `oracle`/`simulation`, 2 testes com `any`) — o único achado em código novo desta sprint (`UserMenu.tsx`, regra `react-hooks/set-state-in-effect`) foi corrigido. |

Nenhuma regressão silenciosa — nenhum teste pré-existente foi enfraquecido, removido ou pulado.

---

## 19. Banco/Migrations

Nenhuma migration nova — o schema já suportava tudo (`User.status`, `Session` com rotação/revogação). Confirmado que o Sprint 04 já havia corrigido o drift de migrations; esta sprint reutilizou essa base sem alterá-la.

**Validado com evidência real, não só `/health`**: banco derrubado e recriado do zero (`docker compose down -v` → `up`), `POST /auth/register` falhou com `500` (tabela não existe) antes das migrations — confirmando de novo que `/health` só prova conectividade. Rodado `prisma migrate deploy` (5 migrations, incluindo a de reconciliação do Sprint 04) → `migrate status` limpo → `POST /auth/register` funcionando → Web `proxy.ts` protegendo rota corretamente → `/api/proxy/users/me` retornando a identidade certa, tudo contra o banco recém-migrado.

---

## 20. Produção

Testado nos dois modos disponíveis neste ambiente:
1. `next dev` — usado para toda a evidência de §11–§13, §19.
2. `next start` (build de produção real, `NODE_ENV=production`) — reconfirmado: rota protegida redireciona (`307`), `/api/proxy/users/me` autenticado retorna `200`.

`apps/web` **não tem Dockerfile** neste repositório (só `apps/api` tem) — **BLOCKED/NÃO APLICÁVEL** para "build Docker do Web": não existe imagem a construir. Não foi criado um Dockerfile nesta sprint (fora do escopo "WEB AUTHENTICATION & IDENTITY INTEGRATION" — containerizar o Web é uma decisão de infraestrutura separada). A URL pública de produção real (Vercel/domínio final, se existir) não foi acessada — **BLOCKED**, sem credenciais/acesso a esse ambiente a partir daqui.

---

## 21. Limitações

- **Playwright/Cypress ausentes** — nenhuma interação de clique real em navegador foi automatizada. Mitigado com testes unitários reais das funções server-side + testes de integração via `curl` contra infraestrutura real cobrindo exatamente a mesma cadeia de chamadas.
- **Build Docker do Web**: não aplicável — sem Dockerfile no repositório.
- **Ambiente de produção público**: não acessado — sem credenciais/URL a partir deste ambiente.
- **Página de cadastro (signup)**: não construída — fora do escopo explícito desta sprint (usuários de teste continuam criados via API direta, como em todos os sprints anteriores).
- **Recuperação de senha, MFA, social login**: não implementados — não pedidos nesta sprint, e adicioná-los seria exatamente a "arquitetura não solicitada" que a regra fundamental proíbe.

---

## 22. Status Final

**PASS.**

Todos os critérios de PASS do enunciado foram atendidos com evidência real de execução, não inspeção estática: login real funciona (Server Action comprovado por unidade + a cadeia completa de chamadas comprovada via `curl` real); sessão real funciona (cookies httpOnly, gravação/leitura/limpeza comprovadas); Web → API autenticado funciona (Bearer anexado pelo servidor, nunca pelo client); rotas privadas protegidas (Proxy real + defesa em profundidade no BFF); logout funciona e revoga de verdade no servidor; identidade correta (sempre resolvida a partir do token, nunca de um valor client); autorização correta (herdada intacta dos Sprints 03/04); isolamento entre usuários comprovado com dois usuários reais através do próprio caminho Web→API; testes passam (394 novos+existentes de Web, 261 suítes de API); build passa (Next build + TypeScript + `next start`); nenhuma vulnerabilidade crítica nova foi aberta — pelo contrário, o token deixou de poder ser exposto a JS client-side, o que antes nem existia para ser vulnerável.

Reservas que já eram esperadas e continuam documentadas, não bloqueantes para este PASS: ausência de Playwright (mitigada), ausência de Dockerfile para o Web (fora de escopo), ambiente de produção público não acessado (sem credenciais).

Sprint 06 não foi iniciada automaticamente, conforme instrução.
