import * as tf from '@tensorflow/tfjs-node';
import { MongoClient, Db } from 'mongodb';

export interface EnvironmentalReading {
  batchId: string;
  deviceId: string;
  temperature: number;
  humidity: number;
  timestamp: Date;
  isAnomaly?: boolean;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  reasons: {
    temperature: boolean;
    humidity: boolean;
    suddenChange: boolean;
    gradualDrift: boolean;
    pattern: string;
  };
  prediction?: {
    nextTemperature: number;
    nextHumidity: number;
    riskLevel: number;
  };
}

export interface MedicineToleranceModel {
  name: string;
  temperatureRange: { min: number; max: number; optimal: number };
  humidityRange: { min: number; max: number; optimal: number };
  criticalThresholds: {
    temperature: { danger: number; critical: number };
    humidity: { danger: number; critical: number };
  };
}

// Medicine-specific tolerance models
const MEDICINE_MODELS: Record<string, MedicineToleranceModel> = {
  'Aspirin': {
    name: 'Aspirin',
    temperatureRange: { min: 15, max: 25, optimal: 20 },
    humidityRange: { min: 40, max: 60, optimal: 50 },
    criticalThresholds: {
      temperature: { danger: 30, critical: 35 },
      humidity: { danger: 70, critical: 80 }
    }
  },
  'Amoxicillin': {
    name: 'Amoxicillin',
    temperatureRange: { min: 2, max: 8, optimal: 5 },
    humidityRange: { min: 30, max: 50, optimal: 40 },
    criticalThresholds: {
      temperature: { danger: 12, critical: 15 },
      humidity: { danger: 60, critical: 70 }
    }
  },
  'Insulin': {
    name: 'Insulin',
    temperatureRange: { min: 2, max: 8, optimal: 4 },
    humidityRange: { min: 20, max: 40, optimal: 30 },
    criticalThresholds: {
      temperature: { danger: 10, critical: 12 },
      humidity: { danger: 50, critical: 60 }
    }
  },
  'Lisinopril': {
    name: 'Lisinopril',
    temperatureRange: { min: 20, max: 25, optimal: 22 },
    humidityRange: { min: 45, max: 65, optimal: 55 },
    criticalThresholds: {
      temperature: { danger: 30, critical: 35 },
      humidity: { danger: 75, critical: 85 }
    }
  },
  'default': {
    name: 'Generic Medicine',
    temperatureRange: { min: 15, max: 25, optimal: 20 },
    humidityRange: { min: 40, max: 60, optimal: 50 },
    criticalThresholds: {
      temperature: { danger: 30, critical: 35 },
      humidity: { danger: 70, critical: 80 }
    }
  }
};

export class MLAnomalyDetector {
  private db: Db;
  private historicalData: Map<string, EnvironmentalReading[]> = new Map();
  private adaptiveThresholds: Map<string, { temp: { mean: number; std: number }; hum: { mean: number; std: number } }> = new Map();
  private isInitialized = false;

  constructor(db: Db) {
    this.db = db;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('Initializing ML Anomaly Detector...');
    await this.loadHistoricalData();
    await this.calculateAdaptiveThresholds();
    this.isInitialized = true;
    console.log('ML Anomaly Detector initialized successfully');
  }

  private async loadHistoricalData(): Promise<void> {
    try {
      const readings = await this.db
        .collection('environmental_data')
        .find({})
        .sort({ timestamp: -1 })
        .limit(10000)
        .toArray();

      // Group by batchId
      for (const reading of readings) {
        const batchId = reading.batchId;
        if (!this.historicalData.has(batchId)) {
          this.historicalData.set(batchId, []);
        }
        this.historicalData.get(batchId)!.push({
          batchId: reading.batchId,
          deviceId: reading.deviceId,
          temperature: reading.temperature,
          humidity: reading.humidity,
          timestamp: new Date(reading.timestamp),
          isAnomaly: reading.isAnomaly,
          severity: reading.severity
        });
      }

      console.log(`Loaded historical data for ${this.historicalData.size} batches`);
    } catch (error) {
      console.error('Error loading historical data:', error);
    }
  }

