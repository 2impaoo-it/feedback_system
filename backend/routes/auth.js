const express = require('express');
const router = express.Router();
const { User, Customer, Notification } = require('../models');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { authLimiter, registrationLimiter } = require('../middleware/rateLimiter');

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register',
    // registrationLimiter, // Temporarily disabled for testing
    validate(schemas.register),
    async (req, res) => {
        try {
            console.log('Registration request body:', req.body);
            const { email, password, firstName, lastName, phone, company, department } = req.body;

            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }

            // Create user
            const user = new User({
                email,
                password,
                role: 'customer'
            });

            await user.save();

            // Create customer profile
            const customer = new Customer({
                userId: user._id,
                firstName,
                lastName,
                phone,
                company,
                department
            });

            await customer.save();

            // Generate token
            const token = generateToken(user);

            // Create welcome notification
            const welcomeNotification = new Notification({
                userId: user._id,
                type: 'system',
                title: 'Welcome to Feedback System',
                message: `Hello ${firstName}! Welcome to our feedback management system. You can now submit and track your feedback.`,
                priority: 'medium'
            });
            await welcomeNotification.save();

            // Remove password from response
            const userResponse = user.toJSON();

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user: userResponse,
                    customer,
                    token
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            
            // Handle duplicate key error
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Registration failed'
            });
        }
    }
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
    // authLimiter, // Temporarily disabled for testing  
    validate(schemas.login),
    async (req, res) => {
        try {
            const { email, password } = req.body;

            // Find user by email
            const user = await User.findOne({ email, isActive: true });
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Check if account is locked
            if (user.isLocked) {
                return res.status(423).json({
                    success: false,
                    message: 'Account temporarily locked due to multiple failed login attempts'
                });
            }

            // Verify password
            const isValidPassword = await user.comparePassword(password);
            if (!isValidPassword) {
                // Increment login attempts
                await user.incrementLoginAttempts();
                
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Reset login attempts on successful login
            if (user.loginAttempts > 0) {
                await User.updateOne(
                    { _id: user._id },
                    { 
                        $unset: { loginAttempts: 1, lockUntil: 1 },
                        $set: { lastLogin: new Date() }
                    }
                );
            } else {
                user.lastLogin = new Date();
                await user.save();
            }

            // Generate token
            const token = generateToken(user);

            // Get customer profile if user is a customer
            let customer = null;
            if (user.role === 'customer') {
                customer = await Customer.findOne({ userId: user._id });
            }

            // Remove password from response
            const userResponse = user.toJSON();

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: userResponse,
                    customer,
                    token
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Login failed'
            });
        }
    }
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate token)
 * @access  Private
 */
router.post('/logout',
    authenticateToken,
    async (req, res) => {
        try {
            // In a production environment, you would typically:
            // 1. Add the token to a blacklist in Redis
            // 2. Store the token with its expiration time
            // 3. Check this blacklist in the auth middleware
            
            // For now, we'll just return success
            // The client should remove the token from storage
            
            res.json({
                success: true,
                message: 'Logout successful'
            });

        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }
    }
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me',
    authenticateToken,
    async (req, res) => {
        try {
            const user = req.user;
            let customer = null;

            if (user.role === 'customer') {
                customer = await Customer.findOne({ userId: user._id });
            }

            res.json({
                success: true,
                data: {
                    user,
                    customer
                }
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user profile'
            });
        }
    }
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile',
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user._id;
            const { firstName, lastName, phone, company, department, preferences } = req.body;

            // Update customer profile if user is a customer
            if (req.user.role === 'customer') {
                const updateData = {};
                if (firstName) updateData.firstName = firstName;
                if (lastName) updateData.lastName = lastName;
                if (phone !== undefined) updateData.phone = phone;
                if (company !== undefined) updateData.company = company;
                if (department !== undefined) updateData.department = department;
                if (preferences) updateData.preferences = preferences;

                const customer = await Customer.findOneAndUpdate(
                    { userId },
                    updateData,
                    { new: true, runValidators: true }
                );

                if (!customer) {
                    return res.status(404).json({
                        success: false,
                        message: 'Customer profile not found'
                    });
                }

                res.json({
                    success: true,
                    message: 'Profile updated successfully',
                    data: customer
                });
            } else {
                res.json({
                    success: true,
                    message: 'No profile updates available for this user role'
                });
            }

        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update profile'
            });
        }
    }
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password',
    authenticateToken,
    async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;

            // Validate input
            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password and new password are required'
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be at least 6 characters long'
                });
            }

            // Get user with password
            const user = await User.findById(req.user._id);
            
            // Verify current password
            const isValidPassword = await user.comparePassword(currentPassword);
            if (!isValidPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Update password
            user.password = newPassword;
            await user.save();

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to change password'
            });
        }
    }
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh-token',
    authenticateToken,
    async (req, res) => {
        try {
            // Generate new token
            const token = generateToken(req.user);

            res.json({
                success: true,
                message: 'Token refreshed successfully',
                data: { token }
            });

        } catch (error) {
            console.error('Refresh token error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to refresh token'
            });
        }
    }
);

