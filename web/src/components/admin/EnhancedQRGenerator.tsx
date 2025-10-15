'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  QrCode,
  Download,
  Blocks,
  Shield,
  Package,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { MedicineBatch } from '@/types';

interface QRData {
  batchId: string;
  name: string;
  url: string;
  timestamp: string;
  blockchainHash?: string;
  verified?: boolean;
}

interface BlockchainStatus {
  isVerified: boolean;
  txHash?: string;
  source: 'thirdweb' | 'mock';
}

interface EnhancedQRGeneratorProps {
  batches: MedicineBatch[];
}

const EnhancedQRGenerator = ({ batches }: EnhancedQRGeneratorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<MedicineBatch | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [blockchainStatus, setBlockchainStatus] = useState<BlockchainStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredBatches = batches.filter(batch => 
    batch.batchId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateQRCode = async (batch: MedicineBatch) => {
    setLoading(true);
    try {
      // First, check blockchain status
      const blockchainResponse = await fetch(`/api/blockchain/verify?batchId=${encodeURIComponent(batch.batchId)}`);
      const blockchainData = await blockchainResponse.json();
      setBlockchainStatus(blockchainData);

      // Generate QR code with enhanced data
      const qrPayload: QRData = {
        batchId: batch.batchId,
        name: batch.name,
        url: `pharmatrust://verify/${batch.batchId}`,
        timestamp: new Date().toISOString(),
        blockchainHash: blockchainData.txHash,
        verified: blockchainData.isVerified
      };

      const qrResponse = await fetch('/api/admin/qr-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          batchId: batch.batchId,
          enhancedData: qrPayload
        }),
      });
      
      const result = await qrResponse.json();
      
      if (result.success) {
        setQrCodeImage(result.qrCode);
        setQrData(qrPayload);
      } else {
        console.error('QR generation failed:', result.error);
      }
    } catch (error) {
      console.error('QR generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSelect = (batch: MedicineBatch) => {
    setSelectedBatch(batch);
    generateQRCode(batch);
  };

  const mintToBlockchain = async (batch: MedicineBatch) => {
    setLoading(true);
    try {
      const response = await fetch('/api/blockchain/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchId: batch.batchId,
          name: batch.name,
          manufacturerId: 'mfg1',
          metadata: {
            currentStage: batch.currentStage,
            qualityStatus: batch.qualityStatus
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Regenerate QR code with new blockchain data
        await generateQRCode(batch);
        alert(`✅ Batch minted to blockchain!\nTx Hash: ${result.txHash}`);
      } else {
        alert(`❌ Minting failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Minting error:', error);
      alert('❌ Failed to mint batch to blockchain');
    } finally {
      setLoading(false);
    }
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
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setTimeout(async () => {
            try {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800';
      case 'compromised': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generator">QR Generator</TabsTrigger>
          <TabsTrigger value="blockchain">Blockchain Integration</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Batch Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Select Medicine Batch</span>
                </CardTitle>
                <CardDescription>
                  Choose a batch to generate QR code with blockchain verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Search batches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-4"
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
                            <Badge className={getStatusColor(batch.qualityStatus)}>
                              {batch.qualityStatus.toUpperCase()}
                            </Badge>
                            {batch.blockchainHash && (
                              <Shield className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* QR Code Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <QrCode className="h-5 w-5" />
                  <span>Generated QR Code</span>
                  {selectedBatch && <Badge variant="outline" className="break-all max-w-xs">{selectedBatch.batchId}</Badge>}
                </CardTitle>
                <CardDescription>
                  {selectedBatch ? `QR code for ${selectedBatch.name}` : 'Select a batch to generate QR code'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-4 border-2 border-gray-200 rounded-lg">
                    {loading ? (
                      <div className="flex items-center justify-center w-64 h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      </div>
                    ) : qrCodeImage ? (
                      <img 
                        src={qrCodeImage} 
                        alt={`QR Code for ${selectedBatch?.batchId}`}
                        className="rounded-lg"
                        width={300}
                        height={300}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-64 h-64 bg-gray-50 rounded-lg">
                        <QrCode className="h-16 w-16 text-gray-400" />
                        <span className="mt-2 text-gray-500">Select a batch to generate QR</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {blockchainStatus && (
                  <Alert className="mb-4">
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Blockchain Status:</strong> {blockchainStatus.isVerified ? 'Verified ✅' : 'Not on blockchain ⚠️'}
                      {blockchainStatus.txHash && ` (${blockchainStatus.txHash.substring(0, 16)}...)`}
                    </AlertDescription>
                  </Alert>
                )}

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
          </div>

          {/* QR Data Preview */}
          {qrData && (
            <Card>
              <CardHeader>
                <CardTitle>QR Code Data Preview</CardTitle>
                <CardDescription>
                  Data encoded in the QR code for mobile app scanning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify(qrData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="blockchain" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Blocks className="h-5 w-5" />
                <span>Blockchain Operations</span>
              </CardTitle>
              <CardDescription>
                Mint batches to blockchain and enhance QR codes with verification data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedBatch ? (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="font-medium">{selectedBatch.name}</h3>
                        <p className="text-sm text-gray-600 break-all max-w-xs">Batch ID: {selectedBatch.batchId}</p>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(selectedBatch.qualityStatus)}>
                            {selectedBatch.qualityStatus.toUpperCase()}
                          </Badge>
                          {blockchainStatus?.isVerified && (
                            <Badge variant="outline" className="text-green-600">
                              Blockchain Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => mintToBlockchain(selectedBatch)}
                        disabled={loading || blockchainStatus?.isVerified}
                        className="flex items-center space-x-2"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Blocks className="h-4 w-4" />
                        )}
                        <span>
                          {blockchainStatus?.isVerified ? 'Already on Blockchain' : 'Mint to Blockchain'}
                        </span>
                      </Button>
                    </div>
                  </div>

                  {blockchainStatus && (
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <div><strong>Verification Status:</strong> {blockchainStatus.isVerified ? 'Verified ✅' : 'Not verified ❌'}</div>
                          {blockchainStatus.txHash && (
                            <div><strong>Transaction Hash:</strong> {blockchainStatus.txHash}</div>
                          )}
                          <div><strong>Source:</strong> {blockchainStatus.source}</div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Select a batch to view blockchain details and operations
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedQRGenerator;
