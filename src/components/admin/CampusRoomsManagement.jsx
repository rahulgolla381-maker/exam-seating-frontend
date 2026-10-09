import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getCampusSummary,
  getBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  getBuildingFloors,
  createBuildingFloor,
  updateFloor,
  deleteFloor,
  getRooms,
  createRoomDTO,
  updateRoomDTO,
  deleteRoom,
} from '../../services/adminService.js';

export const CampusRoomsManagement = () => {
  // Main Data States
  const [summary, setSummary] = useState({
    totalBuildings: 0,
    totalFloors: 0,
    totalRooms: 0,
    totalCapacity: 0,
  });
  const [buildings, setBuildings] = useState([]);
  const [floorsByBuilding, setFloorsByBuilding] = useState({});
  const [roomsByFloor, setRoomsByFloor] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');

  // Hierarchy Expansion States
  const [expandedBuildings, setExpandedBuildings] = useState(new Set());
  const [expandedFloors, setExpandedFloors] = useState(new Set());

  // Building Add/Edit Modal
  const [bldModalOpen, setBldModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [bldForm, setBldForm] = useState({
    name: '',
    code: '',
    description: '',
    status: 'ACTIVE',
    floorsCount: 0,
  });
  const [bldSubmitting, setBldSubmitting] = useState(false);
  const [bldError, setBldError] = useState(null);

  // Floor Add/Edit Modal
  const [floorModalOpen, setFloorModalOpen] = useState(false);
  const [floorContextBuilding, setFloorContextBuilding] = useState(null);
  const [editingFloor, setEditingFloor] = useState(null);
  const [floorForm, setFloorForm] = useState({
    floorNumber: 0,
    floorName: '',
  });
  const [floorSubmitting, setFloorSubmitting] = useState(false);
  const [floorError, setFloorError] = useState(null);

  // Room Add/Edit Modal
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [roomContextBuilding, setRoomContextBuilding] = useState(null);
  const [roomContextFloor, setRoomContextFloor] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    rowsCount: 4,
    columnsCount: 5,
    status: 'AVAILABLE',
  });
  const [roomSubmitting, setRoomSubmitting] = useState(false);
  const [roomError, setRoomError] = useState(null);

  // View Layout Modal
  const [viewLayoutRoom, setViewLayoutRoom] = useState(null);

  // Delete Confirmation Modals
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'building'|'floor'|'room', item, parent }
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Load All Core Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, bldData, rmData] = await Promise.all([
        getCampusSummary().catch(() => null),
        getBuildings(),
        getRooms(),
      ]);

      const validBuildings = bldData || [];
      const validRooms = rmData || [];

      // Calculate totals if summary endpoint not available
      const totalBld = validBuildings.length;
      let totalFlr = 0;
      let totalCap = 0;

      validBuildings.forEach((b) => {
        totalFlr += b.floorsCount || 0;
      });

      validRooms.forEach((r) => {
        totalCap += (r.rowsCount || 0) * (r.columnsCount || 0);
      });

      setSummary(
        sumData || {
          totalBuildings: totalBld,
          totalFloors: totalFlr,
          totalRooms: validRooms.length,
          totalCapacity: totalCap,
        }
      );
      setBuildings(validBuildings);

      // Group rooms by floor id
      const rMap = {};
      validRooms.forEach((r) => {
        const flId = r.floorEntity?.id || r.floor;
        if (flId) {
          if (!rMap[flId]) rMap[flId] = [];
          rMap[flId].push(r);
        }
      });
      setRoomsByFloor(rMap);

      // Fetch floors for all currently expanded buildings
      if (expandedBuildings.size > 0) {
        const fMap = { ...floorsByBuilding };
        await Promise.all(
          Array.from(expandedBuildings).map(async (bId) => {
            try {
              const floors = await getBuildingFloors(bId);
              fMap[bId] = floors || [];
            } catch {
              fMap[bId] = [];
            }
          })
        );
        setFloorsByBuilding(fMap);
      }
    } catch (err) {
      console.error('Error loading campus data:', err);
      setError('Unable to load campus infrastructure from server. Please verify connection.');
    } finally {
      setLoading(false);
    }
  }, [expandedBuildings, floorsByBuilding]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Expand / Collapse Building ---
  const toggleBuilding = async (buildingId) => {
    setExpandedBuildings((prev) => {
      const next = new Set(prev);
      if (next.has(buildingId)) {
        next.delete(buildingId);
      } else {
        next.add(buildingId);
      }
      return next;
    });

    if (!floorsByBuilding[buildingId]) {
      try {
        const floors = await getBuildingFloors(buildingId);
        setFloorsByBuilding((prev) => ({ ...prev, [buildingId]: floors || [] }));
      } catch (err) {
        console.error('Error fetching floors for building:', err);
      }
    }
  };

  // --- Expand / Collapse Floor (View Rooms) ---
  const toggleFloor = async (floorId) => {
    setExpandedFloors((prev) => {
      const next = new Set(prev);
      if (next.has(floorId)) {
        next.delete(floorId);
      } else {
        next.add(floorId);
      }
      return next;
    });

    try {
      const rms = await getRooms(null, floorId);
      setRoomsByFloor((prev) => ({ ...prev, [floorId]: rms || [] }));
    } catch (err) {
      console.error('Error fetching rooms for floor:', err);
    }
  };

  // --- Building CRUD Handlers ---
  const handleOpenAddBuilding = () => {
    setEditingBuilding(null);
    setBldForm({
      name: '',
      code: '',
      description: '',
      status: 'ACTIVE',
      floorsCount: 0,
    });
    setBldError(null);
    setBldModalOpen(true);
  };

  const handleOpenEditBuilding = (bld) => {
    setEditingBuilding(bld);
    setBldForm({
      name: bld.name || '',
      code: bld.code || '',
      description: bld.description || '',
      status: bld.status || 'ACTIVE',
      floorsCount: bld.floorsCount || 0,
    });
    setBldError(null);
    setBldModalOpen(true);
  };

  const handleSubmitBuilding = async (e) => {
    e.preventDefault();
    setBldError(null);

    const name = bldForm.name.trim();
    const code = bldForm.code.trim().toUpperCase();

    if (!name || !code) {
      setBldError('Building Name and Code are required.');
      return;
    }

    setBldSubmitting(true);
    try {
      if (editingBuilding) {
        await updateBuilding(editingBuilding.id, {
          name,
          code,
          description: bldForm.description?.trim() || null,
          status: bldForm.status,
        });
        setSuccess(`Building "${name} (${code})" updated successfully.`);
      } else {
        const payload = {
          name,
          code,
          description: bldForm.description?.trim() || null,
          status: bldForm.status,
          floorsCount: Number(bldForm.floorsCount) || 0,
        };
        const created = await createBuilding(payload);
        setSuccess(`Building "${name} (${code})" created successfully.`);
        if (created?.id) {
          setExpandedBuildings((prev) => new Set(prev).add(created.id));
        }
      }
      setBldModalOpen(false);
      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Operation failed. Please ensure building code is unique.';
      setBldError(msg);
    } finally {
      setBldSubmitting(false);
    }
  };

  // --- Floor CRUD Handlers ---
  const handleOpenAddFloor = (bld) => {
    setFloorContextBuilding(bld);
    setEditingFloor(null);

    // Suggest next floor number
    const existingFloors = floorsByBuilding[bld.id] || [];
    let nextNum = 0;
    if (existingFloors.length > 0) {
      const maxNum = Math.max(...existingFloors.map((f) => f.floorNumber ?? 0));
      nextNum = maxNum + 1;
    }

    let defaultName = `Level ${nextNum}`;
    if (nextNum === 0) defaultName = 'Ground Floor';
    else if (nextNum === 1) defaultName = 'First Floor';
    else if (nextNum === 2) defaultName = 'Second Floor';
    else if (nextNum === 3) defaultName = 'Third Floor';

    setFloorForm({
      floorNumber: nextNum,
      floorName: defaultName,
    });
    setFloorError(null);
    setFloorModalOpen(true);
  };

  const handleOpenEditFloor = (flr, bld) => {
    setFloorContextBuilding(bld);
    setEditingFloor(flr);
    setFloorForm({
      floorNumber: flr.floorNumber ?? 0,
      floorName: flr.floorName || '',
    });
    setFloorError(null);
    setFloorModalOpen(true);
  };

  const handleSubmitFloor = async (e) => {
    e.preventDefault();
    setFloorError(null);

    const name = floorForm.floorName.trim();
    const num = Number(floorForm.floorNumber);

    if (!name) {
      setFloorError('Level / Floor Name is required.');
      return;
    }

    setFloorSubmitting(true);
    try {
      if (editingFloor) {
        await updateFloor(editingFloor.id, {
          floorNumber: num,
          floorName: name,
        });
        setSuccess(`Level "${name}" updated successfully.`);
      } else {
        await createBuildingFloor(floorContextBuilding.id, {
          floorNumber: num,
          floorName: name,
        });
        setSuccess(`Level "${name}" added to ${floorContextBuilding.name}.`);
      }
      setFloorModalOpen(false);

      // Refresh floors for this building
      const updatedFloors = await getBuildingFloors(floorContextBuilding.id);
      setFloorsByBuilding((prev) => ({ ...prev, [floorContextBuilding.id]: updatedFloors || [] }));
      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save level. Ensure floor number is unique.';
      setFloorError(msg);
    } finally {
      setFloorSubmitting(false);
    }
  };

  // --- Room CRUD Handlers ---
  const handleOpenAddRoom = (flr, bld) => {
    setRoomContextBuilding(bld);
    setRoomContextFloor(flr);
    setEditingRoom(null);

    // Suggest room number based on building code and floor number
    const bCode = bld.code || 'R';
    const flNum = flr.floorNumber ?? 0;
    const existingRooms = roomsByFloor[flr.id] || [];
    const roomCount = existingRooms.length + 1;
    const suggestedNum = `${bCode}-${flNum}${roomCount < 10 ? '0' + roomCount : roomCount}`;

    setRoomForm({
      roomNumber: suggestedNum,
      rowsCount: 5,
      columnsCount: 6,
      status: 'AVAILABLE',
    });
    setRoomError(null);
    setRoomModalOpen(true);
  };

  const handleOpenEditRoom = (rm, flr, bld) => {
    setRoomContextBuilding(bld);
    setRoomContextFloor(flr);
    setEditingRoom(rm);
    setRoomForm({
      roomNumber: rm.roomNumber || '',
      rowsCount: rm.rowsCount || 4,
      columnsCount: rm.columnsCount || 5,
      status: rm.status || 'AVAILABLE',
    });
    setRoomError(null);
    setRoomModalOpen(true);
  };

  const handleSubmitRoom = async (e) => {
    e.preventDefault();
    setRoomError(null);

    const roomNumber = roomForm.roomNumber.trim().toUpperCase();
    const rows = Number(roomForm.rowsCount);
    const cols = Number(roomForm.columnsCount);

    if (!roomNumber) {
      setRoomError('Room Number / Hall Code is required.');
      return;
    }
    if (rows < 1 || cols < 1) {
      setRoomError('Rows and Columns must each be at least 1.');
      return;
    }

    setRoomSubmitting(true);
    try {
      const payload = {
        roomNumber,
        buildingId: roomContextBuilding.id,
        building: roomContextBuilding.name,
        floorId: roomContextFloor.id,
        floor: roomContextFloor.floorName,
        rowsCount: rows,
        columnsCount: cols,
        status: roomForm.status,
      };

      if (editingRoom) {
        await updateRoomDTO(editingRoom.id, payload);
        setSuccess(`Room "${roomNumber}" updated successfully.`);
      } else {
        await createRoomDTO(payload);
        setSuccess(`Room "${roomNumber}" added to ${roomContextFloor.floorName}.`);
      }
      setRoomModalOpen(false);

      // Auto-expand floor so user sees new/updated room
      setExpandedFloors((prev) => new Set(prev).add(roomContextFloor.id));
      const updatedRooms = await getRooms(null, roomContextFloor.id);
      setRoomsByFloor((prev) => ({ ...prev, [roomContextFloor.id]: updatedRooms || [] }));

      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Operation failed. Ensure room number is unique.';
      setRoomError(msg);
    } finally {
      setRoomSubmitting(false);
    }
  };

  // --- Destructive Deletion Modal Handlers ---
  const handleRequestDelete = (type, item, parent = null) => {
    setDeleteTarget({ type, item, parent });
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    const { type, item, parent } = deleteTarget;

    try {
      if (type === 'building') {
        await deleteBuilding(item.id);
        setSuccess(`Building "${item.name}" deleted successfully.`);
        setExpandedBuildings((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      } else if (type === 'floor') {
        await deleteFloor(item.id);
        setSuccess(`Level "${item.floorName}" deleted successfully.`);
        if (parent?.id) {
          const updatedFloors = await getBuildingFloors(parent.id);
          setFloorsByBuilding((prev) => ({ ...prev, [parent.id]: updatedFloors || [] }));
        }
      } else if (type === 'room') {
        await deleteRoom(item.id);
        setSuccess(`Room "${item.roomNumber}" deleted successfully.`);
        if (parent?.id) {
          const updatedRooms = await getRooms(null, parent.id);
          setRoomsByFloor((prev) => ({ ...prev, [parent.id]: updatedRooms || [] }));
        }
        if (viewLayoutRoom?.id === item.id) {
          setViewLayoutRoom(null);
        }
      }

      setDeleteTarget(null);
      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || `Unable to delete ${type}. It may have active dependencies.`;
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Buildings based on search
  const filteredBuildings = useMemo(() => {
    if (!searchQuery.trim()) return buildings;
    const q = searchQuery.toLowerCase().trim();

    return buildings.filter((b) => {
      const matchBld =
        b.name?.toLowerCase().includes(q) ||
        b.code?.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q);

      // Check if any room in this building matches
      const bFloors = floorsByBuilding[b.id] || [];
      const matchRoom = bFloors.some((f) => {
        const fRooms = roomsByFloor[f.id] || [];
        return fRooms.some((r) => r.roomNumber?.toLowerCase().includes(q));
      });

      return matchBld || matchRoom;
    });
  }, [buildings, searchQuery, floorsByBuilding, roomsByFloor]);

  // Capacity calculation preview for room modal
  const roomCalculatedCapacity = (Number(roomForm.rowsCount) || 0) * (Number(roomForm.columnsCount) || 0);

  return (
    <div className="section-panel" style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* 1. Header & Primary Action */}
      <div
        className="section-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="section-title-wrap">
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Campus & Rooms
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.92rem' }}>
            Manage campus buildings, floor levels, examination halls, and 2D seating layouts
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            title="Refresh latest data from database"
            style={{ padding: '9px 16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAddBuilding}
            style={{
              padding: '10px 18px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#2563eb',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
            }}
          >
            <span>+</span>
            <span>Add Building / Block</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {success && <div className="success-message" style={{ marginBottom: '16px' }}>{success}</div>}
      {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* 2. Top Summary Information Cards (MySQL Real-Time Source of Truth) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: '#eff6ff',
              color: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
            }}
          >
            🏢
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
              Total Buildings
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginTop: '2px' }}>
              {summary.totalBuildings}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: '#f0fdf4',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
            }}
          >
            🏗️
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
              Total Levels / Floors
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginTop: '2px' }}>
              {summary.totalFloors}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: '#faf5ff',
              color: '#7e22ce',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
            }}
          >
            🚪
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
              Total Rooms
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginTop: '2px' }}>
              {summary.totalRooms}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: '#fff7ed',
              color: '#c2410c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
            }}
          >
            🪑
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
              Seating Capacity
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginTop: '2px' }}>
              {summary.totalCapacity.toLocaleString()} Seats
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search Bar & Hierarchy Navigation Context */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
          <span style={{ fontSize: '1.1rem', color: '#64748b' }}>🔍</span>
          <input
            type="text"
            className="form-control"
            placeholder="Search by building name, code (e.g. CB) or room number (e.g. C-101)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              boxShadow: 'none',
              fontSize: '0.92rem',
              width: '100%',
              padding: '6px 0',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#94a3b8',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              ✕
            </button>
          )}
        </div>

        <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600 }}>Hierarchy:</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>Campus</span>
          <span>→</span>
          <span style={{ color: '#2563eb', fontWeight: 600 }}>Building</span>
          <span>→</span>
          <span style={{ color: '#059669', fontWeight: 600 }}>Level</span>
          <span>→</span>
          <span style={{ color: '#7c3aed', fontWeight: 600 }}>Room</span>
        </div>
      </div>

      {/* 4. Hierarchy Explorer */}
      {loading ? (
        <div className="state-box" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>⏳ Loading campus infrastructure...</div>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Retrieving live buildings and rooms from MySQL</div>
        </div>
      ) : buildings.length === 0 ? (
        /* Empty State */
        <div
          style={{
            background: '#ffffff',
            border: '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🏢</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>
            No buildings added yet.
          </h3>
          <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.92rem', maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto' }}>
            Begin by creating your first academic complex or examination block. You can then add floor levels and rooms with classroom 2D layouts.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAddBuilding}
            style={{ padding: '10px 22px', fontWeight: 700 }}
          >
            + Add Building / Block
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredBuildings.map((bld) => {
            const isExpanded = expandedBuildings.has(bld.id);
            const bldFloors = floorsByBuilding[bld.id] || [];

            // Compute dynamic capacities
            let bldCapacity = bld.totalCapacity || 0;
            if (!bldCapacity) {
              bldFloors.forEach((fl) => {
                const flRooms = roomsByFloor[fl.id] || [];
                flRooms.forEach((r) => {
                  bldCapacity += (r.rowsCount || 0) * (r.columnsCount || 0);
                });
              });
            }

            return (
              <div
                key={bld.id}
                style={{
                  background: '#ffffff',
                  border: isExpanded ? '2px solid #bfdbfe' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: isExpanded
                    ? '0 10px 15px -3px rgba(59, 130, 246, 0.05), 0 4px 6px -4px rgba(59, 130, 246, 0.05)'
                    : '0 1px 3px rgba(0,0,0,0.02)',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Building Header Card */}
                <div
                  style={{
                    padding: '18px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                    background: isExpanded ? '#f8fafc' : '#ffffff',
                    borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleBuilding(bld.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        color: isExpanded ? '#2563eb' : '#64748b',
                        padding: 0,
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={isExpanded ? 'Collapse levels' : 'Expand levels'}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1e40af',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '0.88rem',
                            fontFamily: 'monospace',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {bld.code}
                        </span>

                        <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: '#0f172a' }}>
                          {bld.name}
                        </h3>

                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: bld.status === 'ACTIVE' ? '#ecfdf5' : '#fef2f2',
                            color: bld.status === 'ACTIVE' ? '#047857' : '#b91c1c',
                            border: bld.status === 'ACTIVE' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                          }}
                        >
                          {bld.status || 'ACTIVE'}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginTop: '6px',
                          fontSize: '0.85rem',
                          color: '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        <span>{bld.floorsCount ?? bldFloors.length} Levels</span>
                        <span>•</span>
                        <span>{bld.roomsCount ?? 0} Rooms</span>
                        <span>•</span>
                        <span style={{ color: '#047857', fontWeight: 700 }}>
                          {bldCapacity.toLocaleString()} Seats
                        </span>
                        {bld.description && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#94a3b8', fontWeight: 400 }}>{bld.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Building Actions */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenAddFloor(bld)}
                      style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>+</span>
                      <span>Add Level</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-edit"
                      onClick={() => handleOpenEditBuilding(bld)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-delete"
                      onClick={() => handleRequestDelete('building', bld)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Building Expanded: Floors / Levels List */}
                {isExpanded && (
                  <div style={{ padding: '20px 24px', background: '#fafbfc' }}>
                    {bldFloors.length === 0 ? (
                      /* No Floors State */
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px dashed #cbd5e1',
                          borderRadius: '8px',
                          padding: '24px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '12px' }}>
                          No levels added to this building yet.
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenAddFloor(bld)}
                          style={{ fontWeight: 700 }}
                        >
                          + Add Level
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {bldFloors.map((flr) => {
                          const isFloorExpanded = expandedFloors.has(flr.id);
                          const floorRooms = roomsByFloor[flr.id] || [];

                          // Calculate floor capacity
                          let flrCapacity = flr.totalCapacity || 0;
                          if (!flrCapacity) {
                            floorRooms.forEach((r) => {
                              flrCapacity += (r.rowsCount || 0) * (r.columnsCount || 0);
                            });
                          }

                          return (
                            <div
                              key={flr.id}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                              }}
                            >
                              {/* Floor Bar */}
                              <div
                                style={{
                                  padding: '12px 18px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '12px',
                                  background: isFloorExpanded ? '#f1f5f9' : '#ffffff',
                                  borderBottom: isFloorExpanded ? '1px solid #e2e8f0' : 'none',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <button
                                    type="button"
                                    onClick={() => toggleFloor(flr.id)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontSize: '0.95rem',
                                      color: isFloorExpanded ? '#2563eb' : '#64748b',
                                      padding: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    {isFloorExpanded ? '▼' : '▶'}
                                  </button>

                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '2px 8px',
                                      background: '#f1f5f9',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '4px',
                                      fontWeight: 700,
                                      fontSize: '0.78rem',
                                      color: '#475569',
                                    }}
                                  >
                                    L{flr.floorNumber}
                                  </span>

                                  <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>
                                    {flr.floorName}
                                  </strong>

                                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                    • {flr.roomsCount ?? floorRooms.length} Rooms •{' '}
                                    <strong style={{ color: '#047857' }}>
                                      {flrCapacity.toLocaleString()} Seats
                                    </strong>
                                  </span>
                                </div>

                                {/* Floor Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => toggleFloor(flr.id)}
                                    style={{
                                      padding: '5px 12px',
                                      fontSize: '0.82rem',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <span>{isFloorExpanded ? 'Hide Rooms' : 'View Rooms'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleOpenAddRoom(flr, bld)}
                                    style={{
                                      padding: '5px 12px',
                                      fontSize: '0.82rem',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <span>+</span>
                                    <span>Add Room</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-sm btn-edit"
                                    onClick={() => handleOpenEditFloor(flr, bld)}
                                    style={{ padding: '5px 10px', fontSize: '0.82rem' }}
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-sm btn-delete"
                                    onClick={() => handleRequestDelete('floor', flr, bld)}
                                    style={{ padding: '5px 10px', fontSize: '0.82rem' }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>

                              {/* Floor Expanded: Rooms Grid */}
                              {isFloorExpanded && (
                                <div style={{ padding: '16px 20px', background: '#ffffff' }}>
                                  {floorRooms.length === 0 ? (
                                    /* No Rooms on Floor */
                                    <div
                                      style={{
                                        border: '1px dashed #cbd5e1',
                                        borderRadius: '8px',
                                        padding: '20px',
                                        textAlign: 'center',
                                        background: '#f8fafc',
                                      }}
                                    >
                                      <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '10px' }}>
                                        No rooms added to this level yet.
                                      </div>
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleOpenAddRoom(flr, bld)}
                                        style={{ fontWeight: 700 }}
                                      >
                                        + Add Room
                                      </button>
                                    </div>
                                  ) : (
                                    /* Rooms Responsive Grid */
                                    <div
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                        gap: '14px',
                                      }}
                                    >
                                      {floorRooms.map((rm) => {
                                        const capacity = (rm.rowsCount || 0) * (rm.columnsCount || 0);
                                        const isAvailable = rm.status === 'AVAILABLE';
                                        const isMaint = rm.status === 'MAINTENANCE';

                                        return (
                                          <div
                                            key={rm.id}
                                            style={{
                                              border: '1px solid #e2e8f0',
                                              borderRadius: '8px',
                                              padding: '14px',
                                              background: '#ffffff',
                                              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              justifyContent: 'space-between',
                                              transition: 'transform 0.15s ease, border-color 0.15s ease',
                                            }}
                                          >
                                            <div>
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  justifyContent: 'space-between',
                                                  alignItems: 'center',
                                                  marginBottom: '8px',
                                                }}
                                              >
                                                <strong
                                                  style={{
                                                    fontSize: '1.05rem',
                                                    color: '#0f172a',
                                                    fontFamily: 'monospace',
                                                  }}
                                                >
                                                  {rm.roomNumber}
                                                </strong>
                                                <span
                                                  style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '10px',
                                                    background: isAvailable
                                                      ? '#ecfdf5'
                                                      : isMaint
                                                      ? '#fffbeb'
                                                      : '#fef2f2',
                                                    color: isAvailable
                                                      ? '#047857'
                                                      : isMaint
                                                      ? '#b45309'
                                                      : '#b91c1c',
                                                    border: isAvailable
                                                      ? '1px solid #a7f3d0'
                                                      : isMaint
                                                      ? '1px solid #fde68a'
                                                      : '1px solid #fecaca',
                                                  }}
                                                >
                                                  {rm.status}
                                                </span>
                                              </div>

                                              <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>
                                                <strong>{capacity} Seats</strong>
                                              </div>
                                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                {rm.rowsCount} rows × {rm.columnsCount} cols
                                              </div>
                                            </div>

                                            {/* Room Card Actions */}
                                            <div
                                              style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginTop: '14px',
                                                paddingTop: '10px',
                                                borderTop: '1px solid #f1f5f9',
                                                gap: '6px',
                                              }}
                                            >
                                              <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => setViewLayoutRoom({ ...rm, buildingObj: bld, floorObj: flr })}
                                                style={{
                                                  padding: '4px 8px',
                                                  fontSize: '0.75rem',
                                                  fontWeight: 700,
                                                  color: '#2563eb',
                                                  borderColor: '#bfdbfe',
                                                  background: '#eff6ff',
                                                }}
                                              >
                                                View Layout
                                              </button>

                                              <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                  type="button"
                                                  className="btn btn-sm btn-edit"
                                                  onClick={() => handleOpenEditRoom(rm, flr, bld)}
                                                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  type="button"
                                                  className="btn btn-sm btn-delete"
                                                  onClick={() => handleRequestDelete('room', rm, flr)}
                                                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                                >
                                                  Delete
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. ADD / EDIT BUILDING MODAL                                 */}
      {/* ============================================================ */}
      {bldModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingBuilding ? 'Edit Building / Block' : 'Add New Building / Block'}
              </h3>
              <button type="button" className="close-btn" onClick={() => setBldModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitBuilding}>
              <div className="modal-body">
                {bldError && <div className="error-message">{bldError}</div>}

                <div className="form-group">
                  <label htmlFor="bldName">Building / Block Name *</label>
                  <input
                    id="bldName"
                    type="text"
                    className="form-control"
                    placeholder="e.g., C Block, Engineering Block"
                    value={bldForm.name}
                    onChange={(e) => setBldForm({ ...bldForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="bldCode">Building / Block Code *</label>
                  <input
                    id="bldCode"
                    type="text"
                    className="form-control"
                    placeholder="e.g., CB, EB, TB"
                    value={bldForm.code}
                    onChange={(e) => setBldForm({ ...bldForm, code: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="bldDesc">Description (Optional)</label>
                  <input
                    id="bldDesc"
                    type="text"
                    className="form-control"
                    placeholder="e.g., Computer Science & Engineering Complex"
                    value={bldForm.description}
                    onChange={(e) => setBldForm({ ...bldForm, description: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="bldStatus">Status</label>
                    <select
                      id="bldStatus"
                      className="form-control"
                      value={bldForm.status}
                      onChange={(e) => setBldForm({ ...bldForm, status: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>

                  {!editingBuilding && (
                    <div className="form-group">
                      <label htmlFor="bldFloors">Initial Levels Count</label>
                      <input
                        id="bldFloors"
                        type="number"
                        min="0"
                        max="20"
                        className="form-control"
                        placeholder="e.g., 3 (Ground, L1, L2)"
                        value={bldForm.floorsCount}
                        onChange={(e) => setBldForm({ ...bldForm, floorsCount: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setBldModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={bldSubmitting}>
                  {bldSubmitting ? 'Saving...' : editingBuilding ? 'Update Building' : 'Create Building'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. ADD / EDIT FLOOR / LEVEL MODAL                             */}
      {/* ============================================================ */}
      {floorModalOpen && floorContextBuilding && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingFloor ? 'Edit Level' : 'Add Level to Building'}
              </h3>
              <button type="button" className="close-btn" onClick={() => setFloorModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitFloor}>
              <div className="modal-body">
                {/* Context Breadcrumb */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    fontSize: '0.88rem',
                    color: '#475569',
                  }}
                >
                  <span>Building Context: </span>
                  <strong style={{ color: '#0f172a' }}>
                    {floorContextBuilding.name} ({floorContextBuilding.code})
                  </strong>
                </div>

                {floorError && <div className="error-message">{floorError}</div>}

                <div className="form-group">
                  <label htmlFor="flNum">Level / Floor Number *</label>
                  <input
                    id="flNum"
                    type="number"
                    min="0"
                    max="50"
                    className="form-control"
                    value={floorForm.floorNumber}
                    onChange={(e) => setFloorForm({ ...floorForm, floorNumber: e.target.value })}
                    required
                  />
                  <small style={{ color: '#64748b' }}>
                    0 = Ground Floor, 1 = First Floor, 2 = Second Floor, etc.
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="flName">Level / Floor Display Name *</label>
                  <input
                    id="flName"
                    type="text"
                    className="form-control"
                    placeholder="e.g., Ground Floor, Level 1, Second Floor"
                    value={floorForm.floorName}
                    onChange={(e) => setFloorForm({ ...floorForm, floorName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setFloorModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={floorSubmitting}>
                  {floorSubmitting ? 'Saving...' : editingFloor ? 'Update Level' : 'Create Level'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. ADD / EDIT ROOM MODAL (WITH LIVE 2D LAYOUT PREVIEW)        */}
      {/* ============================================================ */}
      {roomModalOpen && roomContextBuilding && roomContextFloor && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingRoom ? 'Edit Room' : 'Add Examination Room / Hall'}
              </h3>
              <button type="button" className="close-btn" onClick={() => setRoomModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRoom}>
              <div className="modal-body">
                {/* Context Breadcrumb */}
                <div
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    fontSize: '0.88rem',
                    color: '#1e40af',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Location:</span>
                  <strong>{roomContextBuilding.name} ({roomContextBuilding.code})</strong>
                  <span>→</span>
                  <strong>Level {roomContextFloor.floorNumber}: {roomContextFloor.floorName}</strong>
                </div>

                {roomError && <div className="error-message">{roomError}</div>}

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1.5 }}>
                    <label htmlFor="rmNum">Room Number / Hall Code *</label>
                    <input
                      id="rmNum"
                      type="text"
                      className="form-control"
                      placeholder="e.g., C-101, LH-1"
                      value={roomForm.roomNumber}
                      onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="rmStatus">Status</label>
                    <select
                      id="rmStatus"
                      className="form-control"
                      value={roomForm.status}
                      onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="UNAVAILABLE">UNAVAILABLE</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="rmRows">Number of Rows *</label>
                    <input
                      id="rmRows"
                      type="number"
                      min="1"
                      max="30"
                      className="form-control"
                      value={roomForm.rowsCount}
                      onChange={(e) => setRoomForm({ ...roomForm, rowsCount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="rmCols">Number of Columns / Benches *</label>
                    <input
                      id="rmCols"
                      type="number"
                      min="1"
                      max="30"
                      className="form-control"
                      value={roomForm.columnsCount}
                      onChange={(e) => setRoomForm({ ...roomForm, columnsCount: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Calculated Seating Capacity (Read-Only) */}
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                      Calculated Seating Capacity:
                    </span>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Automatically computed: {roomForm.rowsCount || 0} Rows × {roomForm.columnsCount || 0} Columns
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: '#1e40af',
                      padding: '4px 12px',
                      background: '#eff6ff',
                      borderRadius: '6px',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    {roomCalculatedCapacity} Seats
                  </span>
                </div>

                {/* Live Classroom 2D Layout Preview */}
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                    Live Classroom 2D Seating Layout Preview
                  </label>

                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '12px',
                      maxHeight: '220px',
                      overflow: 'auto',
                    }}
                  >
                    {/* Blackboard Banner */}
                    <div
                      style={{
                        background: '#1e293b',
                        color: '#f8fafc',
                        padding: '6px 12px',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        borderRadius: '4px',
                        marginBottom: '12px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }}
                    >
                      ▲ FRONT / TEACHER DESK / BLACKBOARD ▲
                    </div>

                    {/* 2D Seating Grid */}
                    {Number(roomForm.rowsCount) > 0 && Number(roomForm.columnsCount) > 0 ? (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${Number(roomForm.columnsCount)}, minmax(36px, 1fr))`,
                          gap: '6px',
                        }}
                      >
                        {Array.from({ length: Number(roomForm.rowsCount) }).map((_, rIdx) =>
                          Array.from({ length: Number(roomForm.columnsCount) }).map((_, cIdx) => {
                            const seatNum = rIdx * Number(roomForm.columnsCount) + cIdx + 1;
                            return (
                              <div
                                key={`${rIdx}-${cIdx}`}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #94a3b8',
                                  borderRadius: '4px',
                                  padding: '5px 2px',
                                  textAlign: 'center',
                                  fontSize: '0.68rem',
                                  color: '#1e3a8a',
                                  fontWeight: 700,
                                }}
                                title={`Row ${rIdx + 1}, Col ${cIdx + 1} (Seat #${seatNum})`}
                              >
                                S{seatNum}
                              </div>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>
                        Enter valid rows and columns to generate preview
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRoomModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={roomSubmitting}>
                  {roomSubmitting ? 'Saving...' : editingRoom ? 'Update Room' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. ROOM DETAILS & 2D SEATING LAYOUT MODAL                    */}
      {/* ============================================================ */}
      {viewLayoutRoom && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ margin: 0, fontSize: '1.25rem' }}>
                  Room {viewLayoutRoom.roomNumber} — Seating Layout
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                  {viewLayoutRoom.building || viewLayoutRoom.buildingObj?.name} →{' '}
                  {viewLayoutRoom.floor || viewLayoutRoom.floorObj?.floorName}
                </div>
              </div>
              <button type="button" className="close-btn" onClick={() => setViewLayoutRoom(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Room Stats Banner */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  textAlign: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>DIMENSIONS</div>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                    {viewLayoutRoom.rowsCount} × {viewLayoutRoom.columnsCount}
                  </strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>CAPACITY</div>
                  <strong style={{ fontSize: '0.95rem', color: '#047857' }}>
                    {(viewLayoutRoom.rowsCount || 0) * (viewLayoutRoom.columnsCount || 0)} Seats
                  </strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>STATUS</div>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: viewLayoutRoom.status === 'AVAILABLE' ? '#ecfdf5' : '#fef2f2',
                      color: viewLayoutRoom.status === 'AVAILABLE' ? '#047857' : '#b91c1c',
                      marginTop: '2px',
                    }}
                  >
                    {viewLayoutRoom.status}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>HALL CODE</div>
                  <strong style={{ fontSize: '0.95rem', color: '#1e40af', fontFamily: 'monospace' }}>
                    {viewLayoutRoom.roomNumber}
                  </strong>
                </div>
              </div>

              {/* 2D Seating Layout */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                {/* Blackboard Banner */}
                <div
                  style={{
                    background: '#0f172a',
                    color: '#f8fafc',
                    padding: '8px',
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  ▲ FRONT / TEACHER DESK / BLACKBOARD ▲
                </div>

                {/* Seat Matrix */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${viewLayoutRoom.columnsCount}, minmax(40px, 1fr))`,
                    gap: '8px',
                    maxHeight: '320px',
                    overflow: 'auto',
                    padding: '4px',
                  }}
                >
                  {Array.from({ length: viewLayoutRoom.rowsCount }).map((_, rIdx) =>
                    Array.from({ length: viewLayoutRoom.columnsCount }).map((_, cIdx) => {
                      const seatNum = rIdx * viewLayoutRoom.columnsCount + cIdx + 1;
                      return (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          style={{
                            background: '#f0fdf4',
                            border: '1px solid #86efac',
                            borderRadius: '6px',
                            padding: '8px 2px',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            color: '#166534',
                            fontWeight: 700,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                          }}
                          title={`Row ${rIdx + 1}, Bench ${cIdx + 1} (Seat #${seatNum})`}
                        >
                          S{seatNum}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-edit"
                  onClick={() => {
                    const rm = viewLayoutRoom;
                    setViewLayoutRoom(null);
                    handleOpenEditRoom(rm, rm.floorObj || { id: rm.floorEntity?.id, floorName: rm.floor }, rm.buildingObj || { id: rm.buildingEntity?.id, name: rm.building });
                  }}
                >
                  Edit Room
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-delete"
                  onClick={() => {
                    const rm = viewLayoutRoom;
                    setViewLayoutRoom(null);
                    handleRequestDelete('room', rm, rm.floorObj || { id: rm.floorEntity?.id });
                  }}
                >
                  Delete Room
                </button>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewLayoutRoom(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. DELETE CONFIRMATION MODAL                                  */}
      {/* ============================================================ */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
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
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
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
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem', fontWeight: 700 }}>
                Delete {deleteTarget.type === 'building' ? deleteTarget.item.name : deleteTarget.type === 'floor' ? deleteTarget.item.floorName : `Room ${deleteTarget.item.roomNumber}`}?
              </h3>
            </div>

            {deleteError ? (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  color: '#991b1b',
                  fontSize: '0.88rem',
                  marginBottom: '16px',
                }}
              >
                <strong>Deletion Blocked:</strong> {deleteError}
              </div>
            ) : (
              <p style={{ margin: '0 0 16px', color: '#475569', fontSize: '0.92rem', lineHeight: 1.5 }}>
                Are you sure you want to delete this {deleteTarget.type}?
                {deleteTarget.type === 'building' && ' If this building contains rooms, deletion will be safely blocked.'}
                {deleteTarget.type === 'floor' && ' If this level contains rooms, deletion will be safely blocked.'}
                {deleteTarget.type === 'room' && ' If this room has active allocations or exams, deletion will be safely blocked.'}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  padding: '9px 18px',
                  borderRadius: '6px',
                }}
              >
                {deleting ? 'Deleting...' : `Confirm Delete`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampusRoomsManagement;
