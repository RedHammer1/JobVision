@echo off
echo ========================================
echo  JobVision - Installing Dependencies
echo ========================================

:: Get the directory where this script is located
set "ROOT_DIR=%~dp0"

:: Install backend dependencies
echo [1/2] Installing Backend Dependencies...
cd /d "%ROOT_DIR%backend"
echo Installing backend packages...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend installation failed!
    pause
    exit /b %errorlevel%
)
echo Backend dependencies installed successfully!

:: Return to root directory
cd /d "%ROOT_DIR%"

:: Install frontend dependencies
echo [2/2] Installing Frontend Dependencies...
cd /d "%ROOT_DIR%frontend"
echo Installing frontend packages...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend installation failed!
    pause
    exit /b %errorlevel%
)
echo Frontend dependencies installed successfully!

:: Return to root directory
cd /d "%ROOT_DIR%"

echo ========================================
echo  All dependencies installed successfully!
echo  Backend:  %ROOT_DIR%backend
echo  Frontend: %ROOT_DIR%frontend
echo ========================================
echo.
echo Press any key to close this window...
pause >nul