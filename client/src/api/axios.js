/**
 * ═══════════════════════════════════════════════════════════════
 * EthioPOS Axios Configuration
 * Production-Ready HTTP Client with Smart Error Handling
 * Version: 2.1.0
 * ═══════════════════════════════════════════════════════════════
 */

import axios from 'axios';

// Determine API base URL (Works on localhost and Render)
const getBaseURL = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // Default for local development
  return process.env.NODE_ENV === 'production' 
    ? 'https://ethiopos-backend.onrender.com/api'
    : 'http://localhost:5000/api';
};

// Create axios instance
const API = axios.create({
  baseURL: getBaseURL(),
  timeout: 20000, // Increased for Render cold starts
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * REQUEST INTERCEPTOR
 * Automatically attaches JWT token to every request
 */
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token && typeof token === 'string' && token.trim() !== '') {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error.message);
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR
 * Handles all API responses and errors intelligently
 * Critical: Distinguishes between 401 (logout) and 403 (permission denied)
 */
API.interceptors.response.use(
  (response) => {
    // Success - just return the response
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const errorData = error.response?.data;
    const errorMessage = errorData?.error || errorData?.message || 'An unexpected error occurred';

    // ─────────────────────────────────────────────────────────────
    // CASE 1: 401 UNAUTHORIZED (Token Missing/Expired/Invalid)
    // Action: LOGOUT user completely
    // ─────────────────────────────────────────────────────────────
    if (status === 401) {
      console.warn('🔒 [401] Unauthorized - Token invalid or expired');

      // Clear all stored credentials
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('ultra_cart');
      localStorage.removeItem('ultra_inventory');
      localStorage.removeItem('ultra_staff_directory');

      // Dispatch event to notify App.js and other components
      window.dispatchEvent(new Event('loginStateChange'));

      // Show toast notification if available
      if (window.showToast) {
        window.showToast(errorMessage || 'Session expired. Please login again.', 'error');
      }

      // Redirect to login page (only if not already there)
      if (!window.location.pathname.includes('/login')) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // CASE 2: 403 FORBIDDEN (Valid Token, Insufficient Permissions)
    // Action: Show error but DO NOT logout
    // ─────────────────────────────────────────────────────────────
    else if (status === 403) {
      console.warn('⚠️ [403] Forbidden - Insufficient permissions');
      
      if (window.showToast) {
        window.showToast(
          errorMessage || 'Access Denied: You do not have permission for this action.',
          'error'
        );
      }
    }

    // ─────────────────────────────────────────────────────────────
    // CASE 3: 400 BAD REQUEST (Validation Errors)
    // ─────────────────────────────────────────────────────────────
    else if (status === 400) {
      console.warn('⚠️ [400] Bad Request:', errorMessage);
      
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      }
    }

    // ─────────────────────────────────────────────────────────────
    // CASE 4: 500+ SERVER ERRORS
    // ─────────────────────────────────────────────────────────────
    else if (status >= 500) {
      console.error('🔥 [' + status + '] Server Error:', errorMessage);
      
      if (window.showToast) {
        window.showToast('Server error. Please try again later.', 'error');
      }
    }

    // ─────────────────────────────────────────────────────────────
    // CASE 5: NETWORK ERRORS (No Response)
    // ─────────────────────────────────────────────────────────────
    else if (!error.response) {
      console.error('📡 Network Error:', error.message);
      
      if (window.showToast) {
        if (error.code === 'ECONNABORTED') {
          window.showToast('Request timed out. Please check your connection.', 'error');
        } else {
          window.showToast('Network error. Check your internet connection.', 'error');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default API;