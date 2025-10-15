// Admin system page - placeholder for now
'use client';

import { useAuth, withAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SystemStatusCard from '@/components/admin/SystemStatusCard';
import ServiceOverviewCard from '@/components/admin/ServiceOverviewCard';
import { useState, useEffect } from 'react';
import { type SystemHealth } from '@/lib/health-check';

const AdminSystemPage = () => {
  const { user: _user } = useAuth();
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  const fetchSystemHealth = async () => {
    try {
      const healthResponse = await fetch('/api/system/health');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setSystemHealth(healthData);
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    }
  };

  useEffect(() => {
    fetchSystemHealth();
  }, []);

  return (
    <DashboardLayout title="System Management" subtitle="Monitor system health and services">
      <div className="space-y-6">
        <SystemStatusCard systemHealth={systemHealth} />
        <ServiceOverviewCard onRefresh={fetchSystemHealth} />
      </div>
    </DashboardLayout>
  );
};

export default withAuth(AdminSystemPage);
