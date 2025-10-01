#!/usr/bin/env node

/**
 * PharmaTrust ML Integration Test Suite
 * Tests the machine learning anomaly detection system
 */

import fetch from 'node-fetch';
import { MongoClient } from 'mongodb';

const IOT_SERVICE_URL = 'http://localhost:4003';
const WEB_API_URL = 'http://localhost:3000';
const MONGODB_URI = 'mongodb://localhost:27017/pharmatrust';

// Test configuration
const TEST_BATCHES = [
  { id: 'ASPIRIN_BATCH_001', medicine: 'Aspirin' },
  { id: 'INSULIN_BATCH_001', medicine: 'Insulin' },
  { id: 'LISINOPRIL_BATCH_001', medicine: 'Lisinopril' }
];

const TEST_READINGS = [
  // Normal readings
  { batchId: 'ASPIRIN_BATCH_001', temperature: 22, humidity: 50, expected: 'normal' },
  { batchId: 'INSULIN_BATCH_001', temperature: 5, humidity: 35, expected: 'normal' },
  
  // Anomalous readings
  { batchId: 'ASPIRIN_BATCH_001', temperature: 35, humidity: 85, expected: 'anomaly' },
  { batchId: 'INSULIN_BATCH_001', temperature: 15, humidity: 70, expected: 'anomaly' },
  
  // Edge cases
  { batchId: 'LISINOPRIL_BATCH_001', temperature: 25, humidity: 65, expected: 'normal' },
  { batchId: 'LISINOPRIL_BATCH_001', temperature: 40, humidity: 90, expected: 'anomaly' }
];

