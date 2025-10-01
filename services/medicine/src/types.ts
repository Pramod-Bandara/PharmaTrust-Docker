import { ObjectId } from 'mongodb';

// Supply chain stages
export type SupplyChainStage = 'manufacturer' | 'supplier' | 'pharmacist' | 'customer';

// Quality status
export type QualityStatus = 'good' | 'compromised' | 'unknown';

// Anomaly severity levels
export type AnomalySeverity = 'low' | 'medium' | 'high';

// User roles
export type UserRole = 'manufacturer' | 'supplier' | 'pharmacist' | 'admin';

// Supply chain entry for tracking batch movement
export interface SupplyChainEntry {
  stage: SupplyChainStage;
  timestamp: Date;
  handledBy: string; // user ID or username
  location?: string;
  notes?: string;
  environmentalConditions?: {
    temperature?: number;
    humidity?: number;
  };
}

// Main medicine batch document
export interface MedicineBatch {
  _id?: ObjectId;
  batchId: string; // Format: BATCH_timestamp
  name: string;
  description?: string;
  manufacturerId: string;
  manufacturerName: string;
  currentStage: SupplyChainStage;
  qualityStatus: QualityStatus;
  supplyChain: SupplyChainEntry[];
  
  // Medicine details
  medicineType: string;
  dosage?: string;
  expiryDate: Date;
  quantity: number;
  unit: string; // e.g., "tablets", "ml", "mg"
  
  // Blockchain integration
  blockchainHash?: string;
  nftTokenId?: string;
  
  // Quality monitoring
  qualityAlerts: QualityAlert[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Quality alert for anomaly tracking
export interface QualityAlert {
  id: string;
  type: 'temperature' | 'humidity' | 'manual';
  severity: AnomalySeverity;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// Environmental data from IoT sensors
export interface EnvironmentalData {
  _id?: ObjectId;
  batchId: string;
  deviceId: string;
  temperature: number;
  humidity: number;
  timestamp: Date;
  isAnomaly: boolean;
  severity?: AnomalySeverity;
  anomalyReason?: string;
}

// User document
export interface User {
  _id?: ObjectId;
  username: string;
  password: string; // hashed
  role: UserRole;
  name: string;
  email?: string;
  organization?: string;
  createdAt: Date;
  lastLogin?: Date;
}

// API Request/Response types
export interface CreateBatchRequest {
  name: string;
  description?: string;
  medicineType: string;
  dosage?: string;
  expiryDate: string; // ISO date string
  quantity: number;
  unit: string;
}

export interface UpdateBatchRequest {
  name?: string;
  description?: string;
  qualityStatus?: QualityStatus;
  notes?: string;
}

export interface TransferBatchRequest {
  toStage: SupplyChainStage;
  handledBy: string;
  location?: string;
  notes?: string;
}

export interface BatchTrackingResponse {
  batchId: string;
  name: string;
  currentStage: SupplyChainStage;
  qualityStatus: QualityStatus;
  supplyChain: SupplyChainEntry[];
  qualityAlerts: QualityAlert[];
  environmentalData?: EnvironmentalData[];
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
