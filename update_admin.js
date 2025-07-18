db = db.getSiblingDB('feedback_system');
db.users.updateOne(
  {email: 'admin@hutech.edu.vn'}, 
  {$set: {role: 'admin'}}
);
print('Admin user role updated to admin');
