import mqtt from 'mqtt';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const HIVEMQ_HOST = process.env.HIVEMQ_HOST || 'e3dd87fcf2f74b1681d41863183a91d7.s1.eu.hivemq.cloud';
const HIVEMQ_PORT = parseInt(process.env.HIVEMQ_PORT || '8883');
const HIVEMQ_USERNAME = process.env.HIVEMQ_USERNAME || 'YOUR_HIVEMQ_USERNAME';
const HIVEMQ_PASSWORD = process.env.HIVEMQ_PASSWORD || 'YOUR_HIVEMQ_PASSWORD';

const IOT_SERVICE_URL = process.env.IOT_SERVICE_URL || 'http://localhost:4003/readings';

// MQTT Topics to subscribe to
const TOPICS = [
  'pharmatrust/sensors/temperature',
  'pharmatrust/sensors/humidity',
  'pharmatrust/sensors/status',
  'pharmatrust/alerts/environmental'
];

// Connect to HiveMQ Cloud with enhanced options
const client = mqtt.connect(`mqtts://${HIVEMQ_HOST}:${HIVEMQ_PORT}`, {
  username: HIVEMQ_USERNAME,
  password: HIVEMQ_PASSWORD,
  protocol: 'mqtts',
  rejectUnauthorized: false, // For simplicity, disable cert verification
  clientId: 'pharmatrust_bridge_' + Math.random().toString(16).substr(2, 8),
  clean: true,
  reconnectPeriod: parseInt(process.env.HIVEMQ_RECONNECT_INTERVAL || '5000'),
  connectTimeout: parseInt(process.env.HIVEMQ_CONNECT_TIMEOUT || '30000'),
  keepalive: parseInt(process.env.HIVEMQ_KEEP_ALIVE || '60'),
  will: {
    topic: 'pharmatrust/bridge/status',
    payload: Buffer.from('offline'),
    qos: 1,
    retain: true
  }
});

// Enhanced statistics with error tracking
let stats = {
  messagesReceived: 0,
  messagesForwarded: 0,
  errors: 0,
  lastMessage: null as Date | null,
  connectedAt: null as Date | null,
  lastError: null as { timestamp: Date; error: string; context: string } | null,
  connectionAttempts: 0,
  mqttStatus: 'disconnected' as 'connected' | 'connecting' | 'disconnected' | 'error'
};

// Enhanced logging utility
function logWithContext(level: 'info' | 'warn' | 'error', message: string, context?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    service: 'mqtt-bridge',
    message,
    context
  };
  
  const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
  console.log(`${emoji} [${timestamp}] ${message}`, context ? JSON.stringify(context, null, 2) : '');
  
  // Store last error for health checks
  if (level === 'error') {
    stats.lastError = {
      timestamp: new Date(),
      error: message,
      context: context ? JSON.stringify(context) : ''
    };
  }
}

// Connection event handlers with enhanced logging
client.on('connect', () => {
  stats.connectedAt = new Date();
  stats.mqttStatus = 'connected';
  stats.connectionAttempts++;
  
  logWithContext('info', 'Connected to HiveMQ Cloud', {
    host: HIVEMQ_HOST,
    port: HIVEMQ_PORT,
    clientId: client.options.clientId,
    attempt: stats.connectionAttempts
  });
  
  // Subscribe to all PharmaTrust topics
  TOPICS.forEach(topic => {
    client.subscribe(topic, (err) => {
      if (err) {
        logWithContext('error', `Failed to subscribe to topic`, {
          topic,
          error: err.message,
          code: (err as any).code || 'UNKNOWN'
        });
        stats.errors++;
      } else {
        logWithContext('info', `Subscribed to topic`, { topic });
      }
    });
  });
});

client.on('error', (error) => {
  stats.errors++;
  stats.mqttStatus = 'error';
  
  logWithContext('error', 'MQTT Connection error', {
    error: error.message,
    code: (error as any).code || 'UNKNOWN',
    host: HIVEMQ_HOST,
    port: HIVEMQ_PORT,
    totalErrors: stats.errors
  });
});

client.on('close', () => {
  stats.mqttStatus = 'disconnected';
  logWithContext('warn', 'MQTT Connection closed', {
    uptime: stats.connectedAt ? Date.now() - stats.connectedAt.getTime() : 0,
    messagesReceived: stats.messagesReceived,
    messagesForwarded: stats.messagesForwarded
  });
});

client.on('reconnect', () => {
  stats.mqttStatus = 'connecting';
  stats.connectionAttempts++;
  logWithContext('info', 'Reconnecting to HiveMQ Cloud', {
    attempt: stats.connectionAttempts,
    lastConnected: stats.connectedAt?.toISOString()
  });
});

// Message handler with enhanced logging
client.on('message', async (topic, message) => {
  const messageStartTime = Date.now();
  
  try {
    stats.messagesReceived++;
    stats.lastMessage = new Date();
    
    const messageStr = message.toString();
    
    logWithContext('info', 'Received MQTT message', {
      topic,
      messageLength: messageStr.length,
      totalReceived: stats.messagesReceived
    });
    
    // Parse the message
    let data;
    
    try {
      data = JSON.parse(messageStr);
    } catch (parseError) {
      stats.errors++;
      logWithContext('error', 'Failed to parse JSON message', {
        topic,
        messageStr: messageStr.substring(0, 200),
        parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      });
      return;
    }
    
    // Process based on topic
    if (topic.includes('/temperature') || topic.includes('/humidity')) {
      // Forward sensor readings to IoT service
      await forwardSensorReading(data, topic);
    } else if (topic.includes('/status')) {
      logWithContext('info', 'Status update received', { topic, data });
      // Status messages can be logged or processed differently
    } else if (topic.includes('/alerts')) {
      logWithContext('warn', 'Alert received', { topic, data });
      // Could forward alerts to a different endpoint
    } else {
      logWithContext('info', 'Unknown topic message', { topic, data });
    }
    
    const processingTime = Date.now() - messageStartTime;
    logWithContext('info', 'Message processing completed', {
      topic,
      processingTime,
      dataPreview: JSON.stringify(data).substring(0, 100)
    });
    
  } catch (error) {
    stats.errors++;
    const processingTime = Date.now() - messageStartTime;
    
    logWithContext('error', 'Error processing MQTT message', {
      topic,
      processingTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      totalErrors: stats.errors
    });
  }
});

