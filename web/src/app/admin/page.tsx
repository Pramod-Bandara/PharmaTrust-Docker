"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth, withAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { type SystemHealth } from "@/lib/health-check";
import { MedicineBatch, type EnvironmentalData } from "@/types";
import { useBatches } from "@/hooks/useBatches";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Package,
  QrCode,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  BarChart3,
  Scan,
} from "lucide-react";
import QRGeneratorModal from "@/components/admin/QRGeneratorModal";
import EnhancedQRGenerator from "@/components/admin/EnhancedQRGenerator";
import QRScannerModal from "@/components/common/QRScannerModal";
import AdminBatchDetailsModal from "@/components/admin/AdminBatchDetailsModal";

import SystemStatusCard from "@/components/admin/SystemStatusCard";
import BatchManagementCard from "@/components/admin/BatchManagementCard";
import UserManagementCard from "@/components/admin/UserManagementCard";
import ServiceOverviewCard from "@/components/admin/ServiceOverviewCard";
import IoTServiceOverviewCard from "@/components/admin/IoTServiceOverviewCard";
import MLStatusPanel, {
  BatchStatistics,
  MLLogEntry,
  MLStatistics,
} from "@/components/common/MLStatusPanel";
import PopupAlertManager from "@/components/ui/popup-alert-manager";
import type { ServiceHealth } from "@/lib/health-check";

