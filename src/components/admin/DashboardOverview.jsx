import React, { useState, useEffect } from 'react';
import {
  getDepartments,
  getSections,
  getStudents,
  getRooms,
  getExams,
} from '../../services/adminService.js';

export const DashboardOverview = ({ setActiveTab }) => {
  const [stats, setStats] = useState({
    departments: 0,
    sections: 0,
    students: 0,
    rooms: 0,
    exams: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deps, secs, studs, rms, exms] = await Promise.all([
        getDepartments(),
        getSections(),
        getStudents(),
        getRooms(),
        getExams(),
      ]);

      setStats({
        departments: deps?.length || 0,
        sections: secs?.length || 0,
        students: studs?.length || 0,
        rooms: rms?.length || 0,
        exams: exms?.length || 0,
      });
    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
      setError('Unable to load dashboard statistics. Please ensure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="state-box">Loading administrative metrics...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card" onClick={() => setActiveTab('departments')} style={{ cursor: 'pointer' }}>
              <span className="stat-label">Total Departments</span>
              <span className="stat-value">{stats.departments}</span>
            </div>

            <div className="stat-card" onClick={() => setActiveTab('sections')} style={{ cursor: 'pointer' }}>
              <span className="stat-label">Total Sections</span>
              <span className="stat-value">{stats.sections}</span>
            </div>

            <div className="stat-card" onClick={() => setActiveTab('students')} style={{ cursor: 'pointer' }}>
              <span className="stat-label">Total Students</span>
              <span className="stat-value">{stats.students}</span>
            </div>

            <div className="stat-card" onClick={() => setActiveTab('campus-rooms')} style={{ cursor: 'pointer' }}>
              <span className="stat-label">Total Rooms</span>
              <span className="stat-value">{stats.rooms}</span>
            </div>

            <div className="stat-card" onClick={() => setActiveTab('exams')} style={{ cursor: 'pointer' }}>
              <span className="stat-label">Total Exams</span>
              <span className="stat-value">{stats.exams}</span>
            </div>
          </div>

          <div className="section-panel" style={{ marginTop: '20px' }}>
            <div className="section-header">
              <div className="section-title-wrap">
                <h2>Quick Management Actions</h2>
                <p>Select a module to manage examination data and allocation rules</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '16px', textAlign: 'left' }}
                onClick={() => setActiveTab('students')}
              >
                <strong>🎓 Manage Students</strong>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                  Register, view, or update student roster
                </p>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '16px', textAlign: 'left' }}
                onClick={() => setActiveTab('campus-rooms')}
              >
                <strong>🏢 Campus & Rooms</strong>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                  Manage buildings, floor levels, halls, and 2D seating layouts
                </p>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '16px', textAlign: 'left' }}
                onClick={() => setActiveTab('exams')}
              >
                <strong>📝 Exam Schedule</strong>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                  Schedule upcoming examinations and sessions
                </p>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '16px', textAlign: 'left' }}
                onClick={() => setActiveTab('allocations')}
              >
                <strong>🪑 Seating Allocation</strong>
                <p style={{ fontSize: '0.8rem', color: '#eff6ff', marginTop: '4px' }}>
                  Execute non-adjacent seating algorithm and inspect grids
                </p>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardOverview;
