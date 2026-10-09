import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard strictly enforcing ADMIN role access.
 * Unauthenticated users are redirected to /login.
 * Authenticated non-admin users (e.g. STUDENT) are redirected to /student.
 */
export const AdminRoute = () => {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role !== 'ADMIN') {
    return <Navigate to="/student" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
