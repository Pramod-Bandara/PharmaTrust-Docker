'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useBatches } from '@/hooks/useBatches';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  ExternalLink,
  RefreshCw,
  Activity,
  Shield,
  Blocks,
  Eye,
  Download
} from 'lucide-react';

interface BlockchainTransaction {
  type: 'MINT' | 'TRANSFER' | 'VERIFY';
  batchId: string;
  txHash: string;
  timestamp: number;
}

interface BatchVerification {
  batchId: string;
  isVerified: boolean;
  txHash?: string;
  source: 'thirdweb' | 'mock';
}

interface MedicineBatch {
  _id: string;
  batchId: string;
  name: string;
  currentStage: string;
  qualityStatus: 'good' | 'compromised' | 'unknown';
  blockchainHash?: string;
  createdAt: string;
}

const BlockchainDemoPage = () => {
  const { batches, loading, error } = useBatches();
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [verifications, setVerifications] = useState<Record<string, BatchVerification>>({});
  const [_selectedBatch, _setSelectedBatch] = useState<string>('');
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  const [blockchainError, setBlockchainError] = useState<string>('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/blockchain/events');
      const data = await response.json();
      if (data.events) {
        setTransactions(data.events);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const mintBatchToBlockchain = async (batch: MedicineBatch) => {
    setBlockchainLoading(true);
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
            qualityStatus: batch.qualityStatus,
            createdAt: batch.createdAt
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setBlockchainError('');
        await fetchTransactions();
        // Show success message
        alert(`✅ Batch minted to blockchain!\nTx Hash: ${result.txHash}`);
      } else {
        setBlockchainError(result.error || 'Failed to mint batch');
      }
    } catch (error) {
      console.error('Minting error:', error);
      setBlockchainError('Failed to mint batch to blockchain');
    } finally {
      setBlockchainLoading(false);
    }
  };

  const verifyBatch = async (batchId: string) => {
    setBlockchainLoading(true);
    try {
      const response = await fetch(`/api/blockchain/verify?batchId=${encodeURIComponent(batchId)}`);
      const result = await response.json();
      
      setVerifications(prev => ({
        ...prev,
        [batchId]: result
      }));
      
      await fetchTransactions();
    } catch (error) {
      console.error('Verification error:', error);
      setBlockchainError('Failed to verify batch');
    } finally {
      setBlockchainLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800';
      case 'compromised': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'MINT': return <Blocks className="h-4 w-4 text-blue-600" />;
      case 'VERIFY': return <Shield className="h-4 w-4 text-green-600" />;
      case 'TRANSFER': return <Activity className="h-4 w-4 text-orange-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const exportBlockchainData = () => {
    const data = {
      batches: batches.map(b => ({
        batchId: b.batchId,
        name: b.name,
        blockchainHash: b.blockchainHash,
        verification: verifications[b.batchId]
      })),
      transactions,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blockchain-demo-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout
      title="Blockchain Demo"
      subtitle="Pharmaceutical batch validation on blockchain testnet"
    >
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {blockchainError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{blockchainError}</AlertDescription>
        </Alert>
      )}

      {/* Blockchain Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Blocks className="h-5 w-5" />
            <span>Blockchain Network Status</span>
          </CardTitle>
          <CardDescription>
            PharmaTrust Demo Blockchain - Enhanced Mock Environment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium">Network</div>
                <div className="text-sm text-gray-600">Demo Testnet Active</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium">Transactions</div>
                <div className="text-sm text-gray-600">{transactions.length} Total</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <div>
                <div className="font-medium">Verifications</div>
                <div className="text-sm text-gray-600">{Object.keys(verifications).length} Completed</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="batches" className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList className="grid w-fit grid-cols-3">
            <TabsTrigger value="batches">Medicine Batches</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
          </TabsList>
          
          <div className="flex space-x-2">
            <Button onClick={fetchTransactions} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={exportBlockchainData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        <TabsContent value="batches">
          <Card>
            <CardHeader>
              <CardTitle>Medicine Batches on Blockchain</CardTitle>
              <CardDescription>
                Mint medicine batches to blockchain and track their lifecycle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {batches.map((batch) => (
                  <div key={batch._id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{batch.name}</h3>
                          <Badge variant="outline" className="break-all max-w-xs">{batch.batchId}</Badge>
                          <Badge className={getStatusColor(batch.qualityStatus)}>
                            {batch.qualityStatus.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          Stage: {batch.currentStage} • Created: {batch.createdAt ? new Date(batch.createdAt).toLocaleDateString() : 'Unknown'}
                        </div>
                        {batch.blockchainHash && (
                          <div className="flex items-center space-x-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">Blockchain Hash: {batch.blockchainHash?.substring(0, 20)}...</span>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => mintBatchToBlockchain(batch)}
                          disabled={blockchainLoading}
                          size="sm"
                        >
                          <Blocks className="h-4 w-4 mr-2" />
                          {blockchainLoading ? 'Minting...' : 'Mint to Blockchain'}
                        </Button>
                        <Button
                          onClick={() => verifyBatch(batch.batchId)}
                          disabled={blockchainLoading}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {blockchainLoading ? 'Verifying...' : 'Verify'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Blockchain Transaction History</CardTitle>
              <CardDescription>
                All blockchain transactions for pharmaceutical batches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No transactions yet. Mint a batch to see blockchain activity.
                  </div>
                ) : (
                  transactions.map((tx, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getTransactionIcon(tx.type)}
                          <div>
                            <div className="font-medium">{tx.type} - {tx.batchId}</div>
                            <div className="text-sm text-gray-600">
                              {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'Unknown'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{tx.txHash?.substring(0, 16) || 'N/A'}...</Badge>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification">
          <Card>
            <CardHeader>
              <CardTitle>Batch Verification Results</CardTitle>
              <CardDescription>
                Verify the authenticity of medicine batches on blockchain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(verifications).map(([batchId, verification]) => (
                  <div key={batchId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {verification.isVerified ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium break-all max-w-xs">Batch: {batchId}</div>
                          <div className="text-sm text-gray-600">
                            Source: {verification.source} • 
                            Status: {verification.isVerified ? 'Verified' : 'Not Found'}
                          </div>
                        </div>
                      </div>
                      {verification.txHash && (
                        <Badge variant="outline">
                          {verification.txHash?.substring(0, 16) || 'N/A'}...
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                
                {Object.keys(verifications).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No verifications yet. Click &quot;Verify&quot; on any batch to check blockchain status.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default BlockchainDemoPage;
