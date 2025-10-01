import express, { Request, Response } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import Redis from 'ioredis';
import { z } from 'zod';
import http from 'http';
import { WebSocketServer } from 'ws';
import { MLAnomalyDetector, EnvironmentalReading } from './ml/anomalyDetector.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

const PORT = Number(process.env.PORT || 4003);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmatrust';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// MongoDB setup
const mongoClient = new MongoClient(MONGODB_URI);
const dbPromise = mongoClient.connect().then(() => mongoClient.db('pharmatrust'));

// Redis setup
const redis = new Redis(REDIS_URL);

// ML Anomaly Detector setup
let mlDetector: MLAnomalyDetector;

// HTTP + WS server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

type WsMessage = {
  type: 'reading' | 'anomaly';
  payload: any;
};

function broadcast(message: WsMessage) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client: any) => {
    if (client.readyState === 1) {
      client.send(data);
    }
  });
}

// Legacy basic anomaly detection (kept as fallback)
const TEMP_MIN = Number(process.env.TEMP_MIN ?? 2);
const TEMP_MAX = Number(process.env.TEMP_MAX ?? 25);
const HUM_MIN = Number(process.env.HUM_MIN ?? 30);
const HUM_MAX = Number(process.env.HUM_MAX ?? 70);

function detectAnomalyBasic(temperature: number, humidity: number) {
  const tempOut = temperature < TEMP_MIN || temperature > TEMP_MAX;
  const humOut = humidity < HUM_MIN || humidity > HUM_MAX;
  const isAnomaly = tempOut || humOut;
  let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (tempOut && (temperature < TEMP_MIN - 2 || temperature > TEMP_MAX + 2)) severity = 'HIGH';
  if (humOut && (humidity < HUM_MIN - 5 || humidity > HUM_MAX + 5)) severity = severity === 'HIGH' ? 'HIGH' : 'MEDIUM';
  return { 
    isAnomaly, 
    severity, 
    confidence: 0.5,
    reasons: { 
      temperature: tempOut, 
      humidity: humOut, 
      suddenChange: false, 
      gradualDrift: false,
      pattern: 'threshold_violation'
    },
    prediction: {
      nextTemperature: temperature,
      nextHumidity: humidity,
      riskLevel: isAnomaly ? 0.7 : 0.1
    }
  };
}

const readingSchema = z.object({
  batchId: z.string().min(1),
  deviceId: z.string().min(1).default('DHT22_001'),
  temperature: z.number(),
  humidity: z.number(),
  timestamp: z.coerce.date().optional()
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'iot', port: PORT });
});

app.post('/readings', async (req: Request, res: Response) => {
  const parsed = readingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { batchId, deviceId, temperature, humidity } = parsed.data;
  const timestamp = parsed.data.timestamp ?? new Date();

  try {
    const db = await dbPromise;
    
    // Create reading object for ML analysis
    const reading: EnvironmentalReading = {
      batchId,
      deviceId,
      temperature,
      humidity,
      timestamp
    };

    // Use ML anomaly detection if available, fallback to basic detection
    let result;
    try {
      if (mlDetector) {
        result = await mlDetector.detectAnomaly(reading);
      } else {
        result = detectAnomalyBasic(temperature, humidity);
      }
    } catch (mlError) {
      console.warn('ML anomaly detection failed, using fallback:', mlError);
      result = detectAnomalyBasic(temperature, humidity);
    }

    const doc = {
      batchId,
      deviceId,
      temperature,
      humidity,
      timestamp,
      isAnomaly: result.isAnomaly,
      severity: result.isAnomaly ? result.severity : null,
      confidence: result.confidence,
      mlReasons: result.reasons,
      prediction: result.prediction
    };
    
    await db.collection('environmental_data').insertOne(doc);

    // Publish to Redis channels
    await redis.publish('iot:reading', JSON.stringify(doc));
    if (result.isAnomaly) {
      await redis.publish('iot:anomaly', JSON.stringify({ 
        ...doc, 
        reasons: result.reasons,
        prediction: result.prediction 
      }));
    }

    // Broadcast over WebSocket
    broadcast({ type: 'reading', payload: doc });
    if (result.isAnomaly) {
      broadcast({ 
        type: 'anomaly', 
        payload: { 
          ...doc, 
          reasons: result.reasons,
          prediction: result.prediction 
        } 
      });
    }

    res.json({ 
      ok: true, 
      data: doc,
      mlAnalysis: {
        confidence: result.confidence,
        reasons: result.reasons,
        prediction: result.prediction
      }
    });
  } catch (err) {
    console.error('Failed to save reading', err);
    res.status(500).json({ error: 'Failed to process reading' });
  }
});

// Historical data endpoint
app.get('/readings', async (req: Request, res: Response) => {
  const batchId = req.query.batchId ? String(req.query.batchId) : undefined;
  const limit = Number(req.query.limit || 50);
  try {
    const db = await dbPromise;
    const query = batchId ? { batchId } : {};
    const items = await db
      .collection('environmental_data')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(Math.max(1, Math.min(200, limit)))
      .toArray();
    res.json({ items });
  } catch (err) {
    console.error('Failed to load readings', err);
    res.status(500).json({ error: 'Failed to load readings' });
  }
});

// ML Statistics endpoint
app.get('/ml/statistics', async (_req: Request, res: Response) => {
  try {
    if (!mlDetector) {
      return res.status(503).json({ error: 'ML detector not initialized' });
    }
    const stats = mlDetector.getMLStatistics();
    res.json({ stats });
  } catch (err) {
    console.error('Failed to get ML statistics', err);
    res.status(500).json({ error: 'Failed to get ML statistics' });
  }
});

// Batch statistics endpoint
app.get('/ml/batch/:batchId/statistics', async (req: Request, res: Response) => {
  try {
    if (!mlDetector) {
      return res.status(503).json({ error: 'ML detector not initialized' });
    }
    const { batchId } = req.params;
    const stats = await mlDetector.getBatchStatistics(batchId);
    if (!stats) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    res.json({ batchId, stats });
  } catch (err) {
    console.error('Failed to get batch statistics', err);
    res.status(500).json({ error: 'Failed to get batch statistics' });
  }
});

app.get('/', (_req: Request, res: Response) => {
  res.json({ 
    message: 'PharmaTrust IoT Service with ML Anomaly Detection',
    features: [
      'Real-time environmental monitoring',
      'Machine learning anomaly detection',
      'Adaptive threshold learning',
      'Medicine-specific tolerance models',
      'Pattern recognition (drift vs spikes)',
      'Time-series forecasting',
      'WebSocket real-time streaming'
    ]
  });
});

server.listen(PORT, async () => {
  try {
    const db = await dbPromise;
    console.log('Connected to MongoDB');
    
    // Initialize ML Anomaly Detector
    console.log('Initializing ML Anomaly Detector...');
    mlDetector = new MLAnomalyDetector(db);
    await mlDetector.initialize();
    console.log('ML Anomaly Detector initialized successfully');
  } catch (e) {
    console.error('MongoDB connection or ML initialization failed', e);
  }
  console.log(`IoT service with ML capabilities listening on port ${PORT}`);
});

process.on('SIGINT', async () => {
  await mongoClient.close().catch(() => {});
  redis.disconnect();
  process.exit(0);
});
