/**
 * Repair ID Generator
 * Generates unique repair IDs in format: RPR{YYMMDD}-{random}
 */

const prisma = require('../config/database');

/**
 * Generate a unique repair ID
 * @returns {Promise<string>} Unique repair ID
 */
async function generateRepairId() {
  const now = new Date();
  const year = now.getFullYear().toString().substr(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  let repairId;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    repairId = `RPR${year}${month}${day}-${random}`;

    // Check if this ID already exists
    const existing = await prisma.repair.findUnique({
      where: { repairId }
    });

    if (!existing) {
      isUnique = true;
    }

    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique repair ID after maximum attempts');
  }

  return repairId;
}

module.exports = { generateRepairId };
