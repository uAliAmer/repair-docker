/**
 * Repair Controller
 * Handles all repair-related operations
 */

const repairService = require('../services/repairService');

/**
 * Get all repairs
 */
async function getAllRepairs(req, res, next) {
  try {
    const filters = {
      status: req.query.status,
      branch: req.query.branch,
      search: req.query.search
    };

    const repairs = await repairService.getAllRepairs(filters);

    return res.json({
      success: true,
      repairs
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Get repair by ID
 */
async function getRepairById(req, res, next) {
  try {
    const { id } = req.params;

    const repair = await repairService.getRepairById(id);

    if (!repair) {
      return res.status(404).json({
        success: false,
        error: 'Repair not found'
      });
    }

    return res.json({
      success: true,
      repair
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Create new repair
 */
async function createRepair(req, res, next) {
  try {
    // Debug logging
    console.log('=== CREATE REPAIR DEBUG ===');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    console.log('warranty value:', req.body.warranty, 'type:', typeof req.body.warranty);
    console.log('estimatedCost value:', req.body.estimatedCost, 'type:', typeof req.body.estimatedCost);
    console.log('==========================');

    const repairData = {
      customerName: req.body.customer || req.body.customerName,
      phone: req.body.phone,
      device: req.body.device,
      branch: req.body.branch,
      issue: req.body.issue,
      receivedDate: req.body.date || req.body.receivedDate,
      warranty: req.body.warranty === 'Yes' || req.body.warranty === true,
      estimatedCost: req.body.estimatedCost || req.body.cost,
      imageData: req.body.imageData, // Base64 (backward compatibility)
      imageFile: req.file, // Uploaded file (new method)
      repairId: req.body.repairId // Optional - for scanning existing QR codes
    };

    const result = await repairService.createRepair(
      repairData,
      req.user.id,
      req.user.username
    );

    return res.status(201).json(result);

  } catch (error) {
    next(error);
  }
}

/**
 * Update repair status
 */
async function updateRepairStatus(req, res, next) {
  try {
    const { id } = req.params;

    const updateData = {
      status: req.body.newStatus || req.body.status,
      cost: req.body.cost,
      branch: req.body.branch,
      notes: req.body.notes,
      costCenter: req.body.costCenter
    };

    const result = await repairService.updateRepairStatus(
      id,
      updateData,
      req.user.id,
      req.user.username
    );

    return res.json(result);

  } catch (error) {
    next(error);
  }
}

/**
 * Add note to repair
 */
async function addNoteToRepair(req, res, next) {
  try {
    const { id } = req.params;
    const { noteText } = req.body;

    const result = await repairService.addNoteToRepair(
      id,
      noteText,
      req.user.id,
      req.user.username
    );

    return res.json(result);

  } catch (error) {
    next(error);
  }
}

/**
 * Get lightweight status counters for dashboard
 */
async function getStatusCounts(req, res, next) {
  try {
    const counts = await repairService.getStatusCounts();

    return res.json({
      success: true,
      counts
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Search repair by QR code
 */
async function searchByQRCode(req, res, next) {
  try {
    const { qrData } = req.query;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        error: 'QR data is required'
      });
    }

    const repair = await repairService.getRepairById(qrData);

    if (!repair) {
      return res.status(404).json({
        success: false,
        error: 'Repair not found'
      });
    }

    return res.json({
      success: true,
      repair
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Generate report
 */
async function generateReport(req, res, next) {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      branch: req.query.branch
    };

    const report = await repairService.generateReport(filters);

    return res.json({
      success: true,
      ...report
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllRepairs,
  getRepairById,
  createRepair,
  updateRepairStatus,
  addNoteToRepair,
  searchByQRCode,
  generateReport,
  getStatusCounts
};
