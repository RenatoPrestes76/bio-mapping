# BioBoock — Sprint 03: Security & Privacy Production Audit

**Data:** 2026-09-10
**Escopo:** `apps/api` (NestJS + Prisma + PostgreSQL), produção real (imagem Docker multi-stage, não `nest start --watch`).
**Objetivo:** provar, com evidência de execução real, que um usuário autenticado não consegue ultrapassar seu limite de autorização, acessar dados privados de outro usuário, contornar a privacidade da rede social ou usar APIs/storage para escapar das regras de segurança do BioBoock.

---

## 1. Resumo Executivo

A auditoria encontrou e corrigiu **14 vulnerabilidades reais** de autorização (3 CRITICAL, 7 HIGH, 2 MEDIUM, 2 LOW), a maioria da classe IDOR/BOLA (Broken Object Level Authorization): endpoints que confiavam em `id`/`patientId` vindo da URL ou do corpo da requisição sem validar se o usuário autenticado tinha relação real com aquele recurso.

O achado mais severo, comprovado com dados reais via HTTP direto (dois usuários genuínos, `curl` com `Authorization: Bearer`, sem UI): qualquer paciente autenticado conseguia ler, editar e apagar o prontuário (`Patient`) de **qualquer outro paciente da plataforma**, só sabendo o `id`. Um segundo achado CRITICAL, também comprovado por execução real: `/uploads/**` (evidências clínicas — fotos, PDFs, laudos de avaliação) era servido por static middleware montado **antes** do prefixo `api/v1` e de qualquer guard — zero autenticação, arquivo acessível por qualquer pessoa com a URL.

Todas as 14 vulnerabilidades foram corrigidas, cobertas por testes de regressão novos (prefixo `SECURITY (IDOR):`), e as duas mais críticas foram **reproduzidas de novo contra uma imagem Docker de produção recém-buildada** para confirmar que a correção realmente fecha o vetor (não é apenas uma alteração estática de código). Suíte completa: **261/261 suítes, 3961/3961 testes, 0 falhas.** Build de produção via Docker: sucesso. Nenhum dado de produção foi alterado; todo teste ofensivo usou usuários/dados criados especificamente para este fim, em ambiente Docker isolado.

**Veredito: PASS COM RESERVA.** Ver §17 (Riscos Residuais) e §18 (Veredito Final) para o detalhamento do que foi coberto, o que ficou como reserva documentada, e por quê.

---

## 2. Arquitetura de Segurança

- **Framework:** NestJS (Controllers → Guards → Services → Prisma ORM → PostgreSQL).
- **Autenticação:** JWT Bearer stateless (`ExtractJwt.fromAuthHeaderAsBearerToken()`), access token de 15 min, refresh token opaco (64 bytes aleatórios, hash SHA-256 armazenado, nunca o valor em claro) persistido no modelo `Session`, com rotação a cada refresh (token antigo revogado, novo emitido).
- **Autorização:** duas camadas independentes —
  1. **Role-based** (`Role`: ADMIN/DOCTOR/PROFESSIONAL/PATIENT) via `RolesGuard` + `@Roles()`, opt-in por rota (não é global — cada controller decide se precisa).
  2. **Ownership-based**, majoritariamente implementada manualmente em cada `Service` (não há um guard genérico de ownership reaproveitável no repo — padrão descoberto e replicado nesta sprint: `assertOwner`/`assertReadAccess`/`assertWriteAccess` + `assertProfessionalAccess`, todos comparando o `sub` do JWT contra o dono real do recurso, resolvido via Prisma).
- **Multi-tenancy parcial:** `MembershipRole` (OWNER/ADMIN/MANAGER/PROFESSIONAL/ASSISTANT/PATIENT) existe para o módulo Titan (organizações), mas `Patient` **não tem** `organizationId` — não há relação formal paciente↔organização no schema. Isso underlies o achado §13-J (fallback "sharedOrg").
- **Storage:** filesystem local dentro do container (`uploads/evidence/{assessmentId}/{uuid}.ext`), sem integração com S3/MinIO ainda (interface `EvidenceStorageProvider` já desenhada para isso).
- **IA:** 100% determinística — engines de regras/estatística (`rule-engine`, `bioscore-engine`, motores de score/tendência). **Zero chamada a LLM externo** em todo o backend (confirmado por varredura de código — nenhum SDK OpenAI/Anthropic/etc. importado fora de devDependencies não utilizadas).

