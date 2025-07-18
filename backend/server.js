const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Import configurations and middleware
const dbConfig = require('./config/db');
const { generalLimiter, WebSocketRateLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const feedbackRoutes = require('./routes/feedback');
const categoryRoutes = require('./routes/categories');
const userRoutes = require('./routes/users');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS configuration
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Make io accessible to routes
app.set('io', io);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "ws:", "wss:"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token']
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Apply general rate limiting - DISABLED FOR TESTING
// app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);

// Socket.IO WebSocket handling
const wsRateLimiter = new WebSocketRateLimiter();
wsRateLimiter.startCleanup();

// Store connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log(`📡 New client connected: ${socket.id}`);

    // Handle user authentication for WebSocket
    socket.on('authenticate', async (data) => {
        try {
            const { token, userId } = data;
            
            if (!token || !userId) {
                socket.emit('auth_error', { message: 'Token and userId required' });
                return;
            }

            // Verify JWT token (you can reuse the auth middleware logic)
            const jwt = require('jsonwebtoken');
            const { User } = require('./models');
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');
            
            if (!user || !user.isActive) {
                socket.emit('auth_error', { message: 'Invalid token' });
                return;
            }

            // Store user info with socket
            socket.userId = user._id.toString();
            socket.userRole = user.role;
            socket.userEmail = user.email;

            // Add to connected users
            connectedUsers.set(socket.id, {
                userId: user._id.toString(),
                role: user.role,
                email: user.email,
                connectedAt: new Date()
            });

            // Join role-based rooms
            socket.join(`role:${user.role}`);
            socket.join(`user:${user._id}`);

            socket.emit('authenticated', { 
                message: 'Successfully authenticated',
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role
                }
            });

            console.log(`✅ User authenticated: ${user.email} (${user.role})`);

        } catch (error) {
            console.error('WebSocket authentication error:', error);
            socket.emit('auth_error', { message: 'Authentication failed' });
        }
    });

    // Handle real-time feedback submission
    socket.on('submit_feedback', async (data) => {
        try {
            // Rate limiting check
            if (!wsRateLimiter.isAllowed(socket.id, socket.userId)) {
                socket.emit('rate_limit_exceeded', { 
                    message: 'Too many requests, please slow down' 
                });
                return;
            }

            if (!socket.userId) {
                socket.emit('error', { message: 'Authentication required' });
                return;
            }

            // Emit to admins and moderators
            socket.to('role:admin').to('role:moderator').emit('new_feedback_notification', {
                title: data.title,
                submittedBy: socket.userEmail,
                timestamp: new Date(),
                priority: data.priority || 'medium'
            });

            socket.emit('feedback_submitted', { 
                message: 'Feedback submitted successfully',
                timestamp: new Date()
            });

        } catch (error) {
            console.error('WebSocket feedback submission error:', error);
            socket.emit('error', { message: 'Failed to submit feedback' });
        }
    });

    // Handle feedback status updates
    socket.on('update_feedback_status', async (data) => {
        try {
            if (!socket.userId || !['admin', 'moderator'].includes(socket.userRole)) {
                socket.emit('error', { message: 'Insufficient permissions' });
                return;
            }

            // Rate limiting check
            if (!wsRateLimiter.isAllowed(socket.id, socket.userId)) {
                socket.emit('rate_limit_exceeded', { 
                    message: 'Too many requests, please slow down' 
                });
                return;
            }

            const { feedbackId, status, customerId } = data;

            // Emit update to all admin/moderator users
            socket.to('role:admin').to('role:moderator').emit('feedback_status_updated', {
                feedbackId,
                status,
                updatedBy: socket.userEmail,
                timestamp: new Date()
            });

            // Emit to the customer who submitted the feedback
            if (customerId) {
                socket.to(`user:${customerId}`).emit('your_feedback_updated', {
                    feedbackId,
                    status,
                    message: `Your feedback status has been updated to: ${status}`,
                    timestamp: new Date()
                });
            }

        } catch (error) {
            console.error('WebSocket status update error:', error);
            socket.emit('error', { message: 'Failed to update feedback status' });
        }
    });

    // Handle joining feedback-specific rooms
    socket.on('join_feedback', (feedbackId) => {
        if (socket.userId) {
            socket.join(`feedback:${feedbackId}`);
            console.log(`👥 User ${socket.userEmail} joined feedback room: ${feedbackId}`);
        }
    });

    // Handle leaving feedback-specific rooms
    socket.on('leave_feedback', (feedbackId) => {
        socket.leave(`feedback:${feedbackId}`);
        console.log(`👋 User ${socket.userEmail} left feedback room: ${feedbackId}`);
    });

    // Handle real-time chat/comments
    socket.on('send_comment', async (data) => {
        try {
            if (!socket.userId) {
                socket.emit('error', { message: 'Authentication required' });
                return;
            }

            // Rate limiting check
            if (!wsRateLimiter.isAllowed(socket.id, socket.userId)) {
                socket.emit('rate_limit_exceeded', { 
                    message: 'Too many requests, please slow down' 
                });
                return;
            }

            const { feedbackId, comment } = data;

            // Broadcast comment to all users in the feedback room
            socket.to(`feedback:${feedbackId}`).emit('new_comment', {
                feedbackId,
                comment,
                author: {
                    email: socket.userEmail,
                    role: socket.userRole
                },
                timestamp: new Date()
            });

        } catch (error) {
            console.error('WebSocket comment error:', error);
            socket.emit('error', { message: 'Failed to send comment' });
        }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
        if (socket.userId && data.feedbackId) {
            socket.to(`feedback:${data.feedbackId}`).emit('user_typing', {
                userId: socket.userId,
                email: socket.userEmail,
                feedbackId: data.feedbackId
            });
        }
    });

    socket.on('typing_stop', (data) => {
        if (socket.userId && data.feedbackId) {
            socket.to(`feedback:${data.feedbackId}`).emit('user_stopped_typing', {
                userId: socket.userId,
                feedbackId: data.feedbackId
            });
        }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
        console.log(`📡 Client disconnected: ${socket.id}, reason: ${reason}`);
        
        // Remove from connected users
        connectedUsers.delete(socket.id);

        // Broadcast user offline status to relevant rooms
        if (socket.userId) {
            socket.broadcast.emit('user_offline', {
                userId: socket.userId,
                email: socket.userEmail
            });
        }
    });

    // Handle connection errors
    socket.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// WebSocket connection monitoring
