const express = require('express');
const router = express.Router();
const { FeedbackCategory, Feedback } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const dbConfig = require('../config/db');

/**
 * Redis Cache Helper Functions
 */
const cache = {
    async get(key) {
        try {
            const client = dbConfig.getRedisClient();
            const data = await client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    },

    async set(key, data, ttl = 3600) {
        try {
            const client = dbConfig.getRedisClient();
            await client.setEx(key, ttl, JSON.stringify(data));
        } catch (error) {
            console.error('Cache set error:', error);
        }
    },

    async del(key) {
        try {
            const client = dbConfig.getRedisClient();
            await client.del(key);
        } catch (error) {
            console.error('Cache delete error:', error);
        }
    }
};

/**
 * @route   GET /api/categories
 * @desc    Get all feedback categories
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const cacheKey = 'categories:active';
        
        // Try to get from cache
        let categories = await cache.get(cacheKey);
        
        if (!categories) {
            categories = await FeedbackCategory.find({ isActive: true })
                .sort({ sortOrder: 1, name: 1 })
                .lean();
            
            // Cache for 1 hour
            await cache.set(cacheKey, categories, 3600);
        }

        res.json({
            success: true,
            data: categories
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve categories'
        });
    }
});

/**
 * @route   GET /api/categories/admin
 * @desc    Get all categories for admin (including inactive)
 * @access  Private (Admin/Moderator only)
 */
router.get('/admin',
    authenticateToken,
    authorizeRoles('admin', 'moderator'),
    async (req, res) => {
        try {
            const categories = await FeedbackCategory.find({})
                .sort({ sortOrder: 1, name: 1 })
                .lean();

            // Get feedback count for each category
            const categoriesWithStats = await Promise.all(
                categories.map(async (category) => {
                    const feedbackCount = await Feedback.countDocuments({
                        categoryId: category._id
                    });
                    
                    const activeFeedbackCount = await Feedback.countDocuments({
                        categoryId: category._id,
                        status: { $in: ['open', 'in_progress'] }
                    });

                    return {
                        ...category,
                        feedbackCount,
                        activeFeedbackCount
                    };
                })
            );

            res.json({
                success: true,
                data: categoriesWithStats
            });

        } catch (error) {
            console.error('Get admin categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve categories'
            });
        }
    }
);

/**
 * @route   GET /api/categories/:id
 * @desc    Get single category by ID
 * @access  Public
 */
router.get('/:id',
    validate(schemas.objectId, 'params'),
    async (req, res) => {
        try {
            const { id } = req.params;
            
            const cacheKey = `category:${id}`;
            let category = await cache.get(cacheKey);
            
            if (!category) {
                category = await FeedbackCategory.findById(id).lean();
                
                if (!category) {
                    return res.status(404).json({
                        success: false,
                        message: 'Category not found'
                    });
                }
                
                // Cache for 1 hour
                await cache.set(cacheKey, category, 3600);
            }

            // Get category statistics
            const [totalFeedbacks, activeFeedbacks, resolvedFeedbacks] = await Promise.all([
                Feedback.countDocuments({ categoryId: id }),
                Feedback.countDocuments({ 
                    categoryId: id, 
                    status: { $in: ['open', 'in_progress'] } 
                }),
                Feedback.countDocuments({ 
                    categoryId: id, 
                    status: 'resolved' 
                })
            ]);

            res.json({
                success: true,
                data: {
                    ...category,
                    statistics: {
                        totalFeedbacks,
                        activeFeedbacks,
                        resolvedFeedbacks
                    }
                }
            });

        } catch (error) {
            console.error('Get category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve category'
            });
        }
    }
);

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Private (Admin only)
 */
router.post('/',
    authenticateToken,
    authorizeRoles('admin'),
    validate(schemas.category),
    async (req, res) => {
        try {
            const { name, description, color, sortOrder } = req.body;

            // Check if category name already exists
            const existingCategory = await FeedbackCategory.findOne({ 
                name: { $regex: new RegExp(`^${name}$`, 'i') } 
            });
            
            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Category with this name already exists'
                });
            }

            const category = new FeedbackCategory({
                name,
                description,
                color,
                sortOrder
            });

            await category.save();

            // Clear cache
            await cache.del('categories:active');

            res.status(201).json({
                success: true,
                message: 'Category created successfully',
                data: category
            });

        } catch (error) {
            console.error('Create category error:', error);
            
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'Category name must be unique'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to create category'
            });
        }
    }
);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private (Admin only)
 */