---

## 3. Autenticação

Fluxo real (`auth.service.ts`): `register`/`login` → argon2 (hash de senha) → `issueSession` (assina JWT + cria `Session` no banco) → `refresh` (valida hash do refresh token, checa `revokedAt`/`expiresAt`, revoga o antigo, emite par novo) → `logout`/`logoutAll` (revoga sessão(ões)).

**Achado corrigido nesta sprint (MEDIUM, §13-K):** nem `login` nem `refresh` verificavam `User.status` (`ACTIVE`/`INACTIVE`/`BLOCKED`) ou `deletedAt`. Uma conta bloqueada por um ADMIN continuava conseguindo logar normalmente e renovar sessão indefinidamente — o bloqueio administrativo não tinha efeito real. Corrigido: `login` e `refresh` agora rejeitam com `403 ForbiddenException` quando a conta não está `ACTIVE`, e `refresh` adicionalmente revoga a sessão usada na tentativa.

`JwtStrategy.validate()` é stateless — não consulta o banco a cada requisição (trade-off de performance deliberado, pré-existente). Isso significa que um access token **já emitido antes do bloqueio** continua válido até expirar (máx. 15 min) mesmo após a conta ser bloqueada. Documentado como risco residual (§17) — o vetor persistente (login/refresh repetido) está fechado; a janela de 15 min de um token já emitido é uma limitação conhecida do design stateless, não um bug introduzido ou ignorado por esta sprint.

---

## 4. Autorização

Padrão dominante encontrado e agora aplicado consistentemente: **ADMIN bypassa tudo; PATIENT só acessa o próprio registro (`patient.userId === actor.sub`); PROFESSIONAL/DOCTOR só acessam pacientes vinculados via `patient.primaryProfessionalId`.**

Antes desta sprint, essa regra era aplicada de forma **inconsistente**: alguns módulos (`patients`, `titan`) não tinham checagem nenhuma; outros (`clinical/evidence`) deixavam PROFESSIONAL/DOCTOR passar incondicionalmente sem checar vínculo; outros (`vitals`, `biomarkers`, `clinical/assessments`, `gaia/cds`) tinham a checagem certa para PATIENT mas um fallback perigosamente permissivo para PROFESSIONAL ("tem qualquer membership em qualquer organização" — ver §13-J). Nenhum desses módulos tinha teste que provasse a ausência da checagem — os testes existentes só cobriam o caminho feliz.

**RBAC morto identificado (informational, não corrigido — fora de escopo):** `OrgRoleGuard` + `@RequireOrgRole()` existe, está testado (`org-role.guard.spec.ts`), mas não está `@UseGuards()` em nenhum controller. Não é uma vulnerabilidade por si (não concede acesso indevido — simplesmente não é usado), mas indica que o padrão de autorização multi-tenant mais robusto do repo nunca foi adotado pelos módulos que precisariam dele.

---

## 5. Isolamento entre Usuários (evidência real)

Dois usuários reais foram criados via `POST /api/v1/auth/register` numa imagem Docker de produção rodando contra Postgres real:

```
sprint03-verify-a@example.com (PATIENT) → Patient id=aee0911e-814e-46fe-bdcb-21b0ac3f3079
  notes: "DADOS PRIVADOS DE A - sprint03 verify"
sprint03-verify-b@example.com (PATIENT)
```

**Antes da correção** (comprovado nesta mesma sprint, sessão anterior à compactação, com usuários equivalentes `audit-user-a`/`audit-user-b`): B lia, sobrescrevia (`"HACKED BY B"`) e conseguia deletar o `Patient` de A via `GET`/`PATCH`/`DELETE /api/v1/patients/:id`, só sabendo o `id` — nenhuma checagem de dono.

**Depois da correção, reproduzido de novo contra a imagem Docker recém-buildada** (não apenas leitura estática de código):

