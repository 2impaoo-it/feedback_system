const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const uri = 'mongodb://admin:password123@localhost:27017/feedback_system?authSource=admin';

async function createAdminUser() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('feedback_system');
    
    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Create admin user with role 'admin' (not superAdmin)
    const adminUser = {
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',  // Changed from superAdmin to admin
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Delete existing admin if exists
    await db.collection('users').deleteOne({ email: 'admin@example.com' });
    
    // Insert new admin
    const result = await db.collection('users').insertOne(adminUser);
    console.log('Admin user created:', result.insertedId);
    
    // Verify admin role
    const createdUser = await db.collection('users').findOne({ _id: result.insertedId });
    console.log('Admin role:', createdUser.role);
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await client.close();
  }
}

createAdminUser();
