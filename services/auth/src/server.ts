import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import router from './routes.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/health', (_req, res) =>
  res.json({ ok: true, service: 'auth', status: 'healthy' })
);
app.use('/api/auth', router);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(Number(config.port), () => {
  console.log(`Auth service listening on port ${config.port}`);
});
