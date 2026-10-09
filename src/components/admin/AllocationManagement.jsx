import React, { useState, useEffect, useMemo } from 'react';
import {
  getExams,
  getStudents,
  getRooms,
  getDepartments,
  getSections,
  generateAllocation,
  getAllocationsByExam,
  getAllocationsByExamAndRoom,
  downloadExamSeatingPdf,
  downloadRoomSeatingPdf,
} from '../../services/adminService.js';
import SeatingGridView from './SeatingGridView.jsx';

/**
 * Seating Arrangement Management Component for College Administrators.
 * Implements:
 * - Dynamic exam selection with detailed exam metadata
 * - Allocation status determination (Generated vs Not Generated)
 * - Allocation summary metrics across halls
 * - Room cards list with building, floor, capacity, allocated, empty, and occupancy %
 * - Interactive room selection loading room-specific allocations via backend API
 * - Room Seating Grid and Table views with search & filtering
 * - Refresh capability preserving selected exam and room
 * - Full Seating Allocation Wizard with:
 *     Step A: Target Examination selection
 *     Step B: Intentional Department -> Section -> Student selection from MySQL (no Semester filter)
 *     Step C: Hierarchical Building -> Floor -> Room selection with capacity status
 */
export const AllocationManagement = () => {
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Active top mode: 'management' (view seating arrangement) or 'wizard' (generate seating)
  const [activeMode, setActiveMode] = useState('management');

  // Exam Selection
  const [selectedExamId, setSelectedExamId] = useState('');
  const [allocations, setAllocations] = useState([]);
  const [loadingAllocations, setLoadingAllocations] = useState(false);

  // Room Selection within active Exam
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [roomAllocations, setRoomAllocations] = useState([]);
  const [loadingRoomAllocations, setLoadingRoomAllocations] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(null); // 'exam', 'room', 'attendance'

  // Wizard Generation State
  const [wizardStudentIds, setWizardStudentIds] = useState(new Set());
  const [wizardRoomIds, setWizardRoomIds] = useState(new Set());
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [expandedBuildings, setExpandedBuildings] = useState(new Set());
  const [expandedFloors, setExpandedFloors] = useState(new Set());
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadPrerequisites();
  }, []);

  const loadPrerequisites = async () => {
    setLoading(true);
    setError(null);
    try {
      const [exData, stData, rmData, deptData, secData] = await Promise.all([
        getExams(),
        getStudents(),
        getRooms(),
        getDepartments(),
        getSections(),
      ]);
      setExams(exData || []);
      setStudents(stData || []);
      setRooms(rmData || []);
      setDepartments(deptData || []);
      setSections(secData || []);

      if (exData && exData.length > 0) {
        const firstExamId = String(exData[0].id);
        setSelectedExamId(firstExamId);
        await loadExistingAllocations(firstExamId);
      }
    } catch (err) {
      setError('Unable to load prerequisites (exams, students, rooms, or academic data).');
    } finally {
      setLoading(false);
    }
  };

  // Auto-expand all buildings and floors whenever rooms are loaded
  useEffect(() => {
    if (rooms && rooms.length > 0) {
      const bKeys = new Set();
      const fKeys = new Set();
      rooms.forEach((rm) => {
        const bKey = String(rm.buildingEntity?.id || rm.building || 'Default-Bldg');
        const fKey = String(rm.floorEntity?.id || rm.floor || 'Default-Floor');
        bKeys.add(bKey);
        fKeys.add(fKey);
      });
      setExpandedBuildings(bKeys);
      setExpandedFloors(fKeys);
    }
  }, [rooms]);

  /**
   * Load complete allocations for a given exam.
   */
  const loadExistingAllocations = async (examId, preserveRoomId = null) => {
    if (!examId) {
      setAllocations([]);
      setRoomAllocations([]);
      setSelectedRoomId('');
      return;
    }

    setLoadingAllocations(true);
    try {
      const data = await getAllocationsByExam(examId);
      const allocList = data || [];
      setAllocations(allocList);

      if (allocList.length > 0) {
        const availableRoomIds = Array.from(new Set(allocList.map((a) => String(a.roomId))));
        let targetRoomId = availableRoomIds[0];

        if (preserveRoomId && availableRoomIds.includes(String(preserveRoomId))) {
          targetRoomId = String(preserveRoomId);
        }

        setSelectedRoomId(targetRoomId);
        await loadRoomSpecificAllocations(examId, targetRoomId);
      } else {
        setSelectedRoomId('');
        setRoomAllocations([]);
      }
    } catch (err) {
      console.warn('Could not fetch existing allocations for exam', examId, err);
      setAllocations([]);
      setRoomAllocations([]);
      setSelectedRoomId('');
    } finally {
      setLoadingAllocations(false);
    }
  };

  /**
   * Load room-specific allocation using GET /api/allocations/{examId}/room/{roomId}
   */
  const loadRoomSpecificAllocations = async (examId, roomId) => {
    if (!examId || !roomId) {
      setRoomAllocations([]);
      return;
    }

    setLoadingRoomAllocations(true);
    try {
      const data = await getAllocationsByExamAndRoom(examId, roomId);
      setRoomAllocations(data || []);
    } catch (err) {
      console.warn(`Could not fetch room ${roomId} allocations:`, err);
      const fallback = allocations.filter((a) => String(a.roomId) === String(roomId));
      setRoomAllocations(fallback);
    } finally {
      setLoadingRoomAllocations(false);
    }
  };

  // Exam Selection Change Handler
  const handleExamChange = (e) => {
    const examId = e.target.value;
    setSelectedExamId(examId);
    setSuccess(null);
    setError(null);
    loadExistingAllocations(examId);
  };

  // Room Selection Click Handler
  const handleSelectRoom = (roomId) => {
    setSelectedRoomId(String(roomId));
    if (selectedExamId) {
      loadRoomSpecificAllocations(selectedExamId, roomId);
    }
  };

  // Refresh Handler
  const handleRefresh = async () => {
    if (!selectedExamId) return;
    setRefreshing(true);
    setSuccess(null);
    setError(null);
    try {
      const [exData, rmData, stData, deptData, secData] = await Promise.all([
        getExams(),
        getRooms(),
        getStudents(),
        getDepartments(),
        getSections(),
      ]);
      setExams(exData || []);
      setRooms(rmData || []);
      setStudents(stData || []);
      setDepartments(deptData || []);
      setSections(secData || []);
      await loadExistingAllocations(selectedExamId, selectedRoomId);
    } catch (err) {
      setError('Unable to refresh seating data. Please check backend connectivity.');
    } finally {
      setRefreshing(false);
    }
  };

  // PDF Export Handlers
  const handleDownloadExamPdf = async () => {
    if (!selectedExamId) {
      setError('Please select an Examination.');
      return;
    }
    if (allocations.length === 0) {
      setError('No seating arrangement has been generated for this exam yet. Please generate seating allocation first.');
      return;
    }
    if (activeMode === 'wizard' && wizardStudentIds.size > 0 && wizardStudentIds.size !== allocations.length) {
      setError(`Cannot download PDF: You have selected ${wizardStudentIds.size} students in the wizard, but persisted seating contains ${allocations.length} students. Please click "Generate Seating Allocation" first to allocate all ${wizardStudentIds.size} selected students.`);
      return;
    }
    setDownloadingPdf('exam');
    setError(null);
    setSuccess(null);
    try {
      await downloadExamSeatingPdf(selectedExamId, currentExamObj?.subjectCode || 'EXAM');
      setSuccess(`Complete Seating PDF (${allocations.length} students) downloaded successfully.`);
    } catch (err) {
      console.error('Failed to download exam seating PDF:', err);
      const msg = err.response?.data?.message || 'Unable to generate PDF. Please try again.';
      setError(msg);
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleDownloadRoomPdf = async (roomIdToUse = selectedRoomId) => {
    if (!selectedExamId || !roomIdToUse) return;
    setDownloadingPdf('room');
    setError(null);
    setSuccess(null);
    try {
      const roomObj = roomsUsedInExam.find((r) => String(r.id) === String(roomIdToUse)) || activeRoomObj;
      await downloadRoomSeatingPdf(
        selectedExamId,
        roomIdToUse,
        currentExamObj?.subjectCode || 'EXAM',
        roomObj?.roomNumber || 'ROOM'
      );
      setSuccess('PDF downloaded successfully.');
    } catch (err) {
      console.error('Failed to download room seating PDF:', err);
      setError('Unable to generate PDF. Please try again.');
    } finally {
      setDownloadingPdf(null);
    }
  };

  // Active Exam Object
  const currentExamObj = useMemo(() => {
    return exams.find((e) => String(e.id) === String(selectedExamId)) || null;
  }, [exams, selectedExamId]);

  // Distinct rooms used in the selected exam's allocations
  const roomsUsedInExam = useMemo(() => {
    const map = new Map();
    allocations.forEach((a) => {
      if (a.roomId && !map.has(String(a.roomId))) {
        const foundRoom = rooms.find((r) => String(r.id) === String(a.roomId));
        map.set(String(a.roomId), {
          id: a.roomId,
          roomNumber: a.roomNumber || foundRoom?.roomNumber || `Room #${a.roomId}`,
          building: foundRoom?.buildingEntity?.name || foundRoom?.building || 'Campus Hall',
          floor: foundRoom?.floorEntity?.floorName || foundRoom?.floor || 'Floor',
          capacity: foundRoom?.capacity || (foundRoom?.rowsCount * foundRoom?.columnsCount) || 12,
          rowsCount: foundRoom?.rowsCount || 4,
          columnsCount: foundRoom?.columnsCount || 4,
        });
      }
    });
    return Array.from(map.values());
  }, [allocations, rooms]);

  // Overall Allocation Summary Statistics
  const summaryMetrics = useMemo(() => {
    const totalAllocated = allocations.length;
    const roomsCount = roomsUsedInExam.length;
    let totalCapacity = 0;

    roomsUsedInExam.forEach((r) => {
      totalCapacity += r.capacity || (r.rowsCount * r.columnsCount);
    });

    const emptySeats = Math.max(0, totalCapacity - totalAllocated);
    const coverage = totalCapacity > 0 ? ((totalAllocated / totalCapacity) * 100).toFixed(1) : '0.0';

    return {
      totalAllocated,
      roomsCount,
      totalCapacity,
      emptySeats,
      coverage,
    };
  }, [allocations, roomsUsedInExam]);

  // Active Room Details for Selected Room
  const activeRoomObj = useMemo(() => {
    if (!selectedRoomId) return roomsUsedInExam[0] || rooms[0] || null;
    return (
      roomsUsedInExam.find((r) => String(r.id) === String(selectedRoomId)) ||
      rooms.find((r) => String(r.id) === String(selectedRoomId)) ||
      null
    );
  }, [selectedRoomId, roomsUsedInExam, rooms]);

  // =========================================================================
  // STEP B: INTENTIONAL DEPARTMENT & SECTION SELECTION (NO SEMESTER DROPDOWN)
  // =========================================================================

  const handleDeptChange = (e) => {
    const newDeptId = e.target.value;
    setSelectedDeptId(newDeptId);
    if (newDeptId === 'ALL') {
      setSelectedSectionId('ALL'); // automatically include all sections when All Departments is chosen
    } else {
      setSelectedSectionId(''); // prompt user to pick section for this department
    }
  };

  const handleSectionChange = (e) => {
    const newSecId = e.target.value;
    setSelectedSectionId(newSecId);
  };

  const availableSectionsForDept = useMemo(() => {
    if (!selectedDeptId) return [];
    if (selectedDeptId === 'ALL') {
      return sections.map((s) => {
        const dept = departments.find((d) => String(d.id) === String(s.department?.id || s.departmentId));
        return {
          id: s.id,
          name: s.name,
          departmentCode: dept?.code || s.department?.code || '',
        };
      });
    }
    return sections
      .filter((s) => {
        const dId = s.department?.id || s.departmentId;
        return String(dId) === String(selectedDeptId);
      })
      .map((s) => ({
        id: s.id,
        name: s.name,
        departmentCode: '',
      }));
  }, [sections, departments, selectedDeptId]);

  const displayedStudents = useMemo(() => {
    if (!selectedDeptId || !selectedSectionId) {
      return [];
    }
    return students.filter((s) => {
      const sDeptId = String(s.department?.id || s.departmentId);
      const sSecId = String(s.section?.id || s.sectionId);

      const matchDept = (selectedDeptId === 'ALL') || (sDeptId === String(selectedDeptId));
      if (!matchDept) return false;

      if (selectedSectionId === 'ALL') {
        return true;
      }
      return sSecId === String(selectedSectionId);
    });
  }, [students, selectedDeptId, selectedSectionId]);

  const handleToggleStudent = (id) => {
    setWizardStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllShown = () => {
    setWizardStudentIds((prev) => {
      const next = new Set(prev);
      displayedStudents.forEach((st) => {
        if (st.status !== 'DETAINED' && st.status !== 'INACTIVE') {
          next.add(st.id);
        }
      });
      return next;
    });
  };

  const handleDeselectAll = () => {
    setWizardStudentIds(new Set());
  };

  // =========================================================================
  // STEP C: HIERARCHICAL ROOM SELECTOR (BUILDING -> FLOOR -> ROOM)
  // =========================================================================

  const roomHierarchy = useMemo(() => {
    const bMap = new Map();
    rooms.forEach((rm) => {
      const bKey = String(rm.buildingEntity?.id || rm.building || 'Default-Bldg');
      const bName = rm.buildingEntity?.name || rm.building || 'Main Campus Block';
      const bCode = rm.buildingEntity?.code || '';

      if (!bMap.has(bKey)) {
        bMap.set(bKey, { key: bKey, name: bName, code: bCode, floors: new Map() });
      }
      const bObj = bMap.get(bKey);

      const fKey = String(rm.floorEntity?.id || rm.floor || 'Default-Floor');
      const fName = rm.floorEntity?.floorName || rm.floor || 'Floor Level';
      const fNum = rm.floorEntity?.floorNumber ?? 0;

      if (!bObj.floors.has(fKey)) {
        bObj.floors.set(fKey, { key: fKey, name: fName, number: fNum, rooms: [] });
      }
      bObj.floors.get(fKey).rooms.push(rm);
    });

    return Array.from(bMap.values()).map((b) => ({
      ...b,
      floors: Array.from(b.floors.values()).sort((f1, f2) => f1.number - f2.number),
    }));
  }, [rooms]);

  const toggleBuilding = (bKey) => {
    setExpandedBuildings((prev) => {
      const next = new Set(prev);
      if (next.has(bKey)) next.delete(bKey);
      else next.add(bKey);
      return next;
    });
  };

  const toggleFloor = (fKey) => {
    setExpandedFloors((prev) => {
      const next = new Set(prev);
      if (next.has(fKey)) next.delete(fKey);
      else next.add(fKey);
      return next;
    });
  };

  const handleToggleRoom = (id) => {
    setWizardRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRemoveSelectedRoom = (roomId) => {
    setWizardRoomIds((prev) => {
      const next = new Set(prev);
      next.delete(roomId);
      return next;
    });
  };

  const selectedRoomsList = useMemo(() => {
    return rooms.filter((r) => wizardRoomIds.has(r.id));
  }, [rooms, wizardRoomIds]);

  const totalSelectedStudents = wizardStudentIds.size;
  const totalWizardCapacity = useMemo(() => {
    let seats = 0;
    rooms.forEach((r) => {
      if (wizardRoomIds.has(r.id)) {
        seats += r.capacity || (r.rowsCount * r.columnsCount);
      }
    });
    return seats;
  }, [rooms, wizardRoomIds]);

  const capacityMargin = totalWizardCapacity - totalSelectedStudents;
  const isCapacitySufficient = totalWizardCapacity >= totalSelectedStudents && totalWizardCapacity > 0 && totalSelectedStudents > 0;
  const hasCapacityDeficit = totalSelectedStudents > 0 && totalWizardCapacity > 0 && totalSelectedStudents > totalWizardCapacity;

  // Generate Seating Allocation Handler
  const handleGenerate = async () => {
    setError(null);
    setSuccess(null);

    if (!selectedExamId) {
      setError('Please select an Examination.');
      return;
    }
    if (wizardStudentIds.size === 0) {
      setError('Please select at least one student to allocate.');
      return;
    }
    if (wizardRoomIds.size === 0) {
      setError('Please select at least one examination hall / room.');
      return;
    }
    if (totalSelectedStudents > totalWizardCapacity) {
      setError(`Insufficient seating capacity! Selected students (${totalSelectedStudents}) exceed available seats (${totalWizardCapacity}).`);
      return;
    }

    setGenerating(true);
    try {
      const payload = {
        examId: Number(selectedExamId),
        studentIds: Array.from(wizardStudentIds),
        roomIds: Array.from(wizardRoomIds),
      };

      const result = await generateAllocation(payload);
      setSuccess(`Seating arrangement generated successfully! Allocated ${result?.length || 0} students across ${wizardRoomIds.size} halls.`);
      setActiveMode('management');
      await loadExistingAllocations(selectedExamId);
    } catch (err) {
      console.error('Allocation generation error:', err);
      const msg =
        err.response?.data?.message ||
        'Seating allocation failed. Ensure selected rooms have sufficient capacity and algorithm constraints can be satisfied.';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="state-box">Loading examinations and hall data...</div>;
  }

  const hasAllocations = allocations.length > 0;

  return (
    <div>
      {/* Upper Status Notifications */}
      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Top Header Bar: Exam Selector & View Switcher */}
      <div className="exam-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <label htmlFor="examSelect" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e3a8a' }}>
            Target Examination:
          </label>
          <select
            id="examSelect"
            className="form-control"
            style={{ minWidth: '320px', maxWidth: '480px' }}
            value={selectedExamId}
            onChange={handleExamChange}
          >
            <option value="">Select an Examination...</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.subjectCode} - {ex.subjectName} ({ex.session || 'Session'} | {ex.examDate})
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            disabled={refreshing || !selectedExamId}
            title="Reload Seating Data"
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh Data'}
          </button>
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeMode === 'management' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveMode('management')}
          >
            📊 View Seating Arrangement
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeMode === 'wizard' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveMode('wizard')}
          >
            ⚡ Seating Allocation Wizard
          </button>
        </div>
      </div>

      {/* Active Examination Details Banner */}
      {currentExamObj && (
        <div className="exam-info-card">
          <div className="exam-info-grid">
            <div className="exam-info-item">
              <span className="exam-info-label">Subject</span>
              <span className="exam-info-val">{currentExamObj.subjectCode} - {currentExamObj.subjectName}</span>
            </div>
            <div className="exam-info-item">
              <span className="exam-info-label">Exam Date</span>
              <span className="exam-info-val">{currentExamObj.examDate || 'Scheduled Day'}</span>
            </div>
            <div className="exam-info-item">
              <span className="exam-info-label">Time & Session</span>
              <span className="exam-info-val">
                {currentExamObj.startTime?.substring(0, 5)} - {currentExamObj.endTime?.substring(0, 5)} ({currentExamObj.session || 'MORNING'})
              </span>
            </div>
            <div className="exam-info-item">
              <span className="exam-info-label">Semester</span>
              <span className="exam-info-val">Semester {currentExamObj.semester} ({currentExamObj.academicYear})</span>
            </div>
            <div className="exam-info-item">
              <span className="exam-info-label">Status</span>
              <span className="exam-info-val">{currentExamObj.status || 'SCHEDULED'}</span>
            </div>
          </div>

          {/* Exam PDF Export Controls */}
          <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.15)' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDownloadExamPdf}
              disabled={!hasAllocations || Boolean(downloadingPdf)}
              style={{ background: '#ffffff', color: '#1e3a8a', fontWeight: 700, padding: '7px 16px' }}
              title="Download Master Seating PDF for this Exam"
            >
              {downloadingPdf === 'exam' ? '⏳ Generating PDF...' : '📄 Download Complete Seating PDF'}
            </button>
            {!hasAllocations && (
              <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>
                * PDF export will be enabled once seating is generated
              </span>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE A: SEATING ARRANGEMENT MANAGEMENT */}
      {activeMode === 'management' && (
        <div>
          {loadingAllocations ? (
            <div className="state-box">Loading seating arrangement records...</div>
          ) : !hasAllocations ? (
            /* Graceful Empty State */
            <div className="state-box" style={{ background: '#ffffff', padding: '48px 24px', borderRadius: '8px', border: '1px dashed var(--admin-border)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🪑</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '8px' }}>
                No Seating Arrangement Generated Yet
              </h3>
              <p style={{ color: '#64748b', maxWidth: '520px', margin: '0 auto 20px auto', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Seating coordinates have not been allocated for {currentExamObj ? currentExamObj.subjectName : 'this exam'}.
                Click below to launch the Seating Allocation Wizard and distribute candidate seating.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveMode('wizard')}
                style={{ padding: '10px 24px' }}
              >
                ⚡ Launch Seating Allocation Wizard
              </button>
            </div>
          ) : (
            <div>
              {/* Generated Allocation Overview Banner */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#166534' }}>
                    ✓ SEATING ALLOCATION GENERATED
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#15803d', marginTop: '4px' }}>
                    Exam: <strong>{currentExamObj?.subjectCode}</strong> • Students: <strong>{summaryMetrics.totalAllocated}</strong> • Rooms: <strong>{summaryMetrics.roomsCount}</strong> • Seats Used: <strong>{summaryMetrics.totalAllocated}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleDownloadExamPdf}
                    disabled={Boolean(downloadingPdf)}
                    style={{ background: '#ffffff', borderColor: '#86efac', color: '#166534', fontWeight: 600 }}
                  >
                    📄 Download Complete Seating PDF
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const gridEl = document.getElementById('seatingGridViewSection');
                      if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    🔍 View Room-wise Seating
                  </button>
                </div>
              </div>

              {/* Allocation Summary Metrics Cards */}
              <div className="summary-stat-grid">
                <div className="summary-stat-card">
                  <span className="summary-stat-label">Total Allocated Students</span>
                  <span className="summary-stat-val">{summaryMetrics.totalAllocated}</span>
                </div>
                <div className="summary-stat-card">
                  <span className="summary-stat-label">Rooms Used</span>
                  <span className="summary-stat-val" style={{ color: '#0284c7' }}>{summaryMetrics.roomsCount}</span>
                </div>
                <div className="summary-stat-card">
                  <span className="summary-stat-label">Total Available Seats</span>
                  <span className="summary-stat-val" style={{ color: '#475569' }}>{summaryMetrics.totalCapacity}</span>
                </div>
                <div className="summary-stat-card">
                  <span className="summary-stat-label">Total Occupied Seats</span>
                  <span className="summary-stat-val" style={{ color: '#16a34a' }}>{summaryMetrics.totalAllocated}</span>
                </div>
                <div className="summary-stat-card">
                  <span className="summary-stat-label">Empty Buffer Seats</span>
                  <span className="summary-stat-val" style={{ color: '#d97706' }}>{summaryMetrics.emptySeats}</span>
                </div>
                <div className="summary-stat-card">
                  <span className="summary-stat-label">Allocation Coverage</span>
                  <span className="summary-stat-val" style={{ color: '#7c3aed' }}>{summaryMetrics.coverage}%</span>
                </div>
              </div>

              {/* Room Cards List with Building & Floor Visible */}
              <div className="section-panel" style={{ marginBottom: '24px' }}>
                <div className="section-header" style={{ marginBottom: '16px' }}>
                  <div className="section-title-wrap">
                    <h3>Examination Halls Assigned to Exam</h3>
                    <p>Select a room below to inspect its seating layout, occupied desks, and candidate details</p>
                  </div>
                </div>

                <div className="room-cards-grid">
                  {roomsUsedInExam.map((rm) => {
                    const roomAllocs = allocations.filter((a) => String(a.roomId) === String(rm.id));
                    const roomCapacity = rm.capacity || (rm.rowsCount * rm.columnsCount);
                    const occupied = roomAllocs.length;
                    const empty = Math.max(0, roomCapacity - occupied);
                    const occPct = roomCapacity > 0 ? ((occupied / roomCapacity) * 100).toFixed(1) : '0.0';
                    const isSelected = String(rm.id) === String(selectedRoomId);

                    return (
                      <div
                        key={rm.id}
                        className={`room-select-card ${isSelected ? 'active' : ''}`}
                        onClick={() => handleSelectRoom(rm.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="room-select-header">
                          <span className="room-card-number">Room {rm.roomNumber}</span>
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: isSelected ? '#1e3a8a' : '#f1f5f9',
                              color: isSelected ? '#ffffff' : '#334155',
                              fontSize: '0.72rem',
                            }}
                          >
                            {isSelected ? 'Viewing' : 'Select'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, marginTop: '4px' }}>
                          🏢 {rm.building} → {rm.floor}
                        </div>
                        <div className="room-card-metrics" style={{ marginTop: '8px' }}>
                          <div>Capacity: <strong>{roomCapacity}</strong></div>
                          <div>Allocated: <strong style={{ color: '#0284c7' }}>{occupied} / {roomCapacity}</strong></div>
                          <div>Empty: <strong style={{ color: '#d97706' }}>{empty}</strong></div>
                          <div>Occupancy: <strong style={{ color: '#16a34a' }}>{occPct}%</strong></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Room Seating Grid View */}
              <div id="seatingGridViewSection" className="section-panel">
                {loadingRoomAllocations ? (
                  <div className="state-box">Loading room allocation data...</div>
                ) : (
                  <SeatingGridView
                    exam={currentExamObj}
                    allocations={roomAllocations.length > 0 ? roomAllocations : allocations.filter((a) => String(a.roomId) === String(selectedRoomId))}
                    rooms={rooms}
                    activeRoomId={selectedRoomId}
                    onSelectRoom={handleSelectRoom}
                    onDownloadRoomPdf={handleDownloadRoomPdf}
                    downloadingPdf={downloadingPdf}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE B: ALLOCATION GENERATOR WIZARD */}
      {activeMode === 'wizard' && (
        <div className="section-panel">
          <div className="section-header">
            <div className="section-title-wrap">
              <h2>Seating Allocation Wizard</h2>
              <p>Configure candidate students and examination halls to execute the non-adjacent distribution algorithm</p>
            </div>
          </div>

          <div className="allocation-steps">
            {/* STEP A: Select Exam */}
            <div className="step-card">
              <h3 className="step-title">
                <span className="step-badge">1</span>
                <span>Step A: Target Examination</span>
              </h3>
              <div className="form-group" style={{ maxWidth: '480px', margin: 0 }}>
                <select
                  id="wizardExamSelect"
                  className="form-control"
                  value={selectedExamId}
                  onChange={handleExamChange}
                >
                  <option value="">Select an Examination...</option>
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.subjectCode} - {ex.subjectName} ({ex.session || 'Session'} | {ex.examDate})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* STEP B: Select Students (Department -> Section Selection, Semester Filter Completely Removed) */}
            <div className="step-card">
              <h3 className="step-title">
                <span className="step-badge">2</span>
                <span>Step B: Select Students</span>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <label htmlFor="stepBDeptSelect" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Department
                  </label>
                  <select
                    id="stepBDeptSelect"
                    className="form-control"
                    value={selectedDeptId}
                    onChange={handleDeptChange}
                  >
                    <option value="">Select Department...</option>
                    <option value="ALL">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.code} — {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="stepBSectionSelect" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Section
                  </label>
                  <select
                    id="stepBSectionSelect"
                    className="form-control"
                    value={selectedSectionId}
                    onChange={handleSectionChange}
                    disabled={!selectedDeptId}
                  >
                    <option value="">{selectedDeptId ? 'Select Section...' : 'Choose Department First'}</option>
                    {selectedDeptId && <option value="ALL">All Sections</option>}
                    {availableSectionsForDept.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.departmentCode ? `${sec.departmentCode} - Section ${sec.name}` : `Section ${sec.name}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Counts & Action Buttons Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
                  <span>Students Found: <strong>{displayedStudents.length}</strong></span>
                  <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                  <span>Selected: <strong style={{ color: '#1e3a8a' }}>{wizardStudentIds.size}</strong></span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleSelectAllShown}
                    disabled={displayedStudents.length === 0}
                  >
                    Select All ({displayedStudents.filter((s) => s.status !== 'DETAINED' && s.status !== 'INACTIVE').length})
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleDeselectAll}
                    disabled={wizardStudentIds.size === 0}
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Student Selection List */}
              {(!selectedDeptId || !selectedSectionId) ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1', fontSize: '0.9rem' }}>
                  👉 Please select a <strong>Department</strong> (or 'All Departments') and <strong>Section</strong> to display eligible students.
                </div>
              ) : displayedStudents.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1', fontSize: '0.9rem' }}>
                  No students found in this Department and Section.
                </div>
              ) : (
                <div className="student-selection-list" style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
                  {displayedStudents.map((st) => {
                    const isIneligible = st.status === 'DETAINED' || st.status === 'INACTIVE';
                    const isChecked = wizardStudentIds.has(st.id);
                    return (
                      <label
                        key={st.id}
                        className={`student-checkbox-item ${isChecked ? 'selected' : ''} ${isIneligible ? 'ineligible' : ''}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          marginBottom: '4px',
                          border: isChecked ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                          backgroundColor: isIneligible ? '#fef2f2' : isChecked ? '#eff6ff' : '#ffffff',
                          cursor: isIneligible ? 'not-allowed' : 'pointer',
                          opacity: isIneligible ? 0.65 : 1,
                        }}
                        title={isIneligible ? `${st.status} — Not eligible for exam seating` : ''}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked && !isIneligible}
                          onChange={() => !isIneligible && handleToggleStudent(st.id)}
                          disabled={isIneligible}
                          style={{ marginRight: '12px', transform: 'scale(1.15)', cursor: isIneligible ? 'not-allowed' : 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>{st.rollNumber}</span>
                            {st.fullName && st.fullName !== 'Not Entered' && (
                              <span style={{ fontSize: '0.85rem', color: '#475569' }}>— {st.fullName}</span>
                            )}
                            {isIneligible && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  backgroundColor: '#fee2e2',
                                  color: '#b91c1c',
                                  borderRadius: '4px',
                                  padding: '1px 6px',
                                }}
                                data-testid={`ineligible-badge-${st.rollNumber}`}
                              >
                                {st.status} — Ineligible
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                            {st.department?.code || 'Dept'} • Sec {st.section?.name || 'A'}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* STEP C: Hierarchical Examination Rooms Selection (Building -> Floor -> Room) */}
            <div className="step-card">
              <h3 className="step-title">
                <span className="step-badge">3</span>
                <span>Step C: Select Examination Rooms</span>
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '14px' }}>
                Choose examination halls organised by campus building and floor level. Unavailable and maintenance rooms are protected from examination selection.
              </p>

              {/* Hierarchy Tree */}
              <div className="room-hierarchy-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {roomHierarchy.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1', fontSize: '0.9rem' }}>
                    No examination halls configured in campus infrastructure.
                  </div>
                ) : (
                  roomHierarchy.map((bldg) => {
                    const isBldgExpanded = expandedBuildings.has(bldg.key);
                    const totalRoomsInBldg = bldg.floors.reduce((acc, f) => acc + f.rooms.length, 0);

                    return (
                      <div key={bldg.key} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                        {/* Building Accordion Header */}
                        <div
                          onClick={() => toggleBuilding(bldg.key)}
                          style={{
                            background: '#f1f5f9',
                            padding: '10px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontWeight: 700,
                            color: '#1e293b',
                            userSelect: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#0284c7' }}>{isBldgExpanded ? '▼' : '▶'}</span>
                            <span>🏢 {bldg.name} {bldg.code ? `(${bldg.code})` : ''}</span>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                            {totalRoomsInBldg} Room{totalRoomsInBldg !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Floors under Building */}
                        {isBldgExpanded && (
                          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#ffffff' }}>
                            {bldg.floors.map((flr) => {
                              const isFloorExpanded = expandedFloors.has(flr.key);

                              return (
                                <div key={flr.key} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                                  {/* Floor Accordion Header */}
                                  <div
                                    onClick={() => toggleFloor(flr.key)}
                                    style={{
                                      background: '#f8fafc',
                                      padding: '8px 14px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      fontSize: '0.9rem',
                                      fontWeight: 600,
                                      color: '#334155',
                                      userSelect: 'none',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '0.75rem', color: '#0369a1' }}>{isFloorExpanded ? '▼' : '▶'}</span>
                                      <span>📑 {flr.name}</span>
                                    </div>
                                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                      {flr.rooms.length} Room{flr.rooms.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>

                                  {/* Rooms under Floor */}
                                  {isFloorExpanded && (
                                    <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                                      {flr.rooms.map((rm) => {
                                        const isChecked = wizardRoomIds.has(rm.id);
                                        const capacity = rm.capacity || (rm.rowsCount * rm.columnsCount);
                                        const isAvailable = rm.status === 'AVAILABLE';

                                        return (
                                          <label
                                            key={rm.id}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'flex-start',
                                              gap: '10px',
                                              padding: '10px',
                                              borderRadius: '6px',
                                              border: isChecked ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                              background: !isAvailable ? '#fef2f2' : isChecked ? '#eff6ff' : '#ffffff',
                                              opacity: isAvailable ? 1 : 0.6,
                                              cursor: isAvailable ? 'pointer' : 'not-allowed',
                                            }}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              disabled={!isAvailable}
                                              onChange={() => isAvailable && handleToggleRoom(rm.id)}
                                              style={{ marginTop: '3px', transform: 'scale(1.15)', cursor: isAvailable ? 'pointer' : 'not-allowed' }}
                                            />
                                            <div style={{ flex: 1 }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{rm.roomNumber}</strong>
                                                <span
                                                  style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    borderRadius: '4px',
                                                    padding: '1px 6px',
                                                    background: isAvailable ? '#dcfce7' : '#fee2e2',
                                                    color: isAvailable ? '#15803d' : '#b91c1c',
                                                  }}
                                                >
                                                  {rm.status}
                                                </span>
                                              </div>
                                              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                                                {bldg.name} • {flr.name}
                                              </div>
                                              <div style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: 600, marginTop: '2px' }}>
                                                Capacity: {capacity} Seats
                                              </div>
                                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                Layout: {rm.rowsCount} × {rm.columnsCount}
                                              </div>
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected Examination Rooms Summary */}
              {selectedRoomsList.length > 0 && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e3a8a' }}>
                      SELECTED EXAMINATION ROOMS ({selectedRoomsList.length})
                    </h4>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0369a1' }}>
                      Total Available Seats: {totalWizardCapacity}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedRoomsList.map((rm, idx) => {
                      const cap = rm.capacity || (rm.rowsCount * rm.columnsCount);
                      const bName = rm.buildingEntity?.name || rm.building || 'Block';
                      const fName = rm.floorEntity?.floorName || rm.floor || 'Floor';

                      return (
                        <div
                          key={rm.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            flexWrap: 'wrap',
                            gap: '8px',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>
                              {idx + 1}. {bName} → {fName} → {rm.roomNumber}
                            </span>
                            <span style={{ marginLeft: '12px', fontSize: '0.85rem', color: '#0369a1', fontWeight: 600 }}>
                              {cap} Seats ({rm.rowsCount} × {rm.columnsCount})
                            </span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleRemoveSelectedRoom(rm.id)}
                            style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '2px 8px', fontSize: '0.8rem' }}
                            title="Remove Room"
                          >
                            ✕ Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* STEP D & E: Allocation Capacity Summary & Generate Button */}
            <div className="capacity-summary-card" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', width: '100%', marginBottom: '16px' }}>
                <div className="capacity-metric">
                  <span className="capacity-metric-label">Selected Students</span>
                  <span className="capacity-metric-val">{totalSelectedStudents}</span>
                </div>

                <div className="capacity-metric">
                  <span className="capacity-metric-label">Selected Rooms</span>
                  <span className="capacity-metric-val">{selectedRoomsList.length}</span>
                </div>

                <div className="capacity-metric">
                  <span className="capacity-metric-label">Available Seats</span>
                  <span className="capacity-metric-val">{totalWizardCapacity}</span>
                </div>

                <div className="capacity-metric">
                  <span className="capacity-metric-label">Capacity Margin</span>
                  <span
                    className="capacity-metric-val"
                    style={{
                      color: isCapacitySufficient ? '#16a34a' : '#dc2626',
                    }}
                  >
                    {capacityMargin >= 0 ? `+${capacityMargin}` : capacityMargin}
                  </span>
                </div>

                <div className="capacity-metric">
                  <span className="capacity-metric-label">Capacity Status</span>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: isCapacitySufficient ? '#dcfce7' : '#fee2e2',
                      color: isCapacitySufficient ? '#15803d' : '#b91c1c',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      padding: '6px 12px',
                      display: 'inline-block',
                      marginTop: '4px',
                      borderRadius: '4px',
                    }}
                  >
                    {isCapacitySufficient ? '✓ Sufficient Capacity' : '✕ Insufficient Capacity'}
                  </span>
                </div>
              </div>

              <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '12px 28px', fontSize: '1rem', fontWeight: 700 }}
                  onClick={handleGenerate}
                  disabled={generating || !isCapacitySufficient}
                >
                  {generating ? 'Calculating Allocation...' : '⚡ Generate Seating Allocation'}
                </button>
              </div>

              {hasCapacityDeficit && (
                <div className="capacity-warning" style={{ width: '100%', marginTop: '12px' }}>
                  ⚠️ Warning: Selected students ({totalSelectedStudents}) exceed available hall seats ({totalWizardCapacity}). Please select more examination rooms before allocating.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllocationManagement;
