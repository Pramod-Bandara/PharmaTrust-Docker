'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Thermometer, 
  Droplets, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { EnvironmentalData } from '@/types';

interface RealTimeMonitoringProps {
  batchId?: string;
  className?: string;
}

interface RealtimeReading extends EnvironmentalData {
  confidence?: number;
  mlReasons?: {
    temperature: boolean;
    humidity: boolean;
    suddenChange: boolean;
    gradualDrift: boolean;
    pattern: string;
  };
  prediction?: {
    nextTemperature: number;
    nextHumidity: number;
    riskLevel: number;
  };
}

const RealTimeMonitoring = ({ batchId, className = '' }: RealTimeMonitoringProps) => {
  const [latestReading, setLatestReading] = useState<RealtimeReading | null>(null);
  const [recentAnomalies, setRecentAnomalies] = useState<RealtimeReading[]>([]);
  const [stats, setStats] = useState({
    totalReadings: 0,
    anomaliesCount: 0,
    lastUpdate: null as Date | null
  });

  // WebSocket connection to IoT service
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4003';
  
  const { isConnected, error } = useWebSocket(wsUrl, {
    onMessage: (message) => {
      if (message.type === 'reading') {
        const reading = message.payload as RealtimeReading;
        
        // Only process readings for our batch or all if no specific batch
        if (!batchId || reading.batchId === batchId) {
          setLatestReading(reading);
          setStats(prev => ({
            ...prev,
            totalReadings: prev.totalReadings + 1,
            lastUpdate: new Date()
          }));
        }
      } else if (message.type === 'anomaly') {
        const anomaly = message.payload as RealtimeReading;
        
        // Only process anomalies for our batch or all if no specific batch
        if (!batchId || anomaly.batchId === batchId) {
          setRecentAnomalies(prev => [anomaly, ...prev.slice(0, 4)]); // Keep last 5
          setStats(prev => ({
            ...prev,
            anomaliesCount: prev.anomaliesCount + 1
          }));
        }
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    }
  });

  const getTemperatureColor = (temp: number) => {
    if (temp < 2 || temp > 25) return 'text-red-600';
    if (temp < 5 || temp > 22) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getHumidityColor = (humidity: number) => {
    if (humidity < 30 || humidity > 70) return 'text-red-600';
    if (humidity < 35 || humidity > 65) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPatternIcon = (pattern?: string) => {
    switch (pattern) {
      case 'sudden_spike': return '⚡';
      case 'gradual_drift': return '📈';
      case 'threshold_violation': return '🚨';
      default: return '📊';
    }
  };

  const getRiskLevelColor = (riskLevel?: number) => {
    if (!riskLevel) return 'text-gray-500';
    if (riskLevel > 0.7) return 'text-red-600';
    if (riskLevel > 0.4) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Real-Time Monitoring</span>
            </div>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <Badge className="bg-green-100 text-green-800">Connected</Badge>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-600" />
                  <Badge variant="destructive">Disconnected</Badge>
                </>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                WebSocket connection error: {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalReadings}</div>
              <div className="text-sm text-gray-600">Total Readings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.anomaliesCount}</div>
              <div className="text-sm text-gray-600">Anomalies</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {stats.lastUpdate ? stats.lastUpdate.toLocaleTimeString() : 'No data'}
              </div>
              <div className="text-sm text-gray-600">Last Update</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Latest Reading */}
      {latestReading && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Thermometer className="h-5 w-5" />
              <span>Latest Environmental Reading</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <Thermometer className={`h-6 w-6 ${getTemperatureColor(latestReading.temperature)}`} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${getTemperatureColor(latestReading.temperature)}`}>
                    {latestReading.temperature}°C
                  </div>
                  <div className="text-sm text-gray-600">Temperature</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Droplets className={`h-6 w-6 ${getHumidityColor(latestReading.humidity)}`} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${getHumidityColor(latestReading.humidity)}`}>
                    {latestReading.humidity}%
                  </div>
                  <div className="text-sm text-gray-600">Humidity</div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>Device: {latestReading.deviceId}</span>
                  <span>•</span>
                  <span>Batch: {latestReading.batchId}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {latestReading.isAnomaly ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <Badge className={getSeverityColor(latestReading.severity ?? 'unknown')}>
                        {(latestReading.severity ?? 'unknown').toUpperCase()} ANOMALY
                      </Badge>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <Badge className="bg-green-100 text-green-800">Normal</Badge>
                    </>
                  )}
                </div>
              </div>

              {/* ML Analysis Section */}
              {(latestReading.confidence || latestReading.mlReasons || latestReading.prediction) && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-blue-800">🤖 ML Analysis</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {/* Confidence and Pattern */}
                    <div className="space-y-1">
                      {latestReading.confidence && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Confidence:</span>
                          <span className="font-medium">{Math.round(latestReading.confidence * 100)}%</span>
                        </div>
                      )}
                      {latestReading.mlReasons?.pattern && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pattern:</span>
                          <span className="font-medium">
                            {getPatternIcon(latestReading.mlReasons.pattern)} {latestReading.mlReasons.pattern.replace('_', ' ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Predictions */}
                    {latestReading.prediction && (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Next Temp:</span>
                          <span className="font-medium">{latestReading.prediction.nextTemperature}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Risk Level:</span>
                          <span className={`font-medium ${getRiskLevelColor(latestReading.prediction.riskLevel)}`}>
                            {Math.round(latestReading.prediction.riskLevel * 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ML Reasons */}
                  {latestReading.mlReasons && (
                    <div className="mt-2 pt-2 border-t border-blue-300">
                      <div className="flex flex-wrap gap-1">
                        {latestReading.mlReasons.temperature && (
                          <Badge variant="outline" className="text-xs">Temp Alert</Badge>
                        )}
                        {latestReading.mlReasons.humidity && (
                          <Badge variant="outline" className="text-xs">Humidity Alert</Badge>
                        )}
                        {latestReading.mlReasons.suddenChange && (
                          <Badge variant="outline" className="text-xs">Sudden Change</Badge>
                        )}
                        {latestReading.mlReasons.gradualDrift && (
                          <Badge variant="outline" className="text-xs">Gradual Drift</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Anomalies */}
      {recentAnomalies.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Recent Anomalies</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAnomalies.map((anomaly, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Thermometer className="h-4 w-4 text-red-600" />
                      <span className="font-medium">{anomaly.temperature}°C</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Droplets className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{anomaly.humidity}%</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {anomaly.batchId}
                    </div>
                  </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getSeverityColor(anomaly.severity ? anomaly.severity : 'unknown')}>
                        {(anomaly.severity ? anomaly.severity : 'unknown').toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-600">
                        {new Date(anomaly.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!latestReading && isConnected && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Waiting for IoT Data
            </h3>
            <p className="text-gray-500 text-center">
              {batchId 
                ? `Monitoring environmental data for batch ${batchId}`
                : 'Monitoring all environmental data from IoT sensors'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealTimeMonitoring;
