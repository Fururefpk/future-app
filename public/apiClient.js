/**
 * API Client Helper
 * Frontend utility for interacting with Future Property Holdings API
 * 
 * Usage:
 *   import apiClient from './apiClient.js';
 *   
 *   const response = await apiClient.auth.register(userData);
 *   const properties = await apiClient.properties.getAll({ page: 1, limit: 10 });
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  /**
   * Helper function to make API requests
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add Authorization header if token exists
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      // Try to parse JSON response
      const data = await response.json().catch(() => null);

      // Handle token expiration
      if (response.status === 401 && data?.message?.includes('expired')) {
        return await this.refreshAccessTokenAndRetry(endpoint, options);
      }

      if (!response.ok) {
        throw new Error(data?.message || `API Error: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Request Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Refresh access token and retry the original request
   */
  async refreshAccessTokenAndRetry(endpoint, options) {
    try {
      const data = await this.request('/auth/refresh-token', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      this.accessToken = data.data.accessToken;
      localStorage.setItem('accessToken', this.accessToken);

      // Retry original request
      return await this.request(endpoint, options);
    } catch (error) {
      // Refresh failed, redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      throw error;
    }
  }

  /**
   * Store tokens in localStorage
   */
  storeTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Clear stored tokens
   */
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  /**
   * Authentication API Methods
   */
  auth = {
    register: async (userData) => {
      const response = await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      if (response.data) {
        this.storeTokens(response.data.accessToken, response.data.refreshToken);
      }
      return response;
    },

    login: async (email, password) => {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (response.data) {
        this.storeTokens(response.data.accessToken, response.data.refreshToken);
      }
      return response;
    },

    biometricLogin: async (userEmail, faceDescriptor) => {
      const response = await this.request('/auth/biometric-login', {
        method: 'POST',
        body: JSON.stringify({ userEmail, faceDescriptor })
      });
      if (response.data) {
        this.storeTokens(response.data.accessToken, response.data.refreshToken);
      }
      return response;
    },

    refreshToken: async () => {
      const response = await this.request('/auth/refresh-token', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });
      if (response.data) {
        this.accessToken = response.data.accessToken;
        localStorage.setItem('accessToken', this.accessToken);
      }
      return response;
    },

    logout: async () => {
      try {
        await this.request('/auth/logout', { method: 'POST' });
      } finally {
        this.clearTokens();
      }
    },

    getCurrentUser: async () => {
      return await this.request('/auth/me');
    }
  };

  /**
   * Biometric API Methods
   */
  biometric = {
    enrollFace: async (faceDescriptor, imageQuality) => {
      return await this.request('/biometric/enroll-face', {
        method: 'POST',
        body: JSON.stringify({ faceDescriptor, imageQuality })
      });
    },

    reenrollFace: async (faceDescriptor, imageQuality) => {
      return await this.request('/biometric/re-enroll-face', {
        method: 'POST',
        body: JSON.stringify({ faceDescriptor, imageQuality })
      });
    },

    verifyGhanaCard: async (ghanaCardNumber, ghanaCardName) => {
      return await this.request('/biometric/verify-ghana-card', {
        method: 'POST',
        body: JSON.stringify({ ghanaCardNumber, ghanaCardName })
      });
    },

    getStatus: async () => {
      return await this.request('/biometric/status');
    },

    deleteFaceData: async () => {
      return await this.request('/biometric/face', { method: 'DELETE' });
    }
  };

  /**
   * Properties API Methods
   */
  properties = {
    getAll: async (filters = {}) => {
      const params = new URLSearchParams(filters);
      return await this.request(`/properties?${params.toString()}`);
    },

    getById: async (id) => {
      return await this.request(`/properties/${id}`);
    },

    getLandlordProperties: async (userId) => {
      return await this.request(`/properties/user/${userId}`);
    },

    create: async (propertyData) => {
      return await this.request('/properties', {
        method: 'POST',
        body: JSON.stringify(propertyData)
      });
    },

    update: async (id, propertyData) => {
      return await this.request(`/properties/${id}`, {
        method: 'PUT',
        body: JSON.stringify(propertyData)
      });
    },

    delete: async (id) => {
      return await this.request(`/properties/${id}`, { method: 'DELETE' });
    }
  };

  /**
   * Users API Methods
   */
  users = {
    getById: async (id) => {
      return await this.request(`/users/${id}`);
    },

    updateProfile: async (profileData) => {
      return await this.request('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
    },

    changePassword: async (currentPassword, newPassword) => {
      return await this.request('/users/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
    },

    deleteAccount: async (password) => {
      return await this.request('/users/account', {
        method: 'DELETE',
        body: JSON.stringify({ password })
      });
    },

    getAll: async () => {
      return await this.request('/users'); // Admin only
    },

    getStats: async () => {
      return await this.request('/users/stats/overview'); // Admin only
    }
  };
}

// Create and export singleton instance
const apiClient = new APIClient();

export default apiClient;

/**
 * Example Usage in Frontend:
 * 
 * // Register
 * const registerResponse = await apiClient.auth.register({
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   email: 'john@example.com',
 *   phone: '+233501234567',
 *   password: 'SecurePass123!'
 * });
 * 
 * // Biometric enrollment
 * const enrollResponse = await apiClient.biometric.enrollFace(
 *   faceDescriptor,  // 128-dimensional array from face-api.js
 *   85               // quality score 0-100
 * );
 * 
 * // Get properties
 * const properties = await apiClient.properties.getAll({
 *   page: 1,
 *   limit: 10,
 *   city: 'Accra',
 *   minPrice: 500,
 *   maxPrice: 5000
 * });
 * 
 * // Biometric login
 * const loginResponse = await apiClient.auth.biometricLogin(
 *   'john@example.com',
 *   faceDescriptor   // 128-dimensional array
 * );
 */
