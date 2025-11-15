/**
 * Database Seed Script
 * Creates default users for the Repair Tracker system
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default users
  const users = [
    {
      username: 'admin',
      password: 'Admin@123',
      role: 'ADMIN',
    },
    {
      username: 'tech',
      password: 'Tech@123',
      role: 'TECH',
    },
    {
      username: 'user',
      password: 'User@123',
      role: 'USER',
    },
    {
      username: 'viewer',
      password: 'View@123',
      role: 'VIEWER',
    },
  ];

  for (const userData of users) {
    const passwordHash = await bcrypt.hash(userData.password, 10);

    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: {},
      create: {
        username: userData.username,
        passwordHash: passwordHash,
        role: userData.role,
        isActive: true,
      },
    });

    console.log(`✅ Created/Updated user: ${user.username} (${user.role})`);
  }

  console.log('');
  console.log('🎉 Database seed completed successfully!');
  console.log('');
  console.log('Default credentials:');
  console.log('==================');
  users.forEach(u => {
    console.log(`${u.role.padEnd(10)} | ${u.username.padEnd(10)} | ${u.password}`);
  });
  console.log('');
  console.log('⚠️  Please change these passwords in production!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
