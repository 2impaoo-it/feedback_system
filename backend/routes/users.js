const express = require('express');
const router = express.Router();
const { User, Customer } = require('../models');
const { authenticateToken } = require('../middleware/auth');

/**
 * Middleware to check if user is SuperAdmin
 */
const requireSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'superAdmin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. SuperAdmin role required.'
        });
    }
    next();
};

/**
 * @route   GET /api/users
 * @desc    Get all users (SuperAdmin only)
 * @access  Private (SuperAdmin)
 */
router.get('/',
    authenticateToken,
    requireSuperAdmin,
    async (req, res) => {
        try {
            const users = await User.find({})
                .select('-password')
                .sort({ createdAt: -1 });

            // Get customer profiles for each user
            const usersWithProfiles = await Promise.all(
                users.map(async (user) => {
                    const userObj = user.toObject();
                    if (user.role === 'customer') {
                        const customer = await Customer.findOne({ userId: user._id });
                        userObj.customer = customer;
                    }
                    return userObj;
                })
            );

            res.json({
                success: true,
                data: usersWithProfiles
            });

        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch users'
            });
        }
    }
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (SuperAdmin only)
 * @access  Private (SuperAdmin)
 */
router.get('/:id',
    authenticateToken,
    requireSuperAdmin,
    async (req, res) => {
        try {
            const user = await User.findById(req.params.id).select('-password');
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const userObj = user.toObject();
            if (user.role === 'customer') {
                const customer = await Customer.findOne({ userId: user._id });
                userObj.customer = customer;
            }

            res.json({
                success: true,
                data: userObj
            });

        } catch (error) {
            console.error('Get user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user'
            });
        }
    }
);

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role (SuperAdmin only)
 * @access  Private (SuperAdmin)
 */
router.put('/:id/role',
    authenticateToken,
    requireSuperAdmin,
    async (req, res) => {
        try {
            const { role } = req.body;
            const userId = req.params.id;

            // Validate role
            if (!['customer', 'admin', 'superAdmin'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role'
                });
            }

            // Prevent changing own role
            if (userId === req.user.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot change your own role'
                });
            }

            const user = await User.findByIdAndUpdate(
                userId,
                { role },
                { new: true }
            ).select('-password');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                message: 'User role updated successfully',
                data: user
            });

        } catch (error) {
            console.error('Update user role error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user role'
            });
        }
    }
);

/**
 * @route   PUT /api/users/:id/active
 * @desc    Toggle user active status (SuperAdmin only)
 * @access  Private (SuperAdmin)
 */
router.put('/:id/active',
    authenticateToken,
    requireSuperAdmin,
    async (req, res) => {
        try {
            const { isActive } = req.body;
            const userId = req.params.id;

            // Prevent deactivating own account
            if (userId === req.user.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot deactivate your own account'
                });
            }

            const user = await User.findByIdAndUpdate(
                userId,
                { isActive },
                { new: true }
            ).select('-password');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
                data: user
            });

        } catch (error) {
            console.error('Update user status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user status'
            });
        }
    }
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (SuperAdmin only)
 * @access  Private (SuperAdmin)
 */
router.delete('/:id',
    authenticateToken,
    requireSuperAdmin,
    async (req, res) => {
        try {
            const userId = req.params.id;

            // Prevent deleting own account
            if (userId === req.user.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete your own account'
                });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Delete customer profile if exists
            if (user.role === 'customer') {
                await Customer.findOneAndDelete({ userId });
            }

            // Delete user
            await User.findByIdAndDelete(userId);

            res.json({
                success: true,
                message: 'User deleted successfully'
            });

        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete user'
            });
        }
    }
);

module.exports = router;
