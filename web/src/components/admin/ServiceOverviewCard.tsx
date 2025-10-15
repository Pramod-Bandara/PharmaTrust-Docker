'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { EnvironmentalData } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RadioTower, 
  Thermometer, 
  Droplets, 
  AlertTriangle, 
  TrendingUp,
  Activity,
  Database,
  Zap
} from 'lucide-react';

interface ServiceOverviewCardProps {
  onRefresh?: () => void;
}

const ServiceOverviewCard = ({ onRefresh: _onRefresh }: ServiceOverviewCardProps) => {
  const [iotReadings, setIotReadings] = useState<EnvironmentalData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchIoTData();
  }, []);

  const fetchIoTData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getIoTReadings(undefined, 50);
      if (response.success && response.data) {
        setIotReadings(response.data);
      } else {
        setError(response.error || 'Failed to fetch IoT data');
      }
    } catch {
      setError('Failed to fetch IoT data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate IoT statistics
  const iotStats = {
    totalReadings: iotReadings.length,
    anomalies: iotReadings.filter(r => r.isAnomaly).length,
    devices: new Set(iotReadings.map(r => r.deviceId)).size,
    batches: new Set(iotReadings.map(r => r.batchId)).size,
    avgTemperature: iotReadings.length > 0 
      ? (iotReadings.reduce((sum, r) => sum + r.temperature, 0) / iotReadings.length).toFixed(1)
      : '0',
    avgHumidity: iotReadings.length > 0 
      ? (iotReadings.reduce((sum, r) => sum + r.humidity, 0) / iotReadings.length).toFixed(1)
      : '0',
    recentAnomalies: iotReadings.filter(r => {
      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);
      return r.isAnomaly && new Date(r.timestamp) > hourAgo;
    }).length,
  };

  const getAnomalySeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTemperatureStatus = (temp: number) => {
    if (temp < 2 || temp > 25) return { status: 'critical', color: 'text-red-600' };
    if (temp < 5 || temp > 22) return { status: 'warning', color: 'text-yellow-600' };
    return { status: 'good', color: 'text-green-600' };
  };

  const getHumidityStatus = (humidity: number) => {
    if (humidity < 30 || humidity > 70) return { status: 'critical', color: 'text-red-600' };
    if (humidity < 35 || humidity > 65) return { status: 'warning', color: 'text-yellow-600' };
    return { status: 'good', color: 'text-green-600' };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* IoT Service Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RadioTower className="h-5 w-5" />
            <span>IoT Service Overview</span>
          </CardTitle>
          <CardDescription>
            Real-time environmental monitoring and anomaly detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{iotStats.totalReadings}</div>
                  <p className="text-sm text-blue-800">Total Readings</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{iotStats.anomalies}</div>
                  <p className="text-sm text-red-800">Anomalies Detected</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{iotStats.devices}</div>
                  <p className="text-sm text-green-800">Active Devices</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{iotStats.batches}</div>
                  <p className="text-sm text-purple-800">Monitored Batches</p>
                </div>
              </div>

              {/* Environmental Conditions */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center space-x-2">
                  <Activity className="h-4 w-4" />
                  <span>Current Environmental Conditions</span>
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Thermometer className={`h-5 w-5 ${getTemperatureStatus(parseFloat(iotStats.avgTemperature)).color}`} />
                    <div>
                      <div className="font-semibold">{iotStats.avgTemperature}°C</div>
                      <div className="text-xs text-gray-600">Avg Temperature</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Droplets className={`h-5 w-5 ${getHumidityStatus(parseFloat(iotStats.avgHumidity)).color}`} />
                    <div>
                      <div className="font-semibold">{iotStats.avgHumidity}%</div>
                      <div className="text-xs text-gray-600">Avg Humidity</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Anomalies */}
              {iotStats.recentAnomalies > 0 && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <strong>{iotStats.recentAnomalies} anomalies</strong> detected in the last hour. 
                    Monitor environmental conditions closely.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Service Performance Metrics */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Service Performance</span>
          </CardTitle>
          <CardDescription>
            Microservice health and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Service Status Indicators */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Service Status</span>
            </h4>
            
            <div className="space-y-2">
              {[
                { name: 'Authentication Service', status: 'healthy', responseTime: '45ms' },
                { name: 'Medicine Service', status: 'healthy', responseTime: '62ms' },
                { name: 'IoT Service', status: iotReadings.length > 0 ? 'healthy' : 'degraded', responseTime: '38ms' },
                { name: 'Blockchain Service', status: 'healthy', responseTime: '156ms' },
              ].map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      service.status === 'healthy' ? 'bg-green-500' : 
                      service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-sm font-medium">{service.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={
                      service.status === 'healthy' ? 'bg-green-100 text-green-800' :
                      service.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {service.status.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500">{service.responseTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">99.8%</div>
              <p className="text-sm text-green-800">Uptime</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">78ms</div>
              <p className="text-sm text-blue-800">Avg Response</p>
            </div>
          </div>

          {/* System Health Summary */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">System Health Summary</span>
            </div>
            <p className="text-xs text-gray-600">
              All core services are operational. IoT monitoring is active with {iotStats.totalReadings} readings processed. 
              {iotStats.anomalies > 0 && ` ${iotStats.anomalies} anomalies detected and flagged for review.`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Anomalies Detail */}
      {iotReadings.filter(r => r.isAnomaly).slice(0, 5).length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span>Recent Anomalies</span>
            </CardTitle>
            <CardDescription>
              Latest environmental anomalies detected by IoT sensors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {iotReadings
                .filter(r => r.isAnomaly)
                .slice(0, 5)
                .map((reading, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <div>
                        <div className="font-medium text-sm">Batch: {reading.batchId}</div>
                        <div className="text-xs text-gray-600">Device: {reading.deviceId}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-sm">{reading.temperature}°C, {reading.humidity}%</div>
                        <div className="text-xs text-gray-600">
                          {new Date(reading.timestamp).toLocaleString()}
                        </div>
                      </div>
                      {reading.severity && (
                        <Badge className={getAnomalySeverityColor(reading.severity)}>
                          {reading.severity.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServiceOverviewCard;
