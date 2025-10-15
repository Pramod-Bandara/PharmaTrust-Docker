// Health check and monitoring utilities for PharmaTrust services

import { healthCheckEndpoints, serviceMeshConfig } from './config';

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
  lastChecked: Date;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  timestamp: Date;
}

class HealthMonitor {
  private healthCache: Map<string, ServiceHealth> = new Map();
  private cacheTimeout = 30000; // 30 seconds

  async checkServiceHealth(serviceName: string, url: string): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), serviceMeshConfig.timeout);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      const health: ServiceHealth = {
        service: serviceName,
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}`,
        lastChecked: new Date(),
      };

      this.healthCache.set(serviceName, health);
      return health;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const health: ServiceHealth = {
        service: serviceName,
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };

      this.healthCache.set(serviceName, health);
      return health;
    }
  }

  async checkAllServices(): Promise<SystemHealth> {
    const serviceChecks = Object.entries(healthCheckEndpoints).map(
      ([serviceName, url]) => this.checkServiceHealth(serviceName, url)
    );

    const services = await Promise.all(serviceChecks);
    
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const totalServices = services.length;
    
    let overall: SystemHealth['overall'];
    if (healthyServices === totalServices) {
      overall = 'healthy';
    } else if (healthyServices > 0) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      services,
      timestamp: new Date(),
    };
  }

  getCachedHealth(serviceName: string): ServiceHealth | null {
    const cached = this.healthCache.get(serviceName);
    if (!cached) return null;

    const isExpired = Date.now() - cached.lastChecked.getTime() > this.cacheTimeout;
    return isExpired ? null : cached;
  }

  async getServiceHealth(serviceName: string): Promise<ServiceHealth> {
    const cached = this.getCachedHealth(serviceName);
    if (cached) return cached;

    const url = healthCheckEndpoints[serviceName as keyof typeof healthCheckEndpoints];
    if (!url) {
      return {
        service: serviceName,
        status: 'unknown',
        error: 'Service not configured',
        lastChecked: new Date(),
      };
    }

    return this.checkServiceHealth(serviceName, url);
  }

  // Circuit breaker pattern implementation
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  getCircuitBreaker(serviceName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker(serviceName));
    }
    return this.circuitBreakers.get(serviceName)!;
  }
}

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(private serviceName: string) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > serviceMeshConfig.circuitBreakerTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error(`Circuit breaker is open for ${this.serviceName}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= serviceMeshConfig.circuitBreakerThreshold) {
      this.state = 'open';
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Retry mechanism with exponential backoff
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = serviceMeshConfig.retryAttempts,
  baseDelay: number = serviceMeshConfig.retryDelay
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxAttempts) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Singleton health monitor instance
export const healthMonitor = new HealthMonitor();

// Utility functions for components
export async function getSystemStatus(): Promise<SystemHealth> {
  return healthMonitor.checkAllServices();
}

export async function getServiceStatus(serviceName: string): Promise<ServiceHealth> {
  return healthMonitor.getServiceHealth(serviceName);
}

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  recordResponseTime(endpoint: string, responseTime: number) {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, []);
    }
    
    const times = this.metrics.get(endpoint)!;
    times.push(responseTime);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
  }

  getAverageResponseTime(endpoint: string): number {
    const times = this.metrics.get(endpoint) || [];
    if (times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getMetrics() {
    const result: Record<string, { average: number; count: number }> = {};
    
    for (const [endpoint, times] of this.metrics.entries()) {
      result[endpoint] = {
        average: this.getAverageResponseTime(endpoint),
        count: times.length,
      };
    }
    
    return result;
  }
}

export const performanceMonitor = new PerformanceMonitor();
