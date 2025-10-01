import express, { Request, Response } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import fetch from 'node-fetch';
import { z } from 'zod';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

const PORT = Number(process.env.PORT || 4010);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const AUTH_BASE = process.env.AUTH_BASE || 'http://auth:4001';
const MEDICINE_BASE = process.env.MEDICINE_BASE || 'http://medicine:4002';
const IOT_BASE = process.env.IOT_BASE || 'http://iot:4003';
const BLOCKCHAIN_BASE = process.env.BLOCKCHAIN_BASE || 'http://blockchain:4004';

const redis = new Redis(REDIS_URL);

const limiter = rateLimit({ windowMs: 60_000, max: 60 });
app.use('/api/mobile/', limiter);

// Simplified mobile auth: exchange code for JWT
const loginSchema = z.object({ username: z.string(), password: z.string() });
app.post('/api/mobile/auth/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid credentials payload' });
  try {
    const r = await fetch(`${AUTH_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data)
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'Auth service unavailable' });
  }
});

async function getCached<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  const fresh = await fetcher();
  await redis.set(key, JSON.stringify(fresh), 'EX', ttlSeconds);
  return fresh;
}

// Verify endpoint: optimized for mobile
const verifySchema = z.object({ batchId: z.string().min(1) });
app.get('/api/mobile/verify', async (req: Request, res: Response) => {
  const parsed = verifySchema.safeParse({ batchId: req.query.batchId });
  if (!parsed.success) return res.status(400).json({ error: 'batchId required' });
  const { batchId } = parsed.data;
  try {
    const result = await getCached(`mobile:verify:${batchId}`, 20, async () => {
      // fetch batch summary
      const [batchResp, readingsResp, chainResp] = await Promise.all([
        fetch(`${MEDICINE_BASE}/api/medicine/batches/${batchId}`, { headers: { 'Authorization': req.headers.authorization || '' } }),
        fetch(`${IOT_BASE}/readings?batchId=${encodeURIComponent(batchId)}&limit=10`),
        fetch(`${BLOCKCHAIN_BASE}/verify?batchId=${encodeURIComponent(batchId)}`)
      ]);
      const [batchJson, readingsJson, chainJson] = await Promise.all([batchResp.json(), readingsResp.json(), chainResp.json().catch(() => ({ isVerified: false }))]);

      const batch = batchJson?.data?.batch || null;
      const lastReading = Array.isArray(readingsJson?.items) ? readingsJson.items[0] : null;
      const isAuthentic = !!chainJson?.isVerified || !!batch?.blockchainHash;
      return {
        batchId,
        name: batch?.name,
        qualityStatus: batch?.qualityStatus ?? 'unknown',
        currentStage: batch?.currentStage ?? 'unknown',
        lastTemperature: lastReading?.temperature ?? null,
        lastHumidity: lastReading?.humidity ?? null,
        lastTimestamp: lastReading?.timestamp ?? null,
        authenticity: isAuthentic ? 'Authentic' : 'Suspicious'
      };
    });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(502).json({ success: false, error: 'Upstream service failure' });
  }
});

// Batch summary endpoint: compact mobile payload
app.get('/api/mobile/batch/:id/summary', async (req: Request, res: Response) => {
  const batchId = req.params.id;
  try {
    const result = await getCached(`mobile:summary:${batchId}`, 30, async () => {
      const [batchResp, readingsResp] = await Promise.all([
        fetch(`${MEDICINE_BASE}/api/medicine/batches/${batchId}`, { headers: { 'Authorization': req.headers.authorization || '' } }),
        fetch(`${IOT_BASE}/readings?batchId=${encodeURIComponent(batchId)}&limit=25`)
      ]);
      const [batchJson, readingsJson] = await Promise.all([batchResp.json(), readingsResp.json()]);
      const batch = batchJson?.data?.batch || null;
      const readings = Array.isArray(readingsJson?.items) ? readingsJson.items : [];
      return {
        batch: batch ? {
          batchId: batch.batchId,
          name: batch.name,
          currentStage: batch.currentStage,
          qualityStatus: batch.qualityStatus
        } : null,
        readings: readings.map((r: any) => ({ t: r.timestamp, temp: r.temperature, hum: r.humidity }))
      };
    });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(502).json({ success: false, error: 'Upstream service failure' });
  }
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'mobile-gateway', port: PORT });
});

app.use((err: any, _req: Request, res: Response, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Mobile API Gateway listening on port ${PORT}`);
});