// Forward sensor readings to IoT service with enhanced error handling
async function forwardSensorReading(data: any, topic: string) {
  const startTime = Date.now();
  
  try {
    // Transform MQTT data to IoT service format with proper validation
    const iotPayload: any = {
      batchId: data.batchId || 'MQTT_BRIDGE_BATCH',
      deviceId: data.deviceId || 'MQTT_BRIDGE_DEVICE',
      timestamp: new Date().toISOString()
    };
    
    // Add temperature or humidity based on topic
    if (topic.includes('/temperature') && data.temperature !== undefined) {
      iotPayload.temperature = parseFloat(data.temperature);
      iotPayload.humidity = 50.0; // Default humidity for temperature-only messages
    } else if (topic.includes('/humidity') && data.humidity !== undefined) {
      iotPayload.humidity = parseFloat(data.humidity);
      iotPayload.temperature = 22.0; // Default temperature for humidity-only messages
    }
    
    // If message contains both values, use them
    if (data.temperature !== undefined && data.humidity !== undefined) {
      iotPayload.temperature = parseFloat(data.temperature);
      iotPayload.humidity = parseFloat(data.humidity);
    }
    
    // Only forward if we have valid temperature and humidity
    if (iotPayload.temperature !== undefined && iotPayload.humidity !== undefined) {
      logWithContext('info', 'Forwarding sensor data to IoT service', {
        topic,
        payload: iotPayload,
        url: IOT_SERVICE_URL
      });
      
      const response = await axios.post(IOT_SERVICE_URL, iotPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.status >= 200 && response.status < 300) {
        stats.messagesForwarded++;
        logWithContext('info', 'Successfully forwarded to IoT service', {
          responseTime,
          status: response.status,
          totalForwarded: stats.messagesForwarded
        });
      } else {
        stats.errors++;
        logWithContext('error', 'IoT service returned error status', {
          status: response.status,
          statusText: response.statusText,
          responseData: response.data,
          responseTime,
          url: IOT_SERVICE_URL
        });
      }
    } else {
      logWithContext('warn', 'Skipping message - missing required sensor data', {
        topic,
        receivedData: data,
        reason: 'Missing temperature or humidity values'
      });
    }
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    stats.errors++;
    
    let errorContext = {
      topic,
      url: IOT_SERVICE_URL,
      responseTime,
      totalErrors: stats.errors
    };
    
    if (error.response) {
      // HTTP error response
      logWithContext('error', 'IoT service HTTP error', {
        ...errorContext,
        status: error.response.status,
        statusText: error.response.statusText,
        responseData: error.response.data
      });
    } else if (error.request) {
      // Network error
      logWithContext('error', 'Network error forwarding to IoT service', {
        ...errorContext,
        error: error.message,
        code: (error as any).code || 'UNKNOWN'
      });
    } else {
      // Other error
      logWithContext('error', 'Unexpected error forwarding to IoT service', {
        ...errorContext,
        error: error.message,
        stack: error.stack
      });
    }
  }
}

// Enhanced health check endpoint with detailed diagnostics
import { createServer } from 'http';

const server = createServer((req, res) => {
  if (req.url === '/health') {
    const uptime = stats.connectedAt ? Date.now() - stats.connectedAt.getTime() : 0;
    const isHealthy = client.connected && stats.mqttStatus === 'connected';
    
    const healthResponse = {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'mqtt-bridge',
      timestamp: new Date().toISOString(),
      mqtt: {
        connected: client.connected,
        status: stats.mqttStatus,
        connectionAttempts: stats.connectionAttempts,
        host: HIVEMQ_HOST,
        port: HIVEMQ_PORT
      },
      stats: {
        ...stats,
        uptime,
        errorRate: stats.messagesReceived > 0 ? (stats.errors / stats.messagesReceived * 100).toFixed(2) + '%' : '0%'
      },
      lastError: stats.lastError,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        iotServiceUrl: IOT_SERVICE_URL
      }
    };
    
    res.writeHead(isHealthy ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthResponse, null, 2));
    
  } else if (req.url === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ...stats,
      uptime: stats.connectedAt ? Date.now() - stats.connectedAt.getTime() : 0,
      errorRate: stats.messagesReceived > 0 ? (stats.errors / stats.messagesReceived * 100).toFixed(2) + '%' : '0%',
      mqttStatus: stats.mqttStatus
    }, null, 2));
    
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found', availableEndpoints: ['/health', '/stats'] }));
  }
});

const PORT = parseInt(process.env.PORT || '4004');
server.listen(PORT, () => {
  console.log(`🚀 MQTT Bridge Service listening on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Statistics: http://localhost:${PORT}/stats`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down MQTT Bridge...');
  client.end();
  server.close();
  process.exit(0);
});

console.log('🌉 PharmaTrust MQTT Bridge Service Starting...');
console.log(`🔗 Connecting to HiveMQ Cloud: ${HIVEMQ_HOST}:${HIVEMQ_PORT}`);
console.log(`📡 Will forward to IoT Service: ${IOT_SERVICE_URL}`);