/**
 * @route   GET /api/auth/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/notifications',
    authenticateToken,
    async (req, res) => {
        try {
            const { page = 1, limit = 10, unreadOnly = false } = req.query;
            
            const query = { userId: req.user._id };
            if (unreadOnly === 'true') {
                query.isRead = false;
            }

            const skip = (page - 1) * limit;

            const [notifications, total, unreadCount] = await Promise.all([
                Notification.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean(),
                Notification.countDocuments(query),
                Notification.countDocuments({ userId: req.user._id, isRead: false })
            ]);

            res.json({
                success: true,
                data: {
                    notifications,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalItems: total,
                        unreadCount
                    }
                }
            });

        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get notifications'
            });
        }
    }
);

/**
 * @route   PUT /api/auth/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/notifications/:id/read',
    authenticateToken,
    async (req, res) => {
        try {
            const notification = await Notification.findOneAndUpdate(
                { _id: req.params.id, userId: req.user._id },
                { isRead: true },
                { new: true }
            );

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            res.json({
                success: true,
                message: 'Notification marked as read',
                data: notification
            });

        } catch (error) {
            console.error('Mark notification read error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark notification as read'
            });
        }
    }
);

/**
 * @route   PUT /api/auth/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/notifications/read-all',
    authenticateToken,
    async (req, res) => {
        try {
            await Notification.updateMany(
                { userId: req.user._id, isRead: false },
                { isRead: true }
            );

            res.json({
                success: true,
                message: 'All notifications marked as read'
            });

        } catch (error) {
            console.error('Mark all notifications read error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark all notifications as read'
            });
        }
    }
);

/**
 * @route   POST /api/auth/create-super-admin
 * @desc    Create first super admin (only if no super admin exists)
 * @access  Public (but restricted)
 */
router.post('/create-super-admin', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        // Check if any super admin already exists
        const existingSuperAdmin = await User.findOne({ role: 'superAdmin' });
        if (existingSuperAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Super admin already exists'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create super admin user
        const user = new User({
            email,
            password,
            role: 'superAdmin'
        });

        await user.save();

        // Create customer profile for super admin
        const customer = new Customer({
            userId: user._id,
            firstName,
            lastName,
            phone: '',
            company: 'System',
            department: 'Administration'
        });

        await customer.save();

        // Generate token
        const token = generateToken(user);

        // Remove password from response
        const userResponse = user.toJSON();

        res.status(201).json({
            success: true,
            message: 'Super admin created successfully',
            data: {
                user: userResponse,
                customer,
                token
            }
        });

    } catch (error) {
        console.error('Create super admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create super admin'
        });
    }
});

/**
 * @route   GET /api/auth/check-super-admin
 * @desc    Check if super admin exists
 * @access  Public (for debugging)
 */
router.get('/check-super-admin', async (req, res) => {
    try {
        const superAdmin = await User.findOne({ role: 'superAdmin' });
        res.json({
            success: true,
            exists: !!superAdmin,
            email: superAdmin?.email || null
        });
    } catch (error) {
        console.error('Check super admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check super admin'
        });
    }
});

/**
 * @route   DELETE /api/auth/reset-super-admin
 * @desc    Reset super admin (for development only)
 * @access  Public (for debugging)
 */
router.delete('/reset-super-admin', async (req, res) => {
    try {
        // Only allow in development
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Not allowed in production'
            });
        }

        // Delete all super admins
        const deleteResult = await User.deleteMany({ role: 'superAdmin' });
        
        res.json({
            success: true,
            message: `Deleted ${deleteResult.deletedCount} super admin(s)`,
            deletedCount: deleteResult.deletedCount
        });
    } catch (error) {
        console.error('Reset super admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset super admin'
        });
    }
});

/**
 * @route   GET /api/auth/list-users
 * @desc    List all users (for debugging)
 * @access  Public (for debugging)
 */
router.get('/list-users', async (req, res) => {
    try {
        // Only allow in development
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Not allowed in production'
            });
        }

        const users = await User.find({}).select('email role createdAt').lean();
        
        res.json({
            success: true,
            users: users,
            count: users.length
        });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list users'
        });
    }
});

module.exports = router;
