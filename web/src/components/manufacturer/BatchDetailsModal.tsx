'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { MedicineBatch, EnvironmentalData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  X, 
  Package, 
  Thermometer, 
  Droplets,
  Shield,
  AlertTriangle,
  CheckCircle,
  Eye
} from 'lucide-react';
import SupplyChainProgress from './SupplyChainProgress';

interface BatchDetailsModalProps {
  batch: MedicineBatch;
  isOpen: boolean;
  onClose: () => void;
}

const BatchDetailsModal = ({ batch, isOpen, onClose }: BatchDetailsModalProps) => {
  const [iotData, setIotData] = useState<EnvironmentalData[]>([]);
  const [loadingIoT, setLoadingIoT] = useState(false);
  const [blockchainVerified, setBlockchainVerified] = useState<boolean | null>(null);

  // Ensure hooks are always called; gate logic inside the effect
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!isOpen) return;
      // Fetch IoT readings
      try {
        setLoadingIoT(true);
        const response = await apiClient.getIoTReadings(batch.batchId, 10);
        if (!cancelled && response.success) {
          setIotData(response.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch IoT data:', error);
      } finally {
        if (!cancelled) setLoadingIoT(false);
      }

      // Verify blockchain if hash exists
      if (batch.blockchainHash) {
        try {
          const response = await apiClient.verifyBatch(batch.batchId);
          if (!cancelled) {
            if (response.success && response.data) {
              setBlockchainVerified(Boolean(response.data.isVerified));
            } else {
              setBlockchainVerified(false);
            }
          }
        } catch (error) {
          console.error('Blockchain verification failed:', error);
          if (!cancelled) setBlockchainVerified(false);
        }
      } else {
        if (!cancelled) setBlockchainVerified(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, batch.batchId, batch.blockchainHash]);

  if (!isOpen) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'compromised':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Eye className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800';
      case 'compromised': return 'bg-red-100 text-red-800';
      case 'unknown': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'manufacturer': return 'bg-blue-100 text-blue-800';
      case 'supplier': return 'bg-purple-100 text-purple-800';
      case 'pharmacist': return 'bg-orange-100 text-orange-800';
      case 'customer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Package className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold">{batch.name}</h2>
              <p className="text-sm text-gray-600">
                Batch ID: <span className="break-all max-w-xs inline-block">{batch.batchId}</span>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Batch Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Medicine Name</label>
                  <p className="text-sm text-gray-900">{batch.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Batch ID</label>
                  <p className="text-sm text-gray-900 font-mono break-all max-w-xs">{batch.batchId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Created Date</label>
                  <p className="text-sm text-gray-900">
                    {new Date(batch.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Manufacturer ID</label>
                  <p className="text-sm text-gray-900">{batch.manufacturerId}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(batch.qualityStatus)}
                  <Badge className={getStatusColor(batch.qualityStatus)}>
                    {batch.qualityStatus.toUpperCase()}
                  </Badge>
                </div>
                <Badge className={getStageColor(batch.currentStage)}>
                  {batch.currentStage.toUpperCase()}
                </Badge>
                {batch.blockchainHash && (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <Shield className="h-3 w-3 mr-1" />
                    Blockchain Verified
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Supply Chain Progress */}
          <SupplyChainProgress batch={batch} />

          {/* Environmental Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Thermometer className="h-5 w-5" />
                <span>Environmental Monitoring</span>
              </CardTitle>
              <CardDescription>
                Recent IoT sensor readings for this batch
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingIoT ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : iotData.length === 0 ? (
                <p className="text-sm text-gray-500">No environmental data available</p>
              ) : (
                <div className="space-y-3">
                  {iotData.slice(0, 5).map((reading, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Thermometer className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium">{reading.temperature}°C</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Droplets className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">{reading.humidity}%</span>
                        </div>
                        <span className="text-xs text-gray-600">
                          Device: {reading.deviceId}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {reading.isAnomaly && (
                          <Badge variant="destructive" className="text-xs">
                            {reading.severity?.toUpperCase()} ANOMALY
                          </Badge>
                        )}
                        <span className="text-xs text-gray-600">
                          {new Date(reading.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Blockchain Verification */}
          {batch.blockchainHash && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Blockchain Verification</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Blockchain Hash:</span>
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {batch.blockchainHash}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Verification Status:</span>
                    {blockchainVerified === null ? (
                      <Badge variant="outline">Checking...</Badge>
                    ) : blockchainVerified ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t p-6">
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BatchDetailsModal;
