import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  saveAuthData, 
  getToken, 
  getUsername, 
  getRole, 
  clearAuthData, 
  isAuthenticated as checkIsAuthenticated 
} from '../utils/authStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize authentication state from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = getToken();
      const storedUsername = getUsername();
      const storedRole = getRole();

      if (storedToken) {
        setToken(storedToken);
        setUsername(storedUsername);
        setRole(storedRole);
      }
    } catch (err) {
      console.error("Failed to load auth data from storage:", err);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (authToken, authUsername, authRole) => {
    saveAuthData({ token: authToken, username: authUsername, role: authRole });
    setToken(authToken);
    setUsername(authUsername);
    setRole(authRole);
  };

  const logout = () => {
    clearAuthData();
    setToken(null);
    setUsername(null);
    setRole(null);
  };

  const isAuthenticated = Boolean(token && token.trim().length > 0);

  const value = {
    user: username ? { username, role } : null,
    token,
    username,
    role,
    isAuthenticated,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
