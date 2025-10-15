'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SupplyChainEntry {
  stage: string;
  entityId: string;
  timestamp: string | Date;
  location?: string;
  notes?: string;
}

interface MedicineBatch {
  _id: string;
  batchId: string;
  name: string;
  manufacturerId: string;
  currentStage: string;
  createdAt: string | Date;
  blockchainHash?: string;
  supplyChain: SupplyChainEntry[];
  qualityStatus: 'good' | 'compromised' | 'unknown';
}

export default function AdminBatchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';
  const [batch, setBatch] = useState<MedicineBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchBatch = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/medicine/batches/${id}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || 'Failed to load batch');
          setBatch(null);
          return;
        }
        // Some backends return { success, data }; others return the document directly
        const payload = data?.data ?? data;
        setBatch(payload as MedicineBatch);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
        setBatch(null);
      } finally {
        setLoading(false);
      }
    };
    fetchBatch();
  }, [id]);

  return (
    <DashboardLayout title="Batch Details" subtitle="Inspect batch metadata and supply chain">
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>

        {loading && (
          <Card>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
          </Card>
        )}

        {error && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">{error}</CardTitle>
            </CardHeader>
          </Card>
        )}

        {batch && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{batch.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{batch.batchId}</Badge>
                  <Badge
                    className={
                      batch.qualityStatus === 'good'
                        ? 'bg-green-100 text-green-800'
                        : batch.qualityStatus === 'compromised'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }
                  >
                    {batch.qualityStatus.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                <div>Manufacturer: {batch.manufacturerId}</div>
                <div>Created: {new Date(batch.createdAt).toLocaleString()}</div>
                <div>Stage: {batch.currentStage}</div>
                {batch.blockchainHash && <div>Blockchain: {batch.blockchainHash}</div>}
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Supply Chain</div>
                <div className="space-y-2">
                  {(batch.supplyChain || []).map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between border rounded p-2">
                      <div className="text-sm">
                        <div className="font-medium">{s.stage}</div>
                        <div className="text-gray-600">{s.entityId}</div>
                        {s.location && <div className="text-gray-600">{s.location}</div>}
                        {s.notes && <div className="text-gray-600">{s.notes}</div>}
                      </div>
                      <div className="text-xs text-gray-500">{new Date(s.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                  {(!batch.supplyChain || batch.supplyChain.length === 0) && (
                    <div className="text-sm text-gray-500">No supply chain entries.</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}


