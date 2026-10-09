import React from 'react';
import CampusRoomsManagement from './CampusRoomsManagement.jsx';

/**
 * Re-exports the unified CampusRoomsManagement component to ensure full backwards compatibility
 * across all existing imports and test runners.
 */
export const InfrastructureManagement = (props) => {
  return <CampusRoomsManagement {...props} />;
};

export default InfrastructureManagement;
