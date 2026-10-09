import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import DashboardOverview from '../../components/admin/DashboardOverview.jsx';
import DepartmentManagement from '../../components/admin/DepartmentManagement.jsx';
import SectionManagement from '../../components/admin/SectionManagement.jsx';
import StudentManagement from '../../components/admin/StudentManagement.jsx';
import CampusRoomsManagement from '../../components/admin/CampusRoomsManagement.jsx';
import InfrastructureManagement from '../../components/admin/InfrastructureManagement.jsx';
import RoomManagement from '../../components/admin/RoomManagement.jsx';
import ExamManagement from '../../components/admin/ExamManagement.jsx';
import AllocationManagement from '../../components/admin/AllocationManagement.jsx';
import DatabaseOverview from '../../components/admin/DatabaseOverview.jsx';

/**
 * Real Admin Dashboard Page for Exam Hall Seating Allocator.
 * Renders complete administrative interface with navigation to all management modules,
 * including Campus & Rooms and Seating Allocation.
 */
export const AdminDashboard = ({ initialTab = 'dashboard' }) => {
  const location = useLocation();

  const getInitialTab = () => {
    if (location?.pathname?.startsWith('/admin/sections')) return 'sections';
    if (location?.pathname?.startsWith('/admin/database')) return 'database';
    if (location?.pathname?.startsWith('/admin/campus-rooms')) return 'campus-rooms';
    if (location?.pathname?.startsWith('/admin/seating')) return 'allocations';
    return initialTab;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    if (location?.pathname?.startsWith('/admin/sections')) {
      setActiveTab('sections');
    } else if (location?.pathname?.startsWith('/admin/database')) {
      setActiveTab('database');
    } else if (location?.pathname?.startsWith('/admin/campus-rooms')) {
      setActiveTab('campus-rooms');
    } else if (location?.pathname?.startsWith('/admin/seating')) {
      setActiveTab('allocations');
    }
  }, [location?.pathname]);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview setActiveTab={setActiveTab} />;
      case 'departments':
        return <DepartmentManagement />;
      case 'sections':
        return <SectionManagement />;
      case 'students':
        return <StudentManagement />;
      case 'campus-rooms':
      case 'infrastructure':
      case 'rooms':
        return <CampusRoomsManagement />;
      case 'exams':
        return <ExamManagement />;
      case 'allocations':
      case 'seating':
        return <AllocationManagement />;
      case 'database':
        return <DatabaseOverview />;
      default:
        return <DashboardOverview setActiveTab={setActiveTab} />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderActiveView()}
    </AdminLayout>
  );
};

export default AdminDashboard;
