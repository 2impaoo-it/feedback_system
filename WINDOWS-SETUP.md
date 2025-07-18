# 🚀 Quick Start Guide cho Windows (Không cần Docker)

## ⚡ Cách 1: Automatic Setup

### Bước 1: Chạy script setup tự động
```powershell
# Mở PowerShell as Administrator và chạy:
.\setup-manual.bat
```

### Bước 2: Cài đặt MongoDB và Redis
1. **MongoDB**: https://www.mongodb.com/try/download/community
2. **Redis**: https://github.com/microsoftarchive/redis/releases

### Bước 3: Khởi động services
```powershell
.\start-services.bat
```

## 🔧 Cách 2: Manual Setup

### Prerequisites
- Node.js 18+ từ https://nodejs.org/
- Python 3.11+ từ https://python.org/
- MongoDB Community từ https://www.mongodb.com/
- Redis từ https://github.com/microsoftarchive/redis/releases

### 1. Tạo Environment Files

**backend/.env**
```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/feedback_system
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key-change-in-production
NLP_SERVICE_URL=http://localhost:8000
```

**frontend/.env**
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SOCKET_URL=http://localhost:3001
```

### 2. Cài đặt Dependencies

```powershell
# Backend
cd backend
npm install

# Frontend  
cd ../frontend
npm install

# NLP Service
cd ../backend/services
pip install -r requirements.txt
```

### 3. Khởi động Services (3 terminal windows)

**Terminal 1: NLP Service**
```powershell
cd backend/services
uvicorn nlpService:app --reload --port 8000
```

**Terminal 2: Backend API**
```powershell
cd backend
npm run dev
```

**Terminal 3: Frontend**
```powershell
cd frontend
npm start
```

## 📋 Access URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001  
- **NLP Service**: http://localhost:8000

## 👤 Default Login
- **Email**: admin@hutech.edu.vn
- **Password**: admin123

## 🔍 Troubleshooting

### MongoDB Connection Error
```powershell
# Khởi động MongoDB service
net start MongoDB
```

### Redis Connection Error
```powershell
# Khởi động Redis service (nếu cài như Windows Service)
net start Redis
```

### Port Already in Use
```powershell
# Kiểm tra ports đang sử dụng
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :8000
```

## 🐳 Hoặc Cài Docker Desktop (Khuyến nghị)

1. Download từ: https://www.docker.com/products/docker-desktop/
2. Cài đặt và khởi động Docker Desktop
3. Chạy: `docker-compose up -d`
