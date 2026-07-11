@echo off
echo ========================================
echo  JobVision - Starting Application
echo ========================================

:: Get the directory where this script is located
set "ROOT_DIR=%~dp0"

:: Start backend
echo [1/2] Starting Backend...
cd /d "%ROOT_DIR%backend"
start "JobVision Backend" cmd /k "npm run dev"

:: Return to root directory
cd /d "%ROOT_DIR%"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

:: Start frontend
echo [2/2] Starting Frontend...
cd /d "%ROOT_DIR%frontend"
start "JobVision Frontend" cmd /k "npm run dev"

:: Return to root directory
cd /d "%ROOT_DIR%"

echo Press any key to close this window...
pause >nul