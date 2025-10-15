"use client";

import React, { useState } from "react";
import { useAuth, withAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiClient } from "@/lib/api-client";
import { MedicineBatch } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Search,
  QrCode,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Clock,
  MapPin,
  User,
  Loader2,
} from "lucide-react";

interface VerificationResult {
  batch: MedicineBatch | null;
  blockchain: {
    isVerified: boolean;
    txHash?: string;
    source?: "thirdweb" | "mock";
  } | null;
  environmentalData?: any[];
}

const PharmacistVerificationPage = () => {
  const { user } = useAuth();
  const [batchId, setBatchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!batchId.trim()) {
      setError("Please enter a batch ID");
      return;
    }

    setLoading(true);
    setError("");
    setVerificationResult(null);

    try {
      // Step 1: Get batch information
      const batchResponse = await apiClient.getBatch(batchId.trim());

      if (!batchResponse.success) {
        setError(batchResponse.error || "Batch not found");
        setLoading(false);
        return;
      }

      // Step 2: Verify on blockchain
      const blockchainResponse = await apiClient.verifyBatch(batchId.trim());

      // Step 3: Get environmental data
      const envResponse = await apiClient.getIoTReadings(batchId.trim(), 50);

      setVerificationResult({
        batch: batchResponse.data as any,
        blockchain: blockchainResponse.success
          ? (blockchainResponse.data as any)
          : null,
        environmentalData: envResponse.success ? (envResponse.data as any) : [],
      });
    } catch (err) {
      setError("Failed to verify batch. Please try again.");
      console.error("Verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleScanQR = () => {
    // Placeholder for QR scanning functionality
    alert(
      "QR Scanner feature coming soon! For now, please enter the batch ID manually.",
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "bg-green-100 text-green-800 border-green-300";
      case "compromised":
        return "bg-red-100 text-red-800 border-red-300";
      case "unknown":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
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

  return (
    <DashboardLayout
      title="Batch Verification"
      subtitle="Verify medicine batch authenticity and track supply chain history"
    >
      {/* Verification Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Verify Medicine Batch
          </CardTitle>
          <CardDescription>
            Enter a batch ID or scan a QR code to verify authenticity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Enter Batch ID (e.g., BATCH_1234567890)"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  disabled={loading}
                  className="text-base"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleScanQR}
                disabled={loading}
              >
                <QrCode className="h-4 w-4 mr-2" />
                Scan QR
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Verify
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Verification Results */}
      {verificationResult && verificationResult.batch && (
        <div className="space-y-6">
          {/* Authenticity Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {verificationResult.blockchain?.isVerified ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-700">Batch Verified</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-red-700">Verification Failed</span>
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {verificationResult.blockchain?.isVerified
                  ? "This batch has been verified on the blockchain and is authentic."
                  : "This batch could not be verified on the blockchain."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <span className="font-semibold">Blockchain Status:</span>
                    {verificationResult.blockchain?.isVerified ? (
                      <Badge className="bg-green-100 text-green-800">
                        Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">
                        Not Verified
                      </Badge>
                    )}
                  </div>
                  {verificationResult.blockchain?.txHash && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Transaction Hash:</span>
                      <p className="font-mono text-xs break-all mt-1 bg-gray-50 p-2 rounded">
                        {verificationResult.blockchain.txHash}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <span className="font-semibold">Quality Status:</span>
                    <Badge
                      className={getStatusColor(
                        verificationResult.batch.qualityStatus,
                      )}
                    >
                      {verificationResult.batch.qualityStatus.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="font-semibold">Current Stage:</span>
                    <Badge
                      className={getStageColor(
                        verificationResult.batch.currentStage,
                      )}
                    >
                      {verificationResult.batch.currentStage.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Batch Details */}
          <Card>
            <CardHeader>
              <CardTitle>Batch Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Batch ID
                    </span>
                    <p className="font-mono text-sm mt-1">
                      {verificationResult.batch.batchId}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Medicine Name
                    </span>
                    <p className="text-base font-semibold mt-1">
                      {verificationResult.batch.name}
                    </p>
                  </div>
                  {verificationResult.batch.medicineType && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Type
                      </span>
                      <p className="text-base mt-1">
                        {verificationResult.batch.medicineType}
                      </p>
                    </div>
                  )}
                  {verificationResult.batch.dosage && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Dosage
                      </span>
                      <p className="text-base mt-1">
                        {verificationResult.batch.dosage}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Manufacturer
                    </span>
                    <p className="text-base mt-1">
                      {verificationResult.batch.manufacturerName}
                    </p>
                  </div>
                  {verificationResult.batch.quantity &&
                    verificationResult.batch.unit && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">
                          Quantity
                        </span>
                        <p className="text-base mt-1">
                          {verificationResult.batch.quantity}{" "}
                          {verificationResult.batch.unit}
                        </p>
                      </div>
                    )}
                  {verificationResult.batch.expiryDate && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Expiry Date
                      </span>
                      <p className="text-base mt-1">
                        {new Date(
                          verificationResult.batch.expiryDate,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Created
                    </span>
                    <p className="text-base mt-1">
                      {new Date(
                        verificationResult.batch.createdAt,
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {verificationResult.batch.description && (
                <div className="mt-4 pt-4 border-t">
                  <span className="text-sm font-medium text-gray-500">
                    Description
                  </span>
                  <p className="text-base mt-1">
                    {verificationResult.batch.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supply Chain History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Supply Chain History
              </CardTitle>
              <CardDescription>
                Track the journey of this batch through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {verificationResult.batch?.supplyChain &&
                verificationResult.batch.supplyChain.length > 0 ? (
                  verificationResult.batch.supplyChain.map(
                    (entry: any, index: number) => (
                      <div
                        key={index}
                        className="flex gap-4 pb-4 border-b last:border-b-0"
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-blue-600" />
                          </div>
                          {index <
                            (verificationResult.batch?.supplyChain.length ||
                              0) -
                              1 && (
                            <div className="w-0.5 h-full bg-blue-200 mt-2"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getStageColor(entry.stage)}>
                              {entry.stage.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            <span>Handled by: {entry.handledBy}</span>
                          </div>
                          {entry.location && (
                            <div className="text-sm text-gray-600 mt-1">
                              Location: {entry.location}
                            </div>
                          )}
                          {entry.notes && (
                            <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ),
                  )
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No supply chain history available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quality Alerts */}
          {verificationResult.batch?.qualityAlerts &&
            verificationResult.batch.qualityAlerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Quality Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {verificationResult.batch.qualityAlerts.map(
                      (alert: any, index: number) => (
                        <Alert
                          key={index}
                          variant={alert.resolved ? "default" : "destructive"}
                          className={alert.resolved ? "bg-gray-50" : ""}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <AlertDescription className="font-medium">
                                {alert.message}
                              </AlertDescription>
                              <Badge
                                variant={
                                  alert.resolved ? "outline" : "destructive"
                                }
                              >
                                {alert.resolved
                                  ? "Resolved"
                                  : alert.severity.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                            {alert.resolved && alert.resolvedBy && (
                              <p className="text-sm text-green-600 mt-1">
                                Resolved by {alert.resolvedBy} on{" "}
                                {new Date(alert.resolvedAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </Alert>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Environmental Data Summary */}
          {verificationResult.environmentalData &&
            verificationResult.environmentalData?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Environmental Monitoring
                  </CardTitle>
                  <CardDescription>
                    Recent temperature and humidity readings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 mb-4">
                    Total readings:{" "}
                    {verificationResult.environmentalData.length}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {verificationResult.environmentalData
                      .slice(0, 6)
                      .map((reading: any, index: number) => (
                        <div
                          key={index}
                          className={`p-3 rounded border ${
                            reading.isAnomaly
                              ? "bg-red-50 border-red-200"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="text-xs text-gray-500 mb-2">
                            {new Date(reading.timestamp).toLocaleString()}
                          </div>
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-sm font-medium">
                                Temp: {reading.temperature}°C
                              </div>
                              <div className="text-sm font-medium">
                                Humidity: {reading.humidity}%
                              </div>
                            </div>
                            {reading.isAnomaly && (
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default withAuth(PharmacistVerificationPage);
