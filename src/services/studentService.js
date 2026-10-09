import api from './api.js';

/**
 * Service handling student portal data operations.
 * Uses centralized api.js Axios instance with automatic JWT Bearer token attachment.
 */

/**
 * Fetch current authenticated student profile identity from the backend.
 * Endpoint: GET /api/student/me (Protected by ROLE_STUDENT)
 * @returns {Promise<{username: string, role: string}>}
 */
export const getStudentMe = async () => {
  const response = await api.get('/api/student/me');
  return response.data;
};

/**
 * Retrieve personal seat allocation for the currently authenticated student.
 * Endpoint: GET /api/student/allocation/{examId} (Protected by ROLE_STUDENT)
 * Extracts student identity exclusively from the authenticated JWT session.
 * 
 * @param {number|string} examId
 * @returns {Promise<Object|null>} The student's allocation details or null if not yet allocated
 */
export const getStudentAllocation = async (examId) => {
  try {
    const response = await api.get(`/api/student/allocation/${examId}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
};

export const getMyAllocation = getStudentAllocation;

/**
 * Attempt to retrieve examination allocations for a given exam.
 * Handles role-based restrictions gracefully (e.g. 403 if restricted to ADMIN).
 * 
 * @param {number|string} examId 
 * @returns {Promise<{data: Array, restricted: boolean}>}
 */
export const getExamAllocations = async (examId) => {
  try {
    const response = await api.get(`/api/allocations/${examId}`);
    return { data: response.data || [], restricted: false };
  } catch (err) {
    if (err.response && err.response.status === 403) {
      // Backend restricts full allocations endpoint to ROLE_ADMIN
      return { data: [], restricted: true };
    }
    throw err;
  }
};

/**
 * Filter an allocation roster strictly for the authenticated student.
 * Guarantees privacy: never returns or exposes peer student allocations.
 * 
 * @param {Array} allocations - List of allocation objects
 * @param {string} studentIdentifier - Username or Roll Number of the student
 * @returns {Object|null} The student's specific seat allocation or null
 */
export const filterStudentAllocation = (allocations, studentIdentifier) => {
  if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
    return null;
  }

  if (!studentIdentifier) {
    return null;
  }

  const query = studentIdentifier.trim().toLowerCase();

  const match = allocations.find((alloc) => {
    const roll = alloc.rollNumber ? alloc.rollNumber.trim().toLowerCase() : '';
    const name = alloc.studentName ? alloc.studentName.trim().toLowerCase() : '';
    return roll === query || name.includes(query);
  });

  return match || null;
};
