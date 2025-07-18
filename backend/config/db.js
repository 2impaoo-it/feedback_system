const mongoose = require('mongoose');
const redis = require('redis');
require('dotenv').config();

/**
 * MongoDB Connection Configuration
 * Implements connection pooling and error handling
 */
class DatabaseConfig {
    constructor() {
        this.mongoConnection = null;
        this.redisClient = null;
    }

    /**
     * Connect to MongoDB with optimized settings
     */
    async connectMongoDB() {
        try {
            const mongoURI = process.env.NODE_ENV === 'test' 
                ? process.env.MONGODB_TEST_URI 
                : process.env.MONGODB_URI;

            this.mongoConnection = await mongoose.connect(mongoURI, {
                maxPoolSize: 10, // Maintain up to 10 socket connections
                serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
                socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
                bufferCommands: false // Disable mongoose buffering
            });

            console.log('✅ MongoDB connected successfully');
            
            // Handle connection events
            mongoose.connection.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                console.log('⚠️ MongoDB disconnected');
            });

            return this.mongoConnection;
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error);
            process.exit(1);
        }
    }

    /**
     * Connect to Redis with retry logic
     */
    async connectRedis() {
        try {
            this.redisClient = redis.createClient({
                url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
                password: process.env.REDIS_PASSWORD || undefined
            });

            await this.redisClient.connect();
            console.log('✅ Redis connected successfully');

            // Handle Redis events
            this.redisClient.on('error', (err) => {
                console.error('❌ Redis error:', err);
            });

            this.redisClient.on('connect', () => {
                console.log('🔄 Redis reconnected');
            });

            return this.redisClient;
        } catch (error) {
            console.error('❌ Redis connection failed:', error);
            throw error;
        }
    }

    /**
     * Initialize all database connections
     */
    async initializeConnections() {
        await this.connectMongoDB();
        await this.connectRedis();
    }

    /**
     * Close all database connections gracefully
     */
    async closeConnections() {
        try {
            if (this.mongoConnection) {
                await mongoose.connection.close();
                console.log('✅ MongoDB connection closed');
            }
            
            if (this.redisClient) {
                await this.redisClient.quit();
                console.log('✅ Redis connection closed');
            }
        } catch (error) {
            console.error('❌ Error closing database connections:', error);
        }
    }

    /**
     * Get Redis client instance
     */
    getRedisClient() {
        if (!this.redisClient) {
            throw new Error('Redis client not initialized');
        }
        return this.redisClient;
    }

    /**
     * Get MongoDB connection instance
     */
    getMongoConnection() {
        if (!this.mongoConnection) {
            throw new Error('MongoDB connection not initialized');
        }
        return this.mongoConnection;
    }
}

// Export singleton instance
const dbConfig = new DatabaseConfig();

module.exports = dbConfig;
