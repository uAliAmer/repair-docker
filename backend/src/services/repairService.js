/**
 * Repair Service
 * Business logic for repair management
 */

const prisma = require('../config/database');
const { generateRepairId } = require('../utils/repairId');
const { generateQRCodeUrl } = require('../utils/qrCode');
const { processBase64Image, processAndSaveImage } = require('../utils/fileUpload');
const { notifyNewRepair, notifyStatusUpdate } = require('./n8nService');
const {
  BRANCH_STATUS_MAP,
  PRISMA_TO_ARABIC_STATUS,
  ARABIC_TO_PRISMA_STATUS
} = require('../config/constants');

/**
 * Create history entry helper
 */
function createHistoryEntry(action, userName, notes = '') {
  return {
    action,
    userName: userName || 'System',
    notes: notes || ''
  };
}

/**
 * Get all repairs with optional filters
 */
async function getAllRepairs(filters = {}) {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.branch) {
    where.branch = filters.branch;
  }

  if (filters.search) {
    where.OR = [
      { repairId: { contains: filters.search, mode: 'insensitive' } },
      { customerName: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search, mode: 'insensitive' } },
      { device: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  const repairs = await prisma.repair.findMany({
    where,
    include: {
      history: {
        orderBy: { timestamp: 'desc' }
      },
      notes: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { receivedDate: 'desc' }
  });

  // Convert status to Arabic
  return repairs.map(repair => ({
    ...repair,
    repairStatus: PRISMA_TO_ARABIC_STATUS[repair.status],
    date: repair.receivedDate.toISOString().split('T')[0],
    returnDate: repair.returnDate ? repair.returnDate.toISOString().split('T')[0] : null,
    estimatedCost: repair.estimatedCost ? repair.estimatedCost.toString() : '',
    warranty: repair.warranty ? 'Yes' : 'No'
  }));
}

/**
 * Get repair by ID or repairId
 */
async function getRepairById(identifier) {
  const repair = await prisma.repair.findFirst({
    where: {
      OR: [
        { id: identifier },
        { repairId: identifier }
      ]
    },
    include: {
      history: {
        orderBy: { timestamp: 'desc' }
      },
      notes: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!repair) {
    return null;
  }

  return {
    ...repair,
    repairStatus: PRISMA_TO_ARABIC_STATUS[repair.status],
    date: repair.receivedDate.toISOString().split('T')[0],
    returnDate: repair.returnDate ? repair.returnDate.toISOString().split('T')[0] : null,
    estimatedCost: repair.estimatedCost ? repair.estimatedCost.toString() : '',
    warranty: repair.warranty ? 'Yes' : 'No'
  };
}

/**
 * Create new repair
 */
async function createRepair(data, userId, username) {
  // Generate or use provided repair ID
  const repairId = data.repairId || await generateRepairId();

  // Check if repair ID already exists (prevent duplicates)
  if (data.repairId) {
    const existing = await prisma.repair.findUnique({
      where: { repairId }
    });

    if (existing) {
      throw new Error('رقم الطلب موجود مسبقاً. الرجاء استخدام رقم آخر.');
    }
  }

  // Process image if provided (support both file upload and base64)
  let imageUrl = null;
  if (data.imageFile) {
    // File upload (new method - more efficient)
    imageUrl = await processAndSaveImage(data.imageFile.buffer, repairId);
  } else if (data.imageData) {
    // Base64 (backward compatibility)
    imageUrl = await processBase64Image(data.imageData, repairId);
  }

  // Generate QR code
  const qrCodeUrl = generateQRCodeUrl(repairId);

  // Determine initial status based on branch
  const initialStatusArabic = BRANCH_STATUS_MAP[data.branch] || BRANCH_STATUS_MAP['عكد النصارى'];
  const initialStatus = ARABIC_TO_PRISMA_STATUS[initialStatusArabic];

  // Create repair with history
  const repair = await prisma.repair.create({
    data: {
      repairId,
      customerName: data.customerName,
      phone: data.phone,
      device: data.device,
      branch: data.branch,
      issue: data.issue,
      receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
      warranty: data.warranty || false,
      estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : null,
      status: initialStatus,
      imageUrl,
      qrCodeUrl,
      createdById: userId,
      history: {
        create: {
          action: initialStatusArabic,
          userName: username || 'موظف الاستقبال',
          userId: userId,
          notes: 'تم إنشاء الطلب'
        }
      }
    },
    include: {
      history: true
    }
  });

  // Send n8n notification
  await notifyNewRepair(repair);

  return {
    success: true,
    repairId: repair.repairId,
    qrCodeUrl: repair.qrCodeUrl,
    imageUrl: repair.imageUrl,
    status: initialStatusArabic
  };
}

/**
 * Update repair status
 */
async function updateRepairStatus(identifier, updateData, userId, username) {
  // Find repair
  const repair = await prisma.repair.findFirst({
    where: {
      OR: [
        { id: identifier },
        { repairId: identifier }
      ]
    }
  });

  if (!repair) {
    throw new Error('Repair not found');
  }

  // Convert Arabic status to Prisma enum
  const newStatus = ARABIC_TO_PRISMA_STATUS[updateData.status];
  if (!newStatus) {
    throw new Error('Invalid status');
  }

  // Prepare update data
  const dataToUpdate = {
    status: newStatus
  };

  // Build activity notes
  let activityNotes = updateData.notes || '';

  // Update cost if provided
  if (updateData.cost !== undefined && updateData.cost !== null && updateData.cost !== '') {
    const newCost = parseFloat(updateData.cost);
    if (repair.estimatedCost !== newCost) {
      dataToUpdate.estimatedCost = newCost;
      activityNotes += (activityNotes ? ' | ' : '') + `تم تحديث التكلفة: ${newCost}`;
    }
  }

  // Update branch if provided
  if (updateData.branch && updateData.branch !== repair.branch) {
    dataToUpdate.branch = updateData.branch;
    activityNotes += (activityNotes ? ' | ' : '') + `تم النقل إلى: ${updateData.branch}`;
  }

  // Update cost center if provided
  if (Object.prototype.hasOwnProperty.call(updateData, 'costCenter')) {
    const newCostCenter = updateData.costCenter || null;
    const existingCostCenter = repair.costCenter || null;
    if (newCostCenter !== existingCostCenter) {
      dataToUpdate.costCenter = newCostCenter;
      if (newCostCenter) {
        const costCenterLabel = newCostCenter === 'Company' ? 'الشركة' : 'الزبون';
        activityNotes += (activityNotes ? ' | ' : '') + `تم تعيين مركز التكلفة: ${costCenterLabel}`;
      } else {
        activityNotes += (activityNotes ? ' | ' : '') + 'تم مسح مركز التكلفة';
      }
    }
  }

  // Set return date if delivered
  if (newStatus === 'DELIVERED_TO_CUSTOMER' && !repair.returnDate) {
    dataToUpdate.returnDate = new Date();
  }

  // Update repair and create history entry
  const updatedRepair = await prisma.repair.update({
    where: { id: repair.id },
    data: {
      ...dataToUpdate,
      history: {
        create: {
          action: updateData.status,
          userName: username || 'موظف',
          userId: userId,
          notes: activityNotes
        }
      }
    },
    include: {
      history: {
        orderBy: { timestamp: 'desc' }
      }
    }
  });

  // Send n8n notification
  await notifyStatusUpdate(updatedRepair, updateData.status, activityNotes);

  return { success: true, repair: updatedRepair };
}

/**
 * Add note to repair
 */
async function addNoteToRepair(identifier, noteText, userId, username) {
  // Find repair
  const repair = await prisma.repair.findFirst({
    where: {
      OR: [
        { id: identifier },
        { repairId: identifier }
      ]
    }
  });

  if (!repair) {
    throw new Error('Repair not found');
  }

  // Create note
  const note = await prisma.note.create({
    data: {
      repairId: repair.id,
      noteText,
      userName: username || 'User',
      userId
    }
  });

  return { success: true, note };
}

/**
 * Generate report statistics
 */
async function generateReport(filters = {}) {
  const where = {};

  // Date range filter
  if (filters.startDate || filters.endDate) {
    where.receivedDate = {};

    if (filters.startDate) {
      where.receivedDate.gte = new Date(filters.startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      where.receivedDate.lte = endDate;
    }
  }

  // Branch filter
  if (filters.branch) {
    where.branch = filters.branch;
  }

  // Get repairs
  const repairs = await prisma.repair.findMany({
    where,
    include: {
      history: true
    },
    orderBy: { receivedDate: 'desc' }
  });

  // Calculate statistics
  const stats = {
    total: repairs.length,
    byStatus: {},
    byBranch: {},
    byWarranty: {
      'Yes': 0,
      'No': 0
    },
    costCenter: {
      Company: {
        count: 0,
        totalCost: 0
      },
      Customer: {
        count: 0,
        totalCost: 0
      }
    },
    totalCost: 0,
    avgCost: 0
  };

  repairs.forEach(repair => {
    // Count by status (Arabic)
    const arabicStatus = PRISMA_TO_ARABIC_STATUS[repair.status];
    stats.byStatus[arabicStatus] = (stats.byStatus[arabicStatus] || 0) + 1;

    // Count by branch
    stats.byBranch[repair.branch] = (stats.byBranch[repair.branch] || 0) + 1;

    // Count by warranty
    const warrantyKey = repair.warranty ? 'Yes' : 'No';
    stats.byWarranty[warrantyKey]++;

    // Sum costs
    if (repair.estimatedCost) {
      stats.totalCost += parseFloat(repair.estimatedCost);
    }

    if (repair.costCenter === 'Company') {
      stats.costCenter.Company.count++;
      if (repair.estimatedCost) {
        stats.costCenter.Company.totalCost += parseFloat(repair.estimatedCost);
      }
    } else if (repair.costCenter === 'Customer') {
      stats.costCenter.Customer.count++;
      if (repair.estimatedCost) {
        stats.costCenter.Customer.totalCost += parseFloat(repair.estimatedCost);
      }
    }
  });

  stats.avgCost = stats.total > 0 ? (stats.totalCost / stats.total).toFixed(2) : 0;

  // Format repairs for output
  const formattedRepairs = repairs.map(repair => ({
    repairId: repair.repairId,
    customer: repair.customerName,
    phone: repair.phone,
    device: repair.device,
    branch: repair.branch,
    issue: repair.issue,
    date: repair.receivedDate.toISOString().split('T')[0],
    warranty: repair.warranty ? 'Yes' : 'No',
    estimatedCost: repair.estimatedCost ? parseFloat(repair.estimatedCost) : 0,
    status: PRISMA_TO_ARABIC_STATUS[repair.status],
    returnDate: repair.returnDate ? repair.returnDate.toISOString().split('T')[0] : '',
    costCenter: repair.costCenter || ''
  }));

  return {
    data: formattedRepairs,
    stats,
    recordCount: repairs.length
  };
}

/**
 * Get lightweight status counts for dashboard summary
 */
async function getStatusCounts() {
  const grouped = await prisma.repair.groupBy({
    by: ['status'],
    _count: {
      status: true
    }
  });

  return grouped
    .map(item => ({
      key: item.status,
      label: PRISMA_TO_ARABIC_STATUS[item.status] || item.status,
      count: item._count.status
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, 'ar');
    });
}

module.exports = {
  getAllRepairs,
  getRepairById,
  createRepair,
  updateRepairStatus,
  addNoteToRepair,
  generateReport,
  getStatusCounts
};
