# 🎯 Hệ Thống Quản Lý Phản Hồi Khách Hàng Thời Gian Thực

Một hệ thống web hoàn chỉnh để quản lý phản hồi khách hàng với khả năng xử lý thời gian thực, phân tích NLP, và dashboard thống kê.

## 🏗️ Kiến Trúc Hệ Thống

```
├── 🖥️ Frontend (React.js + Tailwind CSS)
│   ├── Socket.IO Client (WebSocket)
│   ├── Chart.js (Biểu đồ thống kê)
│   └── React Query (State management)
│
├── ⚙️ Backend (Node.js + Express)
│   ├── Socket.IO Server (WebSocket)
│   ├── JWT Authentication
│   ├── Rate Limiting
│   └── API REST
│
├── 🗄️ Database (MongoDB)
│   ├── 8+ Collections (3NF)
│   ├── Indexes tối ưu
│   └── Aggregation pipelines
│
├── 🚀 Cache (Redis)
│   ├── Session storage
│   ├── Real-time data
│   └── Rate limiting
│
├── 🤖 NLP Service (Python + FastAPI)
│   ├── Hugging Face Transformers
│   ├── Sentiment Analysis
│   └── Topic Classification
│
└── 🌐 Reverse Proxy (NGINX)
    ├── Load balancing
    ├── SSL termination
    └── Static file serving
```

## ✨ Tính Năng Chính

### 🔐 Hệ Thống Phân Quyền
- **Customer**: Gửi phản hồi, xem lịch sử cá nhân
- **Moderator**: Xử lý phản hồi, phân công công việc
- **Admin**: Quản lý toàn bộ hệ thống

### 📡 Real-time Features
- WebSocket cho thông báo tức thì
- Live dashboard với số liệu thống kê
- Real-time status updates
- Typing indicators

### 🧠 AI & Analytics
- Phân tích cảm xúc (Sentiment Analysis)
- Phân loại chủ đề tự động
- Gợi ý danh mục
- Dashboard với biểu đồ tương tác

### 🛡️ Bảo Mật
- JWT Authentication
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection

## 🚀 Cài Đặt và Chạy

### Yêu Cầu Hệ Thống
- Node.js 18+
- Python 3.11+
- MongoDB 7.0+
- Redis 7.0+
- Docker & Docker Compose

### 🐳 Chạy với Docker (Khuyến nghị)

1. **Clone repository**
```bash
git clone <repository-url>
cd feedback_system
```

2. **Cấu hình environment**
```bash
# Copy và chỉnh sửa các file .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. **Khởi động toàn bộ hệ thống**
```bash
docker-compose up -d
```

4. **Kiểm tra services**
```bash
docker-compose ps
```

### 📋 URLs Truy Cập
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **NLP Service**: http://localhost:8000
- **MongoDB Express**: http://localhost:8081
- **Redis Commander**: http://localhost:8082

### 👤 Tài Khoản Mặc Định
- **Email**: admin@hutech.edu.vn
- **Password**: admin123

## 🛠️ Development Setup

### Backend Development
```bash
cd backend
npm install
npm run dev
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

### NLP Service Development
```bash
cd backend/services
pip install -r requirements.txt
uvicorn nlpService:app --reload
```

## 📊 Cơ Sở Dữ Liệu (MongoDB - 3NF)

### Collections Overview
1. **users** - Thông tin người dùng và xác thực
2. **customers** - Hồ sơ khách hàng chi tiết
3. **feedbackcategories** - Danh mục phản hồi
4. **feedbacks** - Phản hồi chính
5. **feedbackhistory** - Lịch sử thay đổi
6. **analytics** - Dữ liệu thống kê
7. **notifications** - Thông báo hệ thống
8. **feedbackcategorymappings** - Mapping nhiều-nhiều

### Indexes Tối Ưu
```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1, isActive: 1 })

// Feedbacks
db.feedbacks.createIndex({ customerId: 1, createdAt: -1 })
db.feedbacks.createIndex({ status: 1, priority: 1 })
db.feedbacks.createIndex({ title: "text", content: "text" })
```

## 🔧 API Documentation

### Authentication Endpoints
```
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
PUT  /api/auth/profile
```

### Feedback Endpoints
```
GET    /api/feedback
POST   /api/feedback
GET    /api/feedback/:id
PUT    /api/feedback/:id
DELETE /api/feedback/:id
POST   /api/feedback/:id/assign
```

