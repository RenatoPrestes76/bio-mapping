# BioBoock — Sprint 06.1: Admin Identity & Role Foundation

**Data:** 2026-09-10
**Escopo:** `database/prisma/seed.ts` (correção de defeito CRÍTICO), `apps/api` módulo `identity/users` (cobertura de teste, zero mudança de comportamento), `apps/web` (nova área `/admin`, link condicional no `UserMenu`) — **zero migration**.
**Pré-requisitos:** Sprints 03 (Security, `896b5f9`), 05 (Web Auth, `4562724`), 06 (Registration/Onboarding/Profile, `6b99c92`).

---

## 1. Objetivo

Uma única identidade administrativa: o mesmo usuário BioBoock, autenticado pelo mesmo login e pela mesma sessão dos Sprints 05/06, ganha acesso a uma Área Administrador quando sua conta carrega `role: ADMIN`. Sem segundo sistema de login, sem segunda sessão, sem usuário duplicado, sem autenticação paralela.

---

## 2. Estado Inicial (Auditoria — Fase 1)

A auditoria obrigatória, antes de qualquer código, encontrou que praticamente toda a infraestrutura de autorização já existia:

- **`Role` enum** (`ADMIN | DOCTOR | PROFESSIONAL | PATIENT`) já existe em `database/prisma/schema.prisma`, com `User.role @default(PATIENT)` — nenhuma mudança de schema necessária.
- **`RolesGuard` + `@Roles()`** (`apps/api/src/modules/identity/auth/guards/roles.guard.ts`) já existem, já testados (`roles.guard.spec.ts`, 4 testes), e já aplicados a `UsersController`: `GET /users`, `GET /users/:id`, `PATCH /users/:id/status`, `DELETE /users/:id` — todos `@Roles(Role.ADMIN)` desde antes desta sprint.
- **`GET /users/me`** já retorna `role` no payload.
- Conclusão: a única peça de fato faltando era uma forma **segura** de garantir que existe exatamente 1 conta com `role: ADMIN`, e uma superfície Web mínima que consuma essa identidade.

### Achado CRÍTICO (pré-existente, não introduzido nesta sprint)

`database/prisma/seed.ts` continha um e-mail e uma **senha em texto puro hardcoded no código-fonte** (`admin@biomapping.com` / `Admin123@`), versionados no Git desde o commit `82d4a9f`. Isso viola diretamente a exigência de segurança desta sprint e é o tipo de defeito que a auditoria deveria capturar. Corrigido nesta sprint (ver §8).

---

## 3. Arquitetura

Nenhuma mudança na arquitetura de autenticação/sessão dos Sprints 05/06.

```
Web (/admin, Client Component)
   ↓ fetch same-origin
/api/proxy/[...path] (BFF, Sprint 05 — só anexa Authorization: Bearer)
   ↓
API GET /users (@Roles(Role.ADMIN), RolesGuard — já existente, inalterado)
   ↓
Banco (User.role — já existente, zero migration)
```

Bootstrap do administrador acontece **fora** do runtime da aplicação, via `database/prisma/seed.ts` (script já existente na wiring do projeto, `pnpm --filter @bio/database seed`), nunca via endpoint HTTP novo.

---

## 4. Identidade e Bootstrap

`bootstrapAdmin()` em `seed.ts`, lógica idempotente e não-destrutiva:

1. Lê `BIOBOOCK_ADMIN_EMAIL` / `BIOBOOCK_ADMIN_PASSWORD` de variáveis de ambiente — nunca hardcoded, nunca logadas.
2. `findUnique({ where: { email } })`.
3. **Conta não existe**: cria com `role: ADMIN`, senha com hash `argon2` (mesmo mecanismo do `auth.service.ts`).
4. **Conta existe e já é ADMIN**: não faz nada (nunca sobrescreve senha).
5. **Conta existe e não é ADMIN**: atualiza só a `role` — nunca toca em senha ou outros dados pessoais.

Deliberadamente **não** usa `upsert` com `update: { passwordHash }`, porque isso sobrescreveria a senha de uma conta humana já existente a cada re-execução do seed.

---

## 5. Administração (Web)

