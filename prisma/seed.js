const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Single user create karo
  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'user@test.com',
      password: await bcrypt.hash('password123', 12),
    },
  });

  console.log('✅ User created:');
  console.log('Email: ', user.email);
  console.log('Password: ', user.password);

  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });