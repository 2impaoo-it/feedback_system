const jwt = require('jsonwebtoken');
const { User } = require('../models');
const sessionManager = require('./sessionManager');

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and adds user info to request
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            console.log(`🔍 Auth - No token provided`);
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        console.log(`🔍 Auth - Token received: ${token.substring(0, 20)}...`);

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log(`🔍 Auth - Token decoded successfully, userId: ${decoded.userId}`);
        
        // Get user from database (ensure user still exists and is active)
        const user = await User.findById(decoded.userId).select('-password');
        console.log(`🔍 Auth - User found: ${!!user}, active: ${user?.isActive}`);
        
        if (!user || !user.isActive) {
            console.log(`🔍 Auth - User invalid or inactive`);
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Check session validity
        console.log(`🔍 Validating session for user ${user._id.toString()}`);
        const isValidSession = sessionManager.validateSession(user._id.toString(), token);
        console.log(`🔍 Session validation result: ${isValidSession}`);
        if (!isValidSession) {
            return res.status(401).json({
                success: false,
                message: 'Session expired or invalid'
            });
        }

        // Add user info to request
        req.user = user;
        next();
    } catch (error) {
        console.log(`🔍 Auth - Error occurred: ${error.name} - ${error.message}`);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        console.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

/**
 * Role-based Authorization Middleware
 * Checks if user has required role(s)
 */
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Flatten the roles array in case it's nested
        const flatRoles = roles.flat();
        console.log(`🔐 Role check - Required roles: ${JSON.stringify(flatRoles)}, User role: ${req.user.role}`);

        if (!flatRoles.includes(req.user.role)) {
            console.log(`❌ Role check failed - User ${req.user.email} has role ${req.user.role}, but needs one of: ${JSON.stringify(flatRoles)}`);
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        console.log(`✅ Role check passed for user ${req.user.email}`);
        next();
    };
};

/**
 * Optional Authentication Middleware
 * Adds user info if token is provided, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');
            
            if (user && user.isActive) {
                req.user = user;
            }
        }

        next();
    } catch (error) {
        // Continue without authentication for optional auth
        next();
    }
};

/**
 * Generate JWT Token
 */
const generateToken = (user) => {
    return jwt.sign(
        { 
            userId: user._id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        { 
            expiresIn: process.env.JWT_EXPIRE || '7d'
        }
    );
};

/**
 * Refresh Token Validation
 */
const validateRefreshToken = (refreshToken) => {
    try {
        return jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

module.exports = {
    authenticateToken,
    authorizeRoles,
    optionalAuth,
    generateToken,
    validateRefreshToken
};
