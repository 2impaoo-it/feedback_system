const { MongoClient } = require('mongodb');

async function deleteSuperAdmin() {
    const client = new MongoClient('mongodb://admin:password123@localhost:27017/feedback_system?authSource=admin');
    
    try {
        await client.connect();
        const db = client.db('feedback_system');
        
        // Delete all super admins
        const result = await db.collection('users').deleteMany({ role: 'superAdmin' });
        console.log(`Deleted ${result.deletedCount} super admin(s)`);
        
        // Also delete customer profiles
        const customerResult = await db.collection('customers').deleteMany({ 
            company: 'System', 
            department: 'Administration' 
        });
        console.log(`Deleted ${customerResult.deletedCount} super admin customer profile(s)`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

deleteSuperAdmin();
