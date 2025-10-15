// System-wide health check endpoint that checks all microservices

import { NextRequest, NextResponse } from 'next/server';

interface ServiceHealth {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
  lastChecked: string;
  url?: string; // For debugging purposes
  details?: any; // Additional health information from service
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  timestamp: string;
}

// Service URLs for server-side health checks
const serviceEndpoints = {
  auth: process.env.NODE_ENV === 'production' ? 'http://auth:4001/health' : 'http://localhost:4001/health',
  medicine: process.env.NODE_ENV === 'production' ? 'http://medicine:4002/health' : 'http://localhost:4002/health',
  iot: process.env.NODE_ENV === 'production' ? 'http://iot:4003/health' : 'http://localhost:4003/health',
  blockchain: process.env.NODE_ENV === 'production' ? 'http://blockchain:4004/health' : 'http://localhost:4004/health',
  'mqtt-bridge': process.env.NODE_ENV === 'production' ? 'http://mqtt-bridge:4004/health' : 'http://localhost:4006/health',
};

async function checkServiceHealth(serviceName: string, url: string): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (response.ok) {
      // Try to parse response for additional health details
      let healthData = null;
      try {
        healthData = await response.json();
      } catch {
        // If response isn't JSON, that's okay for basic health checks
      }

      return {
        service: serviceName,
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        details: healthData,
      };
    } else {
      // Get response text for better error context
      let errorDetails = `HTTP ${response.status} ${response.statusText}`;
      try {
        const responseText = await response.text();
        if (responseText) {
          errorDetails += ` - ${responseText.substring(0, 200)}`;
        }
      } catch {
        // If we can't read response text, use basic error
      }

      return {
        service: serviceName,
        status: 'unhealthy',
        responseTime,
        error: errorDetails,
        lastChecked: new Date().toISOString(),
        url: url, // Include URL for debugging
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    let errorMessage = 'Connection failed';
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = `Request timeout (${responseTime}ms) - Service may be down or overloaded`;
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = `Connection refused - Service is not running on ${url}`;
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = `DNS resolution failed - Cannot resolve hostname in ${url}`;
      } else if (error.message.includes('ETIMEDOUT')) {
        errorMessage = `Connection timeout - Service at ${url} is not responding`;
      } else if (error.message === 'fetch failed') {
        errorMessage = `Connection failed - Service at ${url} is not accessible (likely not running)`;
      } else {
        errorMessage = `${error.message} (${error.name})`;
      }
    }
    
    return {
      service: serviceName,
      status: 'unhealthy',
      responseTime,
      error: errorMessage,
      lastChecked: new Date().toISOString(),
      url: url, // Include URL for debugging
    };
  }
}

export async function GET(_request: NextRequest) {
  try {
    // Check all services in parallel
    const serviceChecks = Object.entries(serviceEndpoints).map(
      ([serviceName, url]) => checkServiceHealth(serviceName, url)
    );

    const services = await Promise.all(serviceChecks);
    
    // Determine overall system health
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

    const systemHealth: SystemHealth = {
      overall,
      services,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(systemHealth, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        overall: 'unhealthy',
        services: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function POST() {
  return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
}
