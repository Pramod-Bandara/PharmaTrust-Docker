import 'dotenv/config';

export const config = {
  port: process.env.PORT ?? '4001',
  jwtSecret: process.env.JWT_SECRET ?? 'demo-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  refreshSecret: process.env.REFRESH_SECRET ?? 'demo-refresh-secret',
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN ?? '7d',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379'
} as const;
