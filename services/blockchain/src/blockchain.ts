import { z } from 'zod';

export const MintInputSchema = z.object({
  batchId: z.string().min(1),
  name: z.string().min(1),
  manufacturerId: z.string().min(1),
  metadata: z.record(z.any()).optional()
});

export type MintInput = z.infer<typeof MintInputSchema>;

export interface VerificationResult {
  isVerified: boolean;
  txHash?: string;
  source: 'thirdweb' | 'mock';
}

export interface BlockchainService {
  init(): Promise<void>;
  mintBatch(input: MintInput): Promise<{ txHash: string; source: 'thirdweb' | 'mock' }>;
  verifyBatch(batchId: string): Promise<VerificationResult>;
  listEvents(batchId?: string): Promise<Array<{
    type: 'MINT' | 'TRANSFER' | 'VERIFY';
    batchId: string;
    txHash: string;
    timestamp: number;
  }>>;
}

/**
 * Minimal mock implementation to keep demo unblocked when THIRDWEB is not configured.
 */
export class MockBlockchainService implements BlockchainService {
  private mintedByBatch = new Map<string, { txHash: string; timestamp: number }>();
  private events: Array<{ type: 'MINT' | 'TRANSFER' | 'VERIFY'; batchId: string; txHash: string; timestamp: number }> = [];

  async init(): Promise<void> {
    return;
  }

  async mintBatch(input: MintInput): Promise<{ txHash: string; source: 'thirdweb' | 'mock' }> {
    const txHash = `mock_${input.batchId}_${Date.now()}`;
    this.mintedByBatch.set(input.batchId, { txHash, timestamp: Date.now() });
    this.events.push({ type: 'MINT', batchId: input.batchId, txHash, timestamp: Date.now() });
    return { txHash, source: 'mock' };
  }

  async verifyBatch(batchId: string): Promise<VerificationResult> {
    const rec = this.mintedByBatch.get(batchId);
    const isVerified = Boolean(rec);
    const txHash = rec?.txHash;
    if (isVerified && txHash) {
      this.events.push({ type: 'VERIFY', batchId, txHash, timestamp: Date.now() });
    }
    return { isVerified, txHash, source: 'mock' };
  }

  async listEvents(batchId?: string) {
    return this.events.filter(e => (batchId ? e.batchId === batchId : true)).sort((a, b) => b.timestamp - a.timestamp);
  }
}

/**
 * Factory that returns a Thirdweb-backed service if env is configured; otherwise a mock.
 * For now, we return the mock to avoid introducing heavy deps for the demo; wiring is ready for future.
 */
export async function createBlockchainService(): Promise<BlockchainService> {
  const hasThirdweb = Boolean(process.env.THIRDWEB_SECRET_KEY && process.env.CONTRACT_ADDRESS);
  // Placeholder: return mock in both cases for now; easily swappable to real thirdweb later.
  const service = new MockBlockchainService();
  await service.init();
  return service;
}


