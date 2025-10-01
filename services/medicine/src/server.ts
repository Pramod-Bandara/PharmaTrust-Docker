import express, { Request, Response } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { database } from './database.js';
import medicineRoutes from './routes.js';
import { errorHandler, requestLogger, corsMiddleware } from './middleware.js';

dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(corsMiddleware);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('combined'));
app.use(requestLogger);

const PORT = Number(process.env.PORT || 4002);

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const dbHealthy = await database.ping();
    res.json({ 
      status: 'ok', 
      service: 'medicine', 
      port: PORT,
      database: dbHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'medicine',
      port: PORT,
      database: 'disconnected',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({ 
    message: 'PharmaTrust Medicine Service',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      batches: '/api/medicine/batches',
      statistics: '/api/medicine/statistics'
    }
  });
});

// API routes
app.use('/api/medicine', medicineRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('🔄 Connecting to database...');
    await database.connect();
    
    console.log('🔄 Creating database indexes...');
    await database.createIndexes();
    
    app.listen(PORT, () => {
      console.log(`✅ Medicine service listening on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🏥 Medicine API: http://localhost:${PORT}/api/medicine`);
    });
  } catch (error) {
    console.error('❌ Failed to start medicine service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down medicine service...');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Shutting down medicine service...');
  await database.disconnect();
  process.exit(0);
});

startServer();