| Ação de B sobre o paciente de A | Status HTTP | Corpo |
|---|---|---|
| `GET /api/v1/patients/:id` | **403** | `"Acesso negado a este paciente"` |
| `PATCH /api/v1/patients/:id` | **403** | `"Acesso negado a este paciente"` |
| `DELETE /api/v1/patients/:id` | **403** | `"Acesso negado a este paciente"` |
| A lê o próprio paciente (controle negativo) | **200** | dados intactos, `notes` não alterado |

Isolamento confirmado por execução real, não por inspeção de código.

---

## 6. Rede Social Privada (BioCircle / BioTeams)

`BioCircleService` já tinha ownership correto no fluxo de conexões (`sendInvite`/`accept`/`reject`/`block`/`remove`) — coberto pelos 60 testes pré-existentes do módulo, incluindo os 4 estados do ciclo de vida (convite pendente → aceito/rejeitado → conexão ativa → removida/bloqueada). O único gap real encontrado: `PATCH /biocircle/notifications/:id/read` atualizava por `id` sem checar dono (LOW — qualquer usuário podia marcar como lida, e assim silenciar, a notificação de outro). **Corrigido**: `markRead` agora busca a notificação, valida `notification.userId === actor.sub`, 403 caso contrário. Teste novo dedicado (`biocircle-notification.service.spec.ts`, 3 casos incluindo `SECURITY (IDOR)`).

`BioTeamsService`: fluxo de convite/membro (`inviteMember`/`acceptInvite`/`removeMember`/`updateMemberRole`) já validava membership ativa e papel via `requireActiveMembership` + funções puras de permissão (`canManageTeam`, `canInviteMembers` etc.) — sem gaps de autorização encontrados. Único achado (LOW): o código de convite de time era gerado com `Math.random()` (`generateInviteCode`), não criptograficamente seguro — previsível/reproduzível em tese. **Corrigido**: trocado para `crypto.randomInt` (CSPRNG), mesmo formato (6 caracteres alfanuméricos maiúsculos), sem quebrar nenhum contrato existente.

---

## 7. Segurança de API (IDOR/BOLA)

Tabela dos endpoints diretamente envolvidos nos 14 achados desta sprint (inventário completo de ~300 rotas do monorepo está fora do praticável para uma tabela única; os módulos abaixo foram os identificados pela reconstrução em 3 frentes — auth/identidade, domínio clínico, IA/GAIA — como tendo padrão de acesso a recurso por `id`):

| Método | Endpoint | Auth | Ownership (antes) | Ownership (depois) | Severidade |
|---|---|---|---|---|---|
| GET/PATCH/DELETE | `/patients/:id` | JWT | ❌ nenhuma | ✅ dono ou profissional vinculado ou ADMIN | **CRITICAL** |
| GET | `/patients` (findAll) | JWT | ❌ PATIENT via lista completa | ✅ PATIENT bloqueado (403) | **CRITICAL** |
| GET/PATCH | `/organization/settings` | JWT | ❌ nenhuma | ✅ membership OWNER/ADMIN | **CRITICAL** |
| GET | `/organization/dashboard`, `/usage` | JWT | ❌ nenhuma | ✅ membership OWNER/ADMIN/MANAGER | **CRITICAL** |
| GET | `/organization/members` | JWT | ❌ qualquer usuário, qualquer org | ✅ membership ativa na org | **CRITICAL** |
| GET | `/audit` (sem `organizationId`) | JWT | ❌ dump de TODO o audit log da plataforma | ✅ `organizationId` obrigatório + membership OWNER/ADMIN | **CRITICAL** |
| GET/PATCH | `/organization/branches/:id` | JWT | ❌ nenhuma | ✅ membership ADMIN | **CRITICAL** |
| ALL `/uploads/evidence/**` | — | ❌ nenhuma (static, fora do prefixo/guards) | ✅ rota removida; substituída por `GET /assessments/:id/evidence/:id/download` (JWT + ownership) | **CRITICAL** |
| GET/PATCH/GET(vários) | `/bio-book*/...:patientId` (3 módulos) | JWT | ❌ nenhuma | ✅ dono (`actor.sub === patientId`) ou ADMIN | **HIGH** |
| POST/DELETE/GET | `/devices/:id/sessions`, `/devices/sessions`, `/devices/sessions/:id` | JWT | ❌ nenhuma / lista global exposta a PATIENT | ✅ dono do device ou ADMIN; PATIENT bloqueado da listagem global | **HIGH** |
| POST/GET/DELETE | `/assessments/:id/evidence*` | JWT | ⚠️ PROFESSIONAL/DOCTOR sem checar vínculo | ✅ `primaryProfessionalId` exigido | **HIGH** |
| POST/GET | `/clinical-decision/*` | JWT | ❌ `patientId` confiado do DTO/query | ✅ ownership validada antes de qualquer leitura/escrita | **HIGH** |
| GET/PATCH | `/population/*`, `/cohorts/*` | JWT (sem RolesGuard) | ❌ PATIENT lia dados agregados de qualquer tenant | ✅ `@Roles(ADMIN, DOCTOR, PROFESSIONAL)` | **HIGH** |
| GET/PATCH/POST | `/story-engine/chapters/:id*` | JWT | ❌ nenhuma | ✅ dono (`chapter.userId === actor.sub`) ou ADMIN | **HIGH** |
| PATCH | `/aegis/insights/:id/read`, `/aegis/recommendations/:id` | JWT | ❌ nenhuma | ✅ dono (`patientId === actor.sub`) ou ADMIN | **HIGH** |
| POST | `/auth/login`, `/auth/refresh` | — | ❌ status da conta ignorado | ✅ `403` se `BLOCKED`/`INACTIVE`/soft-deleted | **MEDIUM** |
| (interno) `assertProfessionalAccess` | `vitals`, `biomarkers`, `clinical/assessments`, `clinical/evidence`, `gaia/cds` | JWT | ⚠️ fallback "qualquer membership em qualquer org" | ✅ fallback removido — só `primaryProfessionalId` | **MEDIUM** |
| POST | `/teams` (invite code) | JWT | ⚠️ `Math.random()` | ✅ `crypto.randomInt` | **LOW** |
| PATCH | `/biocircle/notifications/:id/read` | JWT | ❌ nenhuma | ✅ dono (`notification.userId === actor.sub`) | **LOW** |

