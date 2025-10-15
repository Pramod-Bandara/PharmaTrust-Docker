'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { MedicineBatch, EnvironmentalData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  X, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Package,
  MapPin,
  Clock,
  Thermometer,
  Droplets,
  FileText,
  Download
} from 'lucide-react';

interface BatchVerificationModalProps {
  batch: MedicineBatch;
  isOpen: boolean;
  onClose: () => void;
}

const BatchVerificationModal = ({ batch, isOpen, onClose }: BatchVerificationModalProps) => {
  const [blockchainVerification, setBlockchainVerification] = useState<unknown>(null);
  const [iotData, setIotData] = useState<EnvironmentalData[]>([]);
  const [loading, setLoading] = useState(false);
  const [_verificationComplete, setVerificationComplete] = useState(false);

  // Ensure hooks are always called; run side-effects conditionally inside
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!isOpen) return;
      setLoading(true);
      try {
        // Verify blockchain authenticity if hash exists
        if (batch.blockchainHash) {
          const blockchainResponse = await apiClient.verifyBatch(batch.batchId);
          if (!cancelled) setBlockchainVerification(blockchainResponse.data);
        } else if (!cancelled) {
          setBlockchainVerification(null);
        }

        // Fetch environmental data
        const iotResponse = await apiClient.getIoTReadings(batch.batchId, 20);
        if (!cancelled && iotResponse.success) {
          setIotData(iotResponse.data || []);
        }

        if (!cancelled) setVerificationComplete(true);
      } catch (error) {
        console.error('Verification failed:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, batch.batchId, batch.blockchainHash]);

  if (!isOpen) return null;

  const getOverallVerificationStatus = () => {
    const hasBlockchainVerification = batch.blockchainHash && (blockchainVerification as any)?.isVerified;
    const hasGoodQuality = batch.qualityStatus === 'good';
    const hasNoRecentAnomalies = iotData.filter(d => d.isAnomaly).length === 0;

    if (hasBlockchainVerification && hasGoodQuality && hasNoRecentAnomalies) {
      return { status: 'verified', color: 'text-green-600', bg: 'bg-green-100', text: 'VERIFIED & SAFE' };
    } else if (hasBlockchainVerification && hasGoodQuality) {
      return { status: 'caution', color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'VERIFIED - MONITOR' };
    } else {
      return { status: 'rejected', color: 'text-red-600', bg: 'bg-red-100', text: 'VERIFICATION FAILED' };
    }
  };

  const verificationStatus = getOverallVerificationStatus();

  const generateReport = () => {
    const report = {
      batchId: batch.batchId,
      medicineName: batch.name,
      verificationDate: new Date().toISOString(),
      verificationStatus: verificationStatus.status,
      blockchainVerified: batch.blockchainHash && (blockchainVerification as any)?.isVerified,
      qualityStatus: batch.qualityStatus,
      anomaliesDetected: iotData.filter(d => d.isAnomaly).length,
      supplyChainStages: batch.supplyChain.length,
      recommendation: verificationStatus.status === 'verified' ? 'Safe for dispensing' : 'Requires further investigation'
    };

    const reportBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(reportBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-report-${batch.batchId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold">Batch Verification</h2>
              <p className="text-sm text-gray-600">
                {batch.name} - <span className="break-all max-w-xs inline-block">{batch.batchId}</span>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Verification Status */}
          <Card className={`border-2 ${verificationStatus.bg} border-opacity-50`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {verificationStatus.status === 'verified' ? (
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  )}
                  <div>
                    <h3 className={`text-xl font-bold ${verificationStatus.color}`}>
                      {verificationStatus.text}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Verification completed at {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button onClick={generateReport} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Performing verification...</span>
            </div>
          )}

          {/* Batch Information */}
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
                  <label className="text-sm font-medium text-gray-700">Manufacturer</label>
                  <p className="text-sm text-gray-900">{batch.manufacturerId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Current Stage</label>
                  <Badge className={
                    batch.currentStage === 'pharmacist' ? 'bg-orange-100 text-orange-800' :
                    batch.currentStage === 'customer' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {batch.currentStage.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blockchain Verification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Blockchain Authentication</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!batch.blockchainHash ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This batch has not been recorded on the blockchain. Authenticity cannot be verified.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Blockchain Hash:</span>
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {batch.blockchainHash}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Verification Status:</span>
                    {blockchainVerification === null ? (
                      <Badge variant="outline">Verifying...</Badge>
                    ) : (blockchainVerification as any)?.isVerified ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        AUTHENTIC
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        VERIFICATION FAILED
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quality Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Thermometer className="h-5 w-5" />
                <span>Quality Assessment</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Quality Status:</span>
                  <Badge className={
                    batch.qualityStatus === 'good' ? 'bg-green-100 text-green-800' :
                    batch.qualityStatus === 'compromised' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }>
                    {batch.qualityStatus.toUpperCase()}
                  </Badge>
                </div>

                {iotData.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recent Environmental Data:</h4>
                    <div className="space-y-2">
                      {iotData.slice(0, 5).map((reading, index) => (
                        <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Thermometer className="h-3 w-3 text-red-500" />
                              <span>{reading.temperature}°C</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Droplets className="h-3 w-3 text-blue-500" />
                              <span>{reading.humidity}%</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {reading.isAnomaly && (
                              <Badge variant="destructive" className="text-xs">
                                ANOMALY
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              {new Date(reading.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-sm">
                  <span className="font-medium">Anomalies Detected: </span>
                  <span className={iotData.filter(d => d.isAnomaly).length > 0 ? 'text-red-600' : 'text-green-600'}>
                    {iotData.filter(d => d.isAnomaly).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supply Chain Traceability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Supply Chain Traceability</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {batch.supplyChain.length === 0 ? (
                <p className="text-sm text-gray-500">No supply chain data available</p>
              ) : (
                <div className="space-y-3">
                  {batch.supplyChain.map((entry, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge className={
                            entry.stage === 'manufacturer' ? 'bg-blue-100 text-blue-800' :
                            entry.stage === 'supplier' ? 'bg-purple-100 text-purple-800' :
                            entry.stage === 'pharmacist' ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }>
                            {entry.stage.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">{entry.location}</span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-600">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                          <span>Entity: {entry.entityId}</span>
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-gray-600 mt-1">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dispensing Recommendation */}
          <Card className={`border-2 ${verificationStatus.bg} border-opacity-50`}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Dispensing Recommendation</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {verificationStatus.status === 'verified' ? (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>SAFE TO DISPENSE:</strong> This medicine batch has passed all verification checks. 
                      It is authentic, maintains good quality, and has a complete supply chain record.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>DO NOT DISPENSE:</strong> This medicine batch has failed one or more verification checks. 
                      Further investigation is required before dispensing to patients.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="text-sm space-y-1">
                  <p><strong>Verification Summary:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li className={batch.blockchainHash ? 'text-green-600' : 'text-red-600'}>
                      Blockchain Authentication: {batch.blockchainHash ? 'PASSED' : 'FAILED'}
                    </li>
                    <li className={batch.qualityStatus === 'good' ? 'text-green-600' : 'text-red-600'}>
                      Quality Status: {batch.qualityStatus.toUpperCase()}
                    </li>
                    <li className={iotData.filter(d => d.isAnomaly).length === 0 ? 'text-green-600' : 'text-yellow-600'}>
                      Environmental Monitoring: {iotData.filter(d => d.isAnomaly).length === 0 ? 'NO ISSUES' : `${iotData.filter(d => d.isAnomaly).length} ANOMALIES`}
                    </li>
                    <li className={batch.supplyChain.length > 0 ? 'text-green-600' : 'text-yellow-600'}>
                      Supply Chain Traceability: {batch.supplyChain.length > 0 ? 'COMPLETE' : 'LIMITED'}
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="sticky bottom-0 bg-white border-t p-6">
          <div className="flex space-x-3">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Close
            </Button>
            <Button onClick={generateReport} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Verification Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchVerificationModal;