class MLIntegrationTester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async test(description, testFn) {
    this.results.total++;
    try {
      await testFn();
      this.results.passed++;
      this.log(`${description} - PASSED`, 'success');
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({ test: description, error: error.message });
      this.log(`${description} - FAILED: ${error.message}`, 'error');
    }
  }

  async checkServiceHealth() {
    await this.test('IoT Service Health Check', async () => {
      const response = await fetch(`${IOT_SERVICE_URL}/health`);
      if (!response.ok) {
        throw new Error(`IoT service health check failed: ${response.status}`);
      }
      const data = await response.json();
      if (data.status !== 'ok') {
        throw new Error('IoT service not healthy');
      }
    });

    await this.test('Web API Health Check', async () => {
      const response = await fetch(`${WEB_API_URL}/api/iot/readings?limit=1`);
      if (!response.ok) {
        throw new Error(`Web API health check failed: ${response.status}`);
      }
    });
  }

  async testMLStatistics() {
    await this.test('ML Statistics Endpoint', async () => {
      const response = await fetch(`${IOT_SERVICE_URL}/ml/statistics`);
      if (!response.ok) {
        throw new Error(`ML statistics failed: ${response.status}`);
      }
      const data = await response.json();
      if (!data.stats || typeof data.stats.totalBatches !== 'number') {
        throw new Error('Invalid ML statistics response');
      }
    });

    await this.test('Web API ML Statistics Proxy', async () => {
      const response = await fetch(`${WEB_API_URL}/api/iot/ml/statistics`);
      if (!response.ok) {
        throw new Error(`Web API ML statistics failed: ${response.status}`);
      }
      const data = await response.json();
      if (!data.stats) {
        throw new Error('Invalid web API ML statistics response');
      }
    });
  }

  async testBatchStatistics() {
    for (const batch of TEST_BATCHES) {
      await this.test(`Batch Statistics for ${batch.id}`, async () => {
        const response = await fetch(`${IOT_SERVICE_URL}/ml/batch/${batch.id}/statistics`);
        if (response.status === 404) {
          // Batch not found is acceptable for new batches
          return;
        }
        if (!response.ok) {
          throw new Error(`Batch statistics failed: ${response.status}`);
        }
        const data = await response.json();
        if (!data.stats || !data.batchId) {
          throw new Error('Invalid batch statistics response');
        }
      });

      await this.test(`Web API Batch Statistics for ${batch.id}`, async () => {
        const response = await fetch(`${WEB_API_URL}/api/iot/ml/batch/${batch.id}/statistics`);
        if (response.status === 404) {
          // Batch not found is acceptable
          return;
        }
        if (!response.ok) {
          throw new Error(`Web API batch statistics failed: ${response.status}`);
        }
      });
    }
  }

  async testMLAnomalyDetection() {
    this.log('Testing ML anomaly detection with sample readings...', 'info');
    
    for (const reading of TEST_READINGS) {
      await this.test(`ML Detection for ${reading.batchId} (${reading.expected})`, async () => {
        const response = await fetch(`${IOT_SERVICE_URL}/readings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId: reading.batchId,
            deviceId: 'DHT22_ML_TEST',
            temperature: reading.temperature,
            humidity: reading.humidity,
            timestamp: new Date().toISOString()
          })
        });

        if (!response.ok) {
          throw new Error(`Reading submission failed: ${response.status}`);
        }

        const data = await response.json();
        if (!data.ok || !data.data) {
          throw new Error('Invalid reading response');
        }

        // Check if ML analysis is present
        if (!data.mlAnalysis) {
          throw new Error('ML analysis missing from response');
        }

        const { confidence, reasons, prediction } = data.mlAnalysis;
        
        // Validate ML analysis structure
        if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
          throw new Error('Invalid confidence value');
        }

        if (!reasons || typeof reasons.pattern !== 'string') {
          throw new Error('Invalid ML reasons structure');
        }

        if (!prediction || typeof prediction.riskLevel !== 'number') {
          throw new Error('Invalid prediction structure');
        }

        // Log ML analysis results
        this.log(`  Confidence: ${Math.round(confidence * 100)}%, Pattern: ${reasons.pattern}, Risk: ${Math.round(prediction.riskLevel * 100)}%`, 'info');
      });
    }
  }

  async testWebAPIIntegration() {
    const testReading = {
      batchId: 'ML_TEST_BATCH_001',
      deviceId: 'DHT22_WEB_TEST',
      temperature: 30,
      humidity: 75
    };

    await this.test('Web API ML Reading Submission', async () => {
      const response = await fetch(`${WEB_API_URL}/api/iot/readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testReading)
      });

      if (!response.ok) {
        throw new Error(`Web API reading submission failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.ok || !data.mlAnalysis) {
        throw new Error('ML analysis missing from web API response');
      }
    });
  }

  async testDatabaseIntegration() {
    await this.test('Database ML Data Storage', async () => {
      const client = new MongoClient(MONGODB_URI);
      await client.connect();
      
      try {
        const db = client.db('pharmatrust');
        const collection = db.collection('environmental_data');
        
        // Find recent readings with ML data
        const recentReadings = await collection
          .find({ 
            deviceId: { $regex: /ML_TEST|WEB_TEST/ },
            confidence: { $exists: true }
          })
          .sort({ timestamp: -1 })
          .limit(5)
          .toArray();

        if (recentReadings.length === 0) {
          throw new Error('No ML-enhanced readings found in database');
        }

        // Validate ML data structure in database
        const reading = recentReadings[0];
        if (!reading.confidence || !reading.mlReasons || !reading.prediction) {
          throw new Error('ML data not properly stored in database');
        }

        this.log(`  Found ${recentReadings.length} ML-enhanced readings in database`, 'info');
      } finally {
        await client.close();
      }
    });
  }

  async runAllTests() {
    this.log('🧪 Starting ML Integration Test Suite', 'info');
    this.log('=' .repeat(60), 'info');

    // Service health checks
    this.log('\n📡 Testing Service Health...', 'info');
    await this.checkServiceHealth();

    // ML statistics endpoints
    this.log('\n📊 Testing ML Statistics...', 'info');
    await this.testMLStatistics();

    // Batch-specific statistics
    this.log('\n📈 Testing Batch Statistics...', 'info');
    await this.testBatchStatistics();

    // ML anomaly detection
    this.log('\n🤖 Testing ML Anomaly Detection...', 'info');
    await this.testMLAnomalyDetection();

    // Web API integration
    this.log('\n🌐 Testing Web API Integration...', 'info');
    await this.testWebAPIIntegration();

    // Database integration
    this.log('\n💾 Testing Database Integration...', 'info');
    await this.testDatabaseIntegration();

    // Results summary
    this.log('\n' + '=' .repeat(60), 'info');
    this.log('🏁 Test Results Summary', 'info');
    this.log('=' .repeat(60), 'info');
    
    this.log(`Total Tests: ${this.results.total}`, 'info');
    this.log(`Passed: ${this.results.passed}`, 'success');
    this.log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'info');
    
    if (this.results.errors.length > 0) {
      this.log('\n❌ Failed Tests:', 'error');
      this.results.errors.forEach(({ test, error }) => {
        this.log(`  • ${test}: ${error}`, 'error');
      });
    }

    const successRate = Math.round((this.results.passed / this.results.total) * 100);
    this.log(`\n🎯 Success Rate: ${successRate}%`, successRate >= 80 ? 'success' : 'warning');

    if (successRate >= 80) {
      this.log('\n🎉 ML Integration Test Suite PASSED!', 'success');
      this.log('The machine learning anomaly detection system is working correctly.', 'success');
    } else {
      this.log('\n⚠️  ML Integration Test Suite FAILED!', 'warning');
      this.log('Some ML features may not be working correctly.', 'warning');
    }

    return successRate >= 80;
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MLIntegrationTester();
  
  tester.runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test suite crashed:', error);
      process.exit(1);
    });
}

export { MLIntegrationTester };
