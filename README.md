# 🎯 Hệ Thống Quản Lý Phản Hồi Khách Hàng HUTECH

Một hệ thống web hoàn chỉnh để quản lý phản hồi khách hàng với khả năng xử lý thời gian thực, phân tích NLP, và dashboard thống kê dành riêng cho HUTECH.

## 🚀 Khởi Chạy Nhanh với Docker

### 📋 Yêu Cầu Hệ Thống
- **Docker**: Version 20.0+ 
- **Docker Compose**: Version 2.0+
- **RAM**: Tối thiểu 4GB (khuyến nghị 8GB)
- **Disk**: Tối thiểu 2GB dung lượng trống
- **OS**: Windows 10/11, macOS, hoặc Linux

### ⚡ Cài Đặt và Chạy (1 Phút)

```bash
# 1. Clone repository
git clone https://github.com/2impaoo-it/feedback_system.git
cd feedback_system

# 2. Khởi động tất cả services (1 lệnh duy nhất)
docker-compose up -d

# 3. Truy cập ứng dụng
# Frontend: http://localhost:3000
# API: http://localhost:3001
# MongoDB Express: http://localhost:8081
# Redis Commander: http://localhost:8082
```

### 🔧 Cấu Hình Môi Trường (Tùy Chọn)

Tạo file `.env` để tùy chỉnh:
```env
# Database
MONGODB_URI=mongodb://admin:password123@localhost:27017/feedback_system?authSource=admin

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (Tùy chọn)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Redis
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=development
```

### 📊 Các Service và Port

| Service | Port | URL | Mô Tả |
|---------|------|-----|-------|
| **Frontend** | 3000 | http://localhost:3000 | Giao diện người dùng React |
| **Backend API** | 3001 | http://localhost:3001 | REST API + WebSocket |
| **MongoDB** | 27017 | - | Database chính |
| **Redis** | 6379 | - | Cache và Session |
| **Mongo Express** | 8081 | http://localhost:8081 | Quản lý database GUI |
| **Redis Commander** | 8082 | http://localhost:8082 | Quản lý Redis GUI |
| **NLP Service** | 8000 | http://localhost:8000 | AI/ML Processing |
| **Nginx** | 80, 443 | http://localhost | Reverse Proxy |

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   🖥️ Frontend    │    │   ⚙️ Backend     │    │  🤖 NLP Service │
│   React.js      │◄──►│   Node.js       │◄──►│   Python/FastAPI│
│   Tailwind CSS  │    │   Express.js    │    │   Transformers  │
│   Socket.IO     │    │   Socket.IO     │    │   Sentiment AI  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  🌐 Nginx Proxy │
                    │  Load Balancer  │
                    │  SSL/TLS        │
                    └─────────────────┘
                                 │
                    ┌─────────────────────────────────┐
                    │         💾 Data Layer           │
                    │  ┌─────────────┐ ┌───────────┐  │
                    │  │ 🗄️ MongoDB │ │ � Redis  │  │
                    │  │  Database   │ │   Cache   │  │
                    │  └─────────────┘ └───────────┘  │
                    └─────────────────────────────────┘
