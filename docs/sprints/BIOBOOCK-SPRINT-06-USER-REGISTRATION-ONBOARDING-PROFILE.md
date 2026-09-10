# BioBoock — Sprint 06: User Registration, Onboarding & Profile Foundation

**Data:** 2026-09-10
**Escopo:** `apps/web` (novo) + `apps/api` módulo `profiles` (correção de defeito real) — nenhuma migration nova.
**Pré-requisitos:** Sprints 03 (Security, PASS COM RESERVA, `896b5f9`), 04 (E2E, PASS COM RESERVA, `ba017a8`), 05 (Web Auth, PASS, `4562724`).

---

## 1. Objetivo

Levar o usuário de "não tenho conta" a "tenho conta autenticada e perfil funcional": cadastro → conta → autenticação → primeiro login → onboarding → perfil → aplicação, ponta a ponta (Web → BFF → API → Banco → identidade), reaproveitando integralmente a infraestrutura de auth do Sprint 05.

---

## 2. Estado Inicial

Auditoria (Fase 1, antes de escrever qualquer código) encontrou mais infraestrutura pronta do que o esperado:

- **`POST /auth/register`** já existe e é usado desde o Sprint 03 (`RegisterDto`: email, password ≥8, name, birthDate?, gender?) — retorna `accessToken`/`refreshToken` imediatamente (auto-login).
- **Módulo `profiles` inteiro já existe** na API (`apps/api/src/modules/profiles`): `POST /profiles` (criar), `GET /profiles/me`, `PATCH /profiles/me`, `DELETE /profiles/me`, `POST /profiles/me/avatar` — todos com `JwtAuthGuard` e ownership resolvido sempre via `@CurrentUser()`, nunca de parâmetro de rota/body. Model `Profile` no Prisma já tinha `fullName`, `cpf`, `birthDate`, `gender`, `phone`, `photo`, `address`, `city`, `state`, `country`, `zipcode`, `timezone`, `language` — só `fullName` é obrigatório.
- **`apps/web` não tinha nenhuma página de cadastro, onboarding ou perfil** — essa era a lacuna real.

Conclusão da auditoria, respeitando a regra "não criar entidades duplicadas": **nenhum endpoint novo de cadastro ou perfil foi necessário na API** — só um defeito real foi corrigido (ver §18) e o lado Web foi construído do zero sobre a API já existente.

---

## 3. Arquitetura

Sem mudança na arquitetura de autenticação do Sprint 05 — cadastro e onboarding reusam integralmente o BFF (`/api/proxy/[...path]`), os cookies `httpOnly`, e o `proxy.ts` de proteção de rota, só adicionando `/signup` à lista de rotas públicas.

```
Web (signup/onboarding/perfil, Client Components)
   ↓ fetch same-origin
/api/proxy/[...path] (BFF, Sprint 05 — só anexa Authorization: Bearer)
   ↓
API (auth/register, profiles/*) — inalterada nesta sprint, exceto §18
   ↓
Banco (User, Profile — schema já suficiente, zero migration nova)
```

---

## 4. Cadastro

`app/signup/actions.ts` (`signupAction`, Server Action) — mesmo padrão do `loginAction` (Sprint 05): roda inteiramente no servidor, nunca expõe senha/token ao client. Validações client-side (nome/email/senha obrigatórios, senha ≥8, confirmação bate) acontecem **antes** de chamar a API, evitando round-trips desnecessários; a validação de verdade (e-mail único, formato) continua sendo feita pela API (fonte única de verdade, Sprint 03). Em sucesso, grava a sessão (`setSessionCookies`, cookies httpOnly) e redireciona para `/onboarding` — não direto para `/biobook`, porque conta e perfil são coisas distintas no modelo da API.

---

## 5. Autenticação

Inalterada. Cadastro usa exatamente o mesmo mecanismo de sessão do login (Sprint 05) — nenhum fluxo de auth paralelo.

---

## 6. Sessão

Inalterada — cookies `httpOnly`/`Secure`(produção)/`SameSite=lax`, gerenciados centralmente por `lib/auth/session.ts` (Sprint 05), reusados sem modificação por `signupAction`.

---

