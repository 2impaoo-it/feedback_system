// Get test user password hash
var testUser = db.users.findOne({email: 'test@test.com'});
print('Test user hash:', testUser.password);

// Update superadmin password
var result = db.users.updateOne(
  {email: 'admin@test.com'}, 
  {$set: {password: testUser.password}}
);

print('Update result:', JSON.stringify(result));

// Verify update
var superAdmin = db.users.findOne({email: 'admin@test.com'});
print('SuperAdmin updated hash:', superAdmin.password);
