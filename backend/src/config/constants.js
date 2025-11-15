/**
 * Application Constants
 * Mirrors the constants from Google Apps Script
 */

// Arabic Status Constants
const STATUS = {
  // Branch Reception Statuses
  RECEIVED_AQD: 'تم استلام في عكد النصارى',
  RECEIVED_BABYLON: 'تم استلام في بابلون مول',
  RECEIVED_CAMP: 'تم استلام في كمب سارة',

  // Repair Center Statuses
  RECEIVED_CENTER: 'تم استلام في مركز الصيانة',
  IN_REPAIR: 'قيد الصيانة حاليا',
  REPAIR_COMPLETE: 'مكتمل الصيانة',
  UNREPAIRABLE: 'غير قابل للصيانة',

  // Return Statuses
  READY_FOR_PICKUP: 'جاهز للاستلام',
  DELIVERED_TO_CUSTOMER: 'تم استلام من قبل الزبون'
};

// Branch to Initial Status Mapping
const BRANCH_STATUS_MAP = {
  'عكد النصارى': STATUS.RECEIVED_AQD,
  'بابلون مول': STATUS.RECEIVED_BABYLON,
  'كمب سارة': STATUS.RECEIVED_CAMP
};

// Prisma Enum to Arabic Status Mapping
const PRISMA_TO_ARABIC_STATUS = {
  'RECEIVED_AQD': STATUS.RECEIVED_AQD,
  'RECEIVED_BABYLON': STATUS.RECEIVED_BABYLON,
  'RECEIVED_CAMP': STATUS.RECEIVED_CAMP,
  'RECEIVED_CENTER': STATUS.RECEIVED_CENTER,
  'IN_REPAIR': STATUS.IN_REPAIR,
  'REPAIR_COMPLETE': STATUS.REPAIR_COMPLETE,
  'UNREPAIRABLE': STATUS.UNREPAIRABLE,
  'READY_FOR_PICKUP': STATUS.READY_FOR_PICKUP,
  'DELIVERED_TO_CUSTOMER': STATUS.DELIVERED_TO_CUSTOMER
};

// Arabic Status to Prisma Enum Mapping
const ARABIC_TO_PRISMA_STATUS = {
  [STATUS.RECEIVED_AQD]: 'RECEIVED_AQD',
  [STATUS.RECEIVED_BABYLON]: 'RECEIVED_BABYLON',
  [STATUS.RECEIVED_CAMP]: 'RECEIVED_CAMP',
  [STATUS.RECEIVED_CENTER]: 'RECEIVED_CENTER',
  [STATUS.IN_REPAIR]: 'IN_REPAIR',
  [STATUS.REPAIR_COMPLETE]: 'REPAIR_COMPLETE',
  [STATUS.UNREPAIRABLE]: 'UNREPAIRABLE',
  [STATUS.READY_FOR_PICKUP]: 'READY_FOR_PICKUP',
  [STATUS.DELIVERED_TO_CUSTOMER]: 'DELIVERED_TO_CUSTOMER'
};

// User Roles
const USER_ROLES = {
  ADMIN: 'ADMIN',
  TECH: 'TECH',
  USER: 'USER',
  VIEWER: 'VIEWER'
};

// Role Permissions (matches Auth.gs permissions)
const ROLE_PERMISSIONS = {
  ADMIN: {
    canViewDashboard: true,
    canAddRepair: true,
    canEditRepair: true,
    canDeleteRepair: true,
    canViewReports: true,
    canScanQR: true,
    canAccessRepairCenter: true,
    canManageUsers: true,
    defaultPage: 'dashboard'
  },
  TECH: {
    canViewDashboard: true,
    canAddRepair: false,
    canEditRepair: true,
    canDeleteRepair: false,
    canViewReports: false,
    canScanQR: true,
    canAccessRepairCenter: true,
    canManageUsers: false,
    defaultPage: 'repaircenter'
  },
  USER: {
    canViewDashboard: true,
    canAddRepair: true,
    canEditRepair: false,
    canDeleteRepair: false,
    canViewReports: false,
    canScanQR: true,
    canAccessRepairCenter: false,
    canManageUsers: false,
    defaultPage: 'form'
  },
  VIEWER: {
    canViewDashboard: true,
    canAddRepair: false,
    canEditRepair: false,
    canDeleteRepair: false,
    canViewReports: true,
    canScanQR: false,
    canAccessRepairCenter: false,
    canManageUsers: false,
    defaultPage: 'reports'
  }
};

module.exports = {
  STATUS,
  BRANCH_STATUS_MAP,
  PRISMA_TO_ARABIC_STATUS,
  ARABIC_TO_PRISMA_STATUS,
  USER_ROLES,
  ROLE_PERMISSIONS
};
