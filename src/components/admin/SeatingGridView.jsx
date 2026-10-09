import React, { useState, useMemo } from 'react';

/**
 * Visual Seating Grid and Table component displaying examination hall seating layout.
 * Accurately renders physical rows and columns based on backend Room definitions and allocation coordinates.
 * Features:
 * - Physical grid mapped to room rowsCount × columnsCount
 * - Clear identification of occupied seats vs empty seats
 * - Search by student name, roll number, department, section, seat number
 * - Dynamic department and section filters
 * - Room Allocation Table roster view
 * - Room statistics (Capacity, Occupied, Empty, Occupancy %)
 */
export const SeatingGridView = ({
  exam,
  allocations = [],
  rooms = [],
  activeRoomId,
  onSelectRoom,
  onDownloadRoomPdf,
  downloadingPdf
}) => {
  // If multiple rooms exist in allocations, let admin filter/switch rooms
  const allocatedRoomIds = useMemo(() => {
    const ids = new Set();
    allocations.forEach((a) => {
      if (a.roomId) ids.add(a.roomId);
    });
    return Array.from(ids);
  }, [allocations]);

  const [internalRoomId, setInternalRoomId] = useState(
    activeRoomId
      ? String(activeRoomId)
      : allocatedRoomIds.length > 0
      ? String(allocatedRoomIds[0])
      : ''
  );

  const selectedRoomId = activeRoomId ? String(activeRoomId) : internalRoomId;

  const handleRoomSelect = (id) => {
    setInternalRoomId(String(id));
    if (onSelectRoom) {
      onSelectRoom(id);
    }
  };

  const activeRoom = useMemo(() => {
    if (!selectedRoomId) return rooms[0] || null;
    return (
      rooms.find((r) => String(r.id) === String(selectedRoomId)) || {
        id: selectedRoomId,
        roomNumber: allocations.find((a) => String(a.roomId) === String(selectedRoomId))?.roomNumber || 'Hall',
        rowsCount: 4,
        columnsCount: 4,
      }
    );
  }, [selectedRoomId, rooms, allocations]);

  // Allocations strictly for this active room
  const roomAllocations = useMemo(() => {
    if (!selectedRoomId) return allocations;
    return allocations.filter((a) => String(a.roomId) === String(selectedRoomId));
  }, [selectedRoomId, allocations]);

  // Build grid map by rowNumber and columnNumber (0-indexed from backend)
  const gridMap = useMemo(() => {
    const map = {};
    roomAllocations.forEach((alloc) => {
      const key = `${alloc.rowNumber}-${alloc.columnNumber}`;
      map[key] = alloc;
    });
    return map;
  }, [roomAllocations]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  // Dynamic Department & Section lists from current room allocations
  const availableDepartments = useMemo(() => {
    const depts = new Set();
    roomAllocations.forEach((a) => {
      if (a.department) depts.add(a.department);
    });
    return Array.from(depts).sort();
  }, [roomAllocations]);

  const availableSections = useMemo(() => {
    const secs = new Set();
    roomAllocations.forEach((a) => {
      if (a.section) secs.add(a.section);
    });
    return Array.from(secs).sort();
  }, [roomAllocations]);

  // Match evaluator for client-side search/filter
  const isMatch = (alloc) => {
    if (!alloc) return false;
    if (departmentFilter && alloc.department !== departmentFilter) return false;
    if (sectionFilter && alloc.section !== sectionFilter) return false;
    if (searchTerm) {
      const q = searchTerm.trim().toLowerCase();
      const name = (alloc.studentName || '').toLowerCase();
      const roll = (alloc.rollNumber || '').toLowerCase();
      const dept = (alloc.department || '').toLowerCase();
      const sec = (alloc.section || '').toLowerCase();
      const seat = String(alloc.seatNumber || '');
      return name.includes(q) || roll.includes(q) || dept.includes(q) || sec.includes(q) || seat === q;
    }
    return true;
  };

  const isFilterActive = Boolean(searchTerm.trim() || departmentFilter || sectionFilter);

  // Filtered room allocations for table roster
  const filteredRoomAllocations = useMemo(() => {
    return roomAllocations
      .filter(isMatch)
      .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));
  }, [roomAllocations, searchTerm, departmentFilter, sectionFilter]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('');
    setSectionFilter('');
  };

  if (!allocations || allocations.length === 0) {
    return (
      <div className="state-box">
        No seating allocations found for this examination. Please generate an allocation first.
      </div>
    );
  }

  // Room geometry and metrics
  const rows = activeRoom ? activeRoom.rowsCount : 4;
  const cols = activeRoom ? activeRoom.columnsCount : 4;
  const totalHallCapacity = activeRoom?.capacity || (rows * cols);
  const occupiedSeatsCount = roomAllocations.length;
  const emptySeatsCount = Math.max(0, totalHallCapacity - occupiedSeatsCount);
  const occupancyPercentage =
    totalHallCapacity > 0
      ? ((occupiedSeatsCount / totalHallCapacity) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="seating-grid-section">
      {/* Header & Room Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', color: '#1e3a8a', fontWeight: 700 }}>
            Seating Arrangement: {exam ? `${exam.subjectCode} - ${exam.subjectName}` : 'Exam'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Room {activeRoom ? activeRoom.roomNumber : 'Hall'} ({rows} Rows × {cols} Columns) • Non-adjacent algorithmic distribution
          </p>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {allocatedRoomIds.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
              <label htmlFor="gridRoomSelect" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Room:
              </label>
              <select
                id="gridRoomSelect"
                className="form-control"
                style={{ width: 'auto', minWidth: '140px', padding: '6px 10px', fontSize: '0.85rem' }}
                value={selectedRoomId}
                onChange={(e) => handleRoomSelect(e.target.value)}
              >
                {allocatedRoomIds.map((rId) => {
                  const r = rooms.find((rm) => String(rm.id) === String(rId));
                  return (
                    <option key={rId} value={rId}>
                      {r ? `Room ${r.roomNumber}` : `Room ID #${rId}`}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('grid')}
          >
            🪑 Visual Grid
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('table')}
          >
            📋 Room Roster Table
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onDownloadRoomPdf && onDownloadRoomPdf(selectedRoomId)}
            disabled={Boolean(downloadingPdf)}
            title="Download Room Seating Chart PDF"
          >
            {downloadingPdf === 'room' ? '⏳ Generating PDF...' : '🗺️ Download Room Seating PDF'}
          </button>
        </div>
      </div>

      {/* Room Statistics Banner (Section 17) */}
      <div className="capacity-summary-card" style={{ padding: '14px 20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Hall / Room
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e3a8a' }}>
              {activeRoom ? `Room ${activeRoom.roomNumber}` : 'Exam Hall'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Capacity
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {totalHallCapacity} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>({rows}×{cols})</span>
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Occupied Seats
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0284c7' }}>
              {occupiedSeatsCount}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Empty Seats
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#64748b' }}>
              {emptySeatsCount}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Room Occupancy
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>
              {occupancyPercentage}%
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="grid-legend" style={{ margin: 0 }}>
          <div className="legend-item">
            <span className="legend-indicator legend-occupied" />
            <span>Allocated Student</span>
          </div>
          <div className="legend-item">
            <span className="legend-indicator legend-empty" />
            <span>EMPTY / Available</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar (Section 15 & 16) */}
      <div className="seating-filter-bar">
        <input
          type="text"
          className="filter-input"
          placeholder="🔍 Search student name, roll number, seat #..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="filter-select"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
        >
          <option value="">All Departments</option>
          {availableDepartments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
        >
          <option value="">All Sections</option>
          {availableSections.map((sec) => (
            <option key={sec} value={sec}>
              Section {sec}
            </option>
          ))}
        </select>

        {isFilterActive && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleClearFilters}
            style={{ padding: '8px 14px' }}
          >
            Clear Filters
          </button>
        )}

        {isFilterActive && (
          <span style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: 600, marginLeft: 'auto' }}>
            Showing {filteredRoomAllocations.length} of {occupiedSeatsCount} allocated students
          </span>
        )}
      </div>

      {/* Main Content: Visual Grid or Table */}
      {viewMode === 'grid' ? (
        <div className="room-grid-container">
          {/* Invigilator / Blackboard Stage Banner (Section 13) */}
          <div
            style={{
              background: '#334155',
              color: '#f8fafc',
              textAlign: 'center',
              padding: '8px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.82rem',
              letterSpacing: '0.06em',
              marginBottom: '20px',
            }}
          >
            ▲ FRONT / TEACHER DESK / BLACKBOARD ▲
          </div>

          <div
            className="grid-board"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(130px, 1fr))`,
            }}
          >
            {Array.from({ length: rows }).map((_, rIndex) =>
              Array.from({ length: cols }).map((_, cIndex) => {
                const key = `${rIndex}-${cIndex}`;
                const alloc = gridMap[key];
                const calculatedSeatNumber = rIndex * cols + cIndex + 1;
                const displaySeatNumber = alloc?.seatNumber !== undefined ? alloc.seatNumber : calculatedSeatNumber;

                if (alloc) {
                  const matches = isMatch(alloc);
                  const seatClass = `seat-box occupied ${isFilterActive ? (matches ? 'highlight' : 'dimmed') : ''}`;

                  return (
                    <div key={key} className={seatClass}>
                      <div className="seat-header">
                        <span>Seat #{displaySeatNumber}</span>
                        <span>R{rIndex + 1}-C{cIndex + 1}</span>
                      </div>
                      <div>
                        <div className="seat-student-name" title={alloc.studentName || alloc.rollNumber}>
                          {alloc.studentName || alloc.rollNumber}
                        </div>
                        <div className="seat-roll">{alloc.rollNumber}</div>
                      </div>
                      <div className="seat-dept-sec">
                        {alloc.department}-{alloc.section}
                      </div>
                    </div>
                  );
                }

                // Empty / Available seat
                const emptyClass = `seat-box empty ${isFilterActive ? 'dimmed' : ''}`;
                return (
                  <div key={key} className={emptyClass}>
                    <div className="seat-header">
                      <span>Seat #{displaySeatNumber}</span>
                      <span>R{rIndex + 1}-C{cIndex + 1}</span>
                    </div>
                    <div className="seat-empty-label">EMPTY</div>
                    <div style={{ height: '18px' }} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Allocation Table View (Part 4.C Columns) */
        <div className="table-responsive" style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Roll Number</th>
                <th>Student Name</th>
                <th>Seat Number</th>
                <th>Department</th>
                <th>Section</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoomAllocations.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No allocated students match your search/filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRoomAllocations.map((alloc, idx) => (
                  <tr key={alloc.allocationId || `${alloc.rowNumber}-${alloc.columnNumber}`}>
                    <td style={{ fontWeight: 600, color: '#64748b', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600, color: '#0284c7' }}>{alloc.rollNumber}</td>
                    <td><strong>{alloc.studentName || alloc.rollNumber}</strong></td>
                    <td>
                      <span className="status-badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }}>
                        Seat #{alloc.seatNumber}
                      </span>
                    </td>
                    <td>{alloc.department}</td>
                    <td>Section {alloc.section}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SeatingGridView;
