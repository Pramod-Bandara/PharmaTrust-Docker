// Environment configuration and service discovery for PharmaTrust

export interface ServiceConfig {
  auth: string;
  medicine: string;
  iot: string;
  blockchain: string;
  gateway: string;
}

export interface AppConfig {
  services: ServiceConfig;
  mongodb: {
    uri: string;
    database: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  environment: 'development' | 'production' | 'test';
}

// Service discovery based on environment
function getServiceUrls(): ServiceConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  if (isDevelopment) {
    // Development: services running on localhost with different ports
    return {
      auth: 'http://localhost:4001',
      medicine: 'http://localhost:4002',
      iot: 'http://localhost:4003',
      blockchain: 'http://localhost:4004',
      gateway: 'http://localhost:3000',
    };
  } else if (isProduction) {
    // Production: services running in Docker containers
    return {
      auth: 'http://auth:4001',
      medicine: 'http://medicine:4002',
      iot: 'http://iot:4003',
      blockchain: 'http://blockchain:4004',
      gateway: 'http://nginx:80',
    };
  } else {
    // Test or other environments
    return {
      auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
      medicine: process.env.MEDICINE_SERVICE_URL || 'http://localhost:4002',
      iot: process.env.IOT_SERVICE_URL || 'http://localhost:4003',
      blockchain: process.env.BLOCKCHAIN_SERVICE_URL || 'http://localhost:4004',
      gateway: process.env.GATEWAY_URL || 'http://localhost:3000',
    };
  }
}

// Application configuration
export const config: AppConfig = {
  services: getServiceUrls(),
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmatrust',
    database: process.env.MONGODB_DB || 'pharmatrust',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'pharmatrust-dev-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  environment: (process.env.NODE_ENV as AppConfig['environment']) || 'development',
};

// Health check endpoints for each service
export const healthCheckEndpoints = {
  auth: `${config.services.auth}/health`,
  medicine: `${config.services.medicine}/health`,
  iot: `${config.services.iot}/health`,
  blockchain: `${config.services.blockchain}/health`,
};

// Service mesh configuration
export const serviceMeshConfig = {
  retryAttempts: 3,
  retryDelay: 1000, // milliseconds
  timeout: 10000, // 10 seconds
  circuitBreakerThreshold: 5, // failures before opening circuit
  circuitBreakerTimeout: 30000, // 30 seconds before retry
};

// API endpoints mapping
export const apiEndpoints = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    verify: '/api/auth/verify',
    register: '/api/auth/register',
  },
  medicine: {
    batches: '/api/medicine/batches',
    batch: (id: string) => `/api/medicine/batches/${id}`,
    updateStage: (id: string) => `/api/medicine/batches/${id}/stage`,
    supplyChain: (id: string) => `/api/medicine/batches/${id}/supply-chain`,
  },
  iot: {
    readings: '/api/iot/readings',
    realtime: (batchId: string) => `/api/iot/realtime/${batchId}`,
    anomalies: '/api/iot/anomalies',
    devices: '/api/iot/devices',
  },
  blockchain: {
    verify: (batchId: string) => `/api/blockchain/verify/${batchId}`,
    record: '/api/blockchain/record',
    transactions: '/api/blockchain/transactions',
  },
  system: {
    health: '/api/health',
    status: '/api/status',
    metrics: '/api/metrics',
  },
};

// Validation functions
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required environment variables
  if (!process.env.MONGODB_URI && config.environment === 'production') {
    errors.push('MONGODB_URI is required in production');
  }

  if (!process.env.JWT_SECRET && config.environment === 'production') {
    errors.push('JWT_SECRET is required in production');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Export individual service configurations for easy access
export const authServiceConfig = {
  url: config.services.auth,
  endpoints: apiEndpoints.auth,
};

export const medicineServiceConfig = {
  url: config.services.medicine,
  endpoints: apiEndpoints.medicine,
};

export const iotServiceConfig = {
  url: config.services.iot,
  endpoints: apiEndpoints.iot,
};

export const blockchainServiceConfig = {
  url: config.services.blockchain,
  endpoints: apiEndpoints.blockchain,
};

// Utility function to get full URL for an endpoint
export function getFullUrl(service: keyof ServiceConfig, endpoint: string): string {
  const baseUrl = config.services[service];
  return `${baseUrl}${endpoint}`;
}

// Development helpers
export const isDevelopment = config.environment === 'development';
export const isProduction = config.environment === 'production';
export const isTest = config.environment === 'test';
