import api from './api.js';

/**
 * Send authentication login request to the backend.
 * 
 * @param {string} username - User username
 * @param {string} password - User password
 * @returns {Promise<{token: string, username: string, role: string}>}
 */
export const loginRequest = async (username, password) => {
  const response = await api.post('/api/auth/login', { username, password });
  return response.data;
};

/**
 * Test connectivity with backend public test endpoint.
 * @returns {Promise<string>}
 */
export const checkBackendHealth = async () => {
  const response = await api.get('/api/test');
  return response.data;
};