  private async calculateAdaptiveThresholds(): Promise<void> {
    for (const [batchId, readings] of this.historicalData) {
      if (readings.length < 10) continue; // Need minimum data points

      const temperatures = readings.map(r => r.temperature);
      const humidities = readings.map(r => r.humidity);

      const tempMean = this.calculateMean(temperatures);
      const tempStd = this.calculateStandardDeviation(temperatures, tempMean);
      const humMean = this.calculateMean(humidities);
      const humStd = this.calculateStandardDeviation(humidities, humMean);

      this.adaptiveThresholds.set(batchId, {
        temp: { mean: tempMean, std: tempStd },
        hum: { mean: humMean, std: humStd }
      });
    }

    console.log(`Calculated adaptive thresholds for ${this.adaptiveThresholds.size} batches`);
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStandardDeviation(values: number[], mean: number): number {
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateZScore(value: number, mean: number, std: number): number {
    return std === 0 ? 0 : (value - mean) / std;
  }

  private calculateMovingAverage(values: number[], window: number = 5): number[] {
    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - window + 1);
      const end = i + 1;
      const windowValues = values.slice(start, end);
      result.push(this.calculateMean(windowValues));
    }
    return result;
  }

  private getMedicineModel(batchId: string): MedicineToleranceModel {
    // Try to extract medicine name from batchId or use default
    const medicineNames = Object.keys(MEDICINE_MODELS);
    for (const name of medicineNames) {
      if (batchId.toLowerCase().includes(name.toLowerCase())) {
        return MEDICINE_MODELS[name];
      }
    }
    return MEDICINE_MODELS['default'];
  }

  private detectSuddenChange(readings: EnvironmentalReading[], currentReading: EnvironmentalReading): boolean {
    if (readings.length < 3) return false;

    const recentReadings = readings.slice(-3);
    const avgTemp = this.calculateMean(recentReadings.map(r => r.temperature));
    const avgHum = this.calculateMean(recentReadings.map(r => r.humidity));

    const tempChange = Math.abs(currentReading.temperature - avgTemp);
    const humChange = Math.abs(currentReading.humidity - avgHum);

    // Sudden change thresholds
    return tempChange > 5 || humChange > 15;
  }

  private detectGradualDrift(readings: EnvironmentalReading[]): boolean {
    if (readings.length < 10) return false;

    const recentTemps = readings.slice(-10).map(r => r.temperature);
    const recentHums = readings.slice(-10).map(r => r.humidity);

    // Calculate trend using simple linear regression
    const tempTrend = this.calculateTrend(recentTemps);
    const humTrend = this.calculateTrend(recentHums);

    // Significant drift thresholds
    return Math.abs(tempTrend) > 0.5 || Math.abs(humTrend) > 2;
  }

  private calculateTrend(values: number[]): number {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const xMean = this.calculateMean(x);
    const yMean = this.calculateMean(values);

    const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (values[i] - yMean), 0);
    const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private classifySeverity(
    tempAnomaly: boolean,
    humAnomaly: boolean,
    tempZScore: number,
    humZScore: number,
    medicineModel: MedicineToleranceModel,
    currentReading: EnvironmentalReading
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    const { temperature, humidity } = currentReading;
    const { criticalThresholds } = medicineModel;

    // Critical level - immediate danger
    if (
      temperature > criticalThresholds.temperature.critical ||
      temperature < (medicineModel.temperatureRange.min - 5) ||
      humidity > criticalThresholds.humidity.critical ||
      humidity < (medicineModel.humidityRange.min - 10)
    ) {
      return 'HIGH';
    }

    // Danger level - significant risk
    if (
      temperature > criticalThresholds.temperature.danger ||
      temperature < (medicineModel.temperatureRange.min - 2) ||
      humidity > criticalThresholds.humidity.danger ||
      humidity < (medicineModel.humidityRange.min - 5) ||
      Math.abs(tempZScore) > 3 ||
      Math.abs(humZScore) > 3
    ) {
      return 'MEDIUM';
    }

    // Low level - minor deviation
    return 'LOW';
  }

