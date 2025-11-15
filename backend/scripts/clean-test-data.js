#!/usr/bin/env node

/**
 * Clean Test Data Script
 * Removes test repair entries from the database
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanTestData() {
  console.log('🧹 Starting database cleanup...\n');

  try {
    // Option 1: Delete ALL repairs (use with caution!)
    console.log('⚠️  WARNING: This will delete ALL repair entries!');
    console.log('Press Ctrl+C within 5 seconds to cancel...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete in correct order (child tables first)
    const deletedNotes = await prisma.note.deleteMany();
    console.log(`✓ Deleted ${deletedNotes.count} notes`);

    const deletedHistory = await prisma.repairHistory.deleteMany();
    console.log(`✓ Deleted ${deletedHistory.count} history entries`);

    const deletedRepairs = await prisma.repair.deleteMany();
    console.log(`✓ Deleted ${deletedRepairs.count} repairs`);

    console.log('\n✅ Database cleanup completed successfully!');

  } catch (error) {
    console.error('\n❌ Error cleaning database:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanTestData();