### Categories Endpoints
```
GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id
```

## 📈 Monitoring và Performance

### Health Checks
- **Backend**: http://localhost:3001/health
- **NLP Service**: http://localhost:8000/health
- **Database**: MongoDB connection status
- **Cache**: Redis connection status

### Performance Metrics
- Response time < 200ms cho API calls
- WebSocket latency < 50ms
- Database query optimization với indexes
- Redis caching cho dữ liệu thường xuyên truy cập

## 🔄 WebSocket Events

### Client Events
```javascript
// Authentication
socket.emit('authenticate', { token, userId })

// Feedback management
socket.emit('submit_feedback', feedbackData)
socket.emit('join_feedback', feedbackId)
socket.emit('send_comment', { feedbackId, comment })
```

### Server Events
```javascript
// Real-time updates
socket.on('newFeedback', handleNewFeedback)
socket.on('feedbackUpdated', handleFeedbackUpdate)
socket.on('new_comment', handleNewComment)
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Load Testing
```bash
# Sử dụng Artillery cho load testing
npm install -g artillery
artillery run load-test.yml
```

## 📦 Deployment

### Production Environment
1. **Set environment variables**
```bash
NODE_ENV=production
MONGODB_URI=mongodb://production-db:27017/feedback_system
JWT_SECRET=your-production-secret
```

2. **Build và deploy**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

3. **SSL Configuration**
```bash
# Cấu hình SSL certificate trong nginx/ssl/
# Uncomment HTTPS server block trong nginx.conf
```

## 🔍 Troubleshooting

### Common Issues

1. **MongoDB connection failed**
```bash
# Kiểm tra MongoDB service
docker-compose logs mongodb
```

2. **Redis connection timeout**
```bash
# Restart Redis service
docker-compose restart redis
```

3. **NLP service slow startup**
```bash
# NLP models cần thời gian download
docker-compose logs nlp-service
```

4. **WebSocket connection failed**
```bash
# Kiểm tra CORS settings
# Verify Socket.IO configuration
```

## 📝 Tối Ưu Hóa

### Performance Tips
1. **Database Optimization**
   - Sử dụng indexes phù hợp
   - Aggregation pipeline thay vì multiple queries
   - Connection pooling

2. **Caching Strategy**
   - Redis cho session data
   - Browser caching cho static files
   - API response caching

3. **Frontend Optimization**
   - Code splitting
   - Lazy loading
   - Image optimization

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 👥 Team

- **Developer**: HUTECH Development Team
- **Email**: support@hutech.edu.vn
- **Version**: 1.0.0

## 🔮 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Email notifications
- [ ] File attachment support
- [ ] Integration với social media
- [ ] Machine learning cho auto-assignment

---

**🎉 Chúc mừng! Bạn đã setup thành công hệ thống Feedback Management System!**

## 🔧 Cài Đặt Docker Desktop cho Windows

### Bước 1: Download Docker Desktop
1. Truy cập: https://www.docker.com/products/docker-desktop/
2. Download "Docker Desktop for Windows"
3. Chạy file installer và làm theo hướng dẫn

### Bước 2: Cấu hình Docker
1. Khởi động Docker Desktop
2. Enable WSL 2 backend (nếu được hỏi)
3. Đợi Docker khởi động hoàn tất

### Bước 3: Kiểm tra cài đặt
```powershell
docker --version
docker-compose --version
```

## 🏃‍♂️ Setup Manual (Không cần Docker)

Nếu không muốn cài Docker, bạn có thể chạy từng service riêng biệt:

### 1. Cài đặt Prerequisites
- **Node.js 18+**: https://nodejs.org/
- **Python 3.11+**: https://python.org/
- **MongoDB Community**: https://www.mongodb.com/try/download/community
- **Redis**: https://github.com/microsoftarchive/redis/releases

### 2. Setup Backend
```powershell
cd backend
npm install
# Tạo file .env với MongoDB và Redis URLs
npm run dev
```

### 3. Setup Frontend  
```powershell
cd frontend
npm install
npm start
```

### 4. Setup NLP Service
```powershell
cd backend/services
pip install -r requirements.txt
uvicorn nlpService:app --reload --port 8000
```

### 5. Environment Variables
Tạo các file .env sau:

**backend/.env**
```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/feedback_system
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key-change-in-production
```

**frontend/.env**
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SOCKET_URL=http://localhost:3001
```