## 7. Onboarding

`app/onboarding/page.tsx`: ao montar, consulta `GET /api/proxy/profiles/me`; se já existe perfil (`200`), redireciona imediatamente para `/biobook` (não mostra o formulário de novo — evita repetir onboarding em usuários que já passaram por ele); se não existe (`404`), mostra um formulário de **um único campo** (nome de exibição) — deliberadamente mínimo, sem CPF/endereço/telefone/dados de saúde, que ficam para a página de Perfil completa. Ao concluir, `POST /api/proxy/profiles` cria o registro e redireciona para `/biobook`.

---

## 8. Perfil

`app/profile/page.tsx`: busca `GET /api/proxy/profiles/me`, preenche um formulário de edição (nome, telefone, data de nascimento, endereço, cidade, estado, CEP, país — os campos já suportados pelo modelo, exceto CPF, que não foi exposto na UI por não ser necessário nesta etapa), salva via `PATCH /api/proxy/profiles/me`. Após salvar, o formulário é atualizado com **o que a API realmente devolveu** (não um eco otimista do que foi digitado) — confirmando persistência real, não só aparência de sucesso. Estado "perfil não existe ainda" (usuário que pulou o onboarding por algum motivo) mostra um link de volta para `/onboarding` em vez de quebrar.

---

## 9. Privacidade

- Nenhuma busca pública de usuários foi criada nesta sprint (a busca já existente, `biocircle.searchUsers`, é anterior e não foi tocada).
- `/profiles/:userId/avatar`: decisão de design explícita — exige autenticação (qualquer usuário logado, não anônimo), mas não restringe a ownership do próprio usuário, pelo mesmo motivo que outras plataformas sociais privadas mostram avatar antes de uma conexão ser aceita (ex.: para decidir se aceita um convite do BioCircle). Todos os outros dados do perfil (`GET/PATCH /profiles/me`) são estritamente "eu mesmo" — a rota nem aceita um `userId` como parâmetro.
- Nenhum dado privado é exposto via URL, ID, ou metadata de resposta além do que já era necessário (o `photo` retornado é uma URL de rota autenticada, nunca um path de filesystem).

---

## 10. Segurança

Auditado especificamente (Fase 3 da spec):

- **E-mail duplicado**: API responde `409`, mensagem repassada como está — testado (`signupAction`, `SECURITY:` no teste).
- **Enumeração de usuários**: mensagens de erro de login/cadastro não foram alteradas desde o Sprint 03/05 (genéricas o suficiente).
- **Senha**: nunca logada, nunca no client, hash via argon2 na API (inalterado, Sprint 03).
- **`userId` como autoridade de ownership**: nenhuma rota de perfil aceita/confia em um `userId` vindo do corpo da requisição — sempre `@CurrentUser()` no lado API, sempre cookie `httpOnly` resolvido no BFF do lado Web (idêntico ao padrão estabelecido no Sprint 05, reforçado por evidência real no §14).
- **Payload malformado/campos inesperados**: `ValidationPipe` global com `whitelist: true` + `forbidNonWhitelisted: true` (já configurado desde antes desta sprint) rejeita campos não declarados nos DTOs.
- **SQL injection/XSS**: Prisma parametriza tudo; React escapa por padrão — nenhum `dangerouslySetInnerHTML` foi usado em nenhum componente novo.

---

## 11. Testes

**49 testes novos** (API: 5 — `profiles.service.spec.ts`/`profiles.controller.spec.ts`, avatar; Web: 44 — signup, onboarding, perfil):

### API
- `getAvatar`: resolve path/mimetype corretamente, infere PNG/JPEG pela extensão, `NotFoundException` sem avatar/perfil.
- `uploadAvatar`: `photo` retornado é a URL autenticada, nunca o path estático morto.
- Controller: `getAvatar()` faz stream com `Content-Type` correto.

### Web
- `signupAction`: sucesso (redireciona a `/onboarding`, grava sessão), campos vazios, senha curta, confirmação divergente, e-mail duplicado (mensagem da API repassada).
- `SignupForm`: campos, `type=password`, link para login, erro exibido de verdade.
- `OnboardingPage`: redireciona quando perfil já existe, mostra formulário mínimo quando não existe, envia e redireciona, bloqueia envio sem nome.
- `ProfilePage`: carrega e preenche o formulário, estado "perfil não existe", salva via PATCH e confirma com a resposta real da API (não eco), mostra erro sem apagar o formulário em falha.

