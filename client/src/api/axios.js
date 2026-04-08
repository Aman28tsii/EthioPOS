import axios from 'axios';

const getBaseURL = () => {
  return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
};

const API = axios.create({
  baseURL: getBaseURL(),
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && typeof token === 'string' && token.trim() !== '') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    
    if (status === 401) {
      console.warn('[401] Unauthorized');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('loginStateChange'));
      
      if (!window.location.pathname.includes('/login')) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
      }
    } else if (status === 403) {
      console.warn('[403] Forbidden');
    }
    
    return Promise.reject(error);
  }
);

export default API;