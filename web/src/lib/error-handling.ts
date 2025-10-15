// Comprehensive error handling and validation for PharmaTrust

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: any;
}

export class PharmaTrustError extends Error {
  public code: string;
  public status: number;
  public details?: any;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', status: number = 500, details?: any) {
    super(message);
    this.name = 'PharmaTrustError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Input validation functions
export const validators = {
  batchId: (value: string): ValidationError | null => {
    if (!value || value.trim().length === 0) {
      return { field: 'batchId', message: 'Batch ID is required' };
    }
    if (!/^BATCH_\d+$/.test(value.trim())) {
      return { field: 'batchId', message: 'Batch ID must be in format BATCH_xxxxxxxx' };
    }
    return null;
  },

  medicineName: (value: string): ValidationError | null => {
    if (!value || value.trim().length === 0) {
      return { field: 'medicineName', message: 'Medicine name is required' };
    }
    if (value.trim().length < 2) {
      return { field: 'medicineName', message: 'Medicine name must be at least 2 characters' };
    }
    if (value.trim().length > 100) {
      return { field: 'medicineName', message: 'Medicine name must be less than 100 characters' };
    }
    return null;
  },

  temperature: (value: number): ValidationError | null => {
    if (typeof value !== 'number' || isNaN(value)) {
      return { field: 'temperature', message: 'Temperature must be a valid number' };
    }
    if (value < -50 || value > 100) {
      return { field: 'temperature', message: 'Temperature must be between -50°C and 100°C' };
    }
    return null;
  },

  humidity: (value: number): ValidationError | null => {
    if (typeof value !== 'number' || isNaN(value)) {
      return { field: 'humidity', message: 'Humidity must be a valid number' };
    }
    if (value < 0 || value > 100) {
      return { field: 'humidity', message: 'Humidity must be between 0% and 100%' };
    }
    return null;
  },

  deviceId: (value: string): ValidationError | null => {
    if (!value || value.trim().length === 0) {
      return { field: 'deviceId', message: 'Device ID is required' };
    }
    if (!/^[A-Z0-9_]+$/.test(value.trim())) {
      return { field: 'deviceId', message: 'Device ID must contain only uppercase letters, numbers, and underscores' };
    }
    return null;
  },

  username: (value: string): ValidationError | null => {
    if (!value || value.trim().length === 0) {
      return { field: 'username', message: 'Username is required' };
    }
    if (value.trim().length < 3) {
      return { field: 'username', message: 'Username must be at least 3 characters' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value.trim())) {
      return { field: 'username', message: 'Username can only contain letters, numbers, and underscores' };
    }
    return null;
  },

  password: (value: string): ValidationError | null => {
    if (!value || value.length === 0) {
      return { field: 'password', message: 'Password is required' };
    }
    if (value.length < 6) {
      return { field: 'password', message: 'Password must be at least 6 characters' };
    }
    return null;
  }
};

// Validation helper function
export function validateFields(data: Record<string, any>, rules: Record<string, (value: any) => ValidationError | null>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  for (const [field, validator] of Object.entries(rules)) {
    const error = validator(data[field]);
    if (error) {
      errors.push(error);
    }
  }
  
  return errors;
}

// Error message mapping
export const errorMessages = {
  // Network errors
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  
  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid username or password.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  
  // Batch errors
  BATCH_NOT_FOUND: 'Medicine batch not found.',
  BATCH_ALREADY_EXISTS: 'A batch with this ID already exists.',
  INVALID_BATCH_STAGE: 'Invalid batch stage transition.',
  
  // IoT errors
  INVALID_SENSOR_DATA: 'Invalid sensor data received.',
  DEVICE_NOT_FOUND: 'IoT device not found.',
  ANOMALY_DETECTION_FAILED: 'Anomaly detection service unavailable.',
  
  // Blockchain errors
  BLOCKCHAIN_UNAVAILABLE: 'Blockchain service is currently unavailable.',
  VERIFICATION_FAILED: 'Blockchain verification failed.',
  TRANSACTION_FAILED: 'Blockchain transaction failed.',
  
  // System errors
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable.',
  DATABASE_ERROR: 'Database connection error.',
  INTERNAL_ERROR: 'An internal error occurred. Please try again.',
};

// Error handler function
export function handleError(error: any): PharmaTrustError {
  // If it's already a PharmaTrustError, return as is
  if (error instanceof PharmaTrustError) {
    return error;
  }

  // Handle fetch/network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new PharmaTrustError(
      errorMessages.NETWORK_ERROR,
      'NETWORK_ERROR',
      0
    );
  }

  // Handle timeout errors
  if (error.name === 'AbortError') {
    return new PharmaTrustError(
      errorMessages.TIMEOUT_ERROR,
      'TIMEOUT_ERROR',
      408
    );
  }

  // Handle API response errors
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    switch (status) {
      case 401:
        return new PharmaTrustError(
          errorMessages.UNAUTHORIZED,
          'UNAUTHORIZED',
          401
        );
      case 404:
        return new PharmaTrustError(
          data?.message || 'Resource not found',
          'NOT_FOUND',
          404
        );
      case 409:
        return new PharmaTrustError(
          data?.message || 'Conflict occurred',
          'CONFLICT',
          409
        );
      case 422:
        return new PharmaTrustError(
          'Validation failed',
          'VALIDATION_ERROR',
          422,
          data?.errors
        );
      case 500:
        return new PharmaTrustError(
          errorMessages.INTERNAL_ERROR,
          'INTERNAL_ERROR',
          500
        );
      default:
        return new PharmaTrustError(
          data?.message || 'An error occurred',
          'API_ERROR',
          status
        );
    }
  }

  // Handle generic errors
  return new PharmaTrustError(
    error.message || errorMessages.INTERNAL_ERROR,
    'UNKNOWN_ERROR',
    500
  );
}

// Sanitization functions
export const sanitizers = {
  string: (value: any): string => {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/[<>\"']/g, '');
  },

  number: (value: any): number => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  },

  batchId: (value: any): string => {
    if (typeof value !== 'string') return '';
    return value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
  },

  deviceId: (value: any): string => {
    if (typeof value !== 'string') return '';
    return value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
  }
};

// Logging functions
export const logger = {
  error: (message: string, error?: any, context?: any) => {
    console.error(`[PharmaTrust Error] ${message}`, {
      error: error?.message || error,
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString()
    });
  },

  warn: (message: string, context?: any) => {
    console.warn(`[PharmaTrust Warning] ${message}`, {
      context,
      timestamp: new Date().toISOString()
    });
  },

  info: (message: string, context?: any) => {
    console.info(`[PharmaTrust Info] ${message}`, {
      context,
      timestamp: new Date().toISOString()
    });
  }
};

// React error boundary helper
export function getErrorBoundaryFallback(error: Error, errorInfo: any) {
  return {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please refresh the page and try again.',
    details: process.env.NODE_ENV === 'development' ? {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    } : undefined
  };
}
