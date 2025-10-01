import { Buffer } from 'buffer';
// Mock JWT verification for demo purposes
// In production, this would verify against the auth service
export function verifyToken(token) {
    try {
        // For demo purposes, we'll decode a simple token format
        // In production, use proper JWT verification with the auth service
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const payload = JSON.parse(decoded);
        if (payload.sub && payload.role && payload.username) {
            return {
                sub: payload.sub,
                role: payload.role,
                username: payload.username
            };
        }
        return null;
    }
    catch (error) {
        return null;
    }
}
// Authentication middleware
export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Authorization header required'
        });
    }
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = verifyToken(token);
    if (!user) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
    req.user = user;
    next();
}
// Role-based authorization middleware
export function requireRole(...roles) {
    return (req, res, next) => {
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
export function errorHandler(error, req, res, next) {
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
export function requestLogger(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    next();
}
// CORS middleware for service-to-service communication
export function corsMiddleware(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    }
    else {
        next();
    }
}
