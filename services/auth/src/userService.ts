import { MongoClient, Db, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';

export type UserRole = 'manufacturer' | 'supplier' | 'pharmacist' | 'admin';

export interface User {
  _id?: ObjectId;
  username: string;
  passwordHash: string;
  role: UserRole;
  entityName: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export interface CreateUserInput {
  username: string;
  password: string;
  role: UserRole;
  entityName: string;
}

export interface UpdateUserInput {
  password?: string;
  role?: UserRole;
  entityName?: string;
  isActive?: boolean;
}

export interface SanitizedUser {
  _id: string;
  username: string;
  role: UserRole;
  entityName: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export class UserService {
  private db: Db | null = null;
  private mongoClient: MongoClient | null = null;

  constructor(private mongoUri: string = 'mongodb://localhost:27017/pharmatrust') {}

  async init(): Promise<void> {
    try {
      this.mongoClient = new MongoClient(this.mongoUri);
      await this.mongoClient.connect();
      this.db = this.mongoClient.db('pharmatrust');
      console.log('Auth service connected to MongoDB');
      
      // Ensure indexes
      await this.createIndexes();
      
      // Migrate demo users if users collection is empty
      await this.migrateDemoUsers();
    } catch (error) {
      console.error('Failed to connect auth service to MongoDB:', error);
      throw error;
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) return;
    
    try {
      await this.db.collection('users').createIndex({ username: 1 }, { unique: true });
      await this.db.collection('users').createIndex({ role: 1 });
      await this.db.collection('users').createIndex({ lastLogin: -1 });
      console.log('Created user collection indexes');
    } catch (error) {
      console.error('Failed to create user indexes:', error);
    }
  }

  private async migrateDemoUsers(): Promise<void> {
    if (!this.db) return;
    
    try {
      const userCount = await this.db.collection('users').countDocuments();
      if (userCount > 0) {
        console.log(`Users collection already has ${userCount} users, skipping migration`);
        return;
      }

      // Demo users to migrate
      const demoUsers = [
        { username: 'mfg1', password: 'demo123', role: 'manufacturer', entityName: 'PharmaCorp Manufacturing' },
        { username: 'sup1', password: 'demo123', role: 'supplier', entityName: 'LogiSupply Ltd' },
        { username: 'phm1', password: 'demo123', role: 'pharmacist', entityName: 'City Pharmacy' },
        { username: 'admin', password: 'admin123', role: 'admin', entityName: 'PharmaTrust Admin' }
      ];

      for (const demoUser of demoUsers) {
        await this.createUser({
          username: demoUser.username,
          password: demoUser.password,
          role: demoUser.role as UserRole,
          entityName: demoUser.entityName
        });
      }

      console.log(`Migrated ${demoUsers.length} demo users to MongoDB`);
    } catch (error) {
      console.error('Failed to migrate demo users:', error);
    }
  }

  async findUserByUsername(username: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const user = await this.db.collection('users').findOne({ username });
    return user as User | null;
  }

  async findUserById(id: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const user = await this.db.collection('users').findOne({ _id: new ObjectId(id) });
    return user as User | null;
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    const user = await this.findUserByUsername(username);
    if (!user || !user.isActive) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    // Update last login
    await this.updateLastLogin(user._id!.toString());
    
    return user;
  }

  async createUser(input: CreateUserInput): Promise<User> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if user already exists
    const existingUser = await this.findUserByUsername(input.username);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 12);

    const user: Omit<User, '_id'> = {
      username: input.username,
      passwordHash,
      role: input.role,
      entityName: input.entityName,
      createdAt: new Date(),
      isActive: true
    };

    const result = await this.db.collection('users').insertOne(user);
    return { ...user, _id: result.insertedId };
  }

  async updateUser(username: string, updates: UpdateUserInput): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');

    const updateDoc: any = {};
    
    if (updates.password) {
      updateDoc.passwordHash = await bcrypt.hash(updates.password, 12);
    }
    if (updates.role !== undefined) {
      updateDoc.role = updates.role;
    }
    if (updates.entityName !== undefined) {
      updateDoc.entityName = updates.entityName;
    }
    if (updates.isActive !== undefined) {
      updateDoc.isActive = updates.isActive;
    }

    const result = await this.db.collection('users').findOneAndUpdate(
      { username },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    return result as User | null;
  }

  async updateLastLogin(userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { lastLogin: new Date() } }
    );
  }

  async deleteUser(username: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    
    if (username === 'admin') {
      throw new Error('Cannot delete primary admin user');
    }

    const result = await this.db.collection('users').deleteOne({ username });
    return result.deletedCount > 0;
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.db) throw new Error('Database not initialized');

    const users = await this.db.collection('users').find({}).toArray();
    return users as User[];
  }

  sanitizeUser(user: User): SanitizedUser {
    return {
      _id: user._id!.toString(),
      username: user.username,
      role: user.role,
      entityName: user.entityName,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive
    };
  }

  async close(): Promise<void> {
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
  }
}

// Singleton instance
let userServiceInstance: UserService | null = null;

export async function getUserService(): Promise<UserService> {
  if (!userServiceInstance) {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/pharmatrust';
    userServiceInstance = new UserService(mongoUri);
    await userServiceInstance.init();
  }
  return userServiceInstance;
}
