import { MongoClient } from 'mongodb';
class Database {
    client = null;
    db = null;
    async connect() {
        try {
            const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/pharmatrust';
            this.client = new MongoClient(mongoUrl);
            await this.client.connect();
            this.db = this.client.db('pharmatrust');
            console.log('Connected to MongoDB');
        }
        catch (error) {
            console.error('Failed to connect to MongoDB:', error);
            throw error;
        }
    }
    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            console.log('Disconnected from MongoDB');
        }
    }
    getDb() {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        return this.db;
    }
    // Collection getters
    get medicineBatches() {
        return this.getDb().collection('medicine_batches');
    }
    get environmentalData() {
        return this.getDb().collection('environmental_data');
    }
    get users() {
        return this.getDb().collection('users');
    }
    // Health check
    async ping() {
        try {
            await this.getDb().admin().ping();
            return true;
        }
        catch (error) {
            console.error('Database ping failed:', error);
            return false;
        }
    }
    // Initialize indexes for performance
    async createIndexes() {
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
        }
        catch (error) {
            console.error('Failed to create indexes:', error);
        }
    }
}
// Singleton instance
export const database = new Database();