```
## ✨ Tính Năng Chính

### 🔐 Hệ Thống Phân Quyền
- **SuperAdmin**: Quản lý người dùng, phân quyền roles
- **Admin**: Quản lý feedback, trả lời phản hồi khách hàng  
- **Customer**: Gửi phản hồi, xem lịch sử cá nhân

### 📡 Real-time Features
- WebSocket cho thông báo tức thì
- Live dashboard với số liệu thống kê
- Real-time status updates và typing indicators

### 🧠 AI & Analytics
- Phân tích cảm xúc (Sentiment Analysis)
- Phân loại chủ đề tự động
- Dashboard với biểu đồ tương tác
- Báo cáo thống kê chi tiết

### 🛡️ Bảo Mật
- JWT Authentication với session management
- Rate limiting để chống spam
- Input validation và sanitization
- Role-based access control (RBAC)

## 🎮 Hướng Dẫn Sử Dụng

### 🔑 Tài Khoản Mặc Định

| Role | Email | Password | Mô Tả |
|------|-------|----------|-------|
| **Admin** | admin@example.com | admin123 | Quản lý feedback, trả lời khách hàng |
| **SuperAdmin** | Tạo qua UI | - | Quản lý users và phân quyền |

### � Quy Trình Sử Dụng

1. **Khách Hàng Gửi Feedback**
   - Truy cập http://localhost:3000
   - Đăng ký/Đăng nhập tài khoản
   - Gửi feedback với mô tả chi tiết

2. **Admin Xử Lý Feedback**  
   - Đăng nhập với tài khoản admin
   - Xem danh sách "Tất cả phản hồi"
   - Click vào feedback để xem chi tiết
   - Trả lời feedback của khách hàng
   - Cập nhật trạng thái (Pending → Resolved)

3. **SuperAdmin Quản Lý Users**
   - Tạo tài khoản SuperAdmin qua UI
   - Quản lý danh sách users
   - Phân quyền roles (Admin/Customer)

## 🛠️ Lệnh Docker Hữu Ích

```bash
# Khởi động tất cả services
docker-compose up -d

# Xem logs của tất cả services
docker-compose logs -f

# Xem logs của service cụ thể
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart service cụ thể
docker-compose restart backend

# Stop tất cả services
docker-compose down

# Stop và xóa toàn bộ data
docker-compose down -v

# Rebuild images khi có thay đổi code
docker-compose up -d --build

# Xem trạng thái các services
docker-compose ps

# Vào container để debug
docker-compose exec backend bash
docker-compose exec mongodb mongosh
```

## 🐛 Xử Lý Sự Cố

### ❌ Lỗi Thường Gặp

**1. Port đã được sử dụng**
```bash
# Kiểm tra port đang sử dụng
netstat -tlnp | grep :3000
# Hoặc trên Windows
netstat -an | findstr :3000

# Dừng process đang dùng port
sudo kill -9 <PID>
```

**2. Database connection failed**
```bash
# Kiểm tra MongoDB container
docker-compose logs mongodb

# Restart database
docker-compose restart mongodb
```

**3. Frontend không load được**
```bash
# Clear browser cache và cookies
# Hoặc thử truy cập chế độ ẩn danh

# Kiểm tra logs frontend
docker-compose logs frontend
```

**4. API không response**
```bash
# Kiểm tra backend logs
docker-compose logs backend

# Test API trực tiếp
curl http://localhost:3001/api/health
```

### � Reset Toàn Bộ Hệ Thống

```bash
# Dừng và xóa tất cả containers + data
docker-compose down -v --remove-orphans

# Xóa images (nếu cần)
docker system prune -a

# Khởi động lại từ đầu
docker-compose up -d --build
```
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

## 🔧 Development (Tùy Chọn)

### Chạy Development Mode
```bash
# Chỉ chạy database services
docker-compose up -d mongodb redis

# Chạy backend trong dev mode
cd backend
npm install
npm run dev

# Chạy frontend trong dev mode  
cd frontend
npm install
npm start

# Chạy NLP service
cd backend/services
pip install -r requirements.txt
uvicorn nlpService:app --reload --host 0.0.0.0 --port 8000
```

## 📊 Cơ Sở Dữ Liệu

### 🗄️ MongoDB Collections
- **users**: Thông tin đăng nhập và phân quyền
- **customers**: Hồ sơ khách hàng chi tiết  
- **feedback**: Nội dung phản hồi chính
- **notifications**: Thông báo hệ thống
- **categories**: Danh mục phân loại

### 🚀 Redis Cache
- **sessions**: Quản lý phiên đăng nhập
- **rate_limit**: Giới hạn request
- **real_time**: Dữ liệu thời gian thực

## � API Endpoints

### 🔐 Authentication
```http
POST /api/auth/login          # Đăng nhập
POST /api/auth/register       # Đăng ký
GET  /api/auth/me             # Thông tin user
POST /api/auth/logout         # Đăng xuất
```

### 💬 Feedback Management  
```http
GET    /api/feedback          # Danh sách feedback
POST   /api/feedback          # Tạo feedback mới
GET    /api/feedback/:id      # Chi tiết feedback
POST   /api/feedback/:id/reply # Admin trả lời feedback
PUT    /api/feedback/:id/status # Cập nhật trạng thái
```

### 👥 User Management (SuperAdmin only)
```http
GET    /api/users             # Danh sách users
PUT    /api/users/:id/role    # Cập nhật role
DELETE /api/users/:id         # Xóa user
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
## 🌐 WebSocket Events