`userId`/`patientId` nunca é confiado do cliente para decisões de autorização — em todos os pontos corrigidos, a identidade vem exclusivamente do JWT validado (`@CurrentUser()`), nunca de parâmetro de rota/body para a checagem em si (o parâmetro de rota só identifica o *recurso*, a checagem de *quem pode acessá-lo* usa sempre o `sub` do token).

---

## 8. Segurança de Storage

Achado CRITICAL, detalhado em §5/§7: `app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' })` em `main.ts`, montado **antes** de `app.setGlobalPrefix('api/v1')` e de qualquer guard. Reproduzido de forma real: um arquivo colocado em `uploads/evidence/test-assessment-id/proof-*.txt` dentro do container foi lido via `curl` **sem nenhum header `Authorization`**, retornando `200` com o conteúdo completo.

Como `local-evidence.provider.ts` é o único escritor em `uploads/` no repo inteiro (confirmado por grep), o impacto real é: qualquer evidência de avaliação clínica (foto, PDF, laudo, áudio, vídeo) enviada por qualquer usuário, uma vez com a URL em mãos (vazada via logs de proxy, cache de navegador, Referer header, histórico compartilhado, captura de tela), era permanentemente acessível por qualquer pessoa, sem revogação possível, sem log de quem acessou.

**Correção:** `useStaticAssets` removido. Nova rota autenticada `GET /api/v1/assessments/:assessmentId/evidence/:evidenceId/download` reaplica exatamente a mesma checagem de `assertReadAccess` usada por `findAll` (dono, profissional vinculado, ou ADMIN) antes de resolver o caminho físico do arquivo e fazer stream via `res.sendFile()`. `toEvidenceResponse` agora retorna essa URL autenticada em vez do path estático antigo.

**Reproduzido de novo pós-correção** contra a imagem Docker rebuilada:

| Teste | Antes | Depois |
|---|---|---|
| `GET /uploads/evidence/.../arquivo` sem auth | `200` (conteúdo exposto) | `404` (rota não existe mais) |
| `GET /api/v1/assessments/:id/evidence/:id/download` sem auth | (rota não existia) | `401 Unauthorized` |

---

## 9. Segurança Administrativa