---

## 12. Banco

Nenhuma alteração de schema — `Profile` já suportava tudo que esta sprint precisava.

---

## 13. Migrations

Nenhuma migration nova foi criada (confirmado antes de escrever qualquer DDL — a regra "se o schema atual já suportar, não criar migration desnecessária" foi seguida). O ciclo completo foi revalidado do zero mesmo assim: `docker compose down -v` → `up` → `POST /auth/register` falhou com `500` (tabela não existe, `/health` continua só provando conectividade) → `prisma migrate deploy` (as mesmas 5 migrations do Sprint 04, nenhuma nova) → cadastro, onboarding e perfil funcionando depois, tudo com evidência real (ver §14).

---

## 14. Acessibilidade

Cadastro e onboarding nasceram acessíveis, seguindo o padrão já estabelecido em `LoginForm` (Sprint 05):
- Todo campo tem `<label htmlFor>` associado ao `id` do input.
- Erros usam `role="alert"` (anunciado por leitor de tela) — nunca só cor; mensagem de sucesso no Perfil usa `role="status"`.
- Estados de loading usam `aria-busy` + esqueleto com `aria-label` descritivo (mesmo padrão do BioBook, Sprint 04).
- Tamanho de campos/botões consistente com o resto do app (`h-11`, área de toque adequada).
- Nenhuma informação é transmitida só por cor — todo erro tem texto explicando o que houve.
- `npx eslint` (inclui regras `jsx-a11y` via `eslint-config-next`): **zero problema novo** nos arquivos desta sprint — os 14 problemas remanescentes são os mesmos pré-existentes já documentados no Sprint 05, em arquivos não tocados aqui.

---

## 15. UX

Fluxo implementado exatamente como pedido: `Criar conta → Dados básicos → Conta criada → Entrar (automático) → Completar perfil (onboarding, 1 campo) → BioBoock`. Onboarding pedindo só um campo evita o "formulário gigante" explicitamente proibido; perfil completo fica disponível a qualquer momento depois, sem forçar nada no primeiro acesso.

---

## 16. Produção

Testado nos dois modos disponíveis neste ambiente (idêntico ao Sprint 05):
- `next dev` — usado para toda a evidência real do §17.
- `next build` + `next start` (produção) — reconfirmado: `/onboarding` protegido redireciona (`307`), `/api/proxy/profiles/me` autenticado retorna `200`.
- Build da API via Docker (`docker compose build api`) — sucesso, imagem reconstruída com a correção do avatar.

URL pública real (Vercel/domínio final) — **BLOCKED**, sem acesso a partir deste ambiente, igual às sprints anteriores.

---

## 17. Limitações

- Playwright/Cypress continuam ausentes — não foram instalados (não havia justificativa técnica forte o suficiente para introduzir essa infraestrutura só para esta sprint, seguindo a própria orientação do enunciado). Mitigado com testes unitários reais + testes de integração via `curl` contra API/Postgres/Web reais, cobrindo a mesma cadeia de chamadas que um clique real dispararia.
- Nenhum campo de CPF foi exposto na UI de perfil (existe no modelo/API, mas coletar documento de identidade não é necessário para o objetivo desta sprint).
- Avatar: o teste de upload real via `curl -F` exigiu usar o diretório de scratchpad em vez de `/tmp` (um path de arquivo do Git Bash neste Windows não foi aceito pelo curl para upload multipart) — achado de ambiente, não do produto; documentado para não confundir com um defeito da aplicação.

---

## 18. Defeitos Encontrados

### Avatar de perfil apontava para um path morto (regressão indireta do Sprint 03)

