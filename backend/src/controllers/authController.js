/**
 * Authentication Controller
 * Handles login, logout, and session validation
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { ROLE_PERMISSIONS } = require('../config/constants');

/**
 * Login user
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { username }
    });

    // User not found
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is disabled'
      });
    }

    // Check for account lockout
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const remainingMinutes = Math.ceil((user.lockedUntil - new Date()) / 60000);
      return res.status(401).json({
        success: false,
        error: `Account is locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`
      });
    }

    // Reset lockout if time has passed
    if (user.lockedUntil && new Date() >= user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lockedUntil: null,
          loginAttempts: 0
        }
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      // Increment failed login attempts
      const loginAttempts = (user.loginAttempts || 0) + 1;
      const maxAttempts = 5;

      // Lock account if too many attempts
      if (loginAttempts >= maxAttempts) {
        const lockoutDuration = 15 * 60 * 1000; // 15 minutes
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts,
            lockedUntil: new Date(Date.now() + lockoutDuration)
          }
        });

        return res.status(401).json({
          success: false,
          error: 'Too many failed login attempts. Account locked for 15 minutes.'
        });
      }

      // Update failed attempts
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts }
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Successful login - reset attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date()
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    );

    // Get permissions for role
    const permissions = ROLE_PERMISSIONS[user.role];

    return res.json({
      success: true,
      session: {
        token,
        username: user.username,
        role: user.role
      },
      permissions
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Validate session (JWT token)
 */
async function validateSession(req, res, next) {
  try {
    // Token is already validated by authenticate middleware
    // Just return session info
    const permissions = ROLE_PERMISSIONS[req.user.role];

    return res.json({
      success: true,
      session: {
        username: req.user.username,
        role: req.user.role,
        permissions
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Logout (optional - for token blacklist)
 */
async function logout(req, res, next) {
  try {
    // In stateless JWT, logout is handled client-side by removing token
    // Optionally, implement token blacklist here

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Check page access permission
 */
async function checkPageAccess(req, res, next) {
  try {
    const { page } = req.query;
    const permissions = ROLE_PERMISSIONS[req.user.role];

    let hasAccess = false;

    // Map pages to permissions
    const pagePermissionMap = {
      'dashboard': 'canViewDashboard',
      'form': 'canAddRepair',
      'scanner': 'canScanQR',
      'reports': 'canViewReports',
      'repaircenter': 'canAccessRepairCenter'
    };

    const requiredPermission = pagePermissionMap[page];
    if (requiredPermission && permissions[requiredPermission]) {
      hasAccess = true;
    }

    return res.json({
      success: true,
      hasAccess,
      defaultPage: permissions.defaultPage
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  validateSession,
  logout,
  checkPageAccess
};
