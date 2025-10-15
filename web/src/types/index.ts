// Shared TypeScript interfaces for PharmaTrust

export interface User {
  _id: string;
  username: string;
  role: "manufacturer" | "supplier" | "pharmacist" | "admin";
  entityName: string;
}

export interface SupplyChainEntry {
  stage: string;
  entityId: string;
  timestamp: string; // ISO string for portability across client/server
  location: string;
  handledBy?: string;
  notes?: string;
}

export interface QualityAlert {
  id: string;
  type: "temperature" | "humidity" | "manual";
  severity: "low" | "medium" | "high";
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface MedicineBatch {
  _id: string;
  batchId: string;
  name: string;
  description?: string;
  manufacturerId: string;
  manufacturerName: string;
  currentStage: "manufacturer" | "supplier" | "pharmacist" | "customer";
  qualityStatus: "good" | "compromised" | "unknown";
  supplyChain: SupplyChainEntry[];

  // Medicine details
  medicineType: string;
  dosage?: string;
  expiryDate: string;
  quantity: number;
  unit: string;

  // Blockchain integration
  blockchainHash?: string;
  nftTokenId?: string;

  // Quality monitoring
  qualityAlerts: QualityAlert[];

  // Timestamps
  createdAt: string; // ISO string
  updatedAt: string;
}

export interface EnvironmentalData {
  _id: string;
  batchId: string;
  deviceId: string;
  temperature: number;
  humidity: number;
  timestamp: string; // ISO string
  isAnomaly: boolean;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "low" | "medium" | "high" | null;
  confidence?: number;
  mlReasons?: {
    temperature?: boolean;
    humidity?: boolean;
    suddenChange?: boolean;
    gradualDrift?: boolean;
    pattern?: string;
  };
  prediction?: {
    nextTemperature?: number;
    nextHumidity?: number;
    riskLevel?: number;
  };
}
