import { MongoClient } from 'mongodb';
import { MLAnomalyDetector, EnvironmentalReading } from './ml/anomalyDetector.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmatrust';

async function testMLAnomalyDetector() {
  console.log('🧪 Testing ML Anomaly Detector...\n');

  const mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  const db = mongoClient.db('pharmatrust');

  const mlDetector = new MLAnomalyDetector(db);
  await mlDetector.initialize();

  // Test 1: Normal reading
  console.log('📊 Test 1: Normal reading for Aspirin');
  const normalReading: EnvironmentalReading = {
    batchId: 'ASPIRIN_BATCH_001',
    deviceId: 'DHT22_001',
    temperature: 22,
    humidity: 50,
    timestamp: new Date()
  };

  const normalResult = await mlDetector.detectAnomaly(normalReading);
  console.log('Result:', {
    isAnomaly: normalResult.isAnomaly,
    severity: normalResult.severity,
    confidence: normalResult.confidence,
    pattern: normalResult.reasons.pattern,
    prediction: normalResult.prediction
  });
  console.log();

  // Test 2: Temperature anomaly
  console.log('🌡️ Test 2: High temperature anomaly for Insulin');
  const tempAnomalyReading: EnvironmentalReading = {
    batchId: 'INSULIN_BATCH_001',
    deviceId: 'DHT22_001',
    temperature: 15, // Too high for insulin (should be 2-8°C)
    humidity: 35,
    timestamp: new Date()
  };

  const tempResult = await mlDetector.detectAnomaly(tempAnomalyReading);
  console.log('Result:', {
    isAnomaly: tempResult.isAnomaly,
    severity: tempResult.severity,
    confidence: tempResult.confidence,
    reasons: tempResult.reasons,
    prediction: tempResult.prediction
  });
  console.log();

  // Test 3: Humidity anomaly
  console.log('💧 Test 3: High humidity anomaly for Aspirin');
  const humAnomalyReading: EnvironmentalReading = {
    batchId: 'ASPIRIN_BATCH_002',
    deviceId: 'DHT22_001',
    temperature: 20,
    humidity: 85, // Too high for aspirin (should be 40-60%)
    timestamp: new Date()
  };

  const humResult = await mlDetector.detectAnomaly(humAnomalyReading);
  console.log('Result:', {
    isAnomaly: humResult.isAnomaly,
    severity: humResult.severity,
    confidence: humResult.confidence,
    reasons: humResult.reasons,
    prediction: humResult.prediction
  });
  console.log();

  // Test 4: Simulate sudden change
  console.log('⚡ Test 4: Sudden temperature change detection');
  const batchId = 'LISINOPRIL_BATCH_001';
  
  // Add some baseline readings
  for (let i = 0; i < 5; i++) {
    await mlDetector.detectAnomaly({
      batchId,
      deviceId: 'DHT22_001',
      temperature: 22 + Math.random() * 2, // 22-24°C
      humidity: 55 + Math.random() * 5,    // 55-60%
      timestamp: new Date(Date.now() - (5-i) * 60000) // 5 minutes ago to now
    });
  }

  // Sudden spike
  const suddenChangeReading: EnvironmentalReading = {
    batchId,
    deviceId: 'DHT22_001',
    temperature: 35, // Sudden jump to 35°C
    humidity: 58,
    timestamp: new Date()
  };

  const suddenResult = await mlDetector.detectAnomaly(suddenChangeReading);
  console.log('Result:', {
    isAnomaly: suddenResult.isAnomaly,
    severity: suddenResult.severity,
    confidence: suddenResult.confidence,
    reasons: suddenResult.reasons,
    prediction: suddenResult.prediction
  });
  console.log();

  // Test 5: Get batch statistics
  console.log('📈 Test 5: Batch statistics');
  const stats = await mlDetector.getBatchStatistics(batchId);
  console.log('Batch Statistics:', stats);
  console.log();

  // Test 6: System-wide ML statistics
  console.log('🔍 Test 6: System-wide ML statistics');
  const systemStats = mlDetector.getMLStatistics();
  console.log('System Statistics:', systemStats);
  console.log();

  console.log('✅ All ML tests completed successfully!');
  
  await mongoClient.close();
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMLAnomalyDetector().catch(console.error);
}

export { testMLAnomalyDetector };
