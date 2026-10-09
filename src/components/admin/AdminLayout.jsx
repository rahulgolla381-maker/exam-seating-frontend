import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/admin.css';

/**
 * Reusable Admin Layout providing standard responsive sidebar, header, and content container.
 */
export const AdminLayout = ({ activeTab, setActiveTab, children }) => {
  const { username, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: '📊' },
    { id: 'departments', label: 'Departments', icon: '🏛️' },
    { id: 'sections', label: 'Sections', icon: '📂' },
    { id: 'students', label: 'Students', icon: '🎓' },
    { id: 'campus-rooms', label: 'Campus & Rooms', icon: '🏢' },
    { id: 'exams', label: 'Exams Schedule', icon: '📝' },
    { id: 'allocations', label: 'Seating Allocation', icon: '🪑' },
    { id: 'database', label: 'Database Overview', icon: '💾' },
  ];

  const currentTab = navItems.find((item) => item.id === activeTab) ||
    (activeTab === 'infrastructure' || activeTab === 'rooms' ? { id: 'campus-rooms', label: 'Campus & Rooms', icon: '🏢' } : navItems[0]);

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-title">Exam Allocator</span>
          <span className="brand-tagline">College Admin Portal</span>
        </div>

        <ul className="sidebar-nav">
          {navItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                type="button"
                className={`nav-button ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          <button type="button" className="logout-nav-button" onClick={handleLogout}>
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <button
              type="button"
              className="mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation menu"
            >
              ☰
            </button>
            <h1 className="header-title">{currentTab.label}</h1>
          </div>

          <div className="header-right">
            <div className="user-profile-badge">
              <span className="user-handle">{username}</span>
              <span className="role-badge">{role}</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
