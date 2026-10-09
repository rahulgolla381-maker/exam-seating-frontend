import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard strictly enforcing STUDENT role access.
 * Unauthenticated users are redirected to /login.
 * Authenticated non-student users (e.g. ADMIN) are redirected to /admin.
 */
export const StudentRoute = () => {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role !== 'STUDENT') {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};

export default StudentRoute;
