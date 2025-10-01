import { MongoClient, Db, Collection } from 'mongodb';
import { MedicineBatch, EnvironmentalData, User } from './types.js';

class Database {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(): Promise<void> {
    try {
      const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/pharmatrust';
      this.client = new MongoClient(mongoUrl);
      await this.client.connect();
      this.db = this.client.db('pharmatrust');
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('Disconnected from MongoDB');
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  // Collection getters
  get medicineBatches(): Collection<MedicineBatch> {
    return this.getDb().collection<MedicineBatch>('medicine_batches');
  }

  get environmentalData(): Collection<EnvironmentalData> {
    return this.getDb().collection<EnvironmentalData>('environmental_data');
  }

  get users(): Collection<User> {
    return this.getDb().collection<User>('users');
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      await this.getDb().admin().ping();
      return true;
    } catch (error) {
      console.error('Database ping failed:', error);
      return false;
    }
  }

  // Initialize indexes for performance
  async createIndexes(): Promise<void> {
    try {
      // Medicine batches indexes
      await this.medicineBatches.createIndex({ batchId: 1 }, { unique: true });
      await this.medicineBatches.createIndex({ manufacturerId: 1 });
      await this.medicineBatches.createIndex({ currentStage: 1 });
      await this.medicineBatches.createIndex({ qualityStatus: 1 });
      await this.medicineBatches.createIndex({ createdAt: -1 });

      // Environmental data indexes
      await this.environmentalData.createIndex({ batchId: 1, timestamp: -1 });
      await this.environmentalData.createIndex({ isAnomaly: 1 });
      await this.environmentalData.createIndex({ timestamp: -1 });

      // Users indexes
      await this.users.createIndex({ username: 1 }, { unique: true });
      await this.users.createIndex({ role: 1 });

      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Failed to create indexes:', error);
    }
  }
}

// Singleton instance
export const database = new Database();
