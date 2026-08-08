// Run with: npm run db:seed
// Creates one admin account from ADMIN_USERNAME / ADMIN_PASSWORD in your
// env, and does nothing else — referees get created automatically by the
// scraper the first time it runs, so there's no fake data seeded here.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.log('ADMIN_USERNAME / ADMIN_PASSWORD not set — skipping admin seed.');
    return;
  }

  const existing = await prisma.account.findUnique({ where: { username } });
  if (existing) {
    console.log(`Admin account "${username}" already exists — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.account.create({
    data: {
      username,
      displayName: username,
      email: `${username}@betterkdul.local`,
      passwordHash,
      type: 'fan',
      fanClubs: [],
      verificationStatus: 'verified',
      isAdmin: true,
      trust: 0,
    },
  });
  console.log(`Created admin account "${username}". Change the password after first login if this was a placeholder.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
