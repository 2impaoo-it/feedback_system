const express = require('express');
const router = express.Router();
const { 
    Feedback, 
    Customer, 
    FeedbackCategory, 
    FeedbackHistory, 
    Notification,
    Analytics,
    User
} = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { feedbackLimiter } = require('../middleware/rateLimiter');
// const emailService = require('../services/emailService');
const dbConfig = require('../config/db');
const axios = require('axios');

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
 * NLP Service Integration
 */
const analyzeWithNLP = async (text) => {
    try {
        const response = await axios.post(`${process.env.NLP_SERVICE_URL}/analyze`, {
            text: text
        }, {
            timeout: 5000
        });
        return response.data;
    } catch (error) {
        console.error('NLP service error:', error);
        // Return default values if NLP service fails
        return {
            sentiment: 'neutral',
            sentiment_score: 0,
            category_suggestions: [],
            topics: []
        };
    }
};

/**
 * @route   POST /api/feedback
 * @desc    Create new feedback
 * @access  Private
 */
router.post('/', 
    authenticateToken,
    feedbackLimiter,
    validate(schemas.feedback),
    async (req, res) => {
        try {
            // Get customer profile
            const customer = await Customer.findOne({ userId: req.user._id });
            if (!customer) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer profile not found'
                });
            }

            // Verify category exists
            const category = await FeedbackCategory.findById(req.body.categoryId);
            if (!category || !category.isActive) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or inactive category'
                });
            }

            // Analyze text with NLP service
            const nlpAnalysis = await analyzeWithNLP(req.body.content);

            // Create feedback
            const feedback = new Feedback({
                customerId: customer._id,
                title: req.body.title,
                content: req.body.content,
                categoryId: req.body.categoryId,
                priority: req.body.priority,
                rating: req.body.rating,
                tags: req.body.tags,
                isPublic: req.body.isPublic,
                sentiment: nlpAnalysis.sentiment,
                sentimentScore: nlpAnalysis.sentiment_score
            });

            await feedback.save();

            // Create feedback history entry
            const historyEntry = new FeedbackHistory({
                feedbackId: feedback._id,
                changedBy: req.user._id,
                changeType: 'created',
                newValue: feedback.toObject()
            });
            await historyEntry.save();

            // Create notifications for admins and moderators
            const adminUsers = await require('../models').User.find({ 
                role: { $in: ['admin', 'moderator'] },
                isActive: true 
            });

            const notifications = adminUsers.map(admin => new Notification({
                userId: admin._id,
                type: 'feedback_received',
                title: 'New Feedback Received',
                message: `New feedback: "${feedback.title}" from ${customer.firstName} ${customer.lastName}`,
                relatedFeedbackId: feedback._id,
                priority: feedback.priority === 'urgent' ? 'high' : 'medium'
            }));

            await Notification.insertMany(notifications);

            // Cache the feedback
            await cache.set(`feedback:${feedback._id}`, feedback, 1800); // 30 minutes

            // Clear related caches
            await cache.del('feedbacks:list');
            await cache.del(`customer:${customer._id}:feedbacks`);

            // Emit real-time notification via Socket.IO
            req.app.get('io').emit('newFeedback', {
                feedback: await feedback.populate([
                    { path: 'customerId', select: 'firstName lastName company' },
                    { path: 'categoryId', select: 'name color' }
                ]),
                nlpAnalysis
            });

            res.status(201).json({
                success: true,
                message: 'Feedback created successfully',
                data: {
                    feedback,
                    nlpAnalysis: {
                        sentiment: nlpAnalysis.sentiment,
                        sentimentScore: nlpAnalysis.sentiment_score,
                        suggestedCategories: nlpAnalysis.category_suggestions,
                        topics: nlpAnalysis.topics
                    }
                }
            });

        } catch (error) {
            console.error('Create feedback error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create feedback'
            });
        }
    }
);

/**
 * @route   GET /api/feedback
 * @desc    Get feedbacks with filtering, pagination, and search
 * @access  Private
 */
