import api from './api.js';

/**
 * Service handling all Administrative CRUD, Infrastructure, Seating Allocation,
 * PDF Export, and Digital Attendance API operations.
 * Relies on centralized api.js Axios client which automatically attaches the JWT Bearer token.
 */

// --- Departments ---
export const getDepartments = async () => {
  const response = await api.get('/api/departments');
  return response.data;
};

export const createDepartment = async (department) => {
  const response = await api.post('/api/departments', department);
  return response.data;
};

export const updateDepartment = async (id, department) => {
  const response = await api.put(`/api/departments/${id}`, department);
  return response.data;
};

export const deleteDepartment = async (id, cascade = true) => {
  if (cascade) {
    await api.delete(`/api/departments/${id}/cascade`);
  } else {
    await api.delete(`/api/departments/${id}`);
  }
};

export const deleteDepartmentCascade = async (id) => {
  await api.delete(`/api/departments/${id}/cascade`);
};

export const getDepartmentDetails = async (id) => {
  const response = await api.get(`/api/departments/${id}/details`);
  return response.data;
};

// --- Sections ---
export const getSections = async () => {
  const response = await api.get('/api/sections');
  return response.data;
};

export const createSection = async (section) => {
  const response = await api.post('/api/sections', section);
  return response.data;
};

export const updateSection = async (id, section) => {
  const response = await api.put(`/api/sections/${id}`, section);
  return response.data;
};

export const deleteSection = async (id, cascade = true) => {
  if (cascade) {
    await api.delete(`/api/sections/${id}/cascade`);
  } else {
    await api.delete(`/api/sections/${id}`);
  }
};

export const deleteSectionCascade = async (id) => {
  await api.delete(`/api/sections/${id}/cascade`);
};

export const createSectionsBatch = async (batchData) => {
  const response = await api.post('/api/sections/batch', batchData);
  return response.data;
};

export const configureSectionPattern = async (sectionId, config) => {
  const response = await api.put(`/api/sections/${sectionId}/config`, config);
  return response.data;
};

export const addDetainedRollNumber = async (sectionId, rollNumber) => {
  const response = await api.post(`/api/sections/${sectionId}/detained`, { rollNumber });
  return response.data;
};

export const removeDetainedRollNumber = async (sectionId, rollNumber) => {
  const response = await api.delete(`/api/sections/${sectionId}/detained/${rollNumber}`);
  return response.data;
};

export const getDetainedRollNumbers = async (sectionId) => {
  const response = await api.get(`/api/sections/${sectionId}/detained`);
  return response.data;
};

export const getSectionDetails = async (sectionId) => {
  const response = await api.get(`/api/sections/${sectionId}/details`);
  return response.data;
};

// --- Students ---
export const getStudents = async () => {
  const response = await api.get('/api/students');
  return response.data;
};

export const getStudentsBySection = async (sectionId) => {
  const response = await api.get(`/api/students/section/${sectionId}`);
  return response.data;
};

export const createStudent = async (student) => {
  const response = await api.post('/api/students', student);
  return response.data;
};

export const updateStudent = async (id, student) => {
  const response = await api.put(`/api/students/${id}`, student);
  return response.data;
};

export const deleteStudent = async (id) => {
  await api.delete(`/api/students/${id}`);
};

// --- Campus Infrastructure: Buildings & Campus Summary ---
export const getCampusSummary = async () => {
  const response = await api.get('/api/buildings/summary');
  return response.data;
};

export const getBuildings = async () => {
  const response = await api.get('/api/buildings');
  return response.data;
};

export const getBuildingById = async (id) => {
  const response = await api.get(`/api/buildings/${id}`);
  return response.data;
};

export const createBuilding = async (buildingData) => {
  const response = await api.post('/api/buildings', buildingData);
  return response.data;
};

export const updateBuilding = async (id, buildingData) => {
  const response = await api.put(`/api/buildings/${id}`, buildingData);
  return response.data;
};

export const deleteBuilding = async (id) => {
  await api.delete(`/api/buildings/${id}`);
};

export const getBuildingFloors = async (buildingId) => {
  const response = await api.get(`/api/buildings/${buildingId}/floors`);
  return response.data;
};

export const createBuildingFloor = async (buildingId, floorData) => {
  const response = await api.post(`/api/buildings/${buildingId}/floors`, floorData);
  return response.data;
};

// --- Campus Infrastructure: Floors (Phase 7 Step 4) ---
export const getFloorsByBuilding = async (buildingId) => {
  const response = await api.get(`/api/floors?buildingId=${buildingId}`);
  return response.data;
};

export const updateFloor = async (id, floorData) => {
  const response = await api.put(`/api/floors/${id}`, floorData);
  return response.data;
};

export const deleteFloor = async (id) => {
  await api.delete(`/api/floors/${id}`);
};

// --- Rooms & Halls ---
export const getRooms = async (buildingId = null, floorId = null) => {
  const params = {};
  if (buildingId) params.buildingId = buildingId;
  if (floorId) params.floorId = floorId;
  const response = await api.get('/api/rooms', { params });
  return response.data;
};

export const getRoomById = async (id) => {
  const response = await api.get(`/api/rooms/${id}`);
  return response.data;
};