  private async predictFutureValues(batchId: string, readings: EnvironmentalReading[]): Promise<{
    nextTemperature: number;
    nextHumidity: number;
    riskLevel: number;
  }> {
    if (readings.length < 5) {
      const lastReading = readings[readings.length - 1];
      return {
        nextTemperature: lastReading.temperature,
        nextHumidity: lastReading.humidity,
        riskLevel: 0.1
      };
    }

    const recentReadings = readings.slice(-10);
    const temperatures = recentReadings.map(r => r.temperature);
    const humidities = recentReadings.map(r => r.humidity);

    // Simple time series prediction using moving average and trend
    const tempMA = this.calculateMovingAverage(temperatures, 3);
    const humMA = this.calculateMovingAverage(humidities, 3);

    const tempTrend = this.calculateTrend(temperatures);
    const humTrend = this.calculateTrend(humidities);

    const nextTemp = tempMA[tempMA.length - 1] + tempTrend;
    const nextHum = humMA[humMA.length - 1] + humTrend;

    // Calculate risk level based on predicted values and medicine model
    const medicineModel = this.getMedicineModel(batchId);
    const tempRisk = Math.max(0, Math.min(1, 
      Math.abs(nextTemp - medicineModel.temperatureRange.optimal) / 
      (medicineModel.temperatureRange.max - medicineModel.temperatureRange.min)
    ));
    const humRisk = Math.max(0, Math.min(1,
      Math.abs(nextHum - medicineModel.humidityRange.optimal) /
      (medicineModel.humidityRange.max - medicineModel.humidityRange.min)
    ));

    const riskLevel = Math.max(tempRisk, humRisk);

    return {
      nextTemperature: Math.round(nextTemp * 100) / 100,
      nextHumidity: Math.round(nextHum * 100) / 100,
      riskLevel: Math.round(riskLevel * 100) / 100
    };
  }

  async detectAnomaly(reading: EnvironmentalReading): Promise<AnomalyResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const { batchId, temperature, humidity } = reading;
    const medicineModel = this.getMedicineModel(batchId);
    
    // Get historical data for this batch
    const batchReadings = this.historicalData.get(batchId) || [];
    
    // Add current reading to historical data
    batchReadings.push(reading);
    this.historicalData.set(batchId, batchReadings);

    // Statistical anomaly detection using Z-score
    let tempZScore = 0;
    let humZScore = 0;
    let tempAnomaly = false;
    let humAnomaly = false;

    const thresholds = this.adaptiveThresholds.get(batchId);
    if (thresholds && batchReadings.length > 10) {
      // Use adaptive thresholds
      tempZScore = this.calculateZScore(temperature, thresholds.temp.mean, thresholds.temp.std);
      humZScore = this.calculateZScore(humidity, thresholds.hum.mean, thresholds.hum.std);
      
      // Update adaptive thresholds with new reading
      const temperatures = batchReadings.slice(-50).map(r => r.temperature);
      const humidities = batchReadings.slice(-50).map(r => r.humidity);
      const newTempMean = this.calculateMean(temperatures);
      const newTempStd = this.calculateStandardDeviation(temperatures, newTempMean);
      const newHumMean = this.calculateMean(humidities);
      const newHumStd = this.calculateStandardDeviation(humidities, newHumMean);
      
      this.adaptiveThresholds.set(batchId, {
        temp: { mean: newTempMean, std: newTempStd },
        hum: { mean: newHumMean, std: newHumStd }
      });

      tempAnomaly = Math.abs(tempZScore) > 2;
      humAnomaly = Math.abs(humZScore) > 2;
    } else {
      // Use medicine-specific thresholds
      tempAnomaly = temperature < medicineModel.temperatureRange.min || temperature > medicineModel.temperatureRange.max;
      humAnomaly = humidity < medicineModel.humidityRange.min || humidity > medicineModel.humidityRange.max;
    }