- **Severidade:** MEDIUM (funcionalidade quebrada, não uma vulnerabilidade nova — o efeito é "avatar nunca aparece", não exposição de dado).
- **Reprodução:** `LocalStorageProvider.upload()` (usado por `ProfilesService.uploadAvatar`) grava em `uploads/avatars/...` e retornava esse path como `photo`. O Sprint 03 removeu `app.useStaticAssets(...)` do `main.ts` (achado CRITICAL daquele sprint: servia arquivos sem autenticação nenhuma) — e como consequência colateral, nunca antes verificada, **nada mais serve `/uploads/**`**. Avatar era salvo com sucesso no disco e no banco, mas o link devolvido ao cliente sempre resultava em 404.
- **Causa:** o achado do Sprint 03 focou em `clinical/evidence` (a exposição mais grave, dados clínicos); o módulo `profiles`, que usa um `StorageProvider` genérico e compartilhado diferente do `EvidenceStorageProvider`, não fazia parte daquele escopo e só foi descoberto ao auditar o módulo de perfil para esta sprint.
- **Correção:** mesmo padrão já estabelecido no Sprint 03 — nova rota autenticada `GET /profiles/:userId/avatar` (`StorageProvider.getAbsolutePath()` adicionado à interface, implementado em `LocalStorageProvider`); `toProfileResponse` agora retorna essa URL em vez do path estático morto. Decisão de design: qualquer usuário **autenticado** pode ver o avatar de qualquer outro (não é dado clínico, é a foto de perfil da rede — mesmo nível de exposição de uma prévia de busca do BioCircle), mas nunca sem token nenhum.
- **Teste de regressão:** 5 testes novos (API) cobrindo resolução de path/mimetype e a URL correta na resposta; reproduzido com evidência real: upload via `curl -F` multipart através do BFF, download autenticado pelo dono (200, conteúdo correto), download autenticado por outro usuário (200, decisão de design), download sem sessão nenhuma via BFF (401) e direto na API (401).

---

## 19. Correções

Ver §18 — única correção de defeito real desta sprint, no módulo `profiles` (`profiles.service.ts`, `profiles.controller.ts`, `dto/profile-response.dto.ts`, `common/storage/storage.provider.ts`, `common/storage/local-storage.provider.ts`).

---

## 20. Regressão

| Suíte | Antes (Sprint 05) | Depois |
|---|---|---|
| `apps/api` (Jest) | 3967/3967 | **3972/3972** (261/261 suítes) — +5 novos (avatar) |
| `apps/web` (Vitest) | 362/362 | **379/379** (49/49 arquivos) — +17 novos (signup, onboarding, perfil) |
| TypeScript API | 110 erros pré-existentes | **110, zero novo** |
| TypeScript Web | 0 | **0** |
| ESLint Web | 14 pré-existentes | **14, zero novo** |
| `next build` | OK | **OK**, 17 rotas (3 novas: `/signup`, `/onboarding`, `/profile`) |
| Docker build API | — | **OK**, reconstruído com a correção do avatar |

Nenhum teste pré-existente foi enfraquecido, removido ou pulado. Nenhuma regressão silenciosa.

---

## 21. Git

Ver commit desta sprint. `git status` limpo após o commit; branch sincronizada com `origin/master` após o push (confirmado no relatório final ao usuário).

---

## 22. Status Final

**PASS.**

Cadastro real funciona e persiste (`POST /auth/register`, reusado, não duplicado); senha protegida (argon2, inalterado); login funciona (Sprint 05, reusado); sessão funciona (Sprint 05, reusado); onboarding mínimo funciona e cria o Profile de verdade; perfil funciona — visualizar, editar, persistir, recarregar e confirmar via nova consulta ao servidor, tudo comprovado com dois usuários reais através da cadeia completa Web→BFF→API→Banco; identidade sempre resolvida no backend, nunca de valor client-side; isolamento entre usuários comprovado (B nunca vê ou altera o perfil de A, estruturalmente — a rota nem aceita um id de outro usuário); nenhuma vulnerabilidade crítica nova foi aberta — pelo contrário, um defeito real e concreto (avatar quebrado desde o Sprint 03) foi encontrado e corrigido, com o mesmo rigor de autenticação de todas as correções anteriores. Testes, build e regressão completos, sem nenhuma queda em relação às sprints anteriores.

Sprint 07 não foi iniciada automaticamente, conforme instrução.
