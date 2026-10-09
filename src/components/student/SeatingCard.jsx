import React from 'react';

/**
 * SeatingCard component presenting the student's allocated exam seat.
 * Features high visual prominence for Hall, Seat Number, Row, and Column,
 * while strictly preserving privacy by omitting peer students' data.
 */
export const SeatingCard = ({ allocation, examDetails }) => {
  if (!allocation) {
    return (
      <div className="not-allocated-card">
        <div className="not-allocated-icon">🪑</div>
        <h3 className="not-allocated-title">Seat Not Allocated Yet</h3>
        <p className="not-allocated-desc">
          Your examination seating arrangement has not been generated yet, or is pending publication by the examination controller.
        </p>
        <span className="status-badge" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
          Status: Allocation Pending
        </span>
      </div>
    );
  }

  const roomDisplay = allocation.roomNumber ? `Room ${allocation.roomNumber}` : 'Exam Hall';
  const seatDisplay = allocation.seatNumber !== undefined ? `#${allocation.seatNumber}` : 'Assigned';
  const rowDisplay = allocation.rowNumber !== undefined ? allocation.rowNumber + 1 : '-';
  const colDisplay = allocation.columnNumber !== undefined ? allocation.columnNumber + 1 : '-';
  const deptSecDisplay = `${allocation.department || 'N/A'}-${allocation.section || 'N/A'}`;

  return (
    <div className="seating-card">
      <div className="seating-card-header">
        <div>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#0369a1', fontWeight: 700 }}>
            Confirmed Seating Allocation
          </span>
          <h2 className="seating-card-title">
            {examDetails?.subjectName || 'Examination'} ({examDetails?.subjectCode || 'Active Exam'})
          </h2>
        </div>
        <span className="exam-status-tag">Seat Confirmed</span>
      </div>

      {/* Primary Visual Prominence Grid */}
      <div className="seating-prominence-grid">
        <div className="prominence-box">
          <span className="prominence-label">Exam Hall</span>
          <span className="prominence-value" style={{ fontSize: '1.5rem' }}>{roomDisplay}</span>
        </div>

        <div className="prominence-box highlight">
          <span className="prominence-label">Seat Number</span>
          <span className="prominence-value">{seatDisplay}</span>
        </div>

        <div className="prominence-box">
          <span className="prominence-label">Row</span>
          <span className="prominence-value">{rowDisplay}</span>
        </div>

        <div className="prominence-box">
          <span className="prominence-label">Column</span>
          <span className="prominence-value">{colDisplay}</span>
        </div>
      </div>

      {/* Secondary Detailed Information */}
      <div className="seating-details-grid">
        <div className="detail-item">
          <span className="detail-label">Candidate Name</span>
          <span className="detail-val">{allocation.studentName || 'Student'}</span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Roll Number</span>
          <span className="detail-val" style={{ color: '#0284c7' }}>{allocation.rollNumber || 'N/A'}</span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Branch & Section</span>
          <span className="detail-val">{deptSecDisplay}</span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Exam Date & Session</span>
          <span className="detail-val">
            {examDetails?.examDate ? `${examDetails.examDate} (${examDetails.session || 'MORNING'})` : 'Scheduled Day'}
          </span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Timing</span>
          <span className="detail-val">
            {examDetails?.startTime ? `${examDetails.startTime.substring(0, 5)} - ${examDetails.endTime?.substring(0, 5)}` : '09:30 - 12:30'}
          </span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Location Details</span>
          <span className="detail-val">
            {roomDisplay} • Floor: Ground / Main Block
          </span>
        </div>
      </div>

      {/* Privacy-Preserving Position Guide */}
      <div style={{ padding: '0 24px 20px 24px' }}>
        <div className="student-room-map">
          <h4 className="room-map-title">📍 Hall Orientation & Seating Guide</h4>
          <div className="room-map-banner">▲ BLACKBOARD / FRONT DESK STAGE ▲</div>
          <div className="student-marker-box">
            Your assigned desk is positioned at <strong>Row {rowDisplay}</strong>, <strong>Column {colDisplay}</strong> in <strong>{roomDisplay}</strong>.
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px', textAlign: 'center' }}>
            * Peer student allocations are private and not displayed. Please proceed directly to your assigned seat upon entering the examination hall.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SeatingCard;
