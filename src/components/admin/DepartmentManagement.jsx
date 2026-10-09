import React, { useState, useEffect } from 'react';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentDetails,
} from '../../services/adminService.js';

export const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Edit/Add Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Cascade Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [deptDependencies, setDeptDependencies] = useState(null);
  const [loadingDependencies, setLoadingDependencies] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDepartments();
      setDepartments(data || []);
    } catch {
      setError('Unable to load departments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormName('');
    setFormCode('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormCode(dept.code);
    setFormError(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingDept(null);
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const name = formName.trim();
    const code = formCode.trim().toUpperCase();

    if (!name || !code) {
      setFormError('Both Department Name and Department Code are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, { name, code });
        setSuccess(`Department "${code}" successfully updated.`);
      } else {
        await createDepartment({ name, code });
        setSuccess(`Department "${code}" successfully created.`);
      }
      handleCloseModal();
      loadDepartments();
    } catch (err) {
      const msg = err.response?.data?.message || 'Operation failed. Please ensure department name and code are unique.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Department Cascade Deletion ---
  const handleRequestDelete = async (dept) => {
    setError(null);
    setSuccess(null);
    setDeptToDelete(dept);
    setDeptDependencies(null);
    setDeleteModalOpen(true);
    setLoadingDependencies(true);

    try {
      const details = await getDepartmentDetails(dept.id);
      setDeptDependencies(details);
    } catch {
      // fallback to known stats from dept row if details fails
      setDeptDependencies({
        sectionCount: dept.sectionCount || 0,
        studentCount: dept.studentCount || 0,
        allocationCount: 0,
        attendanceCount: 0,
      });
    } finally {
      setLoadingDependencies(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setDeptToDelete(null);
    setDeptDependencies(null);
  };

  const handleConfirmDelete = async () => {
    if (!deptToDelete) return;
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteDepartment(deptToDelete.id, true);
      setSuccess(`Department "${deptToDelete.code} - ${deptToDelete.name}" and all its dependent academic data deleted successfully.`);
      setDeleteModalOpen(false);
      setDeptToDelete(null);
      setDeptDependencies(null);
      await loadDepartments();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unable to delete department.';
      setError(msg);
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="section-panel" style={{ width: '100%', boxSizing: 'border-box' }}>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="section-title-wrap">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Department Management</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Define academic departments and institutional branch codes</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadDepartments}
            data-testid="refresh-departments-btn"
            title="Reload latest live data from database"
            style={{ padding: '9px 16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAdd}
            style={{ padding: '9px 18px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>+</span>
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {success && <div className="success-message" style={{ marginBottom: '16px' }}>{success}</div>}
      {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}

      {loading ? (
        <div className="state-box">Loading departments...</div>
      ) : departments.length === 0 ? (
        <div className="state-box">No departments configured yet. Click "+ Add Department" to create one.</div>
      ) : (
        <div
          className="table-responsive"
          style={{
            width: '100%',
            overflowX: 'auto',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <table
            className="data-table"
            style={{
              width: '100%',
              minWidth: '780px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              tableLayout: 'auto',
            }}
          >
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ width: '80px', padding: '14px 20px', fontWeight: 700, fontSize: '0.85rem', color: '#475569', textAlign: 'center' }}>ID</th>
                <th style={{ width: '180px', padding: '14px 20px', fontWeight: 700, fontSize: '0.85rem', color: '#475569' }}>Department Code</th>
                <th style={{ padding: '14px 20px', fontWeight: 700, fontSize: '0.85rem', color: '#475569' }}>Department Name</th>
                <th style={{ width: '180px', padding: '14px 20px', fontWeight: 700, fontSize: '0.85rem', color: '#475569', textAlign: 'center' }}>Actual Sections</th>
                <th style={{ width: '180px', padding: '14px 20px', fontWeight: 700, fontSize: '0.85rem', color: '#475569', textAlign: 'center' }}>Actual Students</th>
                <th style={{ width: '180px', padding: '14px 20px', fontWeight: 700, fontSize: '0.85rem', color: '#475569', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 20px', color: '#64748b', fontWeight: 600, textAlign: 'center' }}>{dept.id}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ display: 'inline-block', padding: '5px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: '6px', fontWeight: 700, fontSize: '0.92rem', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                      {dept.code}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>
                    {dept.name}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', minWidth: '40px', padding: '4px 14px', background: '#f1f5f9', borderRadius: '20px', fontWeight: 700, color: '#334155', fontSize: '0.92rem' }}>
                      {dept.sectionCount ?? 0}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        minWidth: '40px',
                        padding: '4px 14px',
                        background: (dept.studentCount ?? 0) > 0 ? '#ecfdf5' : '#f1f5f9',
                        color: (dept.studentCount ?? 0) > 0 ? '#047857' : '#94a3b8',
                        border: (dept.studentCount ?? 0) > 0 ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                      }}
                    >
                      {dept.studentCount ?? 0}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <div className="actions-cell" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-edit"
                        onClick={() => handleOpenEdit(dept)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-delete"
                        data-testid={`delete-dept-${dept.id}`}
                        onClick={() => handleRequestDelete(dept)}
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

      {/* Add / Edit Modal Dialog */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingDept ? 'Edit Department' : 'Add New Department'}
              </h3>
              <button type="button" className="close-btn" onClick={handleCloseModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="error-message">{formError}</div>}

                <div className="form-group">
                  <label htmlFor="deptCode">Department Code (e.g., AI, CSE, ME)</label>
                  <input
                    id="deptCode"
                    type="text"
                    className="form-control"
                    placeholder="Enter code"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="deptName">Department Name</label>
                  <input
                    id="deptName"
                    type="text"
                    className="form-control"
                    placeholder="e.g., Artificial Intelligence"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Cascade Delete Confirmation Modal */}
      {deleteModalOpen && deptToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="department-delete-modal"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '24px 28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}
              >
                ⚠️
              </div>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: 700 }}>
                Delete {deptToDelete.name}?
              </h3>
            </div>

            <p style={{ margin: '0 0 14px', color: '#475569', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Are you sure you want to delete this department?
            </p>

            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '18px',
              }}
            >
              <div style={{ color: '#991b1b', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px' }}>
                ⚠️ This will permanently delete:
              </div>

              <div style={{ fontSize: '0.85rem', color: '#1e293b', marginBottom: '10px' }}>
                <strong>Department:</strong> {deptToDelete.name} ({deptToDelete.code})
              </div>

              {loadingDependencies ? (
                <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  Loading dependency statistics...
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                    textAlign: 'center',
                    background: '#ffffff',
                    padding: '10px 6px',
                    borderRadius: '6px',
                    border: '1px solid #fee2e2',
                    marginBottom: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>SECTIONS</div>
                    <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '1.1rem' }}>
                      {deptDependencies?.sectionCount ?? deptToDelete.sectionCount ?? 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>STUDENTS</div>
                    <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '1.1rem' }}>
                      {deptDependencies?.studentCount ?? deptToDelete.studentCount ?? 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>ALLOCATIONS</div>
                    <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '1.1rem' }}>
                      {deptDependencies?.allocationCount ?? 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>ATTENDANCE</div>
                    <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '1.1rem' }}>
                      {deptDependencies?.attendanceCount ?? 0}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ color: '#7f1d1d', fontSize: '0.82rem', lineHeight: 1.45, fontWeight: 500 }}>
                This action cannot be undone. All associated sections, students, seat allocations, and attendance records will be permanently removed.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                data-testid="cancel-delete-dept-btn"
                onClick={handleCancelDelete}
                disabled={deleting}
                style={{
                  padding: '9px 18px',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                data-testid="confirm-delete-dept-btn"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{
                  padding: '9px 20px',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  boxShadow: '0 1px 3px rgba(220, 38, 38, 0.4)',
                }}
              >
                {deleting ? 'Deleting...' : 'Delete Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
