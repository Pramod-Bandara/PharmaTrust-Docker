// Admin users page - placeholder for now
'use client';

import { useAuth, withAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import UserManagementCard from '@/components/admin/UserManagementCard';

const AdminUsersPage = () => {
  const { user: _user } = useAuth();

  return (
    <DashboardLayout title="User Management" subtitle="Manage system users and permissions">
      <UserManagementCard onRefresh={() => {}} />
    </DashboardLayout>
  );
};

export default withAuth(AdminUsersPage);
