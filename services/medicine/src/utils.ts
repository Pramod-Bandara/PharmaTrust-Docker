import { SupplyChainStage, QualityStatus, AnomalySeverity, EnvironmentalData, QualityAlert } from './types.js';
import type { Sort } from 'mongodb';

// Generate unique batch ID
export function generateBatchId(): string {
  return `BATCH_${Date.now()}`;
}

// Generate unique alert ID
export function generateAlertId(): string {
  return `ALERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Validate supply chain stage progression
export function isValidStageTransition(currentStage: SupplyChainStage, newStage: SupplyChainStage): boolean {
  const stageOrder: SupplyChainStage[] = ['manufacturer', 'supplier', 'pharmacist', 'customer'];
  const currentIndex = stageOrder.indexOf(currentStage);
  const newIndex = stageOrder.indexOf(newStage);
  
  // Allow moving forward or staying in the same stage
  return newIndex >= currentIndex;
}

// Anomaly detection for environmental data
export function detectAnomaly(temperature: number, humidity: number, batchId: string): {
  isAnomaly: boolean;
  severity?: AnomalySeverity;
  reason?: string;
} {
  const anomalies: string[] = [];
  let maxSeverity: AnomalySeverity = 'low';

  // Temperature thresholds (2-25°C safe range)
  if (temperature < 2 || temperature > 25) {
    anomalies.push(`Temperature ${temperature}°C out of safe range (2-25°C)`);
    maxSeverity = 'high';
  } else if (temperature < 5 || temperature > 22) {
    anomalies.push(`Temperature ${temperature}°C approaching unsafe levels`);
    if (maxSeverity === 'low') maxSeverity = 'medium';
  }

  // Humidity thresholds (30-70% safe range)
  if (humidity < 30 || humidity > 70) {
    anomalies.push(`Humidity ${humidity}% out of safe range (30-70%)`);
    if (maxSeverity !== 'high') maxSeverity = 'medium';
  } else if (humidity < 35 || humidity > 65) {
    anomalies.push(`Humidity ${humidity}% approaching unsafe levels`);
    if (maxSeverity === 'low') maxSeverity = 'low';
  }

  return {
    isAnomaly: anomalies.length > 0,
    severity: anomalies.length > 0 ? maxSeverity : undefined,
    reason: anomalies.join('; ')
  };
}

// Create quality alert from environmental anomaly
export function createQualityAlert(
  environmentalData: EnvironmentalData,
  anomalyResult: { isAnomaly: boolean; severity?: AnomalySeverity; reason?: string }
): QualityAlert | null {
  if (!anomalyResult.isAnomaly || !anomalyResult.severity || !anomalyResult.reason) {
    return null;
  }

  return {
    id: generateAlertId(),
    type: environmentalData.temperature < 2 || environmentalData.temperature > 25 ? 'temperature' : 'humidity',
    severity: anomalyResult.severity,
    message: `Environmental anomaly detected: ${anomalyResult.reason}`,
    timestamp: environmentalData.timestamp,
    resolved: false
  };
}

// Determine quality status based on alerts
export function calculateQualityStatus(alerts: QualityAlert[]): QualityStatus {
  const unresolvedAlerts = alerts.filter(alert => !alert.resolved);
  
  if (unresolvedAlerts.length === 0) {
    return 'good';
  }

  const hasHighSeverity = unresolvedAlerts.some(alert => alert.severity === 'high');
  const hasMediumSeverity = unresolvedAlerts.some(alert => alert.severity === 'medium');

  if (hasHighSeverity) {
    return 'compromised';
  } else if (hasMediumSeverity) {
    return 'compromised';
  } else {
    return 'good'; // Only low severity alerts
  }
}

// Validate batch data
export function validateBatchData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }

  if (!data.medicineType || typeof data.medicineType !== 'string' || data.medicineType.trim().length === 0) {
    errors.push('Medicine type is required and must be a non-empty string');
  }

  if (!data.quantity || typeof data.quantity !== 'number' || data.quantity <= 0) {
    errors.push('Quantity is required and must be a positive number');
  }

  if (!data.unit || typeof data.unit !== 'string' || data.unit.trim().length === 0) {
    errors.push('Unit is required and must be a non-empty string');
  }

  if (data.expiryDate) {
    const expiryDate = new Date(data.expiryDate);
    if (isNaN(expiryDate.getTime())) {
      errors.push('Expiry date must be a valid date');
    } else if (expiryDate <= new Date()) {
      errors.push('Expiry date must be in the future');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Format batch for API response
export function formatBatchResponse(batch: any) {
  return {
    batchId: batch.batchId,
    name: batch.name,
    description: batch.description,
    medicineType: batch.medicineType,
    dosage: batch.dosage,
    quantity: batch.quantity,
    unit: batch.unit,
    expiryDate: batch.expiryDate,
    currentStage: batch.currentStage,
    qualityStatus: batch.qualityStatus,
    manufacturerId: batch.manufacturerId,
    manufacturerName: batch.manufacturerName,
    supplyChain: batch.supplyChain,
    qualityAlerts: batch.qualityAlerts,
    blockchainHash: batch.blockchainHash,
    nftTokenId: batch.nftTokenId,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt
  };
}

// Pagination helper
export function getPaginationParams(query: any) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

// Sort helper
export function getSortParams(query: any): Sort {
  const sortBy: string = typeof query.sortBy === 'string' && query.sortBy.trim().length > 0
    ? query.sortBy
    : 'createdAt';
  const sortOrder: 1 | -1 = query.sortOrder === 'asc' ? 1 : -1;

  return { [sortBy]: sortOrder } as Sort;
}
