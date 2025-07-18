const Joi = require('joi');

/**
 * Validation Middleware Factory
 * Creates middleware for validating request data
 */
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            console.log('Validation error:', error.details);
            console.log('Request body received:', req[property]);
            const errorDetails = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errorDetails
            });
        }

        // Clean empty strings and undefined values for query params
        if (property === 'query') {
            Object.keys(value).forEach(key => {
                if (value[key] === '' || value[key] === undefined) {
                    delete value[key];
                }
            });
        }

        // Replace request data with validated/sanitized data
        req[property] = value;
        next();
    };
};

/**
 * User Registration Validation Schema
 */
const registerSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .lowercase()
        .trim()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
    password: Joi.string()
        .min(6)
        .max(128)
        .required()
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
        .messages({
            'string.min': 'Password must be at least 6 characters long',
            'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
            'any.required': 'Password is required'
        }),
    firstName: Joi.string()
        .min(2)
        .max(50)
        .required()
        .trim()
        .messages({
            'string.min': 'First name must be at least 2 characters long',
            'string.max': 'First name cannot exceed 50 characters',
            'any.required': 'First name is required'
        }),
    lastName: Joi.string()
        .min(2)
        .max(50)
        .required()
        .trim()
        .messages({
            'string.min': 'Last name must be at least 2 characters long',
            'string.max': 'Last name cannot exceed 50 characters',
            'any.required': 'Last name is required'
        }),
    phone: Joi.string()
        .pattern(/^[+]?[\d\s-()]+$/)
        .optional()
        .allow('')
        .messages({
            'string.pattern.base': 'Please provide a valid phone number'
        }),
    company: Joi.string()
        .max(100)
        .optional()
        .allow('')
        .trim(),
    department: Joi.string()
        .max(100)
        .optional()
        .allow('')
        .trim()
});

/**
 * User Login Validation Schema
 */
const loginSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .lowercase()
        .trim()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Password is required'
        })
});

/**
 * Feedback Creation Validation Schema
 */
const feedbackSchema = Joi.object({
    title: Joi.string()
        .min(5)
        .max(200)
        .required()
        .trim()
        .messages({
            'string.min': 'Title must be at least 5 characters long',
            'string.max': 'Title cannot exceed 200 characters',
            'any.required': 'Title is required'
        }),
    content: Joi.string()
        .min(10)
        .max(5000)
        .required()
        .trim()
        .messages({
            'string.min': 'Content must be at least 10 characters long',
            'string.max': 'Content cannot exceed 5000 characters',
            'any.required': 'Content is required'
        }),
    categoryId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid category ID format',
            'any.required': 'Category is required'
        }),
    priority: Joi.string()
        .valid('low', 'medium', 'high', 'urgent')
        .default('medium'),
    rating: Joi.number()
        .integer()
        .min(1)
        .max(5)
        .optional()
        .messages({
            'number.min': 'Rating must be between 1 and 5',
            'number.max': 'Rating must be between 1 and 5'
        }),
    tags: Joi.array()
        .items(Joi.string().trim().max(50))
        .max(10)
        .optional()
        .default([])
        .messages({
            'array.max': 'Maximum 10 tags allowed'
        }),
    isPublic: Joi.boolean()
        .default(true)
});

/**
 * Feedback Update Validation Schema
 */
const feedbackUpdateSchema = Joi.object({
    title: Joi.string()
        .min(5)
        .max(200)
        .optional()
        .trim(),
    content: Joi.string()
        .min(10)
        .max(5000)
        .optional()
        .trim(),
    categoryId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .optional(),
    priority: Joi.string()
        .valid('low', 'medium', 'high', 'urgent')
        .optional(),
    status: Joi.string()
        .valid('open', 'in_progress', 'resolved', 'closed')
        .optional(),
    assignedTo: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .optional()
        .allow(null),
    rating: Joi.number()
        .integer()
        .min(1)
        .max(5)
        .optional(),
    tags: Joi.array()
        .items(Joi.string().trim().max(50))
        .max(10)
        .optional(),
    isPublic: Joi.boolean()
        .optional()
});

/**
 * Category Creation Validation Schema
 */
const categorySchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .trim()
        .messages({
            'string.min': 'Category name must be at least 2 characters long',
            'string.max': 'Category name cannot exceed 100 characters',
            'any.required': 'Category name is required'
        }),
    description: Joi.string()
        .max(500)
        .optional()
        .allow('')
        .trim(),
    color: Joi.string()
        .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
        .optional()
        .default('#3B82F6')
        .messages({
            'string.pattern.base': 'Color must be a valid hex color code'
        }),
    sortOrder: Joi.number()
        .integer()
        .min(0)
        .optional()
        .default(0)
});

/**
 * Query Parameters Validation Schema
 */
const querySchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .optional()
        .default(1),
    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .optional()
        .default(10),
    sort: Joi.string()
        .valid('createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'priority', '-priority', 'status', '-status')
        .optional()
        .default('-createdAt'),
    status: Joi.string()
        .valid('open', 'in_progress', 'resolved', 'closed', '')
        .optional()
        .allow(''),
    priority: Joi.string()
        .valid('low', 'medium', 'high', 'urgent', '')
        .optional()
        .allow(''),
    sentiment: Joi.string()
        .valid('positive', 'neutral', 'negative', '')
        .optional()
        .allow(''),
    categoryId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .optional()
        .allow(''),
    search: Joi.string()
        .max(200)
        .optional()
        .allow('')
        .trim(),
    startDate: Joi.date()
        .iso()
        .optional(),
    endDate: Joi.date()
        .iso()
        .optional()
});

/**
 * ObjectId Parameter Validation Schema
 */
const objectIdSchema = Joi.object({
    id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid ID format',
            'any.required': 'ID is required'
        })
});

module.exports = {
    validate,
    schemas: {
        register: registerSchema,
        login: loginSchema,
        feedback: feedbackSchema,
        feedbackUpdate: feedbackUpdateSchema,
        category: categorySchema,
        query: querySchema,
        objectId: objectIdSchema
    }
};
