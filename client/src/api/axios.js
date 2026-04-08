/**
 * Axios API Configuration
 * Handles all HTTP requests with authentication
 */

import axios from 'axios';

// Create axios instance with default configuration
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Request Interceptor
 * Automatically attaches JWT token to all requests
 */
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles authentication errors globally
 */
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // Handle authentication errors
    if (status === 401 || status === 403) {
      console.warn('Authentication error, logging out...');
      
      // Clear stored credentials
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Notify app of auth state change
      window.dispatchEvent(new Event('loginStateChange'));
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // Log other errors for debugging
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Network Error: No response received');
    }

    return Promise.reject(error);
  }
);

export default API;