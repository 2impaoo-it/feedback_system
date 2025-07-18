const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://admin:password123@feedback_mongodb:27017/feedback_system?authSource=admin');

// User model
const userSchema = new mongoose.Schema({
    email: String,
    role: String,
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Customer model
const customerSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    company: String,
    department: String
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);

async function cleanSuperAdmin() {
    try {
        // Delete all super admins
        const userResult = await User.deleteMany({ role: 'superAdmin' });
        console.log(`Deleted ${userResult.deletedCount} super admin user(s)`);
        
        // Delete super admin customer profiles
        const customerResult = await Customer.deleteMany({ 
            company: 'System', 
            department: 'Administration' 
        });
        console.log(`Deleted ${customerResult.deletedCount} super admin customer profile(s)`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

cleanSuperAdmin();
