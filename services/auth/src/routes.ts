import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { findDemoUser, demoUsers, type DemoUser, type UserRole } from './users.js';
import { blacklistToken, isTokenBlacklisted } from './redis.js';
import { signAccessToken, signRefreshToken, verifyAccessToken, requireRole } from './jwt.js';
import type { JwtPayload } from './jwt.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'auth', status: 'healthy' });
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const roleEnum = z.enum(['manufacturer', 'supplier', 'pharmacist', 'admin']);

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(4),
  role: roleEnum,
  entityName: z.string().min(1)
});

const updateUserSchema = z.object({
  password: z.string().min(4).optional(),
  role: roleEnum.optional(),
  entityName: z.string().min(1).optional()
});

interface SanitizedUser {
  _id: string;
  username: string;
  role: UserRole;
  entityName: string;
}

const sanitizeUser = ({ username, role, entityName }: DemoUser): SanitizedUser => ({
  _id: username,
  username,
  role,
  entityName,
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { username, password } = parsed.data;

  const user = findDemoUser(username);
  if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });

  const access = signAccessToken(user.username, user.role);
  const refresh = signRefreshToken(user.username, user.role);

  const sanitized = sanitizeUser(user);

  res.json({
    user: sanitized,
    token: access.token,
    refreshToken: refresh.token,
    expiresIn: access.expiresInSec
  });
});

const refreshSchema = z.object({ refreshToken: z.string().min(10) });

router.post('/refresh', async (req: Request, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { refreshToken } = parsed.data;
  const jwt = await import('jsonwebtoken');
  const { config } = await import('./config.js');

  try {
    const payload = jwt.default.verify(refreshToken, config.refreshSecret) as any;

    if (await isTokenBlacklisted(payload.jti)) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    await blacklistToken(payload.jti, 60 * 60 * 24 * 7);

    const access = signAccessToken(payload.sub, payload.role);
    const refresh = signRefreshToken(payload.sub, payload.role);

    res.json({ accessToken: access.token, refreshToken: refresh.token, expiresIn: access.expiresInSec });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.replace('Bearer ', '').trim();
  const { default: jwt } = await import('jsonwebtoken');
  const { config } = await import('./config.js');

  try {
    const payload = jwt.verify(accessToken, config.jwtSecret) as any;
    await blacklistToken(payload.jti, 3600);
  } catch {
    // ignore
  }
  const token = (req.body?.refreshToken as string | undefined) ?? '';
  if (token) {
    try {
      const payload = jwt.verify(token, config.refreshSecret) as any;
      await blacklistToken(payload.jti, 60 * 60 * 24 * 7);
    } catch {
      // ignore
    }
  }
  res.json({ success: true });
});
router.get('/me', verifyAccessToken, (req: Request, res: Response) => {
  const payload = (req as any).user as JwtPayload | undefined;
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = findDemoUser(payload.sub);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: sanitizeUser(user) });
});

router.post('/verify', verifyAccessToken, (req: Request, res: Response) => {
  const payload = (req as any).user as JwtPayload | undefined;
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = findDemoUser(payload.sub);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: sanitizeUser(user) });
});

router.get('/users', verifyAccessToken, requireRole(['admin']), (_req: Request, res: Response) => {
  res.json({ users: demoUsers.map(sanitizeUser) });
});

router.post('/users', verifyAccessToken, requireRole(['admin']), (req: Request, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const { username } = parsed.data;
  if (demoUsers.some(user => user.username === username)) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const newUser: DemoUser = { ...parsed.data };
  demoUsers.push(newUser);

  res.status(201).json({ user: sanitizeUser(newUser) });
});

router.put('/users/:username', verifyAccessToken, requireRole(['admin']), (req: Request, res: Response) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const user = demoUsers.find(u => u.username === req.params.username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updates = parsed.data;
  if (updates.role) {
    user.role = updates.role as UserRole;
  }
  if (updates.entityName) {
    user.entityName = updates.entityName;
  }
  if (updates.password) {
    user.password = updates.password;
  }

  res.json({ user: sanitizeUser(user) });
});

router.post('/users/:username/reset-password', verifyAccessToken, requireRole(['admin']), (req: Request, res: Response) => {
  const user = demoUsers.find(u => u.username === req.params.username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const newPassword = randomBytes(4).toString('hex');
  user.password = newPassword;

  res.json({ username: user.username, password: newPassword });
});

router.delete('/users/:username', verifyAccessToken, requireRole(['admin']), (req: Request, res: Response) => {
  const { username } = req.params;
  if (username === 'admin') {
    return res.status(400).json({ error: 'Cannot delete primary admin user' });
  }

  const index = demoUsers.findIndex(u => u.username === username);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  demoUsers.splice(index, 1);

  res.json({ success: true });
});

export default router;
