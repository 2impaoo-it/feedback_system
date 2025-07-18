const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema - Stores user authentication and basic info
 * Follows 3NF: All non-key attributes depend on primary key
 */
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['customer', 'admin', 'superAdmin'],
        default: 'customer',
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { 
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.__v;
            return ret;
        }
    }
});

// Indexes for performance optimization
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

// Password hashing middleware
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        this.password = await bcrypt.hash(this.password, saltRounds);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incrementLoginAttempts = function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };
    
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }
    
    return this.updateOne(updates);
};

userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

/**
 * Customer Profile Schema - Extended customer information
 * Separated from User to follow 3NF (customer-specific data)
 */
const customerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true,
        sparse: true
    },
    company: {
        type: String,
        trim: true
    },
    department: {
        type: String,
        trim: true
    },
    preferences: {
        notifications: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false }
        },
        language: { type: String, default: 'vi' }
    }
}, {
    timestamps: true
});

// Indexes
customerSchema.index({ userId: 1 });
customerSchema.index({ firstName: 1, lastName: 1 });
customerSchema.index({ company: 1 });

/**
 * Feedback Categories Schema - Categorization system
 * Separate table for normalization
 */
const feedbackCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        trim: true
    },
    color: {
        type: String,
        default: '#3B82F6'
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    sortOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes
feedbackCategorySchema.index({ isActive: 1, sortOrder: 1 });

/**
 * Main Feedback Schema - Core feedback data
 */
const feedbackSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FeedbackCategory',
        required: true,
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open',
        index: true
    },
    sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'negative'],
        default: 'neutral',
        index: true
    },
    sentimentScore: {
        type: Number,
        min: -1,
        max: 1,
        default: 0
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    attachments: [{
        filename: String,
        url: String,
        mimeType: String,
        size: Number
    }]
}, {
    timestamps: true
});

// Compound indexes for performance
feedbackSchema.index({ customerId: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, priority: 1 });
feedbackSchema.index({ categoryId: 1, sentiment: 1 });
feedbackSchema.index({ assignedTo: 1, status: 1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ sentiment: 1, createdAt: -1 });

// Text search index
feedbackSchema.index({ 
    title: 'text', 
    content: 'text', 
    tags: 'text' 
});

/**
 * Feedback History Schema - Track all changes to feedback
 * Separate table for audit trail
 */
const feedbackHistorySchema = new mongoose.Schema({
    feedbackId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feedback',
        required: true,
        index: true
    },
    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    changeType: {
        type: String,
        enum: ['created', 'updated', 'status_changed', 'assigned', 'comment_added'],
        required: true,
        index: true
    },
    oldValue: {
        type: mongoose.Schema.Types.Mixed
    },
    newValue: {
        type: mongoose.Schema.Types.Mixed
    },
    comment: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Indexes
feedbackHistorySchema.index({ feedbackId: 1, createdAt: -1 });
feedbackHistorySchema.index({ changedBy: 1, createdAt: -1 });

/**
 * Analytics Schema - Store aggregated analytics data
 * Separate table for performance optimization
 */
const analyticsSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        index: true
    },
    period: {
        type: String,
        enum: ['hour', 'day', 'week', 'month'],
        required: true,
        index: true
    },
    metrics: {
        totalFeedbacks: { type: Number, default: 0 },
        openFeedbacks: { type: Number, default: 0 },
        resolvedFeedbacks: { type: Number, default: 0 },
        averageRating: { type: Number, default: 0 },
        sentimentDistribution: {
            positive: { type: Number, default: 0 },
            neutral: { type: Number, default: 0 },
            negative: { type: Number, default: 0 }
        },
        categoryDistribution: {
            type: Map,
            of: Number,
            default: new Map()
        },
        responseTime: {
            average: { type: Number, default: 0 },
            median: { type: Number, default: 0 }
        }
    }
}, {
    timestamps: true
});

// Compound index for analytics queries
analyticsSchema.index({ period: 1, date: -1 });

/**
 * Notifications Schema - System notifications
 */
const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['feedback_received', 'feedback_assigned', 'feedback_updated', 'system'],
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    relatedFeedbackId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feedback',
        default: null
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    }
}, {
    timestamps: true
});

// Indexes
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

/**
 * Feedback Category Mapping Schema - Many-to-many relationship
 * For advanced categorization (optional)
 */
const feedbackCategoryMappingSchema = new mongoose.Schema({
    feedbackId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feedback',
        required: true,
        index: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FeedbackCategory',
        required: true,
        index: true
    },
    confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 1
    },
    isAutomaticallyAssigned: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Compound index for unique mapping
feedbackCategoryMappingSchema.index({ feedbackId: 1, categoryId: 1 }, { unique: true });

// Export all models
module.exports = {
    User: mongoose.model('User', userSchema),
    Customer: mongoose.model('Customer', customerSchema),
    FeedbackCategory: mongoose.model('FeedbackCategory', feedbackCategorySchema),
    Feedback: mongoose.model('Feedback', feedbackSchema),
    FeedbackHistory: mongoose.model('FeedbackHistory', feedbackHistorySchema),
    Analytics: mongoose.model('Analytics', analyticsSchema),
    Notification: mongoose.model('Notification', notificationSchema),
    FeedbackCategoryMapping: mongoose.model('FeedbackCategoryMapping', feedbackCategoryMappingSchema)
};
