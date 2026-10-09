import React, { useState, useEffect } from 'react';
import {
  getExams,
  createExam,
  updateExam,
  deleteExam,
} from '../../services/adminService.js';

export const ExamManagement = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [formData, setFormData] = useState({
    subjectName: '',
    subjectCode: '',
    examDate: '',
    startTime: '09:30',
    endTime: '12:30',
    semester: 5,
    academicYear: '2025-2026',
    session: 'MORNING',
    status: 'SCHEDULED',
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExams();
      setExams(data || []);
    } catch (err) {
      setError('Unable to load examinations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingExam(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      subjectName: '',
      subjectCode: '',
      examDate: today,
      startTime: '09:30',
      endTime: '12:30',
      semester: 5,
      academicYear: '2025-2026',
      session: 'MORNING',
      status: 'SCHEDULED',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (exam) => {
    setEditingExam(exam);
    setFormData({
      subjectName: exam.subjectName,
      subjectCode: exam.subjectCode,
      examDate: exam.examDate,
      startTime: exam.startTime ? exam.startTime.substring(0, 5) : '09:30',
      endTime: exam.endTime ? exam.endTime.substring(0, 5) : '12:30',
      semester: exam.semester,
      academicYear: exam.academicYear,
      session: exam.session || 'MORNING',
      status: exam.status || 'SCHEDULED',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingExam(null);
    setFormError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const {
      subjectName,
      subjectCode,
      examDate,
      startTime,
      endTime,
      semester,
      academicYear,
      session,
      status,
    } = formData;

    if (!subjectName.trim() || !subjectCode.trim() || !examDate) {
      setFormError('Subject Name, Subject Code, and Exam Date are required.');
      return;
    }

    setSubmitting(true);
    try {
      // Format time as HH:mm:ss for backend LocalTime
      const formattedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
      const formattedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;

      const payload = {
        subjectName: subjectName.trim(),
        subjectCode: subjectCode.trim().toUpperCase(),
        examDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        semester: Number(semester),
        academicYear: academicYear.trim(),
        session,
        status: status || 'SCHEDULED',
      };

      if (editingExam) {
        await updateExam(editingExam.id, payload);
        setSuccess(`Exam "${subjectCode}" updated successfully.`);
      } else {
        await createExam(payload);
        setSuccess(`Exam "${subjectCode}" scheduled successfully.`);
      }

      handleCloseModal();
      loadExams();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save examination schedule.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (exam) => {
    if (!window.confirm(`Are you sure you want to delete exam "${exam.subjectCode} - ${exam.subjectName}"? Any existing allocations will also be affected.`)) {
      return;
    }

    try {
      await deleteExam(exam.id);
      setSuccess(`Exam "${exam.subjectCode}" deleted.`);
      loadExams();
    } catch (err) {
      setError('Unable to delete exam. Remove any associated seat allocations first.');
    }
  };

  return (
    <div className="section-panel">
      <div className="section-header">
        <div className="section-title-wrap">
          <h2>Examination Management</h2>
          <p>Schedule semester papers, test dates, timings, and academic sessions</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
          + Schedule Exam
        </button>
      </div>

      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="state-box">Loading scheduled exams...</div>
      ) : exams.length === 0 ? (
        <div className="state-box">No exams scheduled yet. Click "+ Schedule Exam" to add a new paper.</div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Subject Name</th>
                <th>Exam Date</th>
                <th>Session & Timing</th>
                <th>Semester</th>
                <th>Academic Year</th>
                <th>Status</th>
                <th style={{ width: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id}>
                  <td><strong>{exam.subjectCode}</strong></td>
                  <td>{exam.subjectName}</td>
                  <td>{exam.examDate}</td>
                  <td>
                    <div>{exam.session}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {exam.startTime?.substring(0, 5)} - {exam.endTime?.substring(0, 5)}
                    </div>
                  </td>
                  <td>Sem {exam.semester}</td>
                  <td>{exam.academicYear}</td>
                  <td>
                    <span className={`status-pill ${exam.status === 'SCHEDULED' ? 'status-scheduled' : 'status-completed'}`}>
                      {exam.status || 'SCHEDULED'}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button
                        type="button"
                        className="btn btn-sm btn-edit"
                        onClick={() => handleOpenEdit(exam)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-delete"
                        onClick={() => handleDelete(exam)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingExam ? 'Edit Exam Schedule' : 'Schedule New Examination'}
              </h3>
              <button type="button" className="close-btn" onClick={handleCloseModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="error-message">{formError}</div>}

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="exCode">Subject Code</label>
                    <input
                      id="exCode"
                      name="subjectCode"
                      type="text"
                      className="form-control"
                      placeholder="e.g., CS501, DBMS-TEST"
                      value={formData.subjectCode}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="exName">Subject Name</label>
                    <input
                      id="exName"
                      name="subjectName"
                      type="text"
                      className="form-control"
                      placeholder="e.g., Database Management"
                      value={formData.subjectName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="exDate">Exam Date</label>
                    <input
                      id="exDate"
                      name="examDate"
                      type="date"
                      className="form-control"
                      value={formData.examDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="exSession">Exam Session</label>
                    <select
                      id="exSession"
                      name="session"
                      className="form-control"
                      value={formData.session}
                      onChange={handleChange}
                    >
                      <option value="MORNING">MORNING (Forenoon)</option>
                      <option value="AFTERNOON">AFTERNOON (Afternoon)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="exStart">Start Time</label>
                    <input
                      id="exStart"
                      name="startTime"
                      type="time"
                      className="form-control"
                      value={formData.startTime}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="exEnd">End Time</label>
                    <input
                      id="exEnd"
                      name="endTime"
                      type="time"
                      className="form-control"
                      value={formData.endTime}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="exSem">Semester</label>
                    <input
                      id="exSem"
                      name="semester"
                      type="number"
                      min="1"
                      max="8"
                      className="form-control"
                      value={formData.semester}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="exYear">Academic Year</label>
                    <input
                      id="exYear"
                      name="academicYear"
                      type="text"
                      className="form-control"
                      placeholder="e.g., 2025-2026"
                      value={formData.academicYear}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="exStatus">Status</label>
                  <select
                    id="exStatus"
                    name="status"
                    className="form-control"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="ONGOING">ONGOING</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingExam ? 'Update Exam' : 'Schedule Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManagement;
