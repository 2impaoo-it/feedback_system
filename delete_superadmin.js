db = db.getSiblingDB('feedback_system');
db.users.deleteOne({email: 'superadmin@feedback.com'});
print('Deleted existing SuperAdmin');