router.put('/:id',
    authenticateToken,
    authorizeRoles('admin'),
    validate(schemas.objectId, 'params'),
    validate(schemas.category),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, color, sortOrder, isActive } = req.body;

            const category = await FeedbackCategory.findById(id);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            // Check if new name conflicts with existing category
            if (name && name !== category.name) {
                const existingCategory = await FeedbackCategory.findOne({
                    _id: { $ne: id },
                    name: { $regex: new RegExp(`^${name}$`, 'i') }
                });
                
                if (existingCategory) {
                    return res.status(400).json({
                        success: false,
                        message: 'Category with this name already exists'
                    });
                }
            }

            // Update fields
            if (name) category.name = name;
            if (description !== undefined) category.description = description;
            if (color) category.color = color;
            if (sortOrder !== undefined) category.sortOrder = sortOrder;
            if (isActive !== undefined) category.isActive = isActive;

            await category.save();

            // Clear caches
            await cache.del('categories:active');
            await cache.del(`category:${id}`);

            res.json({
                success: true,
                message: 'Category updated successfully',
                data: category
            });

        } catch (error) {
            console.error('Update category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update category'
            });
        }
    }
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category (soft delete by setting isActive to false)
 * @access  Private (Admin only)
 */
router.delete('/:id',
    authenticateToken,
    authorizeRoles('admin'),
    validate(schemas.objectId, 'params'),
    async (req, res) => {
        try {
            const { id } = req.params;

            const category = await FeedbackCategory.findById(id);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            // Check if category has active feedbacks
            const activeFeedbacks = await Feedback.countDocuments({
                categoryId: id,
                status: { $in: ['open', 'in_progress'] }
            });

            if (activeFeedbacks > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot delete category with ${activeFeedbacks} active feedback(s). Please resolve or reassign them first.`
                });
            }

            // Soft delete by setting isActive to false
            category.isActive = false;
            await category.save();

            // Clear caches
            await cache.del('categories:active');
            await cache.del(`category:${id}`);

            res.json({
                success: true,
                message: 'Category deleted successfully'
            });

        } catch (error) {
            console.error('Delete category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete category'
            });
        }
    }
);

/**
 * @route   POST /api/categories/:id/restore
 * @desc    Restore deleted category
 * @access  Private (Admin only)
 */
router.post('/:id/restore',
    authenticateToken,
    authorizeRoles('admin'),
    validate(schemas.objectId, 'params'),
    async (req, res) => {
        try {
            const { id } = req.params;

            const category = await FeedbackCategory.findById(id);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            if (category.isActive) {
                return res.status(400).json({
                    success: false,
                    message: 'Category is already active'
                });
            }

            category.isActive = true;
            await category.save();

            // Clear cache
            await cache.del('categories:active');

            res.json({
                success: true,
                message: 'Category restored successfully',
                data: category
            });

        } catch (error) {
            console.error('Restore category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to restore category'
            });
        }
    }
);

/**
 * @route   PUT /api/categories/reorder
 * @desc    Reorder categories
 * @access  Private (Admin only)
 */
router.put('/reorder',
    authenticateToken,
    authorizeRoles('admin'),
    async (req, res) => {
        try {
            const { categoryOrders } = req.body;

            if (!Array.isArray(categoryOrders)) {
                return res.status(400).json({
                    success: false,
                    message: 'categoryOrders must be an array'
                });
            }

            // Update sort order for each category
            const updatePromises = categoryOrders.map((item, index) => {
                return FeedbackCategory.updateOne(
                    { _id: item.id },
                    { sortOrder: index }
                );
            });

            await Promise.all(updatePromises);

            // Clear cache
            await cache.del('categories:active');

            res.json({
                success: true,
                message: 'Categories reordered successfully'
            });

        } catch (error) {
            console.error('Reorder categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to reorder categories'
            });
        }
    }
);

/**
 * @route   GET /api/categories/:id/feedbacks
 * @desc    Get feedbacks by category
 * @access  Private
 */
router.get('/:id/feedbacks',
    authenticateToken,
    validate(schemas.objectId, 'params'),
    validate(schemas.query, 'query'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { page, limit, sort, status, priority } = req.query;

            // Verify category exists
            const category = await FeedbackCategory.findById(id);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            // Build query
            const query = { categoryId: id };
            
            // Apply role-based filtering
            if (req.user.role === 'customer') {
                const customer = await require('../models').Customer.findOne({ userId: req.user._id });
                if (customer) {
                    query.customerId = customer._id;
                }
            }

            // Apply filters
            if (status) query.status = status;
            if (priority) query.priority = priority;

            const skip = (page - 1) * limit;

            const [feedbacks, total] = await Promise.all([
                Feedback.find(query)
                    .populate('customerId', 'firstName lastName company')
                    .populate('assignedTo', 'email firstName lastName')
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Feedback.countDocuments(query)
            ]);

            res.json({
                success: true,
                data: {
                    category,
                    feedbacks,
                    pagination: {
                        currentPage: page,
                        totalPages: Math.ceil(total / limit),
                        totalItems: total,
                        itemsPerPage: limit
                    }
                }
            });

        } catch (error) {
            console.error('Get category feedbacks error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve category feedbacks'
            });
        }
    }
);

module.exports = router;
