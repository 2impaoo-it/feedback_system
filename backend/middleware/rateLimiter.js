const rateLimit = require('express-rate-limit');
const dbConfig = require('../config/db');

/**
 * Redis Store for Rate Limiting
 * Uses Redis to store rate limit data across multiple servers
 */
class RedisStore {
    constructor() {
        this.client = null;
        this.prefix = 'rl:';
    }

    async init() {
        try {
            this.client = dbConfig.getRedisClient();
        } catch (error) {
            console.warn('Redis not available for rate limiting, falling back to memory store');
            this.client = null;
        }
    }

    async increment(key, windowMs) {
        if (!this.client) {
            await this.init();
            if (!this.client) {
                // Fallback to memory-based counting
                return { totalHits: 1, timeToExpire: windowMs };
            }
        }
        
        const redisKey = this.prefix + key;
        
        try {
            // Use separate commands instead of multi
            const count = await this.client.incr(redisKey);
            const expirySeconds = Math.ceil(windowMs / 1000);
            
            // Set expiry only on first increment
            if (count === 1) {
                await this.client.expire(redisKey, expirySeconds);
            }
            
            return {
                totalHits: count,
                resetTime: new Date(Date.now() + windowMs)
            };
        } catch (error) {
            console.error('Redis increment error:', error);
            // Return default values on error
            return {
                totalHits: 1,
                resetTime: new Date(Date.now() + windowMs)
            };
        }
    }

    async decrement(key) {
        if (!this.client) await this.init();
        
        const redisKey = this.prefix + key;
        return await this.client.decr(redisKey);
    }

    async resetKey(key) {
        if (!this.client) await this.init();
        
        const redisKey = this.prefix + key;
        return await this.client.del(redisKey);
    }
}

/**
 * General API Rate Limiter
 * 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore(),
    keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise use IP
        return req.user ? `user:${req.user._id}` : `ip:${req.ip}`;
    },
    skip: (req) => {
        // Skip rate limiting for admin users
        return req.user && req.user.role === 'admin';
    }
});

/**
 * Authentication Rate Limiter
 * 20 login attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
        retryAfter: 900 // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore(),
    keyGenerator: (req) => `auth:${req.ip}`,
    skipSuccessfulRequests: true
});

/**
 * Feedback Submission Rate Limiter
 * 10 feedback submissions per hour per user
 */
const feedbackLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
        success: false,
        message: 'Too many feedback submissions, please try again later.',
        retryAfter: 3600 // 1 hour in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore(),
    keyGenerator: (req) => {
        return req.user ? `feedback:${req.user._id}` : `feedback:${req.ip}`;
    },
    skip: (req) => {
        // Skip rate limiting for admin and moderator users
        return req.user && ['admin', 'moderator'].includes(req.user.role);
    }
});

/**
 * Password Reset Rate Limiter
 * 3 password reset attempts per hour per IP
 */
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
        success: false,
        message: 'Too many password reset attempts, please try again later.',
        retryAfter: 3600
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore(),
    keyGenerator: (req) => `reset:${req.ip}`
});

/**
 * Registration Rate Limiter  
 * 20 registration attempts per hour per IP
 */
const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: {
        success: false,
        message: 'Too many registration attempts, please try again later.',
        retryAfter: 3600
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore(),
    keyGenerator: (req) => `register:${req.ip}`
});

/**
 * WebSocket Rate Limiter
 * Custom implementation for Socket.IO
 */
class WebSocketRateLimiter {
    constructor() {
        this.clients = new Map();
        this.windowMs = 60 * 1000; // 1 minute
        this.maxRequests = 30; // 30 messages per minute
    }

    isAllowed(socketId, userId = null) {
        const key = userId || socketId;
        const now = Date.now();
        
        if (!this.clients.has(key)) {
            this.clients.set(key, {
                requests: 1,
                resetTime: now + this.windowMs
            });
            return true;
        }

        const clientData = this.clients.get(key);
        
        if (now > clientData.resetTime) {
            // Reset window
            clientData.requests = 1;
            clientData.resetTime = now + this.windowMs;
            return true;
        }

        if (clientData.requests >= this.maxRequests) {
            return false;
        }

        clientData.requests++;
        return true;
    }

    cleanup() {
        const now = Date.now();
        for (const [key, data] of this.clients.entries()) {
            if (now > data.resetTime) {
                this.clients.delete(key);
            }
        }
    }

    // Clean up expired entries every 5 minutes
    startCleanup() {
        setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }
}

module.exports = {
    generalLimiter,
    authLimiter,
    feedbackLimiter,
    passwordResetLimiter,
    registrationLimiter,
    WebSocketRateLimiter
};
