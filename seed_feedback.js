const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://admin:password123@localhost:27017/feedback_system?authSource=admin';

async function seedFeedback() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('feedback_system');
    
    // Clear existing feedback
    await db.collection('feedback').deleteMany({});
    
    // Sample feedback data
    const sampleFeedback = [
      {
        _id: new ObjectId(),
        title: 'Góp ý về hệ thống học tập',
        description: 'Hệ thống học tập online cần cải thiện giao diện và tăng tốc độ tải trang.',
        category: 'academic',
        priority: 'medium',
        status: 'pending',
        userId: new ObjectId(),
        userEmail: 'student@test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        attachments: []
      },
      {
        _id: new ObjectId(),
        title: 'Vấn đề về thư viện',
        description: 'Thư viện thiếu sách tham khảo cho môn lập trình. Mong nhà trường bổ sung.',
        category: 'facilities',
        priority: 'high',
        status: 'in_progress',
        userId: new ObjectId(),
        userEmail: 'student2@test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        attachments: [],
        replies: [
          {
            _id: new ObjectId(),
            content: 'Cảm ơn bạn đã góp ý. Chúng tôi sẽ xem xét bổ sung sách tham khảo.',
            author: {
              _id: new ObjectId(),
              email: 'admin@test.com',
              role: 'admin'
            },
            createdAt: new Date()
          }
        ]
      },
      {
        _id: new ObjectId(),
        title: 'Góp ý về cafeteria',
        description: 'Chất lượng đồ ăn ở cafeteria cần được cải thiện. Giá cả cũng hơi cao.',
        category: 'services',
        priority: 'low',
        status: 'resolved',
        userId: new ObjectId(),
        userEmail: 'student3@test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        attachments: []
      }
    ];
    
    await db.collection('feedback').insertMany(sampleFeedback);
    console.log('✅ Sample feedback data created successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding feedback:', error);
  } finally {
    await client.close();
  }
}

seedFeedback();
