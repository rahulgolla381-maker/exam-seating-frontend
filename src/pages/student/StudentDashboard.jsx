import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StudentLayout from '../../components/student/StudentLayout.jsx';
import SeatingCard from '../../components/student/SeatingCard.jsx';
import { getStudentMe, getStudentAllocation } from '../../services/studentService.js';

export const StudentDashboard = () => {
  const { username, role } = useAuth();

  const [studentProfile, setStudentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Available Exams (aligned with active semester exams)
  const defaultExams = [
    { id: 1, subjectCode: 'DBMS501', subjectName: 'Database Management Systems', examDate: '2026-10-15', startTime: '09:30:00', endTime: '12:30:00', session: 'MORNING' },
    { id: 2, subjectCode: 'DBMS-TEST', subjectName: 'DBMS Practical Examination', examDate: '2026-10-18', startTime: '14:00:00', endTime: '17:00:00', session: 'AFTERNOON' }
  ];

  const [selectedExamId, setSelectedExamId] = useState(1);
  const [allocation, setAllocation] = useState(null);
  const [allocationLoading, setAllocationLoading] = useState(false);

  useEffect(() => {
    loadStudentData();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      loadAllocationForExam(selectedExamId);
    }
  }, [selectedExamId]);

  const loadStudentData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentMe();
      setStudentProfile(data);
    } catch (err) {
      console.warn('Student profile endpoint error:', err.message);
      if (err.response?.status === 401) {
        setError('Your session has expired. Please sign in again.');
      } else {
        // Non-critical: we still have the authenticated username from AuthContext
        setStudentProfile({ username: username || 'student', role: 'STUDENT' });
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Phase 7 Step 1: Secure personal seat retrieval.
   * Invokes GET /api/student/allocation/{examId} where student identity is
   * extracted strictly from the authenticated JWT token.
   * Never downloads peer student rosters to the browser.
   */
  const loadAllocationForExam = async (examId) => {
    setAllocationLoading(true);
    try {
      const data = await getStudentAllocation(examId);
      setAllocation(data);
    } catch (err) {
      console.error('Failed to load student allocation:', err.message);
      setAllocation(null);
    } finally {
      setAllocationLoading(false);
    }
  };

  const currentExam = defaultExams.find((e) => e.id === Number(selectedExamId)) || defaultExams[0];

  return (
    <StudentLayout>
      {/* Welcome & Identity Card */}
      <div className="welcome-card">
        <div>
          <h1 className="welcome-title">Welcome back, {studentProfile?.username || username}!</h1>
          <p className="welcome-subtitle">
            Academic Semester Examination Seating & Hall Ticket Information
          </p>
        </div>

        <div className="welcome-meta">
          <div>Institutional Role: <strong>{role || 'STUDENT'}</strong></div>
          <div style={{ marginTop: '2px', opacity: 0.9 }}>Status: <strong>Active Candidate</strong></div>
        </div>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}

      {/* Exam Selection Bar */}
      <div className="exam-select-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="exam-select-label">Select Scheduled Exam:</span>
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '280px' }}
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(Number(e.target.value))}
          >
            {defaultExams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.subjectCode} - {ex.subjectName} ({ex.session})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Seating Allocation Card / Not Allocated State */}
      {allocationLoading ? (
        <div className="state-box" style={{ background: '#ffffff', padding: '40px' }}>
          Loading your examination seating information...
        </div>
      ) : (
        <SeatingCard allocation={allocation} examDetails={currentExam} />
      )}

      {/* Helpful Student Instructions Notice */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginTop: '16px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px', color: '#1e3a8a' }}>
          📋 Examination Day Guidelines
        </h4>
        <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
          <li>Candidates must report to their assigned Examination Hall at least 15 minutes prior to the start time.</li>
          <li>Carry your physical College Identity Card and Hall Ticket.</li>
          <li>Verify your Seat Number on the physical desk sticker matching the coordinates indicated above.</li>
          <li>Electronic devices and unauthorized reference materials are strictly prohibited inside the hall.</li>
        </ul>
      </div>
    </StudentLayout>
  );
};

export default StudentDashboard;
