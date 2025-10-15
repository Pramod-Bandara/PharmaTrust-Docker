import { useState, useEffect, useCallback } from 'react';
import { MedicineBatch } from '@/types';

interface UseBatchesOptions {
  filters?: Record<string, string | undefined>;
  autoFetch?: boolean;
  refetchInterval?: number;
}

interface UseBatchesReturn {
  batches: MedicineBatch[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setBatches: (batches: MedicineBatch[]) => void;
}

export function useBatches(options: UseBatchesOptions = {}): UseBatchesReturn {
  const { filters, autoFetch = true, refetchInterval } = options;
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query string from filters
      const queryParams = filters
        ? `?${new URLSearchParams(
            Object.fromEntries(
              Object.entries(filters).filter(([, v]) => typeof v === 'string') as Array<[string, string]>
            )
          ).toString()}`
        : '';

      const response = await fetch(`/api/admin/batches${queryParams}`);

      if (response.ok) {
        const batchData = await response.json();
        if (batchData.success) {
          setBatches(batchData.data || []);
        } else {
          setError(batchData.error || 'Failed to fetch batches');
          setBatches([]);
        }
      } else {
        setError(`HTTP ${response.status}: ${response.statusText}`);
        setBatches([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error occurred');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    if (autoFetch) {
      fetchBatches();
    }
  }, [fetchBatches, autoFetch]);

  // Set up auto-refresh interval if specified
  useEffect(() => {
    if (!refetchInterval) return;

    const interval = setInterval(fetchBatches, refetchInterval);
    return () => clearInterval(interval);
  }, [fetchBatches, refetchInterval]);

  return {
    batches,
    loading,
    error,
    refetch: fetchBatches,
    setBatches
  };
}

// Convenience hook for batches with specific filters
export function useBatchesByStage(stage: string) {
  return useBatches({ filters: { stage } });
}

// Hook for batches by manufacturer
export function useBatchesByManufacturer(manufacturerId: string) {
  return useBatches({ filters: { manufacturerId } });
}

// Hook for batches with quality status
export function useBatchesByQuality(qualityStatus: string) {
  return useBatches({ filters: { qualityStatus } });
}