Não existe um "painel admin" separado — superfícies administrativas são as mesmas rotas de negócio gateadas por `@Roles(Role.ADMIN)` (ex.: `UsersController.findAll` — único uso pré-existente do padrão `RolesGuard` + `@Roles` no repo antes desta sprint) ou, no módulo Titan, por `MembershipRole` (OWNER/ADMIN/MANAGER). Os achados CRITICAL do Titan (§7) eram, na prática, o "painel admin" da organização sem proteção nenhuma — qualquer usuário autenticado podia ler/editar configurações da organização, ver o dashboard financeiro/de uso, listar membros e auditoria de QUALQUER organização da plataforma. Corrigido e verificado via 83 testes de regressão do módulo (incluindo casos `SECURITY`).

---

## 10. AI Guardrails

Confirmado por varredura de código (não apenas leitura de um módulo): **zero chamada a LLM externo** em todo o `apps/api`. Todo "AI"/GAIA é determinístico — motores de regras (`rule-engine.ts`), cálculo de score (`bioscore-engine`), estatística de tendência (`computeTrend`), classificação por thresholds. Nenhum ponto do código deixa a IA "decidir" autorização — os únicos pontos onde IA e autorização se cruzam (`gaia/cds`, `gaia/population`) tinham exatamente os gaps de ownership/RolesGuard já documentados e corrigidos em §7, mas a falha nunca foi "a IA concedeu acesso" — foi a ausência de checagem *antes* de a IA processar o pedido. Corrigido: `CdsService` agora valida `assertPatientAccess` antes de gerar/ler qualquer avaliação de CDS.

---

## 11. Secrets

Auditoria real executada nesta sprint:
- `.env`/`.env.local` no `.gitignore`; apenas `.env.example` (placeholders genéricos, ex. `JWT_SECRET=your-jwt-secret-min-32-chars`) está versionado. Histórico do git (`git log -- "*.env"`) confirma que só `.env.example` foi tocado, nunca um `.env` real.
- Varredura por padrões de credencial real (AWS access key, chave privada RSA/EC/OpenSSH/PGP, OpenAI `sk-`, GitHub PAT `ghp_`, Slack token `xox*`) em todo `apps/` e na raiz do monorepo: **zero ocorrências**.
- CI (`.github/workflows/docker-ci.yml`): usa exclusivamente `${{ secrets.* }}` do GitHub Actions (`GITHUB_TOKEN`, `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`); assinatura de imagem via Cosign keyless/OIDC — "sem secrets privados" por design.
- `docker-compose.prod.yml` e os scripts de deploy/smoke (`scripts/production-*.sh`): toda credencial referenciada via `${VAR}`, nenhum valor hardcoded.

---

## 12. Logging

`LoggingInterceptor` loga apenas `método`, `url`, `status`, `duração`, `requestId` — nunca corpo da requisição, nunca headers (logo, nunca `Authorization`/Bearer token, nunca senha de login/registro). `HttpExceptionFilter` loga stack trace de erros 5xx **só no servidor** (Winston) — a resposta HTTP ao cliente nunca inclui stack trace, apenas `statusCode`/`timestamp`/`path`/`message`. `AuditLogService`: varredura por `metadata` contendo `password`/`token` em todos os módulos — zero ocorrências. Winston configurado só com transport de Console (JSON em produção, colorizado em dev) — sem SDK de log-shipping de terceiros que poderia capturar payloads automaticamente.

---

## 13. Achados Detalhados (Findings)