setInterval(() => {
    const connectedCount = connectedUsers.size;
    console.log(`📊 Connected users: ${connectedCount}`);
    
    // Emit connection stats to admin users
    io.to('role:admin').emit('connection_stats', {
        connectedUsers: connectedCount,
        timestamp: new Date()
    });
}, 30000); // Every 30 seconds

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    // Don't leak error details in production
    const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Something went wrong!' 
        : err.message;

    res.status(err.status || 500).json({
        success: false,
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log('📴 SIGTERM received, shutting down gracefully...');
    
    // Close server
    server.close(() => {
        console.log('🔴 HTTP server closed');
    });

    // Close database connections
    try {
        await dbConfig.closeConnections();
        console.log('🔴 Database connections closed');
    } catch (error) {
        console.error('Error closing database connections:', error);
    }

    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('📴 SIGINT received, shutting down gracefully...');
    
    server.close(() => {
        console.log('🔴 HTTP server closed');
    });

    try {
        await dbConfig.closeConnections();
        console.log('🔴 Database connections closed');
    } catch (error) {
        console.error('Error closing database connections:', error);
    }

    process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log the error
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Exit the process as the application is in an undefined state
    process.exit(1);
});

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
    try {
        // Initialize database connections
        await dbConfig.initializeConnections();
        
        // Start HTTP server
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
            console.log(`📡 WebSocket server ready`);
            console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
        });

        // Server startup success
        console.log('✅ All systems initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = { app, server, io };