`apps/web/src/app/admin/page.tsx` — Client Component mínimo, deliberadamente sem ações de edição/bloqueio/exclusão (fora de escopo desta sprint). Consome `GET /api/proxy/users` (endpoint já existente, já `@Roles(Role.ADMIN)`). Estados: `loading` (skeleton), `forbidden` (403 → mensagem de acesso negado, `role="alert"`), `error` (outras falhas), `ready` (tabela somente leitura nome/email/role/status).

`UserMenu.tsx` — link "Administração" exibido só quando `GET /users/me` retorna `role === 'ADMIN'`. A decisão de exibir o link é só UX; a proteção real está no backend, validada abaixo.

---

## 6. `apps/mobile`

Inspecionado (`ls -la` na raiz do pacote): diretório vazio, zero arquivos além de `.`/`..`. Nenhuma funcionalidade foi inventada. A identidade administrativa é apenas `User.role`, consumida via API HTTP — nada nesta sprint impede que um futuro app mobile reuse a mesma identidade e os mesmos endpoints.

---

## 7. Validação Real (infraestrutura Docker, não leitura estática)

Sequência completa executada de ponta a ponta contra Postgres real em Docker:

**Banco vazio → migrations → bootstrap → login → perfil → `/admin`:**
1. `docker compose down -v` + `docker compose up -d db api` → volume novo, API respondendo em `/health`.
2. `prisma migrate deploy` → 5 migrations pré-existentes aplicadas, "All migrations have been successfully applied." Nenhuma migration nova necessária.
3. Seed executado com credenciais de teste (`sprint061-admin@example.com`) → `Admin bootstrap: conta criada (..., role: ADMIN).`
4. Query direta no Postgres (`docker compose exec db psql`) confirmou **1 linha**, `role = ADMIN`.
5. Seed executado **2 vezes adicionais** (uma com a mesma senha, uma com senha diferente) → ambas retornaram `"conta já existe e já é ADMIN. Nada a fazer."`. Query direta reconfirmou: **1 linha**, mesma senha (nunca sobrescrita).
6. `POST /auth/login` real com a credencial do admin → `200`, `role: "ADMIN"` no payload.
7. `GET /users/me` com o token do admin → `200`, identidade correta.
8. `POST /profiles` + `GET /profiles/me` com o token do admin → `201`/`200` — perfil pessoal funciona normalmente, mesmo `userId` da conta administrativa.
9. `GET /users?page=1&limit=20` com o token do admin → `200`, lista real de usuários.

**Isolamento (segundo usuário real, `sprint061-user@example.com`, role `PATIENT`):**
10. `POST /auth/register` → conta criada com `role: PATIENT` (default, nunca `ADMIN`).
11. `GET /users/me` (próprio) → `200`. `POST /profiles` (próprio) → `201`. Perfil pessoal funciona normalmente para usuário comum.
12. `GET /users?page=1&limit=20` com o token do usuário comum → **`403 Forbidden resource`**.
13. `GET /users` e `GET /users/me` **sem token** → **`401 Unauthorized`** em ambos, nenhum dado vazado no corpo da resposta.
14. Tentativa de forjar `role` no corpo de `PATCH /users/me` (`{"role":"ADMIN"}`) → **`400`**, `"property role should not exist"` (DTO com whitelist rejeita o campo antes de qualquer lógica de negócio). `GET /users/me` confirmado em seguida: `role` continua `PATIENT`.
15. Logout do admin (`DELETE /auth/logout` com o refresh token) → `204`. Reuso do mesmo refresh token em `POST /auth/refresh` → `401 "Refresh token inválido ou expirado"` — sessão efetivamente revogada.

**Web real (servidor `next dev` na porta 3001, contra a mesma API Docker):**
16. `/admin` sem cookie de sessão → `307` redirect para `/login?from=%2Fadmin` (proteção de rota via `proxy.ts`).
17. `GET /api/proxy/users` sem cookie → `401` via BFF.
18. `/admin` com cookie `bb_at` do admin → `200`, `GET /api/proxy/users` com o mesmo cookie → `200` com a lista real (2 usuários).
19. `/admin` com cookie `bb_at` do usuário comum → `200` (rota carrega — o filtro real é o passo seguinte), `GET /api/proxy/users` com o mesmo cookie → `403`, sem vazamento de dados.
20. `/profile` com cookie do usuário comum → `200` — fluxo pessoal segue funcionando sem qualquer interferência da Área Administrador.

