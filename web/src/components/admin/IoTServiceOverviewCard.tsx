'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RadioTower, 
  Thermometer, 
  Droplets, 
  AlertTriangle, 
  Activity,
  Wifi,
  Database,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  WifiOff,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { EnvironmentalData } from '@/types';
import { useWebSocket } from '@/hooks/useWebSocket';
import { addPopupAlert } from '@/components/ui/popup-alert-manager';

interface DeviceReading extends EnvironmentalData {
  lastSeen: Date;
  connectionStatus: 'online' | 'offline' | 'degraded';
  alertLevel: 'normal' | 'warning' | 'critical';
}

interface IoTServiceOverviewCardProps {
  onRefresh?: () => void;
}

const IoTServiceOverviewCard = ({ onRefresh }: IoTServiceOverviewCardProps) => {
  const [devices, setDevices] = useState<Map<string, DeviceReading>>(new Map());
  const [latestReadings, setLatestReadings] = useState<EnvironmentalData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [hivemqStatus, setHivemqStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [tempTrends, setTempTrends] = useState<Map<string, 'up' | 'down' | 'stable'>>(new Map());
  
  const refreshRef = useRef<() => void>(undefined);

  // Pharmaceutical storage temperature thresholds
  const TEMP_THRESHOLDS = {
    CRITICAL_LOW: 2,
    WARNING_LOW: 5,
    OPTIMAL_LOW: 8,
    OPTIMAL_HIGH: 15,
    WARNING_HIGH: 22,
    CRITICAL_HIGH: 25
  };

  const HUMIDITY_THRESHOLDS = {
    CRITICAL_LOW: 30,
    WARNING_LOW: 35,
    OPTIMAL_LOW: 40,
    OPTIMAL_HIGH: 60,
    WARNING_HIGH: 65,
    CRITICAL_HIGH: 70
  };

  // WebSocket connection for real-time updates
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4003';
  
  const { isConnected: wsConnected, error: wsError } = useWebSocket(wsUrl, {
    onMessage: (message) => {
      if (message.type === 'reading' || message.type === 'anomaly') {
        const reading = message.payload as EnvironmentalData;
        handleNewReading(reading);
        setLastUpdate(new Date());
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    }
  });

  const handleNewReading = (reading: EnvironmentalData) => {
    const alertLevel = determineAlertLevel(reading.temperature, reading.humidity);
    const existingDevice = devices.get(reading.deviceId);
    
    // Update devices map
    setDevices(prev => {
      const newDevices = new Map(prev);
      const deviceReading: DeviceReading = {
        ...reading,
        lastSeen: new Date(),
        connectionStatus: 'online',
        alertLevel
      };
      newDevices.set(reading.deviceId, deviceReading);
      return newDevices;
    });

    // Update temperature trends
    setTempTrends(prev => {
      const newTrends = new Map(prev);
      if (existingDevice) {
        const tempDiff = reading.temperature - existingDevice.temperature;
        if (Math.abs(tempDiff) < 0.5) {
          newTrends.set(reading.deviceId, 'stable');
        } else if (tempDiff > 0) {
          newTrends.set(reading.deviceId, 'up');
        } else {
          newTrends.set(reading.deviceId, 'down');
        }
      }
      return newTrends;
    });

    // Update latest readings
    setLatestReadings(prev => {
      const newReadings = [reading, ...prev.filter(r => r.deviceId !== reading.deviceId)];
      return newReadings.slice(0, 10); // Keep only latest 10 readings
    });

    // Trigger popup alerts based on alert level changes
    const previousAlertLevel = existingDevice?.alertLevel || 'normal';
    
    // Only show popup if alert level increased or if it's critical/warning
    if (alertLevel !== previousAlertLevel || alertLevel !== 'normal') {
      const alertData: any = {
        deviceId: reading.deviceId,
        batchId: reading.batchId,
        temperature: reading.temperature,
        humidity: reading.humidity,
        autoClose: alertLevel === 'critical' ? 15000 : 10000 // Critical alerts stay longer
      };

      if (alertLevel === 'critical') {
        addPopupAlert({
          ...alertData,
          type: 'critical',
          title: '🚨 CRITICAL TEMPERATURE ALERT',
          message: `Device ${reading.deviceId} has exceeded safe pharmaceutical storage limits! Immediate action required to prevent drug deterioration.`
        });
      } else if (alertLevel === 'warning' && previousAlertLevel === 'normal') {
        addPopupAlert({
          ...alertData,
          type: 'warning',
          title: '⚠️ Temperature Warning',
          message: `Device ${reading.deviceId} is approaching critical thresholds. Monitor closely for changes.`
        });
      }

      // Special alert for ML anomalies
      if (reading.isAnomaly && reading.severity) {
        addPopupAlert({
          ...alertData,
          type: reading.severity === 'high' ? 'critical' : 'warning',
          title: '🤖 ML Anomaly Detected',
          message: `Machine learning system detected unusual patterns in environmental data from ${reading.deviceId}.`,
          autoClose: 12000
        });
      }
    }
  };

  const determineAlertLevel = useCallback((temperature: number, humidity: number): 'normal' | 'warning' | 'critical' => {
    const tempStatus = getTemperatureStatus(temperature);
    const humidityStatus = getHumidityStatus(humidity);
    
    if (tempStatus.level === 'critical' || humidityStatus.level === 'critical') {
      return 'critical';
    }
    if (tempStatus.level === 'warning' || humidityStatus.level === 'warning') {
      return 'warning';
    }
    return 'normal';
  }, []);

  const getTemperatureStatus = (temp: number) => {
    if (temp < TEMP_THRESHOLDS.CRITICAL_LOW || temp > TEMP_THRESHOLDS.CRITICAL_HIGH) {
      return { level: 'critical' as const, color: 'text-red-600', bgColor: 'bg-red-50', status: 'Critical' };
    }
    if (temp < TEMP_THRESHOLDS.WARNING_LOW || temp > TEMP_THRESHOLDS.WARNING_HIGH) {
      return { level: 'warning' as const, color: 'text-yellow-600', bgColor: 'bg-yellow-50', status: 'Warning' };
    }
    return { level: 'normal' as const, color: 'text-green-600', bgColor: 'bg-green-50', status: 'Optimal' };
  };

  const getHumidityStatus = (humidity: number) => {
    if (humidity < HUMIDITY_THRESHOLDS.CRITICAL_LOW || humidity > HUMIDITY_THRESHOLDS.CRITICAL_HIGH) {
      return { level: 'critical' as const, color: 'text-red-600', bgColor: 'bg-red-50', status: 'Critical' };
    }
    if (humidity < HUMIDITY_THRESHOLDS.WARNING_LOW || humidity > HUMIDITY_THRESHOLDS.WARNING_HIGH) {
      return { level: 'warning' as const, color: 'text-yellow-600', bgColor: 'bg-yellow-50', status: 'Warning' };
    }
    return { level: 'normal' as const, color: 'text-green-600', bgColor: 'bg-green-50', status: 'Optimal' };
  };

  const getConnectionStatusIcon = (status: 'online' | 'offline' | 'degraded') => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-blue-500" />;
      case 'stable':
        return <Minus className="h-3 w-3 text-gray-500" />;
    }
  };

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch recent IoT readings
      const response = await apiClient.getIoTReadings(undefined, 50);
      if (response.success && response.data) {
        setLatestReadings(response.data);
        
        // Process readings into device map
        const deviceMap = new Map<string, DeviceReading>();
        const tempTrendMap = new Map<string, 'up' | 'down' | 'stable'>();
        
        response.data.forEach((reading) => {
          const alertLevel = determineAlertLevel(reading.temperature, reading.humidity);
          const timeSinceReading = Date.now() - new Date(reading.timestamp).getTime();
          const connectionStatus: 'online' | 'offline' | 'degraded' = 
            timeSinceReading < 120000 ? 'online' : // 2 minutes
            timeSinceReading < 600000 ? 'degraded' : // 10 minutes
            'offline';
          
          deviceMap.set(reading.deviceId, {
            ...reading,
            lastSeen: new Date(reading.timestamp),
            connectionStatus,
            alertLevel
          });
          
          tempTrendMap.set(reading.deviceId, 'stable');
        });
        
        setDevices(deviceMap);
        setTempTrends(tempTrendMap);
      } else {
        setError(response.error || 'Failed to fetch IoT data');
      }
      
      // Check HiveMQ bridge status
      try {
        const bridgeResponse = await fetch('/api/system/health');
        if (bridgeResponse.ok) {
          const bridgeData = await bridgeResponse.json();
          // Look for MQTT/IoT services in the health check
          const mqttService = bridgeData.services?.find((s: any) => 
            s.service?.includes('mqtt-bridge') || 
            s.service?.includes('iot') || 
            s.service?.includes('mqtt') || 
            s.service?.includes('hivemq')
          );
          setHivemqStatus(mqttService?.status === 'healthy' ? 'connected' : 'disconnected');
        } else {
          setHivemqStatus('disconnected');
        }
      } catch (bridgeError) {
        console.warn('Could not fetch HiveMQ status:', bridgeError);
        setHivemqStatus('unknown');
      }
      
      setLastUpdate(new Date());
    } catch (err) {
      setError('Failed to fetch IoT service data');
      console.error('IoT data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [determineAlertLevel]);

  useEffect(() => {
    fetchInitialData();
    refreshRef.current = fetchInitialData;
  }, [fetchInitialData]);

  // Auto-refresh every 30 seconds if no WebSocket
  useEffect(() => {
    if (!wsConnected) {
      const interval = setInterval(fetchInitialData, 30000);
      return () => clearInterval(interval);
    }
  }, [wsConnected, fetchInitialData]);

  const handleRefresh = () => {
    if (refreshRef.current) {
      refreshRef.current();
    }
    if (onRefresh) {
      onRefresh();
    }
  };

  const devicesArray = Array.from(devices.values());
  const criticalDevices = devicesArray.filter(d => d.alertLevel === 'critical');
  const warningDevices = devicesArray.filter(d => d.alertLevel === 'warning');
  const onlineDevices = devicesArray.filter(d => d.connectionStatus === 'online');
  const anomalies = latestReadings.filter(r => r.isAnomaly);

  return (
    <div className="space-y-6">
      {/* Main IoT Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <RadioTower className="h-5 w-5" />
                <span>IoT Service Overview</span>
                <div className="flex items-center space-x-2 ml-4">
                  {wsConnected ? (
                    <Badge className="bg-green-100 text-green-800">
                      <Wifi className="h-3 w-3 mr-1" />
                      Real-time
                    </Badge>
                  ) : (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Polling
                  </Badge>
                  )}
                  <Badge className={
                    hivemqStatus === 'connected' ? 'bg-green-100 text-green-800' : 
                    hivemqStatus === 'disconnected' ? 'bg-red-100 text-red-800' : 
                    'bg-gray-100 text-gray-800'
                  }>
                    <Database className="h-3 w-3 mr-1" />
                    HiveMQ {hivemqStatus === 'connected' ? 'Connected' : hivemqStatus === 'disconnected' ? 'Disconnected' : 'Unknown'}
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                Real-time pharmaceutical storage monitoring with temperature alerts
                {lastUpdate && (
                  <span className="ml-2 text-xs text-gray-500">
                    • Last update: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button 
              onClick={handleRefresh} 
              disabled={loading} 
              size="sm" 
              className="border border-gray-300 bg-white hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {wsError && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                WebSocket connection failed. Using polling mode for updates.
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg border">
                  <div className="text-2xl font-bold text-blue-600">{devices.size}</div>
                  <p className="text-sm text-blue-800">Connected Devices</p>
                  <div className="text-xs text-blue-600 mt-1">
                    {onlineDevices.length} online
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border">
                  <div className="text-2xl font-bold text-green-600">
                    {devicesArray.filter(d => d.alertLevel === 'normal').length}
                  </div>
                  <p className="text-sm text-green-800">Normal Status</p>
                  <div className="text-xs text-green-600 mt-1">
                    Optimal conditions
                  </div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg border">
                  <div className="text-2xl font-bold text-yellow-600">{warningDevices.length}</div>
                  <p className="text-sm text-yellow-800">Warnings</p>
                  <div className="text-xs text-yellow-600 mt-1">
                    Need attention
                  </div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border">
                  <div className="text-2xl font-bold text-red-600">{criticalDevices.length}</div>
                  <p className="text-sm text-red-800">Critical Alerts</p>
                  <div className="text-xs text-red-600 mt-1">
                    Immediate action
                  </div>
                </div>
              </div>

              {/* Critical Alerts Section */}
              {criticalDevices.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>CRITICAL TEMPERATURE ALERT:</strong> {criticalDevices.length} device(s) reporting critical conditions. 
                    Temperature exceeds safe pharmaceutical storage limits. Immediate action required!
                  </AlertDescription>
                </Alert>
              )}

              {/* Warning Alerts Section */}
              {warningDevices.length > 0 && criticalDevices.length === 0 && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <strong>Temperature Warning:</strong> {warningDevices.length} device(s) approaching critical thresholds. 
                    Monitor closely for temperature changes.
                  </AlertDescription>
                </Alert>
              )}

              {/* Device Status Grid */}
              {devices.size > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <span>Device Monitoring Status</span>
                  </h4>
                  
                  <div className="grid gap-3">
                    {devicesArray.map((device) => {
                      const tempStatus = getTemperatureStatus(device.temperature);
                      const humidityStatus = getHumidityStatus(device.humidity);
                      const trend = tempTrends.get(device.deviceId) || 'stable';
                      
                      return (
                        <div key={device.deviceId} className={`p-4 border rounded-lg ${
                          device.alertLevel === 'critical' ? 'border-red-200 bg-red-50' :
                          device.alertLevel === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                          'border-gray-200 bg-white'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {getConnectionStatusIcon(device.connectionStatus)}
                              <div>
                                <div className="font-medium text-sm">{device.deviceId}</div>
                                <div className="text-xs text-gray-600">
                                  Batch: {device.batchId} • Last seen: {device.lastSeen.toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              {/* Temperature */}
                              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${tempStatus.bgColor}`}>
                                <Thermometer className={`h-4 w-4 ${tempStatus.color}`} />
                                <div className="text-center">
                                  <div className={`font-semibold text-sm ${tempStatus.color} flex items-center space-x-1`}>
                                    <span>{device.temperature.toFixed(1)}°C</span>
                                    {getTrendIcon(trend)}
                                  </div>
                                  <div className="text-xs text-gray-600">{tempStatus.status}</div>
                                </div>
                              </div>
                              
                              {/* Humidity */}
                              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${humidityStatus.bgColor}`}>
                                <Droplets className={`h-4 w-4 ${humidityStatus.color}`} />
                                <div className="text-center">
                                  <div className={`font-semibold text-sm ${humidityStatus.color}`}>
                                    {device.humidity.toFixed(1)}%
                                  </div>
                                  <div className="text-xs text-gray-600">{humidityStatus.status}</div>
                                </div>
                              </div>
                              
                              {/* Alert Level */}
                              <Badge className={
                                device.alertLevel === 'critical' ? 'bg-red-100 text-red-800' :
                                device.alertLevel === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }>
                                {device.alertLevel === 'critical' ? 'CRITICAL' :
                                 device.alertLevel === 'warning' ? 'WARNING' : 'NORMAL'}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Anomaly Details */}
                          {device.isAnomaly && (
                            <div className="mt-3 p-2 bg-gray-100 rounded text-xs">
                              <div className="flex items-center space-x-1 text-gray-700">
                                <Eye className="h-3 w-3" />
                                <span>ML Anomaly Detected:</span>
                                {device.severity && (
                                  <Badge className="ml-1 text-xs bg-orange-100 text-orange-800">
                                    {device.severity.toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                              {device.prediction && device.prediction.riskLevel !== undefined && (
                                <div className="text-gray-600 mt-1">
                                  Risk Level: {(device.prediction.riskLevel * 100).toFixed(0)}%
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Temperature Threshold Guide */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Pharmaceutical Storage Thresholds</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-2 bg-green-50 rounded border">
                    <div className="font-medium text-green-800">Optimal Range</div>
                    <div className="text-green-700">{TEMP_THRESHOLDS.OPTIMAL_LOW}°C - {TEMP_THRESHOLDS.OPTIMAL_HIGH}°C</div>
                  </div>
                  <div className="p-2 bg-yellow-50 rounded border">
                    <div className="font-medium text-yellow-800">Warning Range</div>
                    <div className="text-yellow-700">{TEMP_THRESHOLDS.WARNING_LOW}°C - {TEMP_THRESHOLDS.WARNING_HIGH}°C</div>
                  </div>
                  <div className="p-2 bg-red-50 rounded border">
                    <div className="font-medium text-red-800">Critical Range</div>
                    <div className="text-red-700">&lt;{TEMP_THRESHOLDS.CRITICAL_LOW}°C or &gt;{TEMP_THRESHOLDS.CRITICAL_HIGH}°C</div>
                  </div>
                </div>
              </div>

              {/* Recent Anomalies */}
              {anomalies.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span>Recent Anomalies ({anomalies.length})</span>
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {anomalies.slice(0, 5).map((reading, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-3 w-3 text-yellow-600" />
                          <span>{reading.deviceId}</span>
                          <span className="text-gray-600">•</span>
                          <span>{reading.temperature.toFixed(1)}°C, {reading.humidity.toFixed(1)}%</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {new Date(reading.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Devices State */}
              {devices.size === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  <RadioTower className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <div className="text-lg font-medium">No IoT devices detected</div>
                  <div className="text-sm">
                    Check HiveMQ connection and ensure devices are sending data
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IoTServiceOverviewCard;
