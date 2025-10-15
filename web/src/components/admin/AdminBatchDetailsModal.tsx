"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api-client";
import { MedicineBatch, EnvironmentalData } from "@/types";
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
  X,
  Package,
  Thermometer,
  Droplets,
  Shield,
  AlertTriangle,
  CheckCircle,
  Eye,
  TruckIcon,
  Calendar,
  Building,
  MapPin,
  User,
  Clock,
  Activity,
  FileText,
} from "lucide-react";
import SupplyChainProgress from "@/components/manufacturer/SupplyChainProgress";
import TransferBatchModal from "./TransferBatchModal";

interface AdminBatchDetailsModalProps {
  batch: MedicineBatch;
  isOpen: boolean;
  onClose: () => void;
  onBatchUpdated?: (updatedBatch: MedicineBatch) => void;
}

const AdminBatchDetailsModal = ({
  batch,
  isOpen,
  onClose,
  onBatchUpdated,
}: AdminBatchDetailsModalProps) => {
  const { user } = useAuth();
  const [iotData, setIotData] = useState<EnvironmentalData[]>([]);
  const [loadingIoT, setLoadingIoT] = useState(false);
  const [blockchainVerified, setBlockchainVerified] = useState<boolean | null>(
    null,
  );
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<MedicineBatch>(batch);

  // Fetch data when modal opens or batch changes
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!isOpen) return;

      // Update current batch
      setCurrentBatch(batch);

      // Fetch IoT readings
      try {
        setLoadingIoT(true);
        const response = await apiClient.getIoTReadings(batch.batchId, 20);
        if (!cancelled && response.success) {
          setIotData(response.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch IoT data:", error);
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
          console.error("Blockchain verification failed:", error);
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
  }, [isOpen, batch]);

  if (!isOpen) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "compromised":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Eye className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "bg-green-100 text-green-800";
      case "compromised":
        return "bg-red-100 text-red-800";
      case "unknown":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "manufacturer":
        return "bg-blue-100 text-blue-800";
      case "supplier":
        return "bg-purple-100 text-purple-800";
      case "pharmacist":
        return "bg-orange-100 text-orange-800";
      case "customer":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const canTransfer = currentBatch.currentStage !== "customer";

  const handleTransferComplete = (updatedBatch: MedicineBatch) => {
    setCurrentBatch(updatedBatch);
    setShowTransferModal(false);
    if (onBatchUpdated) {
      onBatchUpdated(updatedBatch);
    }
  };

  const anomalyCount = iotData.filter((d) => d.isAnomaly).length;
  const avgTemperature =
    iotData.length > 0
      ? (
          iotData.reduce((sum, d) => sum + d.temperature, 0) / iotData.length
        ).toFixed(1)
      : "N/A";
  const avgHumidity =
    iotData.length > 0
      ? (iotData.reduce((sum, d) => sum + d.humidity, 0) / iotData.length).toFixed(
          1,
        )
      : "N/A";

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
            <div className="flex items-center space-x-3">
              <Package className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold">{currentBatch.name}</h2>
                <p className="text-sm text-gray-600">
                  Batch ID:{" "}
                  <span className="font-mono">{currentBatch.batchId}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {canTransfer && (
                <Button
                  onClick={() => setShowTransferModal(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <TruckIcon className="h-4 w-4 mr-2" />
                  Transfer Batch
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Quality Status
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        {getStatusIcon(currentBatch.qualityStatus)}
                        <span className="text-lg font-bold">
                          {currentBatch.qualityStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(currentBatch.qualityStatus)}>
                      {currentBatch.qualityStatus}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Current Stage
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <MapPin className="h-5 w-5 text-blue-600" />
                        <span className="text-lg font-bold">
                          {currentBatch.currentStage.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <Badge className={getStageColor(currentBatch.currentStage)}>
                      {currentBatch.currentStage}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Blockchain Status
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Shield className="h-5 w-5 text-green-600" />
                        <span className="text-lg font-bold">
                          {currentBatch.blockchainHash ? "VERIFIED" : "PENDING"}
                        </span>
                      </div>
                    </div>
                    {currentBatch.blockchainHash && (
                      <Badge className="bg-green-100 text-green-800">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Batch Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      <Package className="h-4 w-4 mr-1" />
                      Medicine Name
                    </label>
                    <p className="text-sm text-gray-900 font-semibold">
                      {currentBatch.name}
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      <FileText className="h-4 w-4 mr-1" />
                      Medicine Type
                    </label>
                    <p className="text-sm text-gray-900">
                      {currentBatch.medicineType}
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      <Activity className="h-4 w-4 mr-1" />
                      Dosage
                    </label>
                    <p className="text-sm text-gray-900">
                      {currentBatch.dosage || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      <Package className="h-4 w-4 mr-1" />
                      Quantity
                    </label>
                    <p className="text-sm text-gray-900">
                      {currentBatch.quantity} {currentBatch.unit}
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      Expiry Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(currentBatch.expiryDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      <Clock className="h-4 w-4 mr-1" />
                      Created Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(currentBatch.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      <Building className="h-4 w-4 mr-1" />
                      Manufacturer
                    </label>
                    <p className="text-sm text-gray-900">
                      {currentBatch.manufacturerName || currentBatch.manufacturerId}
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      <User className="h-4 w-4 mr-1" />
                      Manufacturer ID
                    </label>
                    <p className="text-sm text-gray-900 font-mono">
                      {currentBatch.manufacturerId}
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      <Clock className="h-4 w-4 mr-1" />
                      Last Updated
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(currentBatch.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {currentBatch.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Description
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                      {currentBatch.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Supply Chain Progress */}
            <SupplyChainProgress batch={currentBatch} />

            {/* Supply Chain History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TruckIcon className="h-5 w-5" />
                  <span>Supply Chain History</span>
                </CardTitle>
                <CardDescription>
                  Complete tracking history of this batch through the supply chain
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentBatch.supplyChain.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No supply chain history available
                  </p>
                ) : (
                  <div className="space-y-3">
                    {currentBatch.supplyChain.map((entry, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500"
                      >
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-600">
                              {index + 1}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={getStageColor(entry.stage)}>
                              {entry.stage.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-gray-600">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">
                                Handled by: {entry.handledBy}
                              </span>
                            </div>
                            {entry.location && (
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-700">
                                  Location: {entry.location}
                                </span>
                              </div>
                            )}
                            {entry.notes && (
                              <div className="flex items-start space-x-2 mt-2">
                                <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                                <span className="text-gray-700">{entry.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Environmental Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Thermometer className="h-5 w-5" />
                  <span>Environmental Monitoring</span>
                </CardTitle>
                <CardDescription>
                  Real-time IoT sensor readings for this batch
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingIoT ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : iotData.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      No environmental data available for this batch
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Summary Statistics */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <Thermometer className="h-6 w-6 text-red-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-red-600">
                          {avgTemperature}°C
                        </div>
                        <p className="text-xs text-gray-600">Avg Temperature</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Droplets className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-blue-600">
                          {avgHumidity}%
                        </div>
                        <p className="text-xs text-gray-600">Avg Humidity</p>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <AlertTriangle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-yellow-600">
                          {anomalyCount}
                        </div>
                        <p className="text-xs text-gray-600">Anomalies Detected</p>
                      </div>
                    </div>

                    {/* Readings List */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">
                        Recent Readings
                      </h4>
                      {iotData.slice(0, 10).map((reading, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-md ${
                            reading.isAnomaly ? "bg-red-50 border border-red-200" : "bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Thermometer className="h-4 w-4 text-red-500" />
                              <span className="text-sm font-medium">
                                {reading.temperature}°C
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Droplets className="h-4 w-4 text-blue-500" />
                              <span className="text-sm font-medium">
                                {reading.humidity}%
                              </span>
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
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quality Alerts */}
            {currentBatch.qualityAlerts && currentBatch.qualityAlerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Quality Alerts</span>
                  </CardTitle>
                  <CardDescription>
                    Quality issues detected for this batch
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {currentBatch.qualityAlerts.map((alert, index) => (
                      <Alert
                        key={index}
                        variant={alert.resolved ? "default" : "destructive"}
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{alert.message}</div>
                              <div className="text-xs text-gray-600 mt-1">
                                {new Date(alert.timestamp).toLocaleString()} •{" "}
                                {alert.type.toUpperCase()} • Severity:{" "}
                                {alert.severity.toUpperCase()}
                              </div>
                              {alert.resolved && (
                                <div className="text-xs text-green-600 mt-1">
                                  ✓ Resolved by {alert.resolvedBy} at{" "}
                                  {alert.resolvedAt
                                    ? new Date(alert.resolvedAt).toLocaleString()
                                    : "N/A"}
                                </div>
                              )}
                            </div>
                            <Badge
                              variant={alert.resolved ? "outline" : "destructive"}
                            >
                              {alert.resolved ? "RESOLVED" : "ACTIVE"}
                            </Badge>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Blockchain Verification */}
            {currentBatch.blockchainHash && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Blockchain Verification</span>
                  </CardTitle>
                  <CardDescription>
                    Immutable blockchain record for authenticity verification
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <span className="text-sm font-medium">Blockchain Hash:</span>
                      <span className="text-xs font-mono bg-white px-3 py-1 rounded border">
                        {currentBatch.blockchainHash}
                      </span>
                    </div>
                    {currentBatch.nftTokenId && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <span className="text-sm font-medium">NFT Token ID:</span>
                        <span className="text-xs font-mono bg-white px-3 py-1 rounded border">
                          {currentBatch.nftTokenId}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <span className="text-sm font-medium">
                        Verification Status:
                      </span>
                      {blockchainVerified === null ? (
                        <Badge variant="outline">
                          <Activity className="h-3 w-3 mr-1 animate-spin" />
                          Checking...
                        </Badge>
                      ) : blockchainVerified ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified on Blockchain
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Verification Failed
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="sticky bottom-0 bg-white border-t p-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {canTransfer && (
                <Button
                  onClick={() => setShowTransferModal(true)}
                  variant="outline"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <TruckIcon className="h-4 w-4 mr-2" />
                  Transfer to Next Stage
                </Button>
              )}
            </div>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <TransferBatchModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          batch={currentBatch}
          onTransferComplete={handleTransferComplete}
        />
      )}
    </>
  );
};

export default AdminBatchDetailsModal;
