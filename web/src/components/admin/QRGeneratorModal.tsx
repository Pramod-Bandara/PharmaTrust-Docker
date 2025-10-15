'use client';

import React, { useState } from 'react';
import { MedicineBatch } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  X,
  QrCode,
  Download,
  Search,
  Package,
  ExternalLink
} from 'lucide-react';

interface QRGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: MedicineBatch[];
}

const QRGeneratorModal = ({ isOpen, onClose, batches }: QRGeneratorModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<MedicineBatch | null>(null);
  const [qrData, setQrData] = useState<string>('');
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const filteredBatches = batches.filter(batch => 
    batch.batchId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateQRData = (batch: MedicineBatch) => {
    const qrPayload = {
      batchId: batch.batchId,
      name: batch.name,
      url: `pharmatrust://verify/${batch.batchId}`,
      timestamp: new Date().toISOString(),
    };
    return JSON.stringify(qrPayload, null, 2);
  };

  const handleBatchSelect = (batch: MedicineBatch) => {
    setSelectedBatch(batch);
    const data = generateQRData(batch);
    setQrData(data);
    generateQRCode(batch);
  };

  const downloadQRImage = () => {
    if (!qrCodeImage || !selectedBatch) return;

    const a = document.createElement('a');
    a.href = qrCodeImage;
    a.download = `qr-code-${selectedBatch.batchId}.png`;
    a.click();
  };

  const showInFileManager = async () => {
    if (!qrCodeImage || !selectedBatch) return;

    try {
      // Convert base64 data URL to blob
      const response = await fetch(qrCodeImage);
      const blob = await response.blob();

      const fileName = `qr-code-${selectedBatch.batchId}.png`;

      // Try to use Web Share API first (mobile devices)
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `QR Code for ${selectedBatch.name}`,
              text: `QR code for batch ${selectedBatch.batchId}`,
              files: [file]
            });
            return;
          } catch {
            console.log('Web Share API failed, falling back to download method');
          }
        }
      }

      // For desktop platforms, download and try to open file manager
      const url = URL.createObjectURL(blob);

      // Method 1: Try platform-specific file opening
      const userAgent = navigator.userAgent.toLowerCase();
      const isMac = userAgent.includes('mac');
      const isWindows = userAgent.includes('win');
      const _isLinux = userAgent.includes('linux');

      if (isMac) {
        // On macOS, try to use Finder-specific approach
        try {
          // Create a temporary download that should open in Finder
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          // Try to open the downloads folder after a short delay
          setTimeout(async () => {
            try {
              // Use a service to open the downloads folder
              const _openCommand = `tell application "Finder" to open (path to downloads folder as text)`;
              // Note: This would require a backend service or external script
              // For now, we'll show a message
              alert(`QR code downloaded as "${fileName}".\n\nTo open in Finder:\n1. Open Finder\n2. Go to Downloads folder\n3. Find "${fileName}"`);
            } catch {
              alert(`QR code downloaded as "${fileName}". Please check your Downloads folder.`);
            }
          }, 1500);
        } catch {
          alert(`QR code downloaded as "${fileName}". Please check your Downloads folder.`);
        }
      } else if (isWindows) {
        // On Windows, try to open Explorer
        try {
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setTimeout(() => {
            alert(`QR code downloaded as "${fileName}".\n\nTo open in File Explorer:\n1. Open File Explorer\n2. Go to Downloads folder\n3. Find "${fileName}"`);
          }, 1500);
        } catch {
          alert(`QR code downloaded as "${fileName}". Please check your Downloads folder.`);
        }
      } else {
        // Linux or other platforms
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        alert(`QR code downloaded as "${fileName}". Please check your Downloads folder.`);
      }

      // Clean up the object URL
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 2000);

    } catch (error) {
      console.error('Failed to show in file manager:', error);
      // Fallback to regular download
      downloadQRImage();
    }
  };

  const generateQRCode = async (batch: MedicineBatch) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/qr-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batchId: batch.batchId }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setQrCodeImage(result.qrCode);
      } else {
        console.error('QR generation failed:', result.error);
      }
    } catch (error) {
      console.error('QR generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <QrCode className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold">QR Code Generator</h2>
              <p className="text-sm text-gray-600">Generate QR codes for medicine batch verification</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Batch Selection */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Search className="h-5 w-5" />
                    <span>Select Batch</span>
                  </CardTitle>
                  <CardDescription>
                    Search and select a batch to generate QR code
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Search by batch ID or medicine name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredBatches.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        {searchTerm ? 'No batches match your search' : 'No batches available'}
                      </p>
                    ) : (
                      filteredBatches.map((batch) => (
                        <div
                          key={batch._id}
                          className={`p-3 border rounded cursor-pointer transition-colors ${
                            selectedBatch?._id === batch._id 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleBatchSelect(batch)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{batch.name}</h4>
                              <p className="text-sm text-gray-600 break-all max-w-xs">{batch.batchId}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={
                                batch.qualityStatus === 'good' ? 'bg-green-100 text-green-800' :
                                batch.qualityStatus === 'compromised' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {batch.qualityStatus.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* QR Code Generation */}
            <div className="space-y-4">
              {selectedBatch ? (
                <>
                  {/* QR Code Visualization */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Generated QR Code</span>
                        <Badge variant="outline" className="break-all max-w-xs">{selectedBatch.batchId}</Badge>
                      </CardTitle>
                      <CardDescription>
                        QR code for {selectedBatch.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-center mb-4">
                        <div className="bg-white p-4 border-2 border-gray-200 rounded-lg">
                          {loading ? (
                            <div className="flex items-center justify-center w-64 h-64">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                          ) : qrCodeImage ? (
                            <img 
                              src={qrCodeImage} 
                              alt={`QR Code for ${selectedBatch.batchId}`}
                              className="rounded-lg"
                              width={300}
                              height={300}
                            />
                          ) : (
                            <div className="flex items-center justify-center w-64 h-64 bg-gray-50 rounded-lg">
                              <QrCode className="h-16 w-16 text-gray-400" />
                              <span className="ml-2 text-gray-500">Generating QR Code...</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Alert className="mb-4">
                        <Package className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Generated QR Code:</strong> Scan with PharmaTrust mobile app to verify batch authenticity.
                        </AlertDescription>
                      </Alert>

                      <div className="flex space-x-2">
                        <Button onClick={downloadQRImage} className="flex-1" disabled={!qrCodeImage}>
                          <Download className="h-4 w-4 mr-2" />
                          Download QR Image
                        </Button>
                        <Button onClick={showInFileManager} variant="outline" className="flex-1" disabled={!qrCodeImage}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Show in Finder
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* QR Data Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle>QR Code Data</CardTitle>
                      <CardDescription>
                        JSON payload encoded in the QR code
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto border">
                        {qrData}
                      </pre>
                    </CardContent>
                  </Card>

                  {/* Batch Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Batch Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Batch ID:</span>
                          <p className="text-gray-600 break-all max-w-xs">{selectedBatch.batchId}</p>
                        </div>
                        <div>
                          <span className="font-medium">Medicine:</span>
                          <p className="text-gray-600">{selectedBatch.name}</p>
                        </div>
                        <div>
                          <span className="font-medium">Stage:</span>
                          <Badge className={
                            selectedBatch.currentStage === 'manufacturer' ? 'bg-blue-100 text-blue-800' :
                            selectedBatch.currentStage === 'supplier' ? 'bg-purple-100 text-purple-800' :
                            selectedBatch.currentStage === 'pharmacist' ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }>
                            {selectedBatch.currentStage.toUpperCase()}
                          </Badge>
                        </div>
                        <div>
                          <span className="font-medium">Quality:</span>
                          <Badge className={
                            selectedBatch.qualityStatus === 'good' ? 'bg-green-100 text-green-800' :
                            selectedBatch.qualityStatus === 'compromised' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {selectedBatch.qualityStatus.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <QrCode className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select a Batch
                    </h3>
                    <p className="text-gray-500 text-center">
                      Choose a medicine batch from the list to generate its QR code.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t p-6">
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRGeneratorModal;
