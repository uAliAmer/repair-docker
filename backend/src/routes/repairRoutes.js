/**
 * Repair Routes
 */

const express = require('express');
const router = express.Router();
const repairController = require('../controllers/repairController');
const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../utils/fileUpload');
const {
  validateCreateRepair,
  validateUpdateStatus,
  validateAddNote,
  validateGenerateReport
} = require('../middleware/validation');

// ============================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================

// Get all repairs (with optional filters)
router.get('/',
  authenticate,
  authorize('canViewDashboard'),
  repairController.getAllRepairs
);

// Lightweight status counts for dashboard summary
router.get('/status/counts',
  authenticate,
  authorize('canViewDashboard'),
  repairController.getStatusCounts
);

// Search by QR code - MUST come before /:id route
router.get('/search/qr',
  authenticate,
  authorize('canScanQR'),
  repairController.searchByQRCode
);

// Generate report - MUST come before /:id route
router.get('/reports/generate',
  authenticate,
  authorize('canViewReports'),
  validateGenerateReport,
  repairController.generateReport
);

// ============================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================

// Get repair by ID or repairId - PUBLIC for customer tracking
// MUST be after specific GET routes to avoid catching them
router.get('/:id',
  repairController.getRepairById
);

// Create new repair (supports both multipart file upload and JSON with base64)
router.post('/',
  authenticate,
  authorize('canAddRepair'),
  upload.single('image'), // Optional file upload
  (req, res, next) => {
    // Debug middleware - log what multer gave us
    console.log('=== AFTER MULTER DEBUG ===');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file ? req.file.originalname : 'no file');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('=========================');
    next();
  },
  validateCreateRepair,
  repairController.createRepair
);

// Update repair status
router.patch('/:id/status',
  authenticate,
  authorize('canEditRepair'),
  validateUpdateStatus,
  repairController.updateRepairStatus
);

// Add note to repair
router.post('/:id/notes',
  authenticate,
  validateAddNote,
  repairController.addNoteToRepair
);

module.exports = router;