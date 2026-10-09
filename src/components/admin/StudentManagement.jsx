import React, { useState, useEffect, useMemo } from 'react';
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getDepartments,
  getSections,
} from '../../services/adminService.js';

export const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Search & Section-based filters
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add / Edit Modal state — ONLY 4 Fields: Full Roll Number, Department, Section, Status
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    rollNumber: '',
    departmentId: '',
    sectionId: '',
    status: 'ACTIVE',
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [studData, deptData, secData] = await Promise.all([
        getStudents(),
        getDepartments(),
        getSections(),
      ]);
      setStudents(studData || []);
      setDepartments(deptData || []);
      setSections(secData || []);

      // Default to first department and its section if not set
      if (deptData && deptData.length > 0 && !deptFilter) {
        const firstDept = deptData[0];
        setDeptFilter(String(firstDept.id));
        const firstSec = (secData || []).find((s) => String(s.department?.id) === String(firstDept.id));
        if (firstSec) {
          setSectionFilter(String(firstSec.id));
        }
      }
    } catch {
      setError('Unable to load students data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Sections available for current department filter
  const availableSections = useMemo(() => {
    if (!deptFilter) return sections;
    return sections.filter((s) => String(s.department?.id) === String(deptFilter));
  }, [sections, deptFilter]);

  // Sections available in the Add/Edit form based on chosen department
  const filteredSectionsForForm = useMemo(() => {
    if (!formData.departmentId) return sections;
    return sections.filter(
      (s) => String(s.department?.id) === String(formData.departmentId)
    );
  }, [sections, formData.departmentId]);

  // Displayed students filtered strictly by Section, Department, Status, and Search
  const displayedStudents = useMemo(() => {
    return students.filter((st) => {
      const matchSearch =
        !searchTerm ||
        st.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept =
        !deptFilter || String(st.department?.id) === String(deptFilter);
      const matchSection =
        !sectionFilter || String(st.section?.id) === String(sectionFilter);
      const matchStatus =
        !statusFilter || st.status === statusFilter;
      return matchSearch && matchDept && matchSection && matchStatus;
    });
  }, [students, searchTerm, deptFilter, sectionFilter, statusFilter]);

  // Handle department change in toolbar
  const handleDeptFilterChange = (e) => {
    const newDeptId = e.target.value;
    setDeptFilter(newDeptId);
    const matchingSecs = sections.filter((s) => !newDeptId || String(s.department?.id) === String(newDeptId));
    setSectionFilter(matchingSecs.length > 0 ? String(matchingSecs[0].id) : '');
  };

  const handleOpenAdd = () => {
    setEditingStudent(null);
    const defaultDept = deptFilter || (departments.length > 0 ? String(departments[0].id) : '');
    const matchingSecs = sections.filter((s) => String(s.department?.id) === defaultDept);
    const defaultSec = sectionFilter || (matchingSecs.length > 0 ? String(matchingSecs[0].id) : '');
    setFormData({
      rollNumber: '',
      departmentId: defaultDept,
      sectionId: defaultSec,
      status: 'ACTIVE',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      rollNumber: student.rollNumber,
      departmentId: String(student.department?.id || ''),
      sectionId: String(student.section?.id || ''),
      status: student.status || 'ACTIVE',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingStudent(null);
    setFormError(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'departmentId') {
      const newMatchingSecs = sections.filter((s) => String(s.department?.id) === String(value));
      setFormData((prev) => ({
        ...prev,
        departmentId: value,
        sectionId: newMatchingSecs.length > 0 ? String(newMatchingSecs[0].id) : '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const {
      rollNumber,
      departmentId,
      sectionId,
      status,
    } = formData;

    if (!rollNumber.trim()) {
      setFormError('Full Roll Number is required.');
      return;
    }
    if (!departmentId || !sectionId) {
      setFormError('Please select both a Department and a Section.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        rollNumber: rollNumber.trim().toUpperCase(),
        department: { id: Number(departmentId) },
        section: { id: Number(sectionId) },
        status: status || 'ACTIVE',
      };

      // Preserve non-displayed database attributes for existing students
      if (editingStudent) {
        if (editingStudent.fullName) payload.fullName = editingStudent.fullName;
        if (editingStudent.email) payload.email = editingStudent.email;
        if (editingStudent.phoneNumber) payload.phoneNumber = editingStudent.phoneNumber;
        if (editingStudent.semester != null) payload.semester = editingStudent.semester;
        if (editingStudent.year != null) payload.year = editingStudent.year;
      }

      if (editingStudent) {
        await updateStudent(editingStudent.id, payload);
        setSuccess(`Student "${payload.rollNumber}" updated successfully.`);
      } else {
        await createStudent(payload);
        setSuccess(`Student "${payload.rollNumber}" registered successfully.`);
      }

      handleCloseModal();
      loadAllData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Operation failed. Ensure Roll Number is unique.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (student) => {
    if (!window.confirm(`Are you sure you want to delete student "${student.rollNumber}"?`)) {
      return;
    }

    try {
      await deleteStudent(student.id);
      setSuccess(`Student "${student.rollNumber}" deleted.`);
      loadAllData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete student. Check if student has active seat allocations.');
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <div className="section-panel" style={{ padding: '8px 0' }}>
      {/* Page Header */}
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <div className="section-title-wrap">
          <h2 style={{ margin: '0 0 4px', color: '#1e3a8a', fontSize: '1.5rem', fontWeight: 700 }}>
            Student Management
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            Maintain academic student records organized by Department and Section
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenAdd}
          disabled={departments.length === 0 || sections.length === 0}
          style={{ padding: '9px 18px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <span>+</span>
          <span>Add Student</span>
        </button>
      </div>

      {/* Notifications */}
      {success && <div className="success-message" style={{ marginBottom: '16px' }}>✓ {success}</div>}
      {error && <div className="error-message" style={{ marginBottom: '16px' }}>⚠️ {error}</div>}

      {/* Section-Based Filter Toolbar */}
      <div
        className="toolbar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          background: '#ffffff',
          padding: '14px 18px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          marginBottom: '18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Department Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
            Department
          </label>
          <select
            className="search-input"
            style={{ minWidth: '180px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            value={deptFilter}
            onChange={handleDeptFilterChange}
            data-testid="student-dept-filter"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Section Filter (Section is the source of grouping) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
            Section
          </label>
          <select
            className="search-input"
            style={{ minWidth: '160px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            data-testid="student-section-filter"
          >
            <option value="">All Sections</option>
            {availableSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.department?.code ? `${s.department.code} - ` : ''}Section {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
            Status
          </label>
          <select
            className="search-input"
            style={{ minWidth: '140px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data-testid="student-status-filter"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DETAINED">DETAINED</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        {/* Search Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '220px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
            Search
          </label>
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search by Roll Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ alignSelf: 'flex-end', paddingBottom: '8px', fontSize: '0.84rem', color: '#64748b', fontWeight: 600 }}>
          Showing {displayedStudents.length} of {students.length} students
        </div>
      </div>

      {/* Main Student Table */}
      {loading ? (
        <div className="state-box" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
          Loading students...
        </div>
      ) : displayedStudents.length === 0 ? (
        <div className="state-box" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
          {students.length === 0
            ? 'No students registered yet. Click "+ Add Student" to register.'
            : 'No students match your filter criteria.'}
        </div>
      ) : (
        <div
          className="table-responsive"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            overflowX: 'auto',
            overflowY: 'visible',
            width: '100%',
            boxSizing: 'border-box',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <table
            className="data-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              minWidth: '780px',
            }}
          >
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>
                <th
                  style={{
                    padding: '14px 20px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    width: '28%',
                    minWidth: '220px',
                    whiteSpace: 'nowrap',
                    overflow: 'visible',
                    textOverflow: 'clip',
                  }}
                >Full Roll Number</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, fontSize: '0.85rem', width: '26%', minWidth: '160px' }}>Department</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, fontSize: '0.85rem', width: '18%', minWidth: '120px' }}>Section</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, fontSize: '0.85rem', width: '16%', minWidth: '120px' }}>Status</th>
                <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '0.85rem', width: '12%', minWidth: '130px', textAlign: 'center' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedStudents.map((st) => (
                <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td
                    style={{
                      padding: '14px 20px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      fontSize: '0.94rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                      overflow: 'visible',
                      textOverflow: 'clip',
                      minWidth: '220px',
                    }}
                  >
                    {st.rollNumber}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#475569', fontWeight: 500 }}>
                    {st.department?.code || st.department?.name || 'N/A'}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span className="status-badge" style={{ fontWeight: 600 }}>
                      {st.section?.name || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span
                      className={`status-pill ${
                        st.status === 'ACTIVE'
                          ? 'status-active'
                          : st.status === 'DETAINED'
                          ? ''
                          : 'status-completed'
                      }`}
                      style={
                        st.status === 'DETAINED'
                          ? { backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 700 }
                          : { fontWeight: 600 }
                      }
                    >
                      {st.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div className="actions-cell" style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-edit"
                        onClick={() => handleOpenEdit(st)}
                        style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600 }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-delete"
                        onClick={() => handleDelete(st)}
                        style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600 }}
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

      {/* Add / Edit Student Modal — ONLY 4 Fields */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingStudent ? 'Edit Student' : 'Register New Student'}
              </h3>
              <button type="button" className="close-btn" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ padding: '20px' }}>
                {formError && <div className="error-message" style={{ marginBottom: '16px' }}>⚠️ {formError}</div>}

                {/* 1. Full Roll Number */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label htmlFor="stRoll" style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.88rem' }}>
                    Full Roll Number <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    id="stRoll"
                    name="rollNumber"
                    type="text"
                    className="form-control"
                    placeholder="e.g., 24EG107A01"
                    value={formData.rollNumber}
                    onChange={handleFormChange}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 600 }}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                    Enter complete roll number preserving leading zeros (e.g. 24EG107A01).
                  </small>
                </div>

                {/* 2. Department */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label htmlFor="stDept" style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.88rem' }}>
                    Department <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    id="stDept"
                    name="departmentId"
                    className="form-control"
                    value={formData.departmentId}
                    onChange={handleFormChange}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Section */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label htmlFor="stSec" style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.88rem' }}>
                    Section <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    id="stSec"
                    name="sectionId"
                    className="form-control"
                    value={formData.sectionId}
                    onChange={handleFormChange}
                    required
                    disabled={filteredSectionsForForm.length === 0}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">Select Section...</option>
                    {filteredSectionsForForm.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.department?.code ? `${s.department.code} - ` : ''}Section {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Status */}
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label htmlFor="stStatus" style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.88rem' }}>
                    Enrollment Status
                  </label>
                  <select
                    id="stStatus"
                    name="status"
                    className="form-control"
                    value={formData.status}
                    onChange={handleFormChange}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="DETAINED">DETAINED — Not eligible for exam seating</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                  style={{ padding: '8px 18px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ padding: '8px 20px', fontWeight: 600 }}
                >
                  {submitting ? 'Saving...' : editingStudent ? 'Update Student' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
