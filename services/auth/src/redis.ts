import { Redis } from 'ioredis';
import { config } from './config.js';

export const redis = new Redis(config.redisUrl as string);

export async function blacklistToken(jti: string, expiresInSeconds: number): Promise<void> {
  const key = `bl:jti:${jti}`;
  await redis.set(key, '1', 'EX', expiresInSeconds);
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const key = `bl:jti:${jti}`;
  const exists = await redis.exists(key);
  return exists === 1;
}