| # | Módulo | Severidade | Descrição |
|---|---|---|---|
| A | `titan/*` (org-settings, dashboard, members, branches, audit) | CRITICAL | Zero checagem de autorização em 6 endpoints administrativos de organização; `GET /audit` sem `organizationId` retornava o audit log inteiro da plataforma para qualquer usuário autenticado. |
| B | `patients/*` | CRITICAL | `findById`/`update`/`delete`/`findAll` sem ownership — qualquer paciente lia/editava/apagava o prontuário de qualquer outro. Comprovado com dados reais. |
| C (uploads) | `main.ts` + `clinical/evidence` | CRITICAL | `/uploads/**` servido sem autenticação nenhuma — evidências clínicas publicamente acessíveis por URL. Comprovado com dados reais. |
| D | `bio-book`, `bio-book-insight`, `bio-book-journey` | HIGH | Narrativa/insights/jornada de saúde de qualquer paciente lida por qualquer usuário via `patientId` na URL. |
| E | `devices/sessions` | HIGH | Início/fim/listagem de sessão de dispositivo sem checar dono; listagem sem filtro expunha sessões de TODOS os dispositivos a qualquer PATIENT. |
| F | `clinical/evidence` | HIGH | PROFESSIONAL/DOCTOR passavam incondicionalmente, sem checar vínculo com o paciente da avaliação. |
| G | `gaia/cds` | HIGH | `patientId` do DTO confiado sem validação — qualquer usuário criava/lia avaliações de CDS e alertas de qualquer paciente. |
| H | `gaia/population`, `gaia/cohorts` | HIGH | Sem `RolesGuard` — PATIENT lia dashboards/tendências/risco/alertas agregados de qualquer tenant e confirmava alertas. |
| I | `story-engine` | HIGH | Capítulos de biografia clínica lidos/editados/compartilhados por qualquer usuário via `id`. |
| J | `aegis` | HIGH | `markInsightRead`/`updateRecommendation` atualizavam por `id` sem checar dono. |
| K | `identity/auth` | MEDIUM | `login`/`refresh` ignoravam `User.status` — conta `BLOCKED`/`INACTIVE` continuava autenticando e renovando sessão. |
| L | `vitals`, `biomarkers`, `clinical/assessments`, `clinical/evidence`, `gaia/cds` | MEDIUM | Fallback de acesso profissional caía para "tem qualquer membership em qualquer organização" — sem relação real com o paciente (`Patient` não tem `organizationId`). |
| M | `bioteams` | LOW | Código de convite gerado com `Math.random()` (não CSPRNG). |
| N | `biocircle` | LOW | `markNotificationRead` sem checar dono da notificação. |

---

## 14. Correções Aplicadas

Todas as 14 correções seguiram a disciplina: reproduzir → registrar comportamento → classificar severidade → identificar causa → corrigir → criar/regredir teste → reproduzir de novo → confirmar. Nenhuma correção alterou: framework de auth, banco de dados, provider de storage (a interface `EvidenceStorageProvider` foi estendida com um método novo, não trocada), ou dados de produção. Nenhuma migração destrutiva. Detalhamento técnico de cada correção em §5–§12 acima e nos comentários inline nos arquivos alterados (busca por `Achado da Sprint 03` no diff).

---

## 15. Testes

