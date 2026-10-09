import axios from 'axios';
import { getToken, clearAuthData } from '../utils/authStorage.js';

// Configurable API base URL: Reads from Vite environment variable VITE_API_BASE_URL,
// with safe fallback to local development backend at http://localhost:8083
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8083';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Bearer token if available in storage
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Uniform error handling and response propagation
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      // Clear expired / invalid session on 401 response (except for bad credentials during login attempt)
      if (!url.includes('/api/auth/login')) {
        clearAuthData();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
