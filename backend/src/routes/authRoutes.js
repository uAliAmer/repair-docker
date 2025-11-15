/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validation');

// Public routes
router.post('/login', validateLogin, authController.login);

// Protected routes (require authentication)
router.get('/validate', authenticate, authController.validateSession);
router.post('/logout', authenticate, authController.logout);
router.get('/check-access', authenticate, authController.checkPageAccess);

module.exports = router;
