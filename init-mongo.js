// MongoDB initialization script
// This script creates the initial database and collections with indexes

db = db.getSiblingDB('feedback_system');

// Create initial admin user
db.users.insertOne({
  email: 'admin@hutech.edu.vn',
  password: '$2a$12$LQv3c1yqBwEHxV5FMExBdOCjqc0DEeTQveDBi.Gj5VG5EQ1tXK4VG', // password: admin123
  role: 'admin',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create initial feedback categories
db.feedbackcategories.insertMany([
  {
    name: 'Technical Issue',
    description: 'Technical problems, bugs, and system errors',
    color: '#EF4444',
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Service Quality',
    description: 'Customer service and support related feedback',
    color: '#3B82F6',
    isActive: true,
    sortOrder: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Product Feedback',
    description: 'Product features, usability, and improvements',
    color: '#10B981',
    isActive: true,
    sortOrder: 3,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Pricing',
    description: 'Pricing and billing related feedback',
    color: '#F59E0B',
    isActive: true,
    sortOrder: 4,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'General',
    description: 'General feedback and suggestions',
    color: '#6B7280',
    isActive: true,
    sortOrder: 5,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Create indexes for performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1, isActive: 1 });
db.users.createIndex({ createdAt: -1 });

db.feedbacks.createIndex({ customerId: 1, createdAt: -1 });
db.feedbacks.createIndex({ status: 1, priority: 1 });
db.feedbacks.createIndex({ categoryId: 1, sentiment: 1 });
db.feedbacks.createIndex({ assignedTo: 1, status: 1 });
db.feedbacks.createIndex({ createdAt: -1 });
db.feedbacks.createIndex({ sentiment: 1, createdAt: -1 });
db.feedbacks.createIndex({ title: 'text', content: 'text', tags: 'text' });

db.customers.createIndex({ userId: 1 }, { unique: true });
db.customers.createIndex({ firstName: 1, lastName: 1 });
db.customers.createIndex({ company: 1 });

db.feedbackcategories.createIndex({ name: 1 }, { unique: true });
db.feedbackcategories.createIndex({ isActive: 1, sortOrder: 1 });

db.feedbackhistory.createIndex({ feedbackId: 1, createdAt: -1 });
db.feedbackhistory.createIndex({ changedBy: 1, createdAt: -1 });

db.notifications.createIndex({ userId: 1, isRead: 1, createdAt: -1 });
db.notifications.createIndex({ type: 1, createdAt: -1 });

db.analytics.createIndex({ period: 1, date: -1 });

db.feedbackcategorymappings.createIndex({ feedbackId: 1, categoryId: 1 }, { unique: true });

print('Database initialized successfully with indexes and initial data');
