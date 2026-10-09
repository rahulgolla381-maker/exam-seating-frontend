import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/auth/LoginPage';
import AdminDashboard from '../pages/admin/AdminDashboard';
import StudentDashboard from '../pages/student/StudentDashboard';
import AdminRoute from './AdminRoute';
import StudentRoute from './StudentRoute';

/**
 * Root redirector component based on current user role and authentication state.
 */
const RootRedirect = () => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (role === 'STUDENT') {
    return <Navigate to="/student" replace />;
  }

  return <Navigate to="/login" replace />;
};

/**
 * Top-level application routing definition.
 */
export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin protected routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/sections" element={<AdminDashboard initialTab="sections" />} />
        <Route path="/admin/sections/department/:departmentId" element={<AdminDashboard initialTab="sections" />} />
        <Route path="/admin/sections/department/:departmentId/add" element={<AdminDashboard initialTab="sections" />} />
        <Route path="/admin/sections/:sectionId" element={<AdminDashboard initialTab="sections" />} />
        <Route path="/admin/sections/:sectionId/edit" element={<AdminDashboard initialTab="sections" />} />
        <Route path="/admin/campus-rooms" element={<AdminDashboard initialTab="campus-rooms" />} />
        <Route path="/admin/infrastructure" element={<AdminDashboard initialTab="campus-rooms" />} />
        <Route path="/admin/rooms" element={<AdminDashboard initialTab="campus-rooms" />} />
        <Route path="/admin/seating" element={<AdminDashboard initialTab="allocations" />} />
        <Route path="/admin/attendance" element={<Navigate to="/admin/seating" replace />} />
        <Route path="/admin/exam-day" element={<Navigate to="/admin/seating" replace />} />
        <Route path="/admin/database-overview" element={<AdminDashboard initialTab="database" />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
      </Route>

      {/* Student protected routes */}
      <Route element={<StudentRoute />}>
        <Route path="/student" element={<StudentDashboard />} />
      </Route>

      {/* Default index navigation */}
      <Route path="/" element={<RootRedirect />} />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
