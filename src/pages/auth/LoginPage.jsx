import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginRequest } from '../../services/authService';

/**
 * Login Page for Exam Hall Seating Allocator.
 * Provides accessible, secure authentication with client-side validation,
 * clear user feedback, and role-based navigation.
 */
export const LoginPage = () => {
  const { isAuthenticated, role, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to appropriate role dashboard
  if (isAuthenticated) {
    if (role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    if (role === 'STUDENT') {
      return <Navigate to="/student" replace />;
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();

    // Client-side validation: ensure fields are populated before API call
    if (!trimmedUsername && !password) {
      setError('Username and password are required.');
      return;
    }
    if (!trimmedUsername) {
      setError('Username is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);

    try {
      const data = await loginRequest(trimmedUsername, password);
      // Clean up sensitive state immediately after successful request
      setPassword('');

      // Update global AuthContext and synchronize with localStorage
      login(data.token, data.username, data.role);

      // Navigate based on assigned role
      if (data.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else if (data.role === 'STUDENT') {
        navigate('/student', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      // Clear password field on error
      setPassword('');

      if (err.response && err.response.status === 401) {
        setError('Invalid username or password.');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Unable to connect to the server. Please try again.');
      } else {
        setError('Unable to complete sign-in. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="brand-badge">College Exam Portal</div>
          <h1 className="login-title">Exam Hall Seating Allocator</h1>
          <p className="login-subtitle">Secure Examination Seating Management System</p>
        </div>

        {error && (
          <div className="error-message" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              className="form-control"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError(null);
              }}
              disabled={loading}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-control"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              disabled={loading}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>Please enter your institutional credentials to continue.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
