/**
 * API Client for Repair Tracker
 * Replaces Google Apps Script JSONP calls with REST API calls
 */

class RepairTrackerAPI {
  constructor(baseURL) {
    this.baseURL = baseURL || window.location.origin;
    this.token = localStorage.getItem('repair_tracker_token') || '';
  }

  /**
   * Get authorization headers
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Make API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // ============================================================
  // AUTHENTICATION
  // ============================================================

  /**
   * Login user
   */
  async login(username, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (data.success && data.session && data.session.token) {
      this.token = data.session.token;
      localStorage.setItem('repair_tracker_token', this.token);
      localStorage.setItem('repair_tracker_user', JSON.stringify({
        username: data.session.username,
        role: data.session.role
      }));
      localStorage.setItem('repair_tracker_permissions', JSON.stringify(data.permissions));
    }

    return data;
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.token = '';
      localStorage.removeItem('repair_tracker_token');
      localStorage.removeItem('repair_tracker_user');
      localStorage.removeItem('repair_tracker_permissions');
    }
  }

  /**
   * Validate session
   */
  async validateSession() {
    try {
      const data = await this.request('/api/auth/validate');
      return data;
    } catch (error) {
      // Session invalid - clear storage
      this.logout();
      return { success: false };
    }
  }

  /**
   * Check page access
   */
  async checkPageAccess(page) {
    return await this.request(`/api/auth/check-access?page=${encodeURIComponent(page)}`);
  }

  // ============================================================
  // REPAIRS
  // ============================================================

  /**
   * Get all repairs
   */
  async getAllRepairs(filters = {}) {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.branch) params.append('branch', filters.branch);
    if (filters.search) params.append('search', filters.search);

    const queryString = params.toString();
    const endpoint = `/api/repairs${queryString ? '?' + queryString : ''}`;

    const data = await this.request(endpoint);
    return data.repairs || [];
  }

  /**
   * Get repair by ID
   */
  async getRepairById(id) {
    const data = await this.request(`/api/repairs/${encodeURIComponent(id)}`);
    return data.repair;
  }

  /**
   * Create new repair
   */
  async createRepair(repairData) {
    return await this.request('/api/repairs', {
      method: 'POST',
      body: JSON.stringify(repairData)
    });
  }

  /**
   * Update repair status
   */
  async updateRepairStatus(id, statusData) {
    return await this.request(`/api/repairs/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData)
    });
  }

  /**
   * Add note to repair
   */
  async addNote(id, noteText) {
    return await this.request(`/api/repairs/${encodeURIComponent(id)}/notes`, {
      method: 'POST',
      body: JSON.stringify({ noteText })
    });
  }

  /**
   * Search by QR code
   */
  async searchByQRCode(qrData) {
    const data = await this.request(`/api/repairs/search/qr?qrData=${encodeURIComponent(qrData)}`);
    return data.repair;
  }

  /**
   * Generate report
   */
  async generateReport(filters = {}) {
    const params = new URLSearchParams();

    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.branch) params.append('branch', filters.branch);

    const queryString = params.toString();
    const endpoint = `/api/repairs/reports/generate${queryString ? '?' + queryString : ''}`;

    return await this.request(endpoint);
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.token;
  }

  /**
   * Get current user info
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('repair_tracker_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Get user permissions
   */
  getPermissions() {
    const permStr = localStorage.getItem('repair_tracker_permissions');
    return permStr ? JSON.parse(permStr) : {};
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission) {
    const permissions = this.getPermissions();
    return permissions[permission] === true;
  }
}

// Create global API instance
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://fix.nixflow.xyz';

const api = new RepairTrackerAPI(API_BASE_URL);

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RepairTrackerAPI;
}
