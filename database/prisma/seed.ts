// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('../node_modules/.prisma/client') as typeof import('../node_modules/.prisma/client');
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await argon2.hash('Admin123@');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@biomapping.com' },
    update: { passwordHash, role: 'ADMIN' },
    create: {
      email: 'admin@biomapping.com',
      passwordHash,
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  console.log(`Seed completed. Admin user: ${admin.email} (role: ${admin.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