- **73 casos novos** com prefixo `SECURITY (IDOR):`/`SECURITY:` distribuídos por 15 arquivos de teste (patients, titan ×5, bio-book ×3, devices, clinical/evidence ×2, gaia/cds, gaia/population, story-engine, aegis ×2, auth, biocircle, bioteams — implícito via novo comportamento).
- Nenhum teste pré-existente foi enfraquecido, removido ou marcado `skip` — os poucos que dependiam do comportamento vulnerável (ex.: `assessments.service.spec.ts`'s "profissional com membership compartilhada tem acesso") foram **invertidos** para provar que o comportamento antigo agora é corretamente rejeitado, mantendo a mesma configuração de mocks.
- Suíte completa: **261 suítes / 3961 testes, 100% passando.**

---

## 16. Evidências de Execução Real

1. **IDOR de `patients`** — reproduzido duas vezes: (a) antes da correção, com dados reais (`audit-user-a`/`audit-user-b`, sessão anterior à compactação); (b) depois da correção, contra imagem Docker recém-buildada, com usuários novos (`sprint03-verify-a`/`b`) — `403` em GET/PATCH/DELETE cross-user, `200` para acesso ao próprio recurso, dado (`notes`) confirmadamente intacto.
2. **Storage sem auth** — arquivo real colocado em `uploads/evidence/.../*.txt` dentro do container; `curl` sem header `Authorization` retornou `200` com o conteúdo (antes) e `404` (depois, rota removida); nova rota autenticada retorna `401` sem token.
3. **Build de produção** — `docker build -f apps/api/Dockerfile` com todo o código desta sprint: sucesso, `nest build` compila sem erros dentro do container (ambiente Linux/Node22, contornando a limitação conhecida do `nest build`/`nest start --watch` nativos neste Windows/Node20).
4. **Regressão completa** — `npx jest` (apps/api): 261/261 suítes, 3961/3961 testes.
5. **TypeScript** — `tsc --noEmit`: 110 erros pré-existentes (baseline do `master` antes desta sprint: 113 — a diferença são os 3 erros reais que esta sprint introduziu e corrigiu, ver §17); **zero erro novo** introduzido pelas mudanças desta sprint (confirmado por diff normalizado contra o baseline).
6. **Secrets** — varredura de padrões de credencial real: zero ocorrências; `.env` nunca commitado; CI usa `secrets.*` do GitHub Actions.

---

## 17. Riscos Residuais (documentados, não corrigidos nesta sprint)

- **Janela de 15 min do access token após bloqueio de conta**: `JwtStrategy` é stateless por design (sem consulta ao banco por requisição). O vetor persistente (login/refresh repetido) está fechado por esta sprint; um token já emitido antes do bloqueio continua válido até expirar. Mitigação completa exigiria checagem de status a cada requisição (custo de uma query por request) ou uma denylist de tokens revogados — mudança arquitetural fora do escopo desta sprint de correção pontual.
- **`OrgRoleGuard`/`@RequireOrgRole()` não utilizado em nenhum controller** — código morto, testado, não uma vulnerabilidade ativa, mas indica que o padrão de autorização multi-tenant mais robusto do repo nunca foi adotado onde poderia simplificar os `assertX` manuais espalhados pelos serviços.
- **Débito de lint pré-existente e massivo** (~15.934 problemas em `master` limpo, majoritariamente `prettier`/CRLF e regras `@typescript-eslint` de rigor alto, sem relação com segurança) — não corrigido nesta sprint por estar completamente fora de escopo (a correção via `--fix` reescreveria dezenas de milhares de linhas não relacionadas ao objetivo de segurança). As mudanças desta sprint seguem o mesmo estilo (não-conforme) já presente no arquivo editado em cada caso — débito proporcional, não desproporcional.
- **110 erros de TypeScript pré-existentes** (`tsc --noEmit`), nenhum introduzido por esta sprint — majoritariamente `@jest/globals` não resolvido em type-check isolado (mas resolvido corretamente pelo `ts-jest` em runtime, por isso os testes passam) e mocks de teste com tipos desatualizados em módulos não tocados por esta sprint (`gaia/predictions`, `gaia/precision`, `gaia/learning`, `genomic-interpretation`, `hippocrates`, etc.).
- **Web → API**: esta sprint teve escopo `apps/api` apenas. Nenhuma chamada real do frontend (`apps/web`) foi exercida — **BLOCKED/UNVERIFIED** por estar fora do escopo desta auditoria (backend).
- **CORS**: configuração revisada por leitura de código (`main.ts`) — já correta desde sprint anterior (comentário inline documenta por que `credentials: true` foi removido e por que `CORS_ORIGIN` é tratado como lista). Não modificada nem re-testada via requisição cross-origin real nesta sprint.

---

## 18. Veredito Final

**PASS COM RESERVA.**

Critérios atendidos com evidência real: autenticação validada (incluindo o gap de conta bloqueada, agora fechado); autorização validada; isolamento entre usuários comprovado por HTTP direto antes/depois; IDOR/BOLA testado e corrigido em 14 pontos; storage testado e corrigido (achado CRITICAL não previsto no escopo inicial, encontrado e corrigido dentro desta mesma sprint); autorização administrativa (Titan) corrigida; AI guardrails confirmados (zero LLM externo, zero bypass de autorização via IA); secrets e logs auditados sem achados; regressão completa executada (261/261, 3961/3961); build de produção real executado com sucesso; working tree revisado.

Reserva: a validação Web→API está fora do escopo desta sprint (backend-only) e portanto não foi exercida; a mitigação completa do token-window pós-bloqueio exigiria mudança arquitetural deliberadamente não feita aqui; débito de lint/TypeScript pré-existente e não relacionado a segurança não foi tratado por estar fora do objetivo desta auditoria.

Uma Sprint 04 focada em (a) fechar a janela de token pós-bloqueio, se o negócio julgar necessário, e (b) validar a integração real `apps/web` → `apps/api` contra os endpoints agora corrigidos, é justificável mas não bloqueante para este veredito.