const AdminDashboard = () => {
  const { user: _user } = useAuth();
  const {
    batches,
    loading: batchesLoading,
    error: batchesError,
    refetch: refetchBatches,
  } = useBatches();
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [_selectedBatch, setSelectedBatch] = useState<MedicineBatch | null>(
    null,
  );
  const [mlStats, setMlStats] = useState<MLStatistics | null>(null);
  const [mlBatchStats, setMlBatchStats] = useState<BatchStatistics | null>(
    null,
  );
  const [mlLogs, setMlLogs] = useState<MLLogEntry[]>([]);
  const [mlError, setMlError] = useState<string | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlLastUpdated, setMlLastUpdated] = useState(new Date());
  const [mlAutoRefresh, setMlAutoRefresh] = useState(true);
  const [mlSelectedBatchId, setMlSelectedBatchId] = useState("");

  const fetchMlStats = useCallback(async () => {
    try {
      setMlLoading(true);
      setMlError(null);

      const [statsResponse, logsResponse] = await Promise.all([
        fetch("/api/iot/ml/statistics"),
        fetch("/api/iot/readings?limit=100"),
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setMlStats(statsData.stats ?? null);
      } else {
        const errData = await statsResponse.json().catch(() => ({}));
        setMlError(errData.error || "Failed to load ML statistics");
      }

      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        const normalizedLogs = Array.isArray(logsData)
          ? logsData
          : Array.isArray(
                (logsData as { items?: EnvironmentalData[] } | null)?.items,
              )
            ? (logsData as { items?: EnvironmentalData[] }).items
            : [];
        setMlLogs((normalizedLogs || []) as MLLogEntry[]);
      }

      setMlLastUpdated(new Date());
    } catch (err) {
      setMlError(
        err instanceof Error ? err.message : "Failed to load ML statistics",
      );
    } finally {
      setMlLoading(false);
    }
  }, []);

  const fetchBatchMlStats = useCallback(async (batchId: string) => {
    if (!batchId) {
      setMlBatchStats(null);
      return;
    }

    try {
      setMlError(null);
      const response = await fetch(
        `/api/iot/ml/batch/${encodeURIComponent(batchId)}/statistics`,
      );
      if (response.ok) {
        const data = await response.json();
        setMlBatchStats({ batchId: data.batchId, stats: data.stats });
      } else if (response.status === 404) {
        // Batch not found or no data yet - this is not an error condition
        setMlBatchStats(null);
        setMlError(null);
      } else {
        const errData = await response.json().catch(() => ({}));
        setMlError(errData.error || "Failed to load batch ML statistics");
        setMlBatchStats(null);
      }
    } catch (err) {
      setMlError(
        err instanceof Error
          ? err.message
          : "Failed to load batch ML statistics",
      );
      setMlBatchStats(null);
    }
  }, []);

  useEffect(() => {
    fetchMlStats();
  }, [fetchMlStats]);

  useEffect(() => {
    if (mlSelectedBatchId) {
      fetchBatchMlStats(mlSelectedBatchId);
    } else {
      setMlBatchStats(null);
    }
  }, [fetchBatchMlStats, mlSelectedBatchId]);

  useEffect(() => {
    if (!mlAutoRefresh) {
      return;
    }
    const interval = setInterval(() => {
      fetchMlStats();
      if (mlSelectedBatchId) {
        fetchBatchMlStats(mlSelectedBatchId);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [mlAutoRefresh, fetchMlStats, fetchBatchMlStats, mlSelectedBatchId]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Refresh batches using the centralized hook
      await refetchBatches();

      // Fetch system health from our server-side API
      try {
        const healthResponse = await fetch("/api/system/health");
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          setSystemHealth(healthData);
        } else {
          console.error("Health check failed:", healthResponse.status);
        }
      } catch (healthError) {
        console.error("Health check failed:", healthError);
      }

      setError(batchesError || "");
    } catch (err) {
      setError(batchesError || "Failed to fetch dashboard data");
      console.error("Dashboard data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [refetchBatches, batchesError]);

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Calculate comprehensive statistics
  const stats = {
    totalBatches: batches.length,
    manufacturers: new Set(batches.map((b) => b.manufacturerId)).size,
    goodQuality: batches.filter((b) => b.qualityStatus === "good").length,
    compromised: batches.filter((b) => b.qualityStatus === "compromised")
      .length,
    blockchainVerified: batches.filter((b) => b.blockchainHash).length,
    stages: {
      manufacturer: batches.filter((b) => b.currentStage === "manufacturer")
        .length,
      supplier: batches.filter((b) => b.currentStage === "supplier").length,
      pharmacist: batches.filter((b) => b.currentStage === "pharmacist").length,
      customer: batches.filter((b) => b.currentStage === "customer").length,
    },
    recentBatches: batches.filter((b) => {
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      return new Date(b.createdAt) > dayAgo;
    }).length,
  };

  const generateSystemReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      systemHealth: systemHealth,
      statistics: stats,
      batches: batches.map((batch) => ({
        batchId: batch.batchId,
        name: batch.name,
        currentStage: batch.currentStage,
        qualityStatus: batch.qualityStatus,
        blockchainVerified: !!batch.blockchainHash,
        createdAt: batch.createdAt,
      })),
    };

    const reportBlob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(reportBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pharmatrust-system-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleQRScan = (batchId: string) => {
    setShowQRScanner(false);
    // Find and select the batch
    const batch = batches.find((b) => b.batchId === batchId);
    if (batch) {
      setSelectedBatch(batch);
      // Scroll to batch management section
      document
        .getElementById("batch-management")
        ?.scrollIntoView({ behavior: "smooth" });
    } else {
      alert(`Batch ${batchId} not found in the system.`);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Admin Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Admin Dashboard"
      subtitle="System overview, batch management, and QR code generation"
    >
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Control Panel */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Button onClick={refetchBatches} disabled={batchesLoading} size="sm">
            <RefreshCw
              className={`h-4 w-4 mr-2 ${batchesLoading ? "animate-spin" : ""}`}
            />
            Refresh Data
          </Button>
          <Button onClick={generateSystemReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            System Report
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setShowQRScanner(true)}>
            <Scan className="h-4 w-4 mr-2" />
            Scan QR Code
          </Button>
          <Button onClick={() => setShowQRGenerator(true)}>
            <QrCode className="h-4 w-4 mr-2" />
            Generate QR Code
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <SystemStatusCard systemHealth={systemHealth} />

      {/* ML Insights */}
      <div className="mb-8">
        <MLStatusPanel
          selectedBatchId={mlSelectedBatchId}
          batches={batches}
          onBatchChange={(id) => setMlSelectedBatchId(id)}
          autoRefresh={mlAutoRefresh}
          onToggleAutoRefresh={() => setMlAutoRefresh((prev) => !prev)}
          onRefresh={async () => {
            await fetchMlStats();
            if (mlSelectedBatchId) {
              await fetchBatchMlStats(mlSelectedBatchId);
            }
          }}
          loading={mlLoading}
          lastUpdated={mlLastUpdated}
          mlStats={mlStats}
          mlBatchStats={mlBatchStats}
          mlError={mlError}
          logs={mlLogs}
        />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBatches}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.recentBatches} in last 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manufacturers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.manufacturers}</div>
            <p className="text-xs text-muted-foreground">Active entities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Good Quality</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.goodQuality}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.goodQuality / stats.totalBatches) * 100).toFixed(1)}% of
              total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Quality Issues
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.compromised}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Blockchain Verified
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.blockchainVerified}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.blockchainVerified / stats.totalBatches) * 100).toFixed(
                1,
              )}
              % verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                systemHealth?.overall === "healthy"
                  ? "text-green-600"
                  : systemHealth?.overall === "degraded"
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {systemHealth?.overall?.toUpperCase() || "UNKNOWN"}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemHealth?.services?.filter(
                (s: ServiceHealth) => s.status === "healthy",
              ).length || 0}{" "}
              services healthy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Supply Chain Stage Distribution */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Supply Chain Stage Distribution</span>
          </CardTitle>
          <CardDescription>
            Current distribution of batches across supply chain stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.stages.manufacturer}
              </div>
              <p className="text-sm text-blue-800">Manufacturer</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.stages.supplier}
              </div>
              <p className="text-sm text-purple-800">Supplier</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {stats.stages.pharmacist}
              </div>
              <p className="text-sm text-orange-800">Pharmacist</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.stages.customer}
              </div>
              <p className="text-sm text-green-800">Customer</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IoT Service Overview - Enhanced Real-time Monitoring */}
      <IoTServiceOverviewCard onRefresh={fetchDashboardData} />

      {/* Service Overview */}
      <ServiceOverviewCard onRefresh={fetchDashboardData} />

      {/* User Management */}
      <UserManagementCard onRefresh={fetchDashboardData} />

      {/* Batch Management */}
      <div id="batch-management">
        <BatchManagementCard
          batches={batches}
          onBatchSelect={setSelectedBatch}
          onRefresh={refetchBatches}
        />
      </div>

      {/* Enhanced QR Generator Section */}
      {showQRGenerator && (
        <div className="mb-8">
          <EnhancedQRGenerator batches={batches} />
        </div>
      )}

      {/* QR Generator Modal */}
      <QRGeneratorModal
        isOpen={showQRGenerator}
        onClose={() => setShowQRGenerator(false)}
        batches={batches}
      />

      {/* Popup Alert Manager */}
      <PopupAlertManager maxAlerts={3} />

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScannerModal
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScan={handleQRScan}
          title="Scan Batch QR Code"
          description="Upload a QR code image to quickly locate and manage a batch"
        />
      )}

      {/* Batch Details Modal */}
      {_selectedBatch && (
        <AdminBatchDetailsModal
          batch={_selectedBatch}
          isOpen={!!_selectedBatch}
          onClose={() => setSelectedBatch(null)}
          onBatchUpdated={(updatedBatch) => {
            setSelectedBatch(updatedBatch);
            refetchBatches();
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default withAuth(AdminDashboard);
