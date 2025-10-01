import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';
import { createBlockchainService, MintInputSchema } from './blockchain.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

const PORT = Number(process.env.PORT || 4004);

// lazy init service
let servicePromise = createBlockchainService();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'blockchain', port: PORT });
});

app.get('/', (_req, res) => {
  res.json({ message: 'PharmaTrust Blockchain Service' });
});

// POST /mint (proxied from /api/blockchain/mint)
app.post('/mint', async (req, res) => {
  try {
    const parsed = MintInputSchema.parse(req.body);
    const svc = await servicePromise;
    const result = await svc.mintBatch(parsed);
    res.json({ success: true, ...result });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: err.flatten() });
    }
    console.error('mint error', err);
    res.status(500).json({ error: 'Mint failed' });
  }
});

// GET /verify?batchId=... (proxied from /api/blockchain/verify)
app.get('/verify', async (req, res) => {
  try {
    const batchId = String(req.query.batchId || '');
    if (!batchId) return res.status(400).json({ error: 'batchId is required' });
    const svc = await servicePromise;
    const result = await svc.verifyBatch(batchId);
    res.json(result);
  } catch (err) {
    console.error('verify error', err);
    res.status(500).json({ error: 'Verify failed' });
  }
});

// GET /events?batchId=... (proxied from /api/blockchain/events)
app.get('/events', async (req, res) => {
  try {
    const batchId = req.query.batchId ? String(req.query.batchId) : undefined;
    const svc = await servicePromise;
    const events = await svc.listEvents(batchId);
    res.json({ events });
  } catch (err) {
    console.error('events error', err);
    res.status(500).json({ error: 'Events fetch failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Blockchain service listening on port ${PORT}`);
});