router.get('/',
    authenticateToken,
    validate(schemas.query, 'query'),
    async (req, res) => {
        try {
            const { 
                page, 
                limit, 
                sort, 
                status, 
                priority, 
                sentiment, 
                categoryId, 
                search,
                startDate,
                endDate 
            } = req.query;

            // Build cache key
            const cacheKey = `feedbacks:${JSON.stringify(req.query)}:${req.user._id}:${req.user.role}`;
            
            // Try to get from cache
            const cachedResult = await cache.get(cacheKey);
            if (cachedResult) {
                return res.json(cachedResult);
            }

            // Build query based on user role
            let query = {};

            if (req.user.role === 'customer') {
                // Customers can only see their own feedback
                const customer = await Customer.findOne({ userId: req.user._id });
                if (!customer) {
                    return res.status(400).json({
                        success: false,
                        message: 'Customer profile not found'
                    });
                }
                query.customerId = customer._id;
            }

            // Apply filters
            if (status) query.status = status;
            if (priority) query.priority = priority;
            if (sentiment) query.sentiment = sentiment;
            if (categoryId) query.categoryId = categoryId;

            // Date range filter
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            // Text search
            if (search) {
                query.$text = { $search: search };
            }

            // Calculate pagination
            const skip = (page - 1) * limit;

            // Execute query with population
            const [feedbacks, total] = await Promise.all([
                Feedback.find(query)
                    .populate('customerId', 'firstName lastName company email')
                    .populate('categoryId', 'name color')
                    .populate('assignedTo', 'email firstName lastName')
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Feedback.countDocuments(query)
            ]);

            const result = {
                success: true,
                data: {
                    feedbacks,
                    pagination: {
                        currentPage: page,
                        totalPages: Math.ceil(total / limit),
                        totalItems: total,
                        itemsPerPage: limit,
                        hasNextPage: page < Math.ceil(total / limit),
                        hasPreviousPage: page > 1
                    }
                }
            };

            // Cache the result for 5 minutes
            await cache.set(cacheKey, result, 300);

            res.json(result);

        } catch (error) {
            console.error('Get feedbacks error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve feedbacks'
            });
        }
    }
);

/**
 * @route   GET /api/feedback/:id
 * @desc    Get single feedback by ID
 * @access  Private
 */
router.get('/:id',
    authenticateToken,
    validate(schemas.objectId, 'params'),
    async (req, res) => {
        try {
            const { id } = req.params;

            // Try to get from cache first
            let feedback = await cache.get(`feedback:${id}`);
            
            if (!feedback) {
                feedback = await Feedback.findById(id)
                    .populate('customerId', 'firstName lastName company email phone')
                    .populate('categoryId', 'name color description')
                    .populate('assignedTo', 'email firstName lastName')
                    .lean();

                if (!feedback) {
                    return res.status(404).json({
                        success: false,
                        message: 'Feedback not found'
                    });
                }

                // Cache for 30 minutes
                await cache.set(`feedback:${id}`, feedback, 1800);
            }

            // Check permissions
            if (req.user.role === 'customer') {
                const customer = await Customer.findOne({ userId: req.user._id });
                if (feedback.customerId._id.toString() !== customer._id.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied'
                    });
                }
            }

            // Get feedback history
            const history = await FeedbackHistory.find({ feedbackId: id })
                .populate('changedBy', 'email firstName lastName')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();

            res.json({
                success: true,
                data: {
                    feedback,
                    history
                }
            });

        } catch (error) {
            console.error('Get feedback error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve feedback'
            });
        }
    }
);

/**
 * @route   PUT /api/feedback/:id
 * @desc    Update feedback
 * @access  Private
 */