    // Pattern recognition
    const suddenChange = this.detectSuddenChange(batchReadings.slice(0, -1), reading);
    const gradualDrift = this.detectGradualDrift(batchReadings);

    // Determine pattern type
    let pattern = 'normal';
    if (suddenChange) pattern = 'sudden_spike';
    else if (gradualDrift) pattern = 'gradual_drift';
    else if (tempAnomaly || humAnomaly) pattern = 'threshold_violation';

    const isAnomaly = tempAnomaly || humAnomaly || suddenChange || gradualDrift;

    // ML-based severity classification
    const severity = isAnomaly 
      ? this.classifySeverity(tempAnomaly, humAnomaly, tempZScore, humZScore, medicineModel, reading)
      : 'LOW';

    // Calculate confidence based on multiple factors
    let confidence = 0.5;
    if (thresholds && batchReadings.length > 10) {
      confidence = Math.min(0.95, 0.5 + (Math.abs(tempZScore) + Math.abs(humZScore)) / 10);
    } else {
      const tempDeviation = Math.abs(temperature - medicineModel.temperatureRange.optimal) / 
                           (medicineModel.temperatureRange.max - medicineModel.temperatureRange.min);
      const humDeviation = Math.abs(humidity - medicineModel.humidityRange.optimal) /
                          (medicineModel.humidityRange.max - medicineModel.humidityRange.min);
      confidence = Math.min(0.95, 0.3 + Math.max(tempDeviation, humDeviation));
    }

    // Time-series forecasting
    const prediction = await this.predictFutureValues(batchId, batchReadings);

    return {
      isAnomaly,
      severity,
      confidence: Math.round(confidence * 100) / 100,
      reasons: {
        temperature: tempAnomaly,
        humidity: humAnomaly,
        suddenChange,
        gradualDrift,
        pattern
      },
      prediction
    };
  }

  // Get batch-specific statistics
  async getBatchStatistics(batchId: string): Promise<{
    totalReadings: number;
    anomalyRate: number;
    averageTemperature: number;
    averageHumidity: number;
    temperatureRange: { min: number; max: number };
    humidityRange: { min: number; max: number };
    medicineModel: MedicineToleranceModel;
  } | null> {
    const readings = this.historicalData.get(batchId);
    if (!readings || readings.length === 0) return null;

    const temperatures = readings.map(r => r.temperature);
    const humidities = readings.map(r => r.humidity);
    const anomalies = readings.filter(r => r.isAnomaly);

    return {
      totalReadings: readings.length,
      anomalyRate: Math.round((anomalies.length / readings.length) * 100) / 100,
      averageTemperature: Math.round(this.calculateMean(temperatures) * 100) / 100,
      averageHumidity: Math.round(this.calculateMean(humidities) * 100) / 100,
      temperatureRange: {
        min: Math.min(...temperatures),
        max: Math.max(...temperatures)
      },
      humidityRange: {
        min: Math.min(...humidities),
        max: Math.max(...humidities)
      },
      medicineModel: this.getMedicineModel(batchId)
    };
  }

  // Get system-wide ML statistics
  getMLStatistics(): {
    totalBatches: number;
    totalReadings: number;
    adaptiveThresholds: number;
    averageConfidence: number;
    medicineModels: string[];
  } {
    let totalReadings = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const readings of this.historicalData.values()) {
      totalReadings += readings.length;
    }

    return {
      totalBatches: this.historicalData.size,
      totalReadings,
      adaptiveThresholds: this.adaptiveThresholds.size,
      averageConfidence: confidenceCount > 0 ? Math.round((totalConfidence / confidenceCount) * 100) / 100 : 0,
      medicineModels: Object.keys(MEDICINE_MODELS)
    };
  }
}