Todos os 10 itens da lista de testes obrigatória da Seção 11 da especificação foram exercidos com HTTP real, não inferidos por leitura de código.

Infraestrutura desligada ao final: processo `next dev` finalizado, `docker compose down -v` executado (containers, rede e volumes removidos).

---

## 8. Defeito Corrigido: Senha Hardcoded no Seed

`database/prisma/seed.ts` tinha e-mail/senha de admin em texto puro no código-fonte desde `82d4a9f`. Reescrito para:
- Ler credenciais exclusivamente de `BIOBOOCK_ADMIN_EMAIL`/`BIOBOOCK_ADMIN_PASSWORD` (documentadas, vazias, em `.env.example`).
- Nunca logar a senha (só e-mail e role nas mensagens de console).
- Hash via `argon2` antes de persistir — nunca texto puro no banco.
- Nunca sobrescrever a senha de uma conta já existente.

**Reserva de segurança**: remover a senha do arquivo atual não remove `Admin123@` do histórico do Git. Reescrita de histórico é uma ação destrutiva fora do escopo autorizado desta sprint — não foi feita. Se essa senha foi usada em qualquer ambiente real (não apenas nos testes desta sprint, que usaram credenciais próprias descartáveis), ela deve ser considerada comprometida e rotacionada pelo responsável do projeto.

---

## 9. Testes Automatizados

- `apps/api`: `npx jest --silent` → **261/261 suítes, 3973/3973 testes** (Sprint 06 baseline: 3972/3972 — +1 teste novo de `findAll()` em `users.controller.spec.ts`, cobrindo a rota que a Área Administrador do Web passou a consumir).
- `apps/web`: `npx vitest run` → **50/50 arquivos, 385/385 testes** (Sprint 06 baseline: 379/379 — +6: 4 para `admin/page.tsx`, 2 para o link condicional em `UserMenu.tsx`).
- `apps/api`: `npx tsc --noEmit` — diff contra baseline pré-sprint (técnica de normalização + `comm -13`) → **zero erros novos** (110 pré-existentes, idênticos ao baseline de sprints anteriores).
- `apps/web`: `npx tsc --noEmit` → zero erros.
- `database`: `npx tsc --noEmit` → zero erros (valida o `seed.ts` reescrito).
- `apps/web`: `npx next build` → sucesso, 18 rotas totais, `/admin` listada como nova rota estática (`○`).

---

## 10. Segurança

- Senha do admin: nunca em código-fonte, migrations, seed versionado, README, testes, commits, logs ou `NEXT_PUBLIC_*`. Hash `argon2`, nunca texto puro.
- Autorização: `role` persistida no banco, lida do JWT validado no backend — nunca de `if (email === ...)`, nunca de valor enviado pelo client (provado no item 14 do §7: tentativa de forjar `role` é rejeitada com `400` antes de qualquer lógica).
- Rotas administrativas: `403` para autenticado-não-admin, `401` para não-autenticado, em ambos os casos sem vazamento de dado no corpo.
- Sessão: 100% reusada do Sprint 05 — mesmos cookies `httpOnly`/`Secure`(produção)/`SameSite=lax`, mesmo refresh token, mesmo logout, mesmo BFF. Nenhum mecanismo novo.
- Isolamento: validado com 2 contas reais (`ADMIN` e `PATIENT`), não com mocks.

---

## 11. Reservas

1. Senha antiga (`Admin123@`) permanece no histórico do Git (commit `82d4a9f`) — reescrita de histórico não realizada (destrutiva, fora do escopo autorizado). Rotação recomendada se usada em ambiente real.
2. `GET /users/:userId/avatar` (endpoint pré-existente do módulo `profiles`, não tocado nesta sprint) não exige ownership — mesma exposição documentada desde o Sprint 06. Não relacionado à identidade administrativa; citado aqui apenas porque foi revisitado durante a auditoria.

---

## 12. Bloqueios

Nenhum.

---

## 13. Status Final

**PASS.** Identidade única, sessão única, sem duplicação, autorização validada no backend com evidência HTTP real (ADMIN, usuário comum e anônimo), defeito crítico de segurança pré-existente corrigido, zero regressão, zero migration.
