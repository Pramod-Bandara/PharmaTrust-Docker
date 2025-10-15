// API Client for PharmaTrust Microservices
// Handles communication with auth, medicine, iot, and blockchain services via NGINX gateway

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface FirebaseLoginRequest {
  idToken: string;
  provider?: "email" | "google";
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface CreateBatchRequest {
  name: string;
  description?: string;
  medicineType: string;
  dosage?: string;
  expiryDate: string;
  quantity: number;
  unit: string;
}

export interface TransferBatchRequest {
  toStage: "manufacturer" | "supplier" | "pharmacist" | "customer";
  handledBy?: string;
  location?: string;
  notes?: string;
}

export interface IoTReading {
  batchId: string;
  deviceId: string;
  temperature: number;
  humidity: number;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: User["role"];
  entityName: string;
}

export interface UpdateUserRequest {
  password?: string;
  role?: User["role"];
  entityName?: string;
}

// Imported domain types
import type { User, MedicineBatch, EnvironmentalData } from "@/types";

// Auth
export interface VerifyTokenResponse {
  user: User;
}

// Blockchain
export interface BlockchainVerifyResponse {
  isVerified: boolean;
  txHash?: string;
  source: "thirdweb" | "mock";
}
export interface BlockchainMintRequest {
  batchId: string;
  name: string;
  manufacturerId: string;
  metadata?: Record<string, unknown>;
}
export interface BlockchainMintResponse {
  txHash: string;
  source: "thirdweb" | "mock";
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    // Prefer explicit env, support both names
    const envBase =
      process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
    // Fallback to current origin in browser, else localhost:3000
    const originFallback =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    this.baseUrl = envBase || originFallback;

    // Try to get token from localStorage on client side
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("pharmatrust_token");
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const normalizeHeaders = (
      h: HeadersInit | undefined,
    ): Record<string, string> => {
      if (!h) return {};
      if (h instanceof Headers) {
        const out: Record<string, string> = {};
        h.forEach((value, key) => {
          out[key] = value;
        });
        return out;
      }
      if (Array.isArray(h)) {
        return h.reduce<Record<string, string>>((acc, [k, v]) => {
          acc[String(k)] = String(v);
          return acc;
        }, {});
      }
      return h as Record<string, string>;
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...normalizeHeaders(options.headers),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data: unknown = await response.json();

      const hasErrorString = (x: unknown): x is { error: string } => {
        return (
          typeof x === "object" &&
          x !== null &&
          "error" in (x as Record<string, unknown>) &&
          typeof (x as { error?: unknown }).error === "string"
        );
      };

      if (!response.ok) {
        const errMsg = hasErrorString(data)
          ? data.error
          : `HTTP ${response.status}`;
        return { success: false, error: errMsg };
      }

      return { success: true, data: data as T };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  // Authentication Service Methods
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data?.token) {
      this.token = response.data.token;
      if (typeof window !== "undefined") {
        localStorage.setItem("pharmatrust_token", response.data.token);
        if (response.data.refreshToken) {
          localStorage.setItem(
            "pharmatrust_refresh",
            response.data.refreshToken,
          );
        }
      }
    }

    return response;
  }

  async loginWithFirebaseIdToken(
    request: FirebaseLoginRequest,
  ): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        idToken: request.idToken,
        provider: request.provider,
      }),
    });

    if (response.success && response.data?.token) {
      this.token = response.data.token;
      if (typeof window !== "undefined") {
        localStorage.setItem("pharmatrust_token", response.data.token);
        if (response.data.refreshToken) {
          localStorage.setItem(
            "pharmatrust_refresh",
            response.data.refreshToken,
          );
        }
      }
    }

    return response;
  }

  async logout(): Promise<void> {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("pharmatrust_token");
      localStorage.removeItem("pharmatrust_refresh");
    }
  }

  async verifyToken(): Promise<ApiResponse<VerifyTokenResponse>> {
    return this.request<VerifyTokenResponse>("/api/auth/verify", {
      method: "POST",
    });
  }

  async getUsers(): Promise<ApiResponse<{ users: User[] }>> {
    return this.request<{ users: User[] }>("/api/auth/users");
  }

  async createUser(
    userData: CreateUserRequest,
  ): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>("/api/auth/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async updateUser(
    username: string,
    updates: UpdateUserRequest,
  ): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>(
      `/api/auth/users/${encodeURIComponent(username)}`,
      {
        method: "PUT",
        body: JSON.stringify(updates),
      },
    );
  }

  async resetUserPassword(
    username: string,
  ): Promise<ApiResponse<{ username: string; password: string }>> {
    return this.request<{ username: string; password: string }>(
      `/api/auth/users/${encodeURIComponent(username)}/reset-password`,
      {
        method: "POST",
      },
    );
  }

  async deleteUser(
    username: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(
      `/api/auth/users/${encodeURIComponent(username)}`,
      {
        method: "DELETE",
      },
    );
  }

  // Medicine Service Methods
  async createBatch(
    batchData: CreateBatchRequest,
  ): Promise<ApiResponse<{ batch: MedicineBatch; insertedId: any }>> {
    return this.request<{ batch: MedicineBatch; insertedId: any }>(
      "/api/medicine/batches",
      {
        method: "POST",
        body: JSON.stringify(batchData),
      },
    );
  }

  async getBatches(
    filters?: Record<string, string | undefined>,
  ): Promise<ApiResponse<MedicineBatch[]>> {
    const queryParams = filters
      ? `?${new URLSearchParams(
          Object.fromEntries(
            Object.entries(filters).filter(
              ([, v]) => typeof v === "string",
            ) as Array<[string, string]>,
          ),
        ).toString()}`
      : "";

    const response = await this.request<{
      batches: MedicineBatch[];
      pagination: any;
    }>(`/api/medicine/batches${queryParams}`);

    // Transform the response to extract the batches array
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.batches || [],
      };
    }

    return {
      success: false,
      error: response.error || "Failed to fetch batches",
    };
  }

  async getBatch(batchId: string): Promise<ApiResponse<MedicineBatch>> {
    return this.request<MedicineBatch>(`/api/medicine/batches/${batchId}`);
  }

  async updateBatchStage(
    batchId: string,
    stage: "manufacturer" | "supplier" | "pharmacist" | "customer",
  ): Promise<ApiResponse<MedicineBatch>> {
    return this.request<MedicineBatch>(
      `/api/medicine/batches/${batchId}/stage`,
      {
        method: "PUT",
        body: JSON.stringify({ stage }),
      },
    );
  }

  async transferBatch(
    batchId: string,
    transferData: TransferBatchRequest,
  ): Promise<ApiResponse<{ batch: MedicineBatch }>> {
    return this.request<{ batch: MedicineBatch }>(
      `/api/medicine/batches/${encodeURIComponent(batchId)}/transfer`,
      {
        method: "POST",
        body: JSON.stringify(transferData),
      },
    );
  }

  // IoT Service Methods
  async submitIoTReading(
    reading: IoTReading,
  ): Promise<ApiResponse<{ success: true }>> {
    return this.request<{ success: true }>("/api/iot/readings", {
      method: "POST",
      body: JSON.stringify(reading),
    });
  }

  async getIoTReadings(
    batchId?: string,
    limit?: number,
  ): Promise<ApiResponse<EnvironmentalData[]>> {
    const params = new URLSearchParams();
    if (batchId) params.append("batchId", batchId);
    if (limit) params.append("limit", limit.toString());

    const queryString = params.toString();
    return this.request<EnvironmentalData[]>(
      `/api/iot/readings${queryString ? `?${queryString}` : ""}`,
    );
  }

  async getRealtimeData(batchId: string): Promise<ApiResponse<unknown>> {
    return this.request<unknown>(`/api/iot/realtime/${batchId}`);
  }

  // Blockchain Service Methods
  async verifyBatch(
    batchId: string,
  ): Promise<ApiResponse<BlockchainVerifyResponse>> {
    const qs = `?batchId=${encodeURIComponent(batchId)}`;
    return this.request<BlockchainVerifyResponse>(
      `/api/blockchain/verify${qs}`,
    );
  }

  async recordBatch(
    batchData: BlockchainMintRequest,
  ): Promise<ApiResponse<BlockchainMintResponse>> {
    return this.request<BlockchainMintResponse>("/api/blockchain/mint", {
      method: "POST",
      body: JSON.stringify(batchData),
    });
  }

  // Health Check Methods
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.request<{ status: string }>("/api/health");
  }

  async serviceStatus(): Promise<ApiResponse<unknown>> {
    return this.request<unknown>("/api/status");
  }

  // Utility Methods
  setToken(token: string): void {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("pharmatrust_token", token);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for testing
export { ApiClient };
