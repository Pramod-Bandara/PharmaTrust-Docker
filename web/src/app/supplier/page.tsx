"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth, withAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiClient } from "@/lib/api-client";
import { EnvironmentalData, MedicineBatch } from "@/types";
import { useBatchesByStage } from "@/hooks/useBatches";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Thermometer,
  Droplets,
  AlertTriangle,
  Activity,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Scan,
} from "lucide-react";
import RealtimeChart from "@/components/supplier/RealtimeChart";
import AnomalyAlerts from "@/components/supplier/AnomalyAlerts";
import QRScannerModal from "@/components/common/QRScannerModal";
import SimpleBatchList from "@/components/common/SimpleBatchList";
import BatchDetailsModal from "@/components/manufacturer/BatchDetailsModal";
import MLStatusPanel, {
  BatchStatistics,
  MLLogEntry,
  MLStatistics,
} from "@/components/common/MLStatusPanel";

const SupplierDashboard = () => {
  const { user: _user } = useAuth();
  const { batches, refetch: refetchBatches } = useBatchesByStage("supplier");
  const [iotData, setIotData] = useState<EnvironmentalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [mlStats, setMlStats] = useState<MLStatistics | null>(null);
  const [mlBatchStats, setMlBatchStats] = useState<BatchStatistics | null>(
    null,
  );
  const [mlLogs, setMlLogs] = useState<MLLogEntry[]>([]);
  const [mlError, setMlError] = useState<string | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlLastUpdated, setMlLastUpdated] = useState(new Date());
  const [selectedBatch, setSelectedBatch] = useState<MedicineBatch | null>(
    null,
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch recent IoT readings
      const iotResponse = await apiClient.getIoTReadings(
        selectedBatchId || undefined,
        50,
      );
      if (iotResponse.success) {
        const arr = (iotResponse.data || []) as EnvironmentalData[];
        const sorted = arr.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        setIotData(sorted);
      }

      // Refresh batches using the centralized hook
      await refetchBatches();

      setLastUpdate(new Date());
      setError("");
    } catch {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [selectedBatchId, refetchBatches]);

  const fetchMlStats = useCallback(async () => {
    try {
      setMlLoading(true);
      setMlError(null);

      const statsResponse = await fetch("/api/iot/ml/statistics");
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setMlStats(statsData.stats ?? null);
      } else {
        const errData = await statsResponse.json().catch(() => ({}));
        setMlError(errData.error || "Failed to load ML statistics");
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
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }
    const interval = setInterval(() => {
      fetchData();
      fetchMlStats();
      if (selectedBatchId) {
        fetchBatchMlStats(selectedBatchId);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [
    autoRefresh,
    fetchData,
    fetchMlStats,
    fetchBatchMlStats,
    selectedBatchId,
  ]);

  useEffect(() => {
    fetchMlStats();
  }, [fetchMlStats]);

  useEffect(() => {
    if (selectedBatchId) {
      fetchBatchMlStats(selectedBatchId);
    } else {
      setMlBatchStats(null);
    }
  }, [fetchBatchMlStats, selectedBatchId]);

  useEffect(() => {
    setMlLogs(iotData as MLLogEntry[]);
  }, [iotData]);

  // WebSocket live updates
  useEffect(() => {
    // Use WS through gateway; supports upgrade via NGINX
    const envWsUrl = process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "");
    const protocol =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "wss"
        : "ws";
    const host =
      typeof window !== "undefined" ? window.location.host : "localhost";
    const fallbackWsUrl = `${protocol}://${host}/api/iot`;
    const wsUrl = envWsUrl && envWsUrl.length > 0 ? envWsUrl : fallbackWsUrl;

    let closed = false;
    let socket: WebSocket | null = null;

    const connect = () => {
      socket = new WebSocket(wsUrl);
      socket.onopen = () => {
        // no-op
      };
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: "reading" | "anomaly";
            payload: EnvironmentalData;
          };
          if (msg.type === "reading") {
            const reading = msg.payload;
            if (!selectedBatchId || reading.batchId === selectedBatchId) {
              setIotData((prev) => {
                const next = [reading, ...prev];
                return next.slice(0, 200);
              });
              setLastUpdate(new Date());
            }
          } else if (msg.type === "anomaly") {
            const reading = msg.payload;
            if (!selectedBatchId || reading.batchId === selectedBatchId) {
              setIotData((prev) => {
                const next = [reading, ...prev];
                return next.slice(0, 200);
              });
            }
          }
        } catch {
          // ignore parse errors
        }
      };
      socket.onclose = () => {
        if (!closed) {
          setTimeout(connect, 2000);
        }
      };
      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();
    return () => {
      closed = true;
      socket?.close();
    };
  }, [selectedBatchId]);

  // Calculate statistics
  const stats = {
    totalReadings: iotData.length,
    anomalies: iotData.filter((d) => d.isAnomaly).length,
    activeBatches: batches.length,
    avgTemperature:
      iotData.length > 0
        ? (
            iotData.reduce((sum, d) => sum + d.temperature, 0) / iotData.length
          ).toFixed(1)
        : "0",
    avgHumidity:
      iotData.length > 0
        ? (
            iotData.reduce((sum, d) => sum + d.humidity, 0) / iotData.length
          ).toFixed(1)
        : "0",
  };

  // 24h historical analysis (on current filtered dataset)
  const now = new Date().getTime();
  const last24h = iotData.filter(
    (d) => now - new Date(d.timestamp).getTime() <= 24 * 60 * 60 * 1000,
  );
  const last24hStats = {
    count: last24h.length,
    anomalies: last24h.filter((d) => d.isAnomaly).length,
    maxTemp: last24h.length
      ? Math.max(...last24h.map((d) => d.temperature))
      : 0,
    minTemp: last24h.length
      ? Math.min(...last24h.map((d) => d.temperature))
      : 0,
    maxHum: last24h.length ? Math.max(...last24h.map((d) => d.humidity)) : 0,
    minHum: last24h.length ? Math.min(...last24h.map((d) => d.humidity)) : 0,
  };

  // Get latest readings for each device
  const latestReadings = iotData.reduce(
    (acc, reading) => {
      if (
        !acc[reading.deviceId] ||
        new Date(reading.timestamp) > new Date(acc[reading.deviceId].timestamp)
      ) {
        acc[reading.deviceId] = reading;
      }
      return acc;
    },
    {} as Record<string, EnvironmentalData>,
  );

  const getTemperatureStatus = (temp: number) => {
    if (temp < 2 || temp > 25)
      return { status: "danger", icon: TrendingDown, color: "text-red-600" };
    if (temp < 5 || temp > 22)
      return { status: "warning", icon: TrendingUp, color: "text-yellow-600" };
    return { status: "good", icon: Minus, color: "text-green-600" };
  };

  const getHumidityStatus = (humidity: number) => {
    if (humidity < 30 || humidity > 70)
      return { status: "danger", icon: TrendingDown, color: "text-red-600" };
    if (humidity < 35 || humidity > 65)
      return { status: "warning", icon: TrendingUp, color: "text-yellow-600" };
    return { status: "good", icon: Minus, color: "text-green-600" };
  };

  const handleQRScan = (batchId: string) => {
    setShowQRScanner(false);
    // Set the batch filter to the scanned batch
    const batch = batches.find((b) => b.batchId === batchId);
    if (batch) {
      setSelectedBatchId(batchId);
    } else {
      alert(`Batch ${batchId} not found in supplier batches.`);
    }
  };

  return (
    <DashboardLayout
      title="Supplier Dashboard"
      subtitle="Monitor environmental conditions and medicine batches in real-time"
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
          <div className="text-sm text-gray-600">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <div>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b._id} value={b.batchId}>
                  {b.name} ({b.batchId})
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-green-50 text-green-700" : ""}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </Button>
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowQRScanner(true)}
            size="sm"
          >
            <Scan className="h-4 w-4 mr-2" />
            Scan QR Code
          </Button>
          <Button onClick={fetchData} disabled={loading} size="sm">
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* ML Insights */}
      <div className="mb-8">
        <MLStatusPanel
          selectedBatchId={selectedBatchId}
          batches={batches}
          onBatchChange={(id) => setSelectedBatchId(id)}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={() => setAutoRefresh((prev) => !prev)}
          onRefresh={async () => {
            await fetchMlStats();
            if (selectedBatchId) {
              await fetchBatchMlStats(selectedBatchId);
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Batches
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBatches}</div>
            <p className="text-xs text-muted-foreground">Under monitoring</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Temperature
            </CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTemperature}°C</div>
            <p className="text-xs text-muted-foreground">Optimal: 2-25°C</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Humidity</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgHumidity}%</div>
            <p className="text-xs text-muted-foreground">Optimal: 30-70%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Readings
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReadings}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.anomalies}
            </div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <RealtimeChart
          data={iotData}
          type="temperature"
          title="Temperature Monitoring"
          unit="°C"
          safeRange={{ min: 2, max: 25 }}
        />
        <RealtimeChart
          data={iotData}
          type="humidity"
          title="Humidity Monitoring"
          unit="%"
          safeRange={{ min: 30, max: 70 }}
        />
      </div>

      {/* Device Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Device Status</CardTitle>
          <CardDescription>
            Current status of all IoT monitoring devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(latestReadings).length === 0 ? (
            <p className="text-sm text-gray-500">No devices reporting data</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(latestReadings).map((reading) => {
                const tempStatus = getTemperatureStatus(reading.temperature);
                const humidityStatus = getHumidityStatus(reading.humidity);
                const TempIcon = tempStatus.icon;
                const HumidityIcon = humidityStatus.icon;

                return (
                  <Card key={reading.deviceId} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{reading.deviceId}</h4>
                        {reading.isAnomaly && (
                          <Badge variant="destructive" className="text-xs">
                            ANOMALY
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Thermometer className="h-4 w-4 text-red-500" />
                            <span className="text-sm">Temperature</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="font-medium">
                              {reading.temperature}°C
                            </span>
                            <TempIcon
                              className={`h-4 w-4 ${tempStatus.color}`}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Droplets className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">Humidity</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="font-medium">
                              {reading.humidity}%
                            </span>
                            <HumidityIcon
                              className={`h-4 w-4 ${humidityStatus.color}`}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-gray-500">
                          Last reading:{" "}
                          {new Date(reading.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anomaly Alerts */}
      <AnomalyAlerts data={iotData.filter((d) => d.isAnomaly)} />

      {/* 24h Historical Analysis */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Last 24 Hours Overview</CardTitle>
          <CardDescription>
            Summary for{" "}
            {selectedBatchId ? `batch ${selectedBatchId}` : "all batches"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-600">Readings</div>
              <div className="text-2xl font-bold">{last24hStats.count}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Anomalies</div>
              <div className="text-2xl font-bold text-red-600">
                {last24hStats.anomalies}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Temp Range</div>
              <div className="text-2xl font-bold">
                {last24hStats.minTemp}°C - {last24hStats.maxTemp}°C
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Humidity Range</div>
              <div className="text-2xl font-bold">
                {last24hStats.minHum}% - {last24hStats.maxHum}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Management */}
      <SimpleBatchList
        batches={batches}
        title="Supplier Batches"
        description="Medicine batches currently in your custody"
        onBatchSelect={setSelectedBatch}
        emptyMessage="No batches currently under your custody"
        showFilters={true}
      />

      {showQRScanner && (
        <QRScannerModal
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScan={handleQRScan}
          title="Scan Batch QR Code"
          description="Upload a QR code image to quickly filter IoT data for a specific batch"
        />
      )}

      {selectedBatch && (
        <BatchDetailsModal
          batch={selectedBatch}
          isOpen={!!selectedBatch}
          onClose={() => setSelectedBatch(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default withAuth(SupplierDashboard);
