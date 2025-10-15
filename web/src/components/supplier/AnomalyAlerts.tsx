'use client';

import React from 'react';
import { EnvironmentalData } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Thermometer, 
  Droplets, 
  Clock,
  MapPin,
  AlertCircle
} from 'lucide-react';

interface AnomalyAlertsProps {
  data: EnvironmentalData[];
}

const AnomalyAlerts = ({ data }: AnomalyAlertsProps) => {
  // Sort anomalies by timestamp (most recent first)
  const sortedAnomalies = data
    .filter(d => d.isAnomaly)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10); // Show only last 10 anomalies

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAnomalyReason = (reading: EnvironmentalData) => {
    const reasons = [];
    
    // Temperature checks
    if (reading.temperature < 2) {
      reasons.push(`Temperature too low (${reading.temperature}°C < 2°C)`);
    } else if (reading.temperature > 25) {
      reasons.push(`Temperature too high (${reading.temperature}°C > 25°C)`);
    }
    
    // Humidity checks
    if (reading.humidity < 30) {
      reasons.push(`Humidity too low (${reading.humidity}% < 30%)`);
    } else if (reading.humidity > 70) {
      reasons.push(`Humidity too high (${reading.humidity}% > 70%)`);
    }
    
    return reasons.length > 0 ? reasons : ['Environmental conditions out of range'];
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return time.toLocaleDateString();
  };

  if (sortedAnomalies.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-green-600" />
            <span>Anomaly Alerts</span>
          </CardTitle>
          <CardDescription>
            Environmental anomalies and quality alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              All Systems Normal
            </h3>
            <p className="text-gray-500">
              No environmental anomalies detected in recent readings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group anomalies by severity for summary
  const severityCount = sortedAnomalies.reduce((acc, anomaly) => {
    const severity = anomaly.severity || 'unknown';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span>Anomaly Alerts</span>
          </div>
          <div className="flex items-center space-x-2">
            {severityCount.high && (
              <Badge variant="destructive" className="text-xs">
                {severityCount.high} High
              </Badge>
            )}
            {severityCount.medium && (
              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                {severityCount.medium} Medium
              </Badge>
            )}
            {severityCount.low && (
              <Badge className="bg-orange-100 text-orange-800 text-xs">
                {severityCount.low} Low
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Recent environmental anomalies requiring attention
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedAnomalies.map((anomaly, index) => {
            const reasons = getAnomalyReason(anomaly);
            const severity = anomaly.severity ?? 'unknown';
            const SeverityIcon = getSeverityIcon(severity);
            
            return (
              <Alert key={`${anomaly._id}-${index}`} className="border-l-4 border-l-red-500">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {SeverityIcon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getSeverityColor(severity)}>
                          {severity.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium">Device: {anomaly.deviceId}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{getTimeAgo(anomaly.timestamp)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="flex items-center space-x-1">
                        <Thermometer className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium">{anomaly.temperature}°C</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">{anomaly.humidity}%</span>
                      </div>
                      {anomaly.batchId && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Batch: {anomaly.batchId}</span>
                        </div>
                      )}
                    </div>
                    
                    <AlertDescription className="text-sm">
                      <ul className="list-disc list-inside space-y-1">
                        {reasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                    
                    <div className="mt-2 text-xs text-gray-500">
                      Detected at: {new Date(anomaly.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Alert>
            );
          })}
          
          {data.filter(d => d.isAnomaly).length > 10 && (
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-500">
                Showing 10 most recent anomalies. 
                Total anomalies: {data.filter(d => d.isAnomaly).length}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AnomalyAlerts;
