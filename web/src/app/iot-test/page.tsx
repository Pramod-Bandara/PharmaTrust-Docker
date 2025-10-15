"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PopupAlertManager, {
  addPopupAlert,
} from "@/components/ui/popup-alert-manager";
import {
  RadioTower,
  Thermometer,
  Droplets,
  Activity,
  Wifi,
  WifiOff,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  AlertTriangle,
  Database,
  RefreshCw,
  Eye,
  Zap,
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { EnvironmentalData } from "@/types";

interface DeviceDataStream extends EnvironmentalData {
  receivedAt: Date;
  alertLevel: "normal" | "warning" | "critical";
  tempTrend: "up" | "down" | "stable";
}

const IoTTestPage = () => {
  const [dataStream, setDataStream] = useState<DeviceDataStream[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<
    Map<string, DeviceDataStream>
  >(new Map());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [alertCount, setAlertCount] = useState({
    critical: 0,
    warning: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Temperature thresholds
  const TEMP_THRESHOLDS = {
    CRITICAL_LOW: 2,
    WARNING_LOW: 5,
    OPTIMAL_LOW: 8,
    OPTIMAL_HIGH: 15,
    WARNING_HIGH: 22,
    CRITICAL_HIGH: 25,
  };

  const determineAlertLevel = useCallback(
    (temperature: number): "normal" | "warning" | "critical" => {
      if (
        temperature < TEMP_THRESHOLDS.CRITICAL_LOW ||
        temperature > TEMP_THRESHOLDS.CRITICAL_HIGH
      ) {
        return "critical";
      }
      if (
        temperature < TEMP_THRESHOLDS.WARNING_LOW ||
        temperature > TEMP_THRESHOLDS.WARNING_HIGH
      ) {
        return "warning";
      }
      return "normal";
    },
    [TEMP_THRESHOLDS],
  );

  const getTemperatureTrend = (
    currentTemp: number,
    previousTemp?: number,
  ): "up" | "down" | "stable" => {
    if (!previousTemp) return "stable";
    const diff = currentTemp - previousTemp;
    if (Math.abs(diff) < 0.5) return "stable";
    return diff > 0 ? "up" : "down";
  };

  const getTemperatureColor = (
    alertLevel: "normal" | "warning" | "critical",
  ) => {
    switch (alertLevel) {
      case "critical":
        return "text-red-600 bg-red-50";
      case "warning":
        return "text-yellow-600 bg-yellow-50";
      case "normal":
        return "text-green-600 bg-green-50";
    }
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-red-500" />;
      case "down":
        return <TrendingDown className="h-3 w-3 text-blue-500" />;
      case "stable":
        return <Minus className="h-3 w-3 text-gray-500" />;
    }
  };

  // WebSocket connection for real-time updates
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4003";

  // Load historical data on component mount
  const loadHistoricalData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/iot/readings?limit=20");
      if (response.ok) {
        const readings: EnvironmentalData[] = await response.json();
        // Process historical readings to populate devices
        const deviceMap = new Map<string, DeviceDataStream>();
        const processedReadings: DeviceDataStream[] = [];

        readings.forEach((reading) => {
          const alertLevel = determineAlertLevel(reading.temperature);
          const existingDevice = deviceMap.get(reading.deviceId);
          const tempTrend = getTemperatureTrend(
            reading.temperature,
            existingDevice?.temperature,
          );

          const deviceData: DeviceDataStream = {
            ...reading,
            receivedAt: new Date(reading.timestamp),
            alertLevel,
            tempTrend,
          };

          deviceMap.set(reading.deviceId, deviceData);
          processedReadings.push(deviceData);
        });

        setConnectedDevices(deviceMap);
        setDataStream(processedReadings);
        setLastUpdate(new Date());

        // Update alert counts based on historical data
        const criticalCount = processedReadings.filter(
          (r) => r.alertLevel === "critical",
        ).length;
        const warningCount = processedReadings.filter(
          (r) => r.alertLevel === "warning",
        ).length;
        setAlertCount({
          critical: criticalCount,
          warning: warningCount,
          total: processedReadings.length,
        });
      }
    } catch (error) {
      console.error("Failed to load historical IoT data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [determineAlertLevel]);

  // Load historical data on mount and retry if needed
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    const loadWithRetry = async () => {
      await loadHistoricalData();

      // Check if devices were loaded after a short delay
      setTimeout(() => {
        if (connectedDevices.size === 0 && retryCount < maxRetries) {
          retryCount++;
          console.log(
            `Retrying IoT data load... (attempt ${retryCount}/${maxRetries})`,
          );
          loadWithRetry();
        }
      }, 2000);
    };

    loadWithRetry();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const { isConnected: wsConnected, error: wsError } = useWebSocket(wsUrl, {
    onMessage: (message) => {
      if (message.type === "reading" || message.type === "anomaly") {
        handleNewReading(message.payload as EnvironmentalData);
      }
    },
    onError: (error) => {
      console.error("WebSocket error:", error);
    },
  });

  const handleNewReading = (reading: EnvironmentalData) => {
    const receivedAt = new Date();
    const alertLevel = determineAlertLevel(reading.temperature);
    const existingDevice = connectedDevices.get(reading.deviceId);
    const tempTrend = getTemperatureTrend(
      reading.temperature,
      existingDevice?.temperature,
    );

    const deviceData: DeviceDataStream = {
      ...reading,
      receivedAt,
      alertLevel,
      tempTrend,
    };

    // Update connected devices
    setConnectedDevices((prev) => {
      const newDevices = new Map(prev);
      newDevices.set(reading.deviceId, deviceData);
      return newDevices;
    });

    // Add to data stream (keep last 50 readings)
    setDataStream((prev) => {
      const newStream = [deviceData, ...prev];
      return newStream.slice(0, 50);
    });

    setLastUpdate(receivedAt);

    // Update alert counts
    setAlertCount((prev) => ({
      critical: prev.critical + (alertLevel === "critical" ? 1 : 0),
      warning: prev.warning + (alertLevel === "warning" ? 1 : 0),
      total: prev.total + 1,
    }));

    // Trigger popup alerts
    const previousAlertLevel = existingDevice?.alertLevel || "normal";

    if (alertLevel !== previousAlertLevel || alertLevel !== "normal") {
      const alertData = {
        deviceId: reading.deviceId,
        batchId: reading.batchId,
        temperature: reading.temperature,
        humidity: reading.humidity,
        autoClose: alertLevel === "critical" ? 20000 : 12000,
      };

      if (alertLevel === "critical") {
        addPopupAlert({
          ...alertData,
          type: "critical",
          title: "🚨 CRITICAL TEMPERATURE DETECTED",
          message: `Temperature ${reading.temperature.toFixed(1)}°C exceeds safe limits! Pharmaceutical integrity at risk.`,
        });
      } else if (alertLevel === "warning" && previousAlertLevel === "normal") {
        addPopupAlert({
          ...alertData,
          type: "warning",
          title: "⚠️ Temperature Warning",
          message: `Temperature ${reading.temperature.toFixed(1)}°C approaching critical thresholds.`,
        });
      }

      // ML Anomaly alerts
      if (reading.isAnomaly) {
        addPopupAlert({
          ...alertData,
          type: reading.severity === "high" ? "critical" : "warning",
          title: "🤖 Anomaly Detected",
          message: `ML system detected unusual environmental patterns in ${reading.deviceId}.`,
          autoClose: 15000,
        });
      }
    }
  };

  const clearAlerts = () => {
    setAlertCount({ critical: 0, warning: 0, total: 0 });
  };

  const triggerTestAlert = (type: "critical" | "warning" | "info") => {
    const testData = {
      deviceId: "TEST_DEVICE_001",
      batchId: "TEST_BATCH_001",
      temperature:
        type === "critical" ? 28.5 : type === "warning" ? 23.2 : 12.5,
      humidity: 45.0,
      autoClose: 8000,
    };

    if (type === "critical") {
      addPopupAlert({
        ...testData,
        type: "critical",
        title: "🧪 Test Critical Alert",
        message:
          "This is a test critical temperature alert for demonstration purposes.",
      });
    } else if (type === "warning") {
      addPopupAlert({
        ...testData,
        type: "warning",
        title: "🧪 Test Warning Alert",
        message: "This is a test warning alert for demonstration purposes.",
      });
    } else {
      addPopupAlert({
        ...testData,
        type: "info",
        title: "🧪 Test Info Alert",
        message:
          "This is a test informational alert for demonstration purposes.",
      });
    }
  };

  const devicesArray = Array.from(connectedDevices.values());
  const criticalDevices = devicesArray.filter(
    (d) => d.alertLevel === "critical",
  );
  const warningDevices = devicesArray.filter((d) => d.alertLevel === "warning");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏥 PharmaTrust IoT Real-time Monitor
          </h1>
          <p className="text-gray-600">
            Live pharmaceutical storage temperature monitoring and alert system
          </p>
        </div>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <RadioTower className="h-5 w-5" />
                <span>System Status</span>
              </div>
              <Button
                onClick={loadHistoricalData}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh Data</span>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3">
                {wsConnected ? (
                  <>
                    <Wifi className="h-5 w-5 text-green-600" />
                    <Badge className="bg-green-100 text-green-800">
                      Real-time Connected
                    </Badge>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-5 w-5 text-red-600" />
                    <Badge className="bg-red-100 text-red-800">
                      Connection Lost
                    </Badge>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  Devices: {isLoading ? "..." : connectedDevices.size}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-purple-600" />
                <span className="text-sm">
                  Updates: {isLoading ? "..." : dataStream.length}
                </span>
              </div>

              {lastUpdate && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">
                    Last: {lastUpdate.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alert Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {criticalDevices.length}
              </div>
              <p className="text-sm text-red-800">Critical Alerts</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {warningDevices.length}
              </div>
              <p className="text-sm text-yellow-800">Warning Alerts</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {devicesArray.filter((d) => d.alertLevel === "normal").length}
              </div>
              <p className="text-sm text-green-800">Normal Status</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {alertCount.total}
              </div>
              <p className="text-sm text-blue-800">Total Readings</p>
            </CardContent>
          </Card>
        </div>

        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Test Controls</span>
            </CardTitle>
            <CardDescription>
              Trigger test alerts to demonstrate the popup system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => triggerTestAlert("critical")}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Test Critical Alert
              </Button>
              <Button
                onClick={() => triggerTestAlert("warning")}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Test Warning Alert
              </Button>
              <Button
                onClick={() => triggerTestAlert("info")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Test Info Alert
              </Button>
              <Button onClick={clearAlerts} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Stats
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live Data Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connected Devices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Connected Devices ({connectedDevices.size})</span>
              </CardTitle>
              <CardDescription>
                Real-time device status and readings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <RefreshCw className="h-12 w-12 mx-auto mb-4 text-gray-300 animate-spin" />
                    <div>Loading IoT data...</div>
                    <div className="text-sm">Please wait...</div>
                  </div>
                ) : devicesArray.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <RadioTower className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <div>No devices connected</div>
                    <div className="text-sm">Waiting for IoT data...</div>
                  </div>
                ) : (
                  devicesArray.map((device) => (
                    <div
                      key={device.deviceId}
                      className={`p-4 rounded-lg border ${getTemperatureColor(device.alertLevel)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{device.deviceId}</div>
                        <Badge
                          className={
                            device.alertLevel === "critical"
                              ? "bg-red-100 text-red-800"
                              : device.alertLevel === "warning"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                          }
                        >
                          {device.alertLevel.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Thermometer className="h-4 w-4" />
                          <span>{device.temperature.toFixed(1)}°C</span>
                          {getTrendIcon(device.tempTrend)}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Droplets className="h-4 w-4" />
                          <span>{device.humidity.toFixed(1)}%</span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-600 mt-2">
                        Batch:{" "}
                        <span className="break-all max-w-xs inline-block">
                          {device.batchId}
                        </span>{" "}
                        • {device.receivedAt.toLocaleTimeString()}
                        {device.isAnomaly && (
                          <span className="ml-2 text-orange-600">
                            <Eye className="inline h-3 w-3 mr-1" />
                            ML Anomaly
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Data Stream */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Live Data Stream</span>
              </CardTitle>
              <CardDescription>
                Latest 20 readings from all devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {dataStream.slice(0, 20).map((reading, _index) => (
                  <div
                    key={`${reading.deviceId}-${reading.receivedAt.getTime()}`}
                    className={`p-3 rounded border text-sm ${
                      reading.alertLevel === "critical"
                        ? "border-red-200 bg-red-50"
                        : reading.alertLevel === "warning"
                          ? "border-yellow-200 bg-yellow-50"
                          : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{reading.deviceId}</span>
                        {reading.isAnomaly && (
                          <Badge className="text-xs bg-orange-100 text-orange-800">
                            ANOMALY
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {reading.receivedAt.toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 mt-1">
                      <span className="flex items-center space-x-1">
                        <Thermometer className="h-3 w-3" />
                        <span>{reading.temperature.toFixed(1)}°C</span>
                        {getTrendIcon(reading.tempTrend)}
                      </span>
                      <span className="flex items-center space-x-1">
                        <Droplets className="h-3 w-3" />
                        <span>{reading.humidity.toFixed(1)}%</span>
                      </span>
                      <span className="text-xs text-gray-500 break-all max-w-xs">
                        {reading.batchId}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Temperature Threshold Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Temperature Thresholds</CardTitle>
            <CardDescription>
              Pharmaceutical storage temperature guidelines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <div className="font-medium text-green-800">Optimal Range</div>
                <div className="text-green-700">
                  {TEMP_THRESHOLDS.OPTIMAL_LOW}°C -{" "}
                  {TEMP_THRESHOLDS.OPTIMAL_HIGH}°C
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Safe pharmaceutical storage
                </div>
              </div>
              <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                <div className="font-medium text-yellow-800">Warning Range</div>
                <div className="text-yellow-700">
                  {TEMP_THRESHOLDS.WARNING_LOW}°C -{" "}
                  {TEMP_THRESHOLDS.WARNING_HIGH}°C
                </div>
                <div className="text-xs text-yellow-600 mt-1">
                  Monitor closely
                </div>
              </div>
              <div className="p-3 bg-red-50 rounded border border-red-200">
                <div className="font-medium text-red-800">Critical Range</div>
                <div className="text-red-700">
                  &lt;{TEMP_THRESHOLDS.CRITICAL_LOW}°C or &gt;
                  {TEMP_THRESHOLDS.CRITICAL_HIGH}°C
                </div>
                <div className="text-xs text-red-600 mt-1">
                  Immediate action required
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {wsError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Connection Error</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Unable to connect to IoT service. Using polling mode for
                updates.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Popup Alert Manager */}
      <PopupAlertManager maxAlerts={5} />
    </div>
  );
};

export default IoTTestPage;
