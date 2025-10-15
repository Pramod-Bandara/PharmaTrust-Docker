"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  X,
  Scan,
  Upload,
  Type,
  Image as ImageIcon,
  CheckCircle,
} from "lucide-react";
import jsQR from "jsqr";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (batchId: string) => void;
  title?: string;
  description?: string;
}

const QRScannerModal = ({
  isOpen,
  onClose,
  onScan,
  title = "QR Code Scanner",
  description = "Upload a QR code image or manually enter batch information",
}: QRScannerModalProps) => {
  const [manualInput, setManualInput] = useState("");
  const [scanMode, setScanMode] = useState<"upload" | "manual">("upload");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [_selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedBatchId, setDetectedBatchId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!manualInput.trim()) {
      setError("Please enter a batch ID");
      return;
    }

    // Try to extract batch ID from QR data
    let batchId = manualInput.trim();

    try {
      // If it's JSON (QR code format), parse it
      const qrData = JSON.parse(manualInput);
      if (qrData.batchId) {
        batchId = qrData.batchId;
      }
    } catch {
      // If not JSON, treat as plain batch ID
      // Handle various formats like "BATCH_123" or just "123"
      if (batchId.startsWith("BATCH_")) {
        batchId = batchId;
      } else if (batchId.match(/^\d+$/)) {
        batchId = `BATCH_${batchId}`;
      }
    }

    onScan(batchId);
    setManualInput("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      setSuccess("");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      setSuccess("");
      return;
    }

    setSelectedFile(file);
    setError("");
    setSuccess("");
    setDetectedBatchId("");

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setPreviewUrl(url);
      // Automatically process the QR code
      processQRCode(url);
    };
    reader.readAsDataURL(file);
  };

  const processQRCode = async (imageUrl: string) => {
    setIsProcessing(true);
    setError("");
    setSuccess("");
    setDetectedBatchId("");

    try {
      // Create an image element to load the file
      const img = new Image();
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Create canvas to extract image data
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Could not get canvas context");
      }

      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Decode QR code using jsQR
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (!code) {
        setError(
          "No QR code found in the image. Please try a clearer image or use manual input.",
        );
        setIsProcessing(false);
        return;
      }

      // Extract batch ID from QR code data
      let batchId = code.data;

      try {
        // Try to parse as JSON (standard PharmaTrust format)
        const qrData = JSON.parse(code.data);
        if (qrData.batchId) {
          batchId = qrData.batchId;
        }
      } catch {
        // If not JSON, treat as plain batch ID
        if (!batchId.startsWith("BATCH_") && batchId.match(/^\d+$/)) {
          batchId = `BATCH_${batchId}`;
        }
      }

      // Set detected batch ID and success message
      setDetectedBatchId(batchId);
      setSuccess(`QR code decoded successfully! Batch ID: ${batchId}`);
      setIsProcessing(false);
    } catch (err) {
      console.error("QR Code processing error:", err);
      setError(
        "Failed to process QR code. Please try again or use manual input.",
      );
      setIsProcessing(false);
    }
  };

  const handleConfirmScan = () => {
    if (detectedBatchId) {
      onScan(detectedBatchId);
      // Reset state
      setSelectedFile(null);
      setPreviewUrl("");
      setDetectedBatchId("");
      setSuccess("");
      setError("");
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setError("");
    setSuccess("");
    setDetectedBatchId("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const simulateQRScan = (sampleBatchId: string) => {
    onScan(sampleBatchId);
  };

  const handleClose = () => {
    // Reset all state on close
    setManualInput("");
    setScanMode("upload");
    setError("");
    setSuccess("");
    setSelectedFile(null);
    setPreviewUrl("");
    setDetectedBatchId("");
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Scan className="h-5 w-5 text-blue-600" />
              <CardTitle>{title}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Mode Selection */}
          <div className="flex space-x-2">
            <Button
              variant={scanMode === "upload" ? "default" : "outline"}
              size="sm"
              onClick={() => setScanMode("upload")}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload QR
            </Button>
            <Button
              variant={scanMode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => setScanMode("manual")}
              className="flex-1"
            >
              <Type className="h-4 w-4 mr-2" />
              Manual
            </Button>
          </div>

          {scanMode === "upload" ? (
            <div className="space-y-4">
              {/* File Upload Area */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {!previewUrl ? (
                  <div
                    onClick={handleUploadClick}
                    className="aspect-square bg-gray-50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-blue-400 cursor-pointer transition-colors"
                  >
                    <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 font-medium">
                      Click to upload QR code image
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, JPEG (max 10MB)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                      {isProcessing && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                          <div className="text-center text-white">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                            <p className="text-sm">Processing QR code...</p>
                          </div>
                        </div>
                      )}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="QR Code Preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUploadClick}
                        className="flex-1"
                        disabled={isProcessing}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Different Image
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFile}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm button for detected QR */}
              {detectedBatchId && (
                <Button
                  onClick={handleConfirmScan}
                  className="w-full"
                  size="lg"
                >
                  <Scan className="h-4 w-4 mr-2" />
                  Verify Batch {detectedBatchId}
                </Button>
              )}

              {/* Demo QR Codes */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Quick Demo:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => simulateQRScan("BATCH_1759011127647_NBM4E")}
                    className="text-xs"
                  >
                    Demo Batch 1
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => simulateQRScan("BATCH_1759011127647_OQHJY")}
                    className="text-xs"
                  >
                    Demo Batch 2
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="batchId"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Batch ID or QR Code Data
                </label>
                <Input
                  id="batchId"
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Enter batch ID (e.g., BATCH_1234567890)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can paste QR code JSON data or enter just the batch ID
                </p>
              </div>

              <Button type="submit" className="w-full">
                <Scan className="h-4 w-4 mr-2" />
                Verify Batch
              </Button>
            </form>
          )}

          {/* QR Code Format Info */}
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm font-medium text-gray-700 mb-1">
              Expected QR Code Format:
            </p>
            <code className="text-xs bg-white p-2 rounded border block overflow-x-auto">
              {JSON.stringify(
                {
                  batchId: "BATCH_1234567890",
                  url: "pharmatrust://verify",
                },
                null,
                2,
              )}
            </code>
          </div>

          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScannerModal;