router.put('/:id',
    authenticateToken,
    validate(schemas.objectId, 'params'),
    validate(schemas.feedbackUpdate),
    async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            const feedback = await Feedback.findById(id);
            if (!feedback) {
                return res.status(404).json({
                    success: false,
                    message: 'Feedback not found'
                });
            }

            // Check permissions
            if (req.user.role === 'customer') {
                const customer = await Customer.findOne({ userId: req.user._id });
                if (feedback.customerId.toString() !== customer._id.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied'
                    });
                }
                
                // Customers can only update certain fields
                const allowedFields = ['title', 'content', 'rating', 'tags', 'isPublic'];
                Object.keys(updates).forEach(key => {
                    if (!allowedFields.includes(key)) {
                        delete updates[key];
                    }
                });
            }

            // Store old values for history
            const oldValues = {};
            Object.keys(updates).forEach(key => {
                oldValues[key] = feedback[key];
            });

            // Apply updates
            Object.assign(feedback, updates);
            
            // Re-analyze with NLP if content changed
            if (updates.content) {
                const nlpAnalysis = await analyzeWithNLP(updates.content);
                feedback.sentiment = nlpAnalysis.sentiment;
                feedback.sentimentScore = nlpAnalysis.sentiment_score;
            }

            await feedback.save();

            // Create history entry
            const historyEntry = new FeedbackHistory({
                feedbackId: feedback._id,
                changedBy: req.user._id,
                changeType: 'updated',
                oldValue: oldValues,
                newValue: updates
            });
            await historyEntry.save();

            // Send email notifications for status changes
            if (updates.status && updates.status !== oldValues.status) {
                try {
                    // Get populated feedback for email
                    const populatedFeedback = await Feedback.findById(feedback._id)
                        .populate('customerId', 'firstName lastName email')
                        .populate('assignedTo', 'firstName lastName email');

                    // Notify customer about status change
                    if (populatedFeedback.customerId && populatedFeedback.customerId.email) {
                        // await emailService.sendStatusUpdateEmail(
                        //     populatedFeedback,
                        //     populatedFeedback.customerId,
                        //     oldValues.status,
                        //     updates.status
                        // );
                    }

                    // Notify assigned user if different from updater
                    if (populatedFeedback.assignedTo && 
                        populatedFeedback.assignedTo.email && 
                        populatedFeedback.assignedTo._id.toString() !== req.user._id.toString()) {
                        // Create a simplified customer object for the assigned user notification
                        const assignedUserAsCustomer = {
                            email: populatedFeedback.assignedTo.email,
                            firstName: populatedFeedback.assignedTo.firstName,
                            lastName: populatedFeedback.assignedTo.lastName
                        };
                        // await emailService.sendStatusUpdateEmail(
                        //     populatedFeedback,
                        //     assignedUserAsCustomer,
                        //     oldValues.status,
                        //     updates.status
                        // );
                    }
                } catch (emailError) {
                    console.error('Email notification error:', emailError);
                    // Don't fail the update if email fails
                }
            }

            // Clear caches
            await cache.del(`feedback:${id}`);
            await cache.del('feedbacks:list');

            // Emit real-time update
            req.app.get('io').emit('feedbackUpdated', {
                feedbackId: id,
                updates: updates,
                updatedBy: req.user.email
            });

            res.json({
                success: true,
                message: 'Feedback updated successfully',
                data: feedback
            });

        } catch (error) {
            console.error('Update feedback error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update feedback'
            });
        }
    }
);

/**
 * @route   DELETE /api/feedback/:id
 * @desc    Delete feedback (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/:id',
    authenticateToken,
    authorizeRoles('admin', 'superAdmin'),
    validate(schemas.objectId, 'params'),
    async (req, res) => {
        try {
            const { id } = req.params;

            const feedback = await Feedback.findById(id);
            if (!feedback) {
                return res.status(404).json({
                    success: false,
                    message: 'Feedback not found'
                });
            }

            // Soft delete by setting status to closed and adding deleted flag
            feedback.status = 'closed';
            feedback.isDeleted = true;
            feedback.deletedAt = new Date();
            feedback.deletedBy = req.user._id;
            await feedback.save();

            // Create history entry
            const historyEntry = new FeedbackHistory({
                feedbackId: feedback._id,
                changedBy: req.user._id,
                changeType: 'deleted',
                comment: 'Feedback deleted by admin'
            });
            await historyEntry.save();

            // Clear caches
            await cache.del(`feedback:${id}`);
            await cache.del('feedbacks:list');

            res.json({
                success: true,
                message: 'Feedback deleted successfully'
            });

        } catch (error) {
            console.error('Delete feedback error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete feedback'
            });
        }
    }
);

/**
 * @route   POST /api/feedback/:id/assign
 * @desc    Assign feedback to user
 * @access  Private (Admin/Moderator only)
 */
