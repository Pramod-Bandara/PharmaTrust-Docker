// Admin batches page - placeholder for now
'use client';

import { useAuth, withAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BatchManagementCard from '@/components/admin/BatchManagementCard';
import { useBatches } from '@/hooks/useBatches';
import { useRouter } from 'next/navigation';

const AdminBatchesPage = () => {
  const { user: _user } = useAuth();
  const { batches, loading: _loading, error: _error, refetch } = useBatches();
  const router = useRouter();

  return (
    <DashboardLayout title="Batch Management" subtitle="Manage and monitor medicine batches">
      <BatchManagementCard 
        batches={batches} 
        onBatchSelect={(batch) => router.push(`/admin/batches/${batch._id}`)} 
        onRefresh={refetch}
      />
    </DashboardLayout>
  );
};

export default withAuth(AdminBatchesPage);
