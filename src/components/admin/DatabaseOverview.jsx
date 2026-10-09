import React, { useState, useEffect } from 'react';
import { getAdminDataOverview } from '../../services/adminService.js';

export const DatabaseOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('departments');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminDataOverview();
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load database overview.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'departments', label: 'Departments', count: data?.departmentsCount ?? 0, icon: '🏛️' },
    { id: 'sections', label: 'Sections', count: data?.sectionsCount ?? 0, icon: '📂' },
    { id: 'students', label: 'Students', count: data?.studentsCount ?? 0, icon: '🎓' },
    { id: 'buildings', label: 'Buildings', count: data?.buildingsCount ?? 0, icon: '🏢' },
    { id: 'floors', label: 'Floors', count: data?.floorsCount ?? 0, icon: '🪜' },
    { id: 'rooms', label: 'Rooms', count: data?.roomsCount ?? 0, icon: '🚪' },
    { id: 'exams', label: 'Exams', count: data?.examsCount ?? 0, icon: '📝' },
    { id: 'allocations', label: 'Seat Allocations', count: data?.seatAllocationsCount ?? 0, icon: '🪑' },
    { id: 'attendances', label: 'Attendance', count: data?.attendancesCount ?? 0, icon: '📋' },
  ];

  const filterList = (list, searchFields) => {
    if (!list) return [];
    if (!searchTerm.trim()) return list;
    const term = searchTerm.trim().toLowerCase();
    return list.filter((item) =>
      searchFields.some((field) => {
        const val = item[field];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(term);
      })
    );
  };

  return (
    <div className="section-panel" data-testid="database-overview-panel" style={{ padding: '8px 0' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '24px 28px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.6rem' }}>💾</span>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#ffffff' }}>
              Database Entity Overview
            </h2>
            <span
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#93c5fd',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Admin Read-Only
            </span>
          </div>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.92rem' }}>
            Safe, real-time inspection of database-backed records and relations across all 9 core entities.
          </p>
        </div>

        <button
          type="button"
          onClick={loadOverview}
          disabled={loading}
          data-testid="refresh-overview-btn"
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#ffffff',
            padding: '9px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          <span>🔄</span>
          <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Metrics Row */}
      {data && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <div
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchTerm('');
                }}
                data-testid={`metric-card-${tab.id}`}
                style={{
                  background: isActive ? '#eff6ff' : '#ffffff',
                  border: `1.5px solid ${isActive ? '#3b82f6' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  padding: '14px 12px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 4px 6px -1px rgba(59, 130, 246, 0.1)' : '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{tab.icon}</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: isActive ? '#1d4ed8' : '#0f172a' }}>
                  {tab.count}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isActive ? '#2563eb' : '#64748b' }}>
                  {tab.label}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation Pills & Search Bar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSearchTerm('');
              }}
              data-testid={`tab-btn-${tab.id}`}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: activeTab === tab.id ? '#1e3a8a' : '#f1f5f9',
                color: activeTab === tab.id ? '#ffffff' : '#334155',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                style={{
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                  color: activeTab === tab.id ? '#ffffff' : '#475569',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div>
          <input
            type="text"
            placeholder={`Filter ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="overview-search-input"
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              width: '200px',
            }}
          />
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div className="state-box" style={{ padding: '40px', textAlign: 'center' }}>
          Loading database records...
        </div>
      ) : !data ? (
        <div className="state-box">No database data available.</div>
      ) : (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          {/* TAB 1: DEPARTMENTS */}
          {activeTab === 'departments' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Actual Sections</th>
                    <th>Actual Students</th>
                  </tr>
                </thead>
                <tbody>
                  {filterList(data.departments, ['id', 'code', 'name']).map((dept) => (
                    <tr key={dept.id}>
                      <td><strong>{dept.id}</strong></td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8' }}>
                          {dept.code}
                        </span>
                      </td>
                      <td>{dept.name}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{dept.sectionCount}</span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: dept.studentCount > 0 ? '#0f172a' : '#94a3b8',
                          }}
                        >
                          {dept.studentCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: SECTIONS */}
          {activeTab === 'sections' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Department</th>
                    <th>Section Name</th>
                    <th>Actual Students</th>
                    <th>Configured Expected</th>
                    <th>Roll Range</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filterList(data.sections, ['id', 'departmentCode', 'departmentName', 'name', 'rollRange']).map(
                    (sec) => (
                      <tr key={sec.id}>
                        <td><strong>{sec.id}</strong></td>
                        <td>
                          {sec.departmentName} ({sec.departmentCode})
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#1e3a8a' }}>Section {sec.name}</span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontWeight: 700,
                              color: sec.actualStudents > 0 ? '#15803d' : '#64748b',
                            }}
                          >
                            {sec.actualStudents}
                          </span>
                        </td>
                        <td>
                          {sec.isConfigured ? (
                            <span>{sec.expectedStudents}</span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>NULL</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{sec.rollRange}</span>
                        </td>
                        <td>
                          {!sec.isConfigured ? (
                            <span
                              style={{
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                              }}
                            >
                              ⚠️ Unconfigured / Legacy
                            </span>
                          ) : sec.expectedStudents === sec.actualStudents ? (
                            <span
                              style={{
                                background: '#dcfce7',
                                color: '#15803d',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                              }}
                            >
                              ✓ Matches DB
                            </span>
                          ) : (
                            <span
                              style={{
                                background: '#fee2e2',
                                color: '#b91c1c',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                              }}
                            >
                              ⚠️ Mismatch
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: STUDENTS */}
          {activeTab === 'students' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Roll Number</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Sem / Yr</th>
                    <th>Department</th>
                    <th>Section</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filterList(data.students, ['id', 'rollNumber', 'fullName', 'email', 'departmentCode', 'sectionName', 'status']).map(
                    (st) => (
                      <tr key={st.id}>
                        <td>{st.id}</td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                            {st.rollNumber}
                          </span>
                        </td>
                        <td>{st.fullName}</td>
                        <td style={{ color: '#64748b' }}>{st.email}</td>
                        <td>
                          Sem {st.semester} / Yr {st.year}
                        </td>
                        <td>{st.departmentCode}</td>
                        <td>Section {st.sectionName}</td>
                        <td>
                          <span
                            style={{
                              background: st.status === 'ACTIVE' ? '#dcfce7' : st.status === 'DETAINED' ? '#fee2e2' : '#f1f5f9',
                              color: st.status === 'ACTIVE' ? '#15803d' : st.status === 'DETAINED' ? '#b91c1c' : '#475569',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {st.status}
                          </span>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: BUILDINGS */}
          {activeTab === 'buildings' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filterList(data.buildings, ['id', 'code', 'name', 'description']).map((b) => (
                    <tr key={b.id}>
                      <td>{b.id}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8' }}>
                          {b.code}
                        </span>
                      </td>
                      <td><strong>{b.name}</strong></td>
                      <td style={{ color: '#475569' }}>{b.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: FLOORS */}
          {activeTab === 'floors' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Building</th>
                    <th>Floor Number</th>
                    <th>Floor Name</th>
                  </tr>
                </thead>
                <tbody>
                  {filterList(data.floors, ['id', 'buildingCode', 'buildingName', 'floorName']).map((fl) => (
                    <tr key={fl.id}>
                      <td>{fl.id}</td>
                      <td>
                        {fl.buildingName} ({fl.buildingCode})
                      </td>
                      <td>{fl.floorNumber}</td>
                      <td><strong>{fl.floorName}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: ROOMS */}
          {activeTab === 'rooms' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Room Number</th>
                    <th>Building</th>
                    <th>Floor</th>
                    <th>Capacity</th>
                    <th>Grid Layout</th>
                  </tr>
                </thead>
                <tbody>
                  {filterList(data.rooms, ['id', 'roomNumber', 'building', 'floor']).map((rm) => (
                    <tr key={rm.id}>
                      <td>{rm.id}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{rm.roomNumber}</span>
                      </td>
                      <td>{rm.building}</td>
                      <td>Floor {rm.floor}</td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{rm.capacity} seats</strong>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', color: '#64748b' }}>
                          {rm.rowsCount} rows × {rm.columnsCount} cols
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 7: EXAMS */}
          {activeTab === 'exams' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Date</th>
                    <th>Time & Session</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filterList(data.exams, ['id', 'subjectCode', 'subjectName', 'examDate', 'session', 'status']).map(
                    (ex) => (
                      <tr key={ex.id}>
                        <td>{ex.id}</td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8' }}>
                            {ex.subjectCode}
                          </span>
                        </td>
                        <td><strong>{ex.subjectName}</strong></td>
                        <td>{ex.examDate}</td>
                        <td>
                          {ex.session} ({ex.startTime} – {ex.endTime})
                        </td>
                        <td>
                          <span
                            style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {ex.status}
                          </span>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 8: SEAT ALLOCATIONS */}
          {activeTab === 'allocations' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Exam Subject</th>
                    <th>Room</th>
                    <th>Seat Number</th>
                    <th>Grid Pos</th>
                    <th>Student Roll</th>
                    <th>Student Name</th>
                  </tr>
                </thead>
                <tbody>
                  {filterList(data.seatAllocations, ['id', 'subjectCode', 'roomNumber', 'studentRoll', 'studentName']).map(
                    (sa) => (
                      <tr key={sa.id}>
                        <td>{sa.id}</td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{sa.subjectCode}</span>
                        </td>
                        <td>{sa.roomNumber}</td>
                        <td>
                          <strong style={{ color: '#1d4ed8' }}>Seat {sa.seatNumber}</strong>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                          R{sa.rowNumber} : C{sa.columnNumber}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{sa.studentRoll}</span>
                        </td>
                        <td>{sa.studentName}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 9: ATTENDANCES */}
          {activeTab === 'attendances' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Exam Subject</th>
                    <th>Room</th>
                    <th>Seat #</th>
                    <th>Student Roll</th>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th>Marked At</th>
                  </tr>
                </thead>
                <tbody>
                  {filterList(data.attendances, ['id', 'subjectCode', 'roomNumber', 'studentRoll', 'studentName', 'status']).map(
                    (att) => (
                      <tr key={att.id}>
                        <td>{att.id}</td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{att.subjectCode}</span>
                        </td>
                        <td>{att.roomNumber}</td>
                        <td>
                          <strong>Seat {att.seatNumber}</strong>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{att.studentRoll}</span>
                        </td>
                        <td>{att.studentName}</td>
                        <td>
                          <span
                            style={{
                              background: att.status === 'PRESENT' ? '#dcfce7' : att.status === 'ABSENT' ? '#fee2e2' : '#fef3c7',
                              color: att.status === 'PRESENT' ? '#15803d' : att.status === 'ABSENT' ? '#b91c1c' : '#b45309',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {att.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                          {att.markedAt ? String(att.markedAt).replace('T', ' ').substring(0, 19) : '—'}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatabaseOverview;