router.post('/:id/assign',
    authenticateToken,
    authorizeRoles('admin', 'moderator', 'superAdmin'),
    validate(schemas.objectId, 'params'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { assignedTo } = req.body;

            const feedback = await Feedback.findById(id);
            if (!feedback) {
                return res.status(404).json({
                    success: false,
                    message: 'Feedback not found'
                });
            }

            const oldAssignedTo = feedback.assignedTo;
            feedback.assignedTo = assignedTo;
            feedback.status = assignedTo ? 'in_progress' : 'open';
            await feedback.save();

            // Create history entry
            const historyEntry = new FeedbackHistory({
                feedbackId: feedback._id,
                changedBy: req.user._id,
                changeType: 'assigned',
                oldValue: { assignedTo: oldAssignedTo },
                newValue: { assignedTo: assignedTo }
            });
            await historyEntry.save();

            // Create notification for assigned user
            if (assignedTo) {
                const notification = new Notification({
                    userId: assignedTo,
                    type: 'feedback_assigned',
                    title: 'Feedback Assigned',
                    message: `You have been assigned feedback: "${feedback.title}"`,
                    relatedFeedbackId: feedback._id,
                    priority: feedback.priority === 'urgent' ? 'high' : 'medium'
                });
                await notification.save();

                // Send email notification to assigned user
                try {
                    const assignedUser = await User.findById(assignedTo);
                    const populatedFeedback = await Feedback.findById(feedback._id)
                        .populate('customerId', 'firstName lastName company')
                        .populate('categoryId', 'name');

                    if (assignedUser && assignedUser.email && populatedFeedback.customerId) {
                        // await emailService.sendAssignmentEmail(
                        //     populatedFeedback,
                        //     assignedUser,
                        //     populatedFeedback.customerId,
                        //     req.user
                        // );
                    }
                } catch (emailError) {
                    console.error('Assignment email notification error:', emailError);
                    // Don't fail the assignment if email fails
                }
            }

            // Clear caches
            await cache.del(`feedback:${id}`);

            // Emit real-time update
            req.app.get('io').emit('feedbackAssigned', {
                feedbackId: id,
                assignedTo: assignedTo,
                assignedBy: req.user.email
            });

            res.json({
                success: true,
                message: 'Feedback assigned successfully',
                data: feedback
            });

        } catch (error) {
            console.error('Assign feedback error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to assign feedback'
            });
        }
    }
);

/**
 * @route   GET /api/feedback/stats/dashboard
 * @desc    Get dashboard statistics
 * @access  Private (Admin/Moderator only)
 */
router.get('/stats/dashboard',
    authenticateToken,
    authorizeRoles('admin', 'moderator', 'superAdmin'),
    async (req, res) => {
        try {
            const cacheKey = 'dashboard:stats';
            let stats = await cache.get(cacheKey);

            if (!stats) {
                // Calculate statistics
                const [
                    totalFeedbacks,
                    openFeedbacks,
                    inProgressFeedbacks,
                    resolvedFeedbacks,
                    urgentFeedbacks,
                    sentimentStats,
                    categoryStats,
                    recentFeedbacks
                ] = await Promise.all([
                    Feedback.countDocuments({}),
                    Feedback.countDocuments({ status: 'open' }),
                    Feedback.countDocuments({ status: 'in_progress' }),
                    Feedback.countDocuments({ status: 'resolved' }),
                    Feedback.countDocuments({ priority: 'urgent', status: { $ne: 'closed' } }),
                    Feedback.aggregate([
                        { $group: { _id: '$sentiment', count: { $sum: 1 } } }
                    ]),
                    Feedback.aggregate([
                        { 
                            $lookup: {
                                from: 'feedbackcategories',
                                localField: 'categoryId',
                                foreignField: '_id',
                                as: 'category'
                            }
                        },
                        { $unwind: '$category' },
                        { 
                            $group: { 
                                _id: '$category.name', 
                                count: { $sum: 1 },
                                color: { $first: '$category.color' }
                            } 
                        },
                        { $sort: { count: -1 } },
                        { $limit: 10 }
                    ]),
                    Feedback.find({})
                        .populate('customerId', 'firstName lastName')
                        .populate('categoryId', 'name color')
                        .sort({ createdAt: -1 })
                        .limit(5)
                        .lean()
                ]);

                // Calculate average rating
                const avgRating = await Feedback.aggregate([
                    { $match: { rating: { $ne: null } } },
                    { $group: { _id: null, avgRating: { $avg: '$rating' } } }
                ]);

                stats = {
                    totals: {
                        feedbacks: totalFeedbacks,
                        open: openFeedbacks,
                        inProgress: inProgressFeedbacks,
                        resolved: resolvedFeedbacks,
                        urgent: urgentFeedbacks
                    },
                    averageRating: avgRating[0]?.avgRating || 0,
                    sentimentDistribution: sentimentStats,
                    categoryDistribution: categoryStats,
                    recentFeedbacks: recentFeedbacks
                };

                // Cache for 5 minutes
                await cache.set(cacheKey, stats, 300);
            }

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Dashboard stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve dashboard statistics'
            });
        }
    }
);

module.exports = router;
