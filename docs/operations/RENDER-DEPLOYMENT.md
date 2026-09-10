# BioBoock API — Render Deployment

Este documento descreve como o `bioboock-api` é implantado na Render via Blueprint
(`render.yaml`, raiz do repositório) e, em especial, como ele se conecta ao PostgreSQL
**já existente** na conta — não cria um banco novo.

**Nunca coloque secrets reais neste arquivo.**

---

## 1. Por que não há um Postgres no Blueprint

`render.yaml` define só o Web Service `bioboock-api` (Docker, a partir de
`apps/api/Dockerfile`). Não há bloco `databases:`.

A conta Render já tem um PostgreSQL Free ativo chamado **`seltriva-postgres`**. O nome é
histórico e não reflete o projeto atual — apesar do nome, esse é o banco em uso pelo
BioBoock/Bio Mapping; o Seltriva não usa Render. Contas Render no tier gratuito aceitam
somente **1 Postgres Free por vez**; tentar provisionar um segundo (`bioboock-db`) pelo
Blueprint falha com `cannot have more than one active free tier database` e cancela o
deploy do serviço web junto ("another action failed").

**Não criar um segundo PostgreSQL.** `bioboock-api` deve reusar `seltriva-postgres`.

## 2. Como ligar `bioboock-api` a `seltriva-postgres`

`DATABASE_URL` está declarada no Blueprint como:
```yaml
- key: DATABASE_URL
  sync: false
```
`sync: false` significa que a Render **nunca** preenche esse valor a partir do
`render.yaml` — ele é sempre inserido manualmente, com segurança, fora do Git:

1. No dashboard da Render, abra o banco **`seltriva-postgres`** → aba **Connect** (ou
   **Info**) → copie a **Internal Connection String** (preferível — tráfego dentro da
   rede da Render, mais rápido e não exposto publicamente; use a External só se o
   serviço web estiver fora da Render, o que não é o caso aqui).
2. Abra o serviço **`bioboock-api`** → **Environment** → encontre `DATABASE_URL` (criada
   vazia pelo Blueprint, já que é `sync: false`) → cole a connection string copiada no
   passo 1 → **Save Changes**.
3. Isso dispara um novo deploy do `bioboock-api` automaticamente com a variável
   preenchida.

Esse valor nunca deve ser commitado, colado em chat/log público, ou escrito em qualquer
arquivo versionado deste repositório.

## 3. Migrations — etapa separada, não automática

Conectar `DATABASE_URL` faz o container subir e responder `/health`, mas **não** aplica
o schema do Prisma. Rodar migrations contra `seltriva-postgres` é uma etapa distinta,
autorizada separadamente (nunca automática nem destrutiva) — ver
`docs/operations/PRODUCTION-DEPLOYMENT.md`, seção 8, para o procedimento
(`prisma migrate deploy` a partir de uma máquina com devDependencies instaladas, nunca
via `docker exec` no container de runtime, que não tem o CLI do Prisma).

**Achado documentado (reforço)**: `GET /health` responde `"status":"ok"` mesmo com o
banco vazio/sem migrations (só roda `SELECT 1`). Um `bioboock-api` saudável no healthcheck
não significa que o schema já existe — confirmar migrations antes de apontar tráfego real
(Vercel) para essa instância.

## 4. Outras variáveis do Blueprint

| Variável | Origem | Observação |
|---|---|---|
| `NODE_ENV` | fixa (`production`) no `render.yaml` | não é secret |
| `DATABASE_URL` | manual, dashboard (`sync: false`) | nunca no Git — ver §2 |
| `JWT_SECRET` | `generateValue: true` | a própria Render gera um valor aleatório na criação do Blueprint; nunca definido neste repositório |
| `CORS_ORIGIN` | fixa no `render.yaml`, aponta para a URL de produção do projeto Vercel `web` | atualizar aqui se o domínio do Web mudar |

## 5. Limitação conhecida, não resolvida nesta sprint

O Render informa expiração prevista do Postgres Free (`seltriva-postgres`) em
**2 de outubro de 2026**. Isso é uma decisão futura de infraestrutura (migrar para um
plano pago, ou provisionar outro banco antes do vencimento) — deliberadamente fora do
escopo desta sprint, que tratou só de reaproveitar o banco existente sem criar um
segundo recurso Free.

## 6. Próximo passo após ligar `DATABASE_URL`

1. Confirmar que `bioboock-api` sobe e `GET /health` responde `200`.
2. Rodar `prisma migrate deploy` contra `seltriva-postgres` (etapa separada e
   autorizada, não incluída nesta sprint — ver §3).
3. Só então apontar `NEXT_PUBLIC_API_URL` (projeto `web` na Vercel) para a URL pública
   do `bioboock-api`.
