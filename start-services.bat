@echo off
echo ========================================
echo Starting HUTECH Feedback System Services
echo ========================================
echo.

:: Check if MongoDB is running
echo [INFO] Checking MongoDB connection...
timeout /t 2 /nobreak >nul

:: Check if Redis is running  
echo [INFO] Checking Redis connection...
timeout /t 2 /nobreak >nul

echo [INFO] Starting services...
echo.

:: Start NLP Service
echo [STEP 1] Starting NLP Service on port 8000...
start "NLP Service" cmd /k "cd backend\services && uvicorn nlpService:app --reload --port 8000"
timeout /t 3 /nobreak >nul

:: Start Backend API
echo [STEP 2] Starting Backend API on port 3001...
start "Backend API" cmd /k "cd backend && npm run dev"
timeout /t 5 /nobreak >nul

:: Start Frontend
echo [STEP 3] Starting Frontend on port 3000...
start "Frontend" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo Services are starting...
echo ========================================
echo.
echo Check the opened terminal windows for each service.
echo.
echo Access URLs:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:3001
echo - NLP Service: http://localhost:8000
echo.
echo Default login:
echo - Email: admin@hutech.edu.vn
echo - Password: admin123
echo.
echo Press any key to exit...
pause >nul
