/**
 * Request Validation Middleware
 * Using express-validator for input validation
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Debug logging
    console.log('=== VALIDATION FAILED ===');
    console.log('Request body:', req.body);
    console.log('Validation errors:', errors.array());
    console.log('========================');

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: errors.array()
    });
  }

  next();
};

/**
 * Validation rules for creating a repair
 */
const validateCreateRepair = [
  body('customerName')
    .trim()
    .notEmpty().withMessage('Customer name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Customer name must be 2-100 characters'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9+\-\s()]+$/).withMessage('Invalid phone number format'),

  body('device')
    .trim()
    .notEmpty().withMessage('Device is required')
    .isLength({ min: 2, max: 100 }).withMessage('Device name must be 2-100 characters'),

  body('branch')
    .trim()
    .notEmpty().withMessage('Branch is required')
    .isIn(['عكد النصارى', 'بابلون مول', 'كمب سارة']).withMessage('Invalid branch'),

  body('issue')
    .trim()
    .notEmpty().withMessage('Issue description is required')
    .isLength({ min: 4, max: 1000 }).withMessage('Issue description must be 5-1000 characters'),

  body('warranty')
    .optional()
    .customSanitizer(value => {
      // Convert FormData string representations to boolean
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    })
    .isBoolean().withMessage('Warranty must be true or false'),

  body('estimatedCost')
    .optional()
    .customSanitizer(value => {
      // Convert FormData string to float
      if (value === '' || value === null || value === undefined) return undefined;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? value : parsed;
    })
    .isFloat({ min: 0 }).withMessage('Estimated cost must be a positive number'),

  handleValidationErrors
];

/**
 * Validation rules for updating repair status
 */
const validateUpdateStatus = [
  param('id')
    .notEmpty().withMessage('Repair ID is required'),

  body('status')
    .trim()
    .notEmpty().withMessage('Status is required'),

  body('cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cost must be a positive number'),

  body('branch')
    .optional()
    .trim()
    .isIn(['عكد النصارى', 'بابلون مول', 'كمب سارة', '']).withMessage('Invalid branch'),

  body('costCenter')
    .optional()
    .trim()
    .isIn(['Customer', 'Company', '']).withMessage('Invalid cost center value'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters'),

  handleValidationErrors
];

/**
 * Validation rules for adding a note
 */
const validateAddNote = [
  param('id')
    .notEmpty().withMessage('Repair ID is required'),

  body('noteText')
    .trim()
    .notEmpty().withMessage('Note text is required')
    .isLength({ min: 1, max: 2000 }).withMessage('Note must be 1-2000 characters'),

  handleValidationErrors
];

/**
 * Validation rules for login
 */
const validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  handleValidationErrors
];

/**
 * Validation rules for generating reports
 */
const validateGenerateReport = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format'),

  query('branch')
    .optional()
    .trim()
    .isIn(['عكد النصارى', 'بابلون مول', 'كمب سارة', '']).withMessage('Invalid branch'),

  handleValidationErrors
];

module.exports = {
  validateCreateRepair,
  validateUpdateStatus,
  validateAddNote,
  validateLogin,
  validateGenerateReport,
  handleValidationErrors
};