### Client Events (Frontend → Backend)
```javascript
// Kết nối với authentication
socket.emit('authenticate', { token: 'jwt-token' })

// Join room theo role
socket.emit('join', { room: 'admin' })
```

### Server Events (Backend → Frontend)  
```javascript
// Real-time updates
socket.on('newFeedback', handleNewFeedback)
socket.on('feedbackReplied', handleFeedbackReply)  
socket.on('statusUpdated', handleStatusUpdate)
socket.on('notification', handleNotification)
```

## 🧪 Testing

### Health Check
```bash
# Kiểm tra tất cả services
curl http://localhost:3001/api/health
curl http://localhost:8000/health

# Test WebSocket connection
# Mở browser console tại http://localhost:3000
# Kiểm tra network tab cho WebSocket connection
```

### Database Testing
```bash
# Truy cập MongoDB
docker-compose exec mongodb mongosh -u admin -p password123

# Kiểm tra collections
use feedback_system
show collections
db.users.find()
```

## � Production Deployment

### 📋 Checklist Trước Khi Deploy

- [ ] Thay đổi JWT_SECRET thành key mạnh
- [ ] Cấu hình HTTPS/SSL certificates  
- [ ] Setup backup tự động cho MongoDB
- [ ] Cấu hình monitoring và logging
- [ ] Test load balancing
- [ ] Kiểm tra security headers

### 🏭 Production Commands
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Monitor logs
docker-compose -f docker-compose.prod.yml logs -f

# Health check
curl https://your-domain.com/api/health
```

### � Monitoring
```bash
# Xem resource usage
docker stats

# Backup database
docker-compose exec mongodb mongodump --uri="mongodb://admin:password123@localhost:27017/feedback_system" --out=/backup

# View system metrics
docker-compose exec backend pm2 monit
```

## 🤝 Đóng Góp

### 🛠️ Setup Development Environment
```bash
# Clone và setup
git clone https://github.com/2impaoo-it/feedback_system.git
cd feedback_system

# Tạo branch mới cho feature
git checkout -b feature/ten-tinh-nang-moi

# Chạy development mode
docker-compose up -d mongodb redis
cd backend && npm run dev
cd frontend && npm start
```

### 📝 Quy Tắc Commit
```bash
# Format commit message
feat: thêm tính năng reply feedback
fix: sửa lỗi validation
docs: cập nhật README
style: format code
refactor: tối ưu query database
test: thêm unit tests
```

## 📞 Hỗ Trợ

### 🐛 Báo Lỗi
- Tạo issue tại [GitHub Issues](https://github.com/2impaoo-it/feedback_system/issues)
- Cung cấp logs và steps để reproduce
- Thông tin OS, Docker version

### 💬 Thảo Luận
- [GitHub Discussions](https://github.com/2impaoo-it/feedback_system/discussions)
- Email: support@hutech.edu.vn

### 📚 Tài Liệu Thêm
- [API Documentation](http://localhost:3001/api-docs)  
- [Architecture Decision Records](./docs/adr/)
- [Database Schema](./docs/database-schema.md)

---

## ⭐ Cảm ơn

Hệ thống được phát triển cho HUTECH với mục tiêu cải thiện trải nghiệm phản hồi của sinh viên và cán bộ.

**Made with ❤️ by HUTECH IT Team**

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
