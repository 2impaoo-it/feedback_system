@echo off
echo ========================================
echo HUTECH Feedback System - Manual Setup
echo ========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed!
    echo Please download and install Python from: https://python.org/
    echo.
    pause
    exit /b 1
)

echo [INFO] Prerequisites check passed!
echo.

:: Create environment files
echo [STEP 1] Creating environment files...

:: Backend .env
if not exist "backend\.env" (
    echo NODE_ENV=development > backend\.env
    echo PORT=3001 >> backend\.env
    echo MONGODB_URI=mongodb://localhost:27017/feedback_system >> backend\.env
    echo REDIS_URL=redis://localhost:6379 >> backend\.env
    echo JWT_SECRET=your-super-secret-key-change-in-production >> backend\.env
    echo JWT_EXPIRE=7d >> backend\.env
    echo BCRYPT_ROUNDS=12 >> backend\.env
    echo RATE_LIMIT_WINDOW=15 >> backend\.env
    echo RATE_LIMIT_MAX=100 >> backend\.env
    echo NLP_SERVICE_URL=http://localhost:8000 >> backend\.env
    echo [SUCCESS] Created backend/.env
) else (
    echo [INFO] backend/.env already exists
)

:: Frontend .env
if not exist "frontend\.env" (
    echo REACT_APP_API_URL=http://localhost:3001 > frontend\.env
    echo REACT_APP_SOCKET_URL=http://localhost:3001 >> frontend\.env
    echo GENERATE_SOURCEMAP=false >> frontend\.env
    echo [SUCCESS] Created frontend/.env
) else (
    echo [INFO] frontend/.env already exists
)

echo.
echo [STEP 2] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies!
    pause
    exit /b 1
)
cd ..

echo.
echo [STEP 3] Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies!
    pause
    exit /b 1
)
cd ..

echo.
echo [STEP 4] Installing NLP service dependencies...
cd backend\services
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install NLP dependencies!
    pause
    exit /b 1
)
cd ..\..

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo IMPORTANT: Before running the application:
echo 1. Install and start MongoDB: https://www.mongodb.com/try/download/community
echo 2. Install and start Redis: https://github.com/microsoftarchive/redis/releases
echo.
echo To start the application:
echo 1. Run: start-services.bat
echo 2. Or manually start each service:
echo    - Backend: cd backend ^&^& npm run dev
echo    - Frontend: cd frontend ^&^& npm start  
echo    - NLP: cd backend\services ^&^& uvicorn nlpService:app --reload --port 8000
echo.
pause
