import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/student.css';

/**
 * Reusable layout for the Student Portal.
 * Includes student navigation header, user profile, role badge, and logout action.
 */
export const StudentLayout = ({ children }) => {
  const { username, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="student-layout">
      <header className="student-header">
        <div className="student-brand">
          <span className="student-app-title">Exam Hall Seating Allocator</span>
          <span className="student-portal-tag">Student Examination Portal</span>
        </div>

        <div className="student-header-right">
          <div className="student-user-pill">
            <span style={{ fontWeight: 600 }}>{username}</span>
            <span className="student-badge">{role || 'STUDENT'}</span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="student-container">
        {children}
      </main>
    </div>
  );
};

export default StudentLayout;
