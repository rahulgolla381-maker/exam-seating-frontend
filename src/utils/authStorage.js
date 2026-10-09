const TOKEN_KEY = 'exam_seating_token';
const USERNAME_KEY = 'exam_seating_username';
const ROLE_KEY = 'exam_seating_role';

/**
 * Check whether a JWT token is expired based on its exp claim.
 * Safely handles browser and Node.js environments.
 * Returns false for non-standard dummy tokens (e.g. unit tests).
 * 
 * @param {string} token 
 * @returns {boolean}
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const decodedStr = typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('utf8');
    const payload = JSON.parse(decodedStr);
    if (!payload.exp) return false;
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return false;
  }
};

/**
 * Save authentication credentials to browser localStorage.
 * Does not store passwords or JWT secret keys.
 * 
 * @param {Object} authData
 * @param {string} authData.token - JWT token
 * @param {string} authData.username - Logged in username
 * @param {string} authData.role - User role (e.g., 'ADMIN', 'STUDENT')
 */
export const saveAuthData = ({ token, username, role }) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (username) {
    localStorage.setItem(USERNAME_KEY, username);
  }
  if (role) {
    localStorage.setItem(ROLE_KEY, role);
  }
};

/**
 * Retrieve stored JWT token. Clears auth data if the token is expired.
 * @returns {string|null}
 */
export const getToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && isTokenExpired(token)) {
    clearAuthData();
    return null;
  }
  return token;
};

/**
 * Retrieve stored username.
 * @returns {string|null}
 */
export const getUsername = () => {
  return localStorage.getItem(USERNAME_KEY);
};

/**
 * Retrieve stored role.
 * @returns {string|null}
 */
export const getRole = () => {
  return localStorage.getItem(ROLE_KEY);
};

/**
 * Clear all authentication tokens and credentials from localStorage.
 */
export const clearAuthData = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(ROLE_KEY);
};

/**
 * Check if a valid session exists in storage.
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  const token = getToken();
  return Boolean(token && token.trim().length > 0);
};
