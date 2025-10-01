/// <reference types="node" />
import { Request, Response, NextFunction } from 'express';
import { Buffer } from 'buffer';
import { UserRole } from './types.js';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        role: UserRole;
        username: string;
      };
    }
  }
}

// JWT verification using the same secret as auth service
export function verifyToken(token: string): { sub: string; role: UserRole; username: string } | null {
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret';
    
    const payload = jwt.verify(token, JWT_SECRET) as any;
    
    if (payload.sub && payload.role) {
      return {
        sub: payload.sub,
        role: payload.role as UserRole,
        username: payload.sub // Use sub as username for consistency
      };
    }
    
    return null;
  } catch (error: any) {
    console.error('JWT verification error:', error?.message || 'Unknown error');
    return null;
  }
}

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  console.log('Auth header:', authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Missing or invalid auth header');
    return res.status(401).json({
      success: false,
      error: 'Authorization header required'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  console.log('Token to verify:', token.substring(0, 20) + '...');
  const user = verifyToken(token);
  console.log('Verification result:', user);

  if (!user) {
    console.log('Token verification failed');
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }

  req.user = user;
  next();
}

// Role-based authorization middleware
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
}

// Error handling middleware
export function errorHandler(error: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', error);

  // MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(400).json({
      success: false,
      error: `${field} already exists`
    });
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });

  next();
}

// CORS middleware for service-to-service communication
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}
