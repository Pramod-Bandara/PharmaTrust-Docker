import jwt, { type SignOptions, type Secret } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from './config.js';
import { isTokenBlacklisted } from './redis.js';
import type { UserRole } from './users.js';

export interface JwtPayload {
  sub: string; // username
  role: UserRole;
  jti: string;
}

export function signAccessToken(username: string, role: UserRole): { token: string; jti: string; expiresInSec: number } {
  const jti = randomUUID();
  const options: SignOptions = { expiresIn: config.jwtExpiresIn as unknown as any };
  const token = jwt.sign(
    { sub: username, role, jti } as JwtPayload,
    config.jwtSecret as Secret,
    options
  );
  const expiresInSec = parseExpiryToSeconds(config.jwtExpiresIn);
  return { token, jti, expiresInSec };
}

export function signRefreshToken(username: string, role: UserRole): { token: string; jti: string; expiresInSec: number } {
  const jti = randomUUID();
  const options: SignOptions = { expiresIn: config.refreshExpiresIn as unknown as any };
  const token = jwt.sign(
    { sub: username, role, jti } as JwtPayload,
    config.refreshSecret as Secret,
    options
  );
  const expiresInSec = parseExpiryToSeconds(config.refreshExpiresIn);
  return { token, jti, expiresInSec };
}

export async function verifyAccessToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, config.jwtSecret as Secret) as JwtPayload;
    if (await isTokenBlacklisted(payload.jti)) {
      return res.status(401).json({ error: 'Token revoked' });
    }
    (req as any).user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

function parseExpiryToSeconds(exp: string): number {
  // simple parser supporting "s", "m", "h", "d"
  const match = /^(\d+)([smhd])$/.exec(exp);
  if (!match) return 3600; // default 1h
  const value = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 3600;
  }
}
