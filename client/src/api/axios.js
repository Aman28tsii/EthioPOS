/**
 * EthioPOS Axios Configuration
 * Production-Ready HTTP Client with Smart Error Handling
 * Version: 2.1.0
 */

import axios from 'axios';

// Determine API base URL
const getBaseURL = () => {
  return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
};

// Create axios instance
const API = axios.create({
  baseURL: getBaseURL(),
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Request Interceptor
 * Attaches JWT token to every request
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
 * Response Interceptor
 * Handles authentication, network, and permission errors
 */
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const errorData = error.response?.data;
    const errorMessage = errorData?.error || errorData?.message || 'An unexpected error occurred';

    // 📡 Network Error (No Internet Connection)
    if (!error.response) {
      console.warn('📡 Network Error: No internet connection');
      if (window.showToast) {
        window.showToast('You are offline. Changes will sync when connected.', 'warning');
      }
      return Promise.reject(error);
    }

    // 🔒 Authentication Error (401) - Session Expired
    if (status === 401) {
      console.warn('🔒 [401] Session expired or invalid token');

      // Clear all stored credentials
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('ultra_cart');
      localStorage.removeItem('ultra_inventory');
      localStorage.removeItem('ultra_staff_directory');

      // Notify App.js of auth state change
      window.dispatchEvent(new Event('loginStateChange'));

      // Redirect to login only if not already there
      if (!window.location.pathname.includes('/login')) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
      }
    }

    // ⚠️ Permission Error (403) - Insufficient permissions
    else if (status === 403) {
      console.warn('⚠️ [403] Access denied: Insufficient permissions');
      if (window.showToast) {
        window.showToast('Access Denied: You do not have permission for this action.', 'error');
      }
    }

    // 🔴 Other Server Errors (400, 500, etc.)
    else {
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      }
    }

    return Promise.reject(error);
  }
);

export default API;