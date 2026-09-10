// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('../node_modules/.prisma/client') as typeof import('../node_modules/.prisma/client');
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Achado da Sprint 06.1 (CRITICAL): este arquivo continha um e-mail e uma
// senha de administrador HARDCODED em texto puro (`admin@biomapping.com` /
// `Admin123@`), versionados no Git desde o commit 82d4a9f. Removido —
// agora a credencial vem exclusivamente de variáveis de ambiente
// (BIOBOOCK_ADMIN_EMAIL / BIOBOOCK_ADMIN_PASSWORD), nunca do código-fonte,
// nunca logada. Se `Admin123@` foi usada em algum deploy real, ela deve ser
// considerada comprometida e rotacionada — remover do arquivo não remove do
// histórico do Git, e reescrever histórico não foi feito aqui (ação
// destrutiva que exige autorização explícita, fora do escopo desta sprint).
async function bootstrapAdmin() {
  const email = process.env.BIOBOOCK_ADMIN_EMAIL;
  const password = process.env.BIOBOOCK_ADMIN_PASSWORD;

  if (!email) {
    console.log('BIOBOOCK_ADMIN_EMAIL não definido — bootstrap de admin pulado.');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Conta já existe: só garante a role. Nunca sobrescreve a senha de uma
    // conta que já existe (poderia ser um usuário promovido a admin depois
    // de já ter definido a própria senha) — "atualizar apenas o necessário".
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
      console.log(`Admin bootstrap: role atualizada para ADMIN em conta existente (${email}).`);
    } else {
      console.log(`Admin bootstrap: conta já existe e já é ADMIN (${email}). Nada a fazer.`);
    }
    return;
  }

  if (!password) {
    console.log('BIOBOOCK_ADMIN_PASSWORD não definido — não é possível criar a conta admin (ela ainda não existe).');
    return;
  }

  const passwordHash = await argon2.hash(password);
  const admin = await prisma.user.create({
    data: { email, passwordHash, name: 'Administrador', role: 'ADMIN' },
  });
  console.log(`Admin bootstrap: conta criada (${admin.email}, role: ${admin.role}).`);
}

async function main() {
  await bootstrapAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