export const createRoom = async (room) => {
  const response = await api.post('/api/rooms', room);
  return response.data;
};

export const createRoomDTO = async (roomDto) => {
  const response = await api.post('/api/rooms/dto', roomDto);
  return response.data;
};

export const updateRoom = async (id, room) => {
  const response = await api.put(`/api/rooms/${id}`, room);
  return response.data;
};

export const updateRoomDTO = async (id, roomDto) => {
  const response = await api.put(`/api/rooms/${id}/dto`, roomDto);
  return response.data;
};

export const deleteRoom = async (id) => {
  await api.delete(`/api/rooms/${id}`);
};

export const getRoomLayout = async (id) => {
  const response = await api.get(`/api/rooms/${id}/layout`);
  return response.data;
};

export const checkRoomConflict = async (id, examDate, startTime, endTime, excludeExamId = null) => {
  const params = {};
  if (examDate) params.examDate = examDate;
  if (startTime) params.startTime = startTime;
  if (endTime) params.endTime = endTime;
  if (excludeExamId) params.excludeExamId = excludeExamId;
  const response = await api.get(`/api/rooms/${id}/conflict`, { params });
  return response.data;
};

// --- Exams Schedule ---
export const getExams = async () => {
  const response = await api.get('/api/exams');
  return response.data;
};

export const getExamById = async (id) => {
  const response = await api.get(`/api/exams/${id}`);
  return response.data;
};

export const createExam = async (exam) => {
  const response = await api.post('/api/exams', exam);
  return response.data;
};

export const updateExam = async (id, exam) => {
  const response = await api.put(`/api/exams/${id}`, exam);
  return response.data;
};

export const deleteExam = async (id) => {
  await api.delete(`/api/exams/${id}`);
};

export const getExamSelectedRooms = async (id) => {
  const response = await api.get(`/api/exams/${id}/rooms`);
  return response.data;
};

export const saveExamSelectedRooms = async (id, roomIds) => {
  const response = await api.post(`/api/exams/${id}/rooms`, { roomIds });
  return response.data;
};

// --- Seating Allocation Engine & Queries ---
export const generateAllocation = async (request) => {
  const response = await api.post('/api/allocations/generate', request);
  return response.data;
};

export const getAllocationsByExam = async (examId) => {
  const response = await api.get(`/api/allocations/${examId}`);
  return response.data;
};

export const getAllocationsByExamAndRoom = async (examId, roomId) => {
  const response = await api.get(`/api/allocations/${examId}/room/${roomId}`);
  return response.data;
};

// --- Digital Attendance (Phase 7 Step 4) ---
export const getExamAttendance = async (examId) => {
  const response = await api.get(`/api/attendance/${examId}`);
  return response.data;
};

export const getRoomAttendance = async (examId, roomId) => {
  const response = await api.get(`/api/attendance/${examId}/room/${roomId}`);
  return response.data;
};

export const getAttendanceSummary = async (examId) => {
  const response = await api.get(`/api/attendance/${examId}/summary`);
  return response.data;
};

export const updateStudentAttendance = async (examId, studentId, status) => {
  const response = await api.put(`/api/attendance/${examId}/student/${studentId}`, { status });
  return response.data;
};

export const bulkUpdateAttendance = async (examId, status, roomId = null) => {
  const payload = { status };
  if (roomId) payload.roomId = roomId;
  const response = await api.post(`/api/attendance/${examId}/bulk`, payload);
  return response.data;
};

// --- PDF Generation & Export (Phase 7 Step 3 Reused) ---
export const triggerBlobDownload = (blob, filename) => {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const downloadExamSeatingPdf = async (examId, examCode = 'EXAM') => {
  const response = await api.get(`/api/allocations/${examId}/pdf`, {
    responseType: 'blob',
  });
  const sanitizedCode = String(examCode).replace(/[^a-zA-Z0-9_-]/g, '_');
  triggerBlobDownload(response.data, `Exam_Seating_${sanitizedCode}.pdf`);
  return response.data;
};

export const downloadRoomSeatingPdf = async (examId, roomId, examCode = 'EXAM', roomNum = 'ROOM') => {
  const response = await api.get(`/api/allocations/${examId}/room/${roomId}/pdf`, {
    responseType: 'blob',
  });
  const sanitizedCode = String(examCode).replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedRoom = String(roomNum).replace(/[^a-zA-Z0-9_-]/g, '_');
  triggerBlobDownload(response.data, `Room_Seating_${sanitizedCode}_${sanitizedRoom}.pdf`);
  return response.data;
};

export const downloadAttendancePdf = async (examId, roomId, examCode = 'EXAM', roomNum = 'ROOM') => {
  const response = await api.get(`/api/allocations/${examId}/room/${roomId}/attendance-pdf`, {
    responseType: 'blob',
  });
  const sanitizedCode = String(examCode).replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedRoom = String(roomNum).replace(/[^a-zA-Z0-9_-]/g, '_');
  triggerBlobDownload(response.data, `Attendance_${sanitizedCode}_${sanitizedRoom}.pdf`);
  return response.data;
};

// --- Admin Data Overview ---
export const getAdminDataOverview = async () => {
  const response = await api.get('/api/admin/data-overview');
  return response.data;
};
