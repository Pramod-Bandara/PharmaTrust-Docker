"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth, withAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { EnvironmentalData, MedicineBatch } from "@/types";
import { useBatchesByManufacturer } from "@/hooks/useBatches";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Package,
  Plus,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Scan,
} from "lucide-react";
import CreateBatchModal from "@/components/manufacturer/CreateBatchModal";
import BatchDetailsModal from "@/components/manufacturer/BatchDetailsModal";
import QRScannerModal from "@/components/common/QRScannerModal";
import SimpleBatchList from "@/components/common/SimpleBatchList";
import MLStatusPanel, {
  BatchStatistics,
  MLLogEntry,
  MLStatistics,
} from "@/components/common/MLStatusPanel";

const ManufacturerDashboard = () => {
  const { user } = useAuth();
  const { batches, loading, error, refetch } = useBatchesByManufacturer(
    user?.username || "",
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<MedicineBatch | null>(
    null,
  );
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [mlStats, setMlStats] = useState<MLStatistics | null>(null);
  const [mlBatchStats, setMlBatchStats] = useState<BatchStatistics | null>(
    null,
  );
  const [mlError, setMlError] = useState<string | null>(null);
  const [logs, setLogs] = useState<MLLogEntry[]>([]);
  const [mlLoading, setMlLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchMLStats = useCallback(async () => {
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
        const items = Array.isArray(logsData)
          ? (logsData as EnvironmentalData[])
          : Array.isArray(logsData?.items)
            ? logsData.items
            : [];
        setLogs(items as MLLogEntry[]);
      }

      setLastUpdated(new Date());
    } catch (err) {
      setMlError(err instanceof Error ? err.message : "Failed to load ML data");
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
    fetchMLStats();
  }, [fetchMLStats]);

  useEffect(() => {
    if (selectedBatchId) {
      fetchBatchMlStats(selectedBatchId);
    }
  }, [fetchBatchMlStats, selectedBatchId]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchMLStats();
      if (selectedBatchId) {
        fetchBatchMlStats(selectedBatchId);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedBatchId, fetchMLStats, fetchBatchMlStats]);

  const handleBatchCreated = (_newBatch: MedicineBatch) => {
    // Refresh batches to get the latest data from MongoDB
    refetch();
    setShowCreateModal(false);
  };

  const handleQRScan = (batchId: string) => {
    setShowQRScanner(false);
    // Find and select the batch
    const batch = batches.find((b) => b.batchId === batchId);
    if (batch) {
      setSelectedBatch(batch);
      setSelectedBatchId(batchId);
    } else {
      alert(`Batch ${batchId} not found in your batches.`);
    }
  };

  // Statistics
  const stats = {
    total: batches.length,
    good: batches.filter((b) => b.qualityStatus === "good").length,
    compromised: batches.filter((b) => b.qualityStatus === "compromised")
      .length,
    inTransit: batches.filter(
      (b) => b.currentStage !== "manufacturer" && b.currentStage !== "customer",
    ).length,
  };

  if (loading) {
    return (
      <DashboardLayout title="Manufacturer Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Manufacturer Dashboard"
      subtitle="Create and monitor medicine batches throughout the supply chain"
    >
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All manufactured batches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Quality Status
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.good}
            </div>
            <p className="text-xs text-muted-foreground">
              Good quality batches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compromised</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.compromised}
            </div>
            <p className="text-xs text-muted-foreground">
              Quality issues detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.inTransit}
            </div>
            <p className="text-xs text-muted-foreground">
              Moving through supply chain
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-Time Monitoring Section */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">
          Machine Learning Insights
        </h2>
        <MLStatusPanel
          selectedBatchId={selectedBatchId}
          batches={batches}
          onBatchChange={(id) => setSelectedBatchId(id)}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={() => setAutoRefresh((prev) => !prev)}
          onRefresh={() => {
            fetchMLStats();
            if (selectedBatchId) {
              fetchBatchMlStats(selectedBatchId);
            }
          }}
          loading={mlLoading}
          lastUpdated={lastUpdated}
          mlStats={mlStats}
          mlBatchStats={mlBatchStats}
          mlError={mlError}
          logs={logs}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Medicine Batches</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowQRScanner(true)}>
            <Scan className="h-4 w-4 mr-2" />
            Scan QR Code
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Batch
          </Button>
        </div>
      </div>

      {/* Batches List - Using SimpleBatchList Component */}
      <SimpleBatchList
        batches={batches}
        title="My Batches"
        description="Medicine batches you have manufactured"
        onBatchSelect={setSelectedBatch}
        emptyMessage="No batches created yet. Start by creating your first medicine batch."
        showFilters={true}
      />

      {/* Modals */}
      {showCreateModal && (
        <CreateBatchModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onBatchCreated={handleBatchCreated}
        />
      )}

      {selectedBatch && (
        <BatchDetailsModal
          batch={selectedBatch}
          isOpen={!!selectedBatch}
          onClose={() => setSelectedBatch(null)}
        />
      )}

      {showQRScanner && (
        <QRScannerModal
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScan={handleQRScan}
          title="Scan Batch QR Code"
          description="Upload a QR code image to quickly locate and view batch details"
        />
      )}
    </DashboardLayout>
  );
};

export default withAuth(ManufacturerDashboard);
