#!/usr/bin/env node

/**
 * Selective Data Cleanup Script
 * Allows deleting repairs by specific criteria
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanSelectiveData() {
  console.log('🧹 Selective Database Cleanup\n');

  try {
    // OPTION 1: Delete by customer name (e.g., test entries)
    const testCustomerNames = ['test', 'تجربة', 'Test', 'علي', 'ااابببب'];

    console.log('Searching for test entries with names:', testCustomerNames.join(', '));

    const testRepairs = await prisma.repair.findMany({
      where: {
        OR: testCustomerNames.map(name => ({
          customerName: {
            contains: name,
            mode: 'insensitive'
          }
        }))
      },
      select: {
        id: true,
        repairId: true,
        customerName: true,
        device: true,
        createdAt: true
      }
    });

    console.log(`\nFound ${testRepairs.length} test repairs:\n`);
    testRepairs.forEach(repair => {
      console.log(`  - ${repair.repairId}: ${repair.customerName} (${repair.device}) - ${repair.createdAt.toISOString()}`);
    });

    if (testRepairs.length === 0) {
      console.log('No test repairs found. Exiting.');
      return;
    }

    console.log('\n⚠️  These repairs will be DELETED in 5 seconds...');
    console.log('Press Ctrl+C to cancel\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete related data first
    const repairIds = testRepairs.map(r => r.id);

    const deletedNotes = await prisma.note.deleteMany({
      where: { repairId: { in: repairIds } }
    });
    console.log(`✓ Deleted ${deletedNotes.count} notes`);

    const deletedHistory = await prisma.repairHistory.deleteMany({
      where: { repairId: { in: repairIds } }
    });
    console.log(`✓ Deleted ${deletedHistory.count} history entries`);

    const deletedRepairs = await prisma.repair.deleteMany({
      where: { id: { in: repairIds } }
    });
    console.log(`✓ Deleted ${deletedRepairs.count} repairs`);

    console.log('\n✅ Selective cleanup completed!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// OPTION 2: Delete by date (uncomment to use)
async function deleteByDate() {
  const cutoffDate = new Date('2025-11-14'); // Delete everything before this date

  console.log(`Deleting repairs created before ${cutoffDate.toISOString()}`);

  const oldRepairs = await prisma.repair.findMany({
    where: {
      createdAt: {
        lt: cutoffDate
      }
    },
    select: { id: true }
  });

  const repairIds = oldRepairs.map(r => r.id);

  await prisma.note.deleteMany({ where: { repairId: { in: repairIds } } });
  await prisma.repairHistory.deleteMany({ where: { repairId: { in: repairIds } } });
  await prisma.repair.deleteMany({ where: { id: { in: repairIds } } });

  console.log(`✅ Deleted ${oldRepairs.length} old repairs`);
}

// OPTION 3: Delete specific repair IDs (uncomment to use)
async function deleteSpecificRepairs() {
  const repairIdsToDelete = ['97565100', '108125333']; // Add your repair IDs here

  console.log('Deleting repairs:', repairIdsToDelete.join(', '));

  const repairs = await prisma.repair.findMany({
    where: {
      repairId: {
        in: repairIdsToDelete
      }
    },
    select: { id: true }
  });

  const dbIds = repairs.map(r => r.id);

  await prisma.note.deleteMany({ where: { repairId: { in: dbIds } } });
  await prisma.repairHistory.deleteMany({ where: { repairId: { in: dbIds } } });
  await prisma.repair.deleteMany({ where: { id: { in: dbIds } } });

  console.log(`✅ Deleted ${repairs.length} specific repairs`);
}

// Choose which function to run (change this line)
cleanSelectiveData();
// deleteByDate();
// deleteSpecificRepairs();
