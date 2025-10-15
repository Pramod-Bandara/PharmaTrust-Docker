'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Clock,
  Zap
} from 'lucide-react';
import type { SystemHealth, ServiceHealth } from '@/lib/health-check';

interface SystemStatusCardProps {
  systemHealth: SystemHealth | null;
}

const SystemStatusCard = ({ systemHealth }: SystemStatusCardProps) => {
  if (!systemHealth) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>System Status</span>
          </CardTitle>
          <CardDescription>
            Real-time health monitoring of all microservices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Checking system health...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getOverallStatusColor = (overall: string) => {
    switch (overall) {
      case 'healthy':
        return 'border-green-200 bg-green-50';
      case 'degraded':
        return 'border-yellow-200 bg-yellow-50';
      case 'unhealthy':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <Card className={`mb-8 border-2 ${getOverallStatusColor(systemHealth.overall)}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>System Status</span>
          </div>
          <Badge className={getStatusColor(systemHealth.overall)}>
            {systemHealth.overall?.toUpperCase() || 'UNKNOWN'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Real-time health monitoring of all microservices
          <span className="ml-2 text-xs">
            Last updated: {new Date(systemHealth.timestamp).toLocaleTimeString()}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {systemHealth.overall === 'unhealthy' && (
          <Alert variant="destructive" className="mb-4">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>System Alert:</strong> One or more critical services are down. 
              This may affect system functionality.
            </AlertDescription>
          </Alert>
        )}

        {systemHealth.overall === 'degraded' && (
          <Alert className="mb-4 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Performance Warning:</strong> Some services are experiencing issues. 
              Monitor closely for potential impact.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemHealth.services?.map((service: ServiceHealth, index: number) => (
            <div key={index} className="bg-white p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium capitalize">{service.service}</h4>
                {getStatusIcon(service.status)}
              </div>
              
              <Badge className={getStatusColor(service.status)}>
                {service.status.toUpperCase()}
              </Badge>
              
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                {service.responseTime && (
                  <div className="flex items-center space-x-1">
                    <Zap className="h-3 w-3" />
                    <span>{service.responseTime}ms</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(service.lastChecked).toLocaleTimeString()}</span>
                </div>
                
                {service.error && (
                  <div className="text-red-600 text-xs mt-1">
                    Error: {service.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {(!systemHealth.services || systemHealth.services.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No service health data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemStatusCard;
