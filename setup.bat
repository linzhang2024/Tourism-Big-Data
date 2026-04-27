@echo off
REM ========================================
REM Tourism Big Data Platform Setup Script
REM ========================================

SETLOCAL ENABLEDELAYEDEXPANSION

REM Set project root directory (where this script is located)
SET "PROJECT_ROOT=%~dp0"
SET "BACKEND_DIR=%PROJECT_ROOT%backend"
SET "FRONTEND_DIR=%PROJECT_ROOT%frontend"

echo.
echo ========================================
echo   Tourism Big Data Platform Setup
echo ========================================
echo.

REM ========================================
REM Step 1: Check System Requirements
REM ========================================
echo [1/4] Checking system requirements...
echo.

REM Check Python
echo Checking Python...
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found. Please install Python 3.8+
    echo Download: https://www.python.org/downloads/
    EXIT /B 1
)

FOR /F "tokens=2" %%i IN ('python --version 2^>^&1') DO (
    SET "PYTHON_VERSION=%%i"
)
echo [OK] Python version: %PYTHON_VERSION%

REM Check Node.js
echo.
echo Checking Node.js...
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found. Please install Node.js 16+
    echo Download: https://nodejs.org/
    EXIT /B 1
)

FOR /F "tokens=*" %%i IN ('node --version 2^>^&1') DO (
    SET "NODE_VERSION=%%i"
)
echo [OK] Node.js version: %NODE_VERSION%

REM Check npm
echo.
echo Checking npm...
npm --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not found. Please check your Node.js installation.
    EXIT /B 1
)

FOR /F "tokens=*" %%i IN ('npm --version 2^>^&1') DO (
    SET "NPM_VERSION=%%i"
)
echo [OK] npm version: %NPM_VERSION%

REM ========================================
REM Step 2: Install Backend Dependencies
REM ========================================
echo.
echo [2/4] Installing backend dependencies...
echo.

REM Check if backend directory exists
IF NOT EXIST "%BACKEND_DIR%" (
    echo [ERROR] Backend directory not found: %BACKEND_DIR%
    EXIT /B 1
)

echo Backend directory: %BACKEND_DIR%

REM Check requirements file
SET "REQ_FILE=%BACKEND_DIR%\requirements-backend.txt"
IF NOT EXIST "%REQ_FILE%" (
    echo [WARNING] requirements-backend.txt not found, trying requirements.txt
    SET "REQ_FILE=%BACKEND_DIR%\requirements.txt"
    IF NOT EXIST "%REQ_FILE%" (
        echo [ERROR] No requirements file found in backend directory
        EXIT /B 1
    )
)

echo Requirements file: %REQ_FILE%

REM Upgrade pip first
echo.
echo Upgrading pip...
python -m pip install --upgrade pip
IF %ERRORLEVEL% NEQ 0 (
    echo [WARNING] pip upgrade failed, continuing anyway...
) ELSE (
    echo [OK] pip upgraded successfully
)

REM Install backend dependencies
echo.
echo Installing backend dependencies (this may take a few minutes)...
pip install -r "%REQ_FILE%"
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Backend dependencies installation failed
    echo Please check your network connection and try again
    echo Or run: pip install -r "%REQ_FILE%"
    EXIT /B 1
)

echo [OK] Backend dependencies installed successfully

REM Install root requirements if exists
SET "ROOT_REQ=%PROJECT_ROOT%requirements.txt"
IF EXIST "%ROOT_REQ%" (
    echo.
    echo Installing root requirements...
    pip install -r "%ROOT_REQ%"
    IF %ERRORLEVEL% NEQ 0 (
        echo [WARNING] Root requirements installation failed, but core features should work
    ) ELSE (
        echo [OK] Root requirements installed
    )
)

REM ========================================
REM Step 3: Install Frontend Dependencies
REM ========================================
echo.
echo [3/4] Installing frontend dependencies...
echo.

REM Check if frontend directory exists
IF NOT EXIST "%FRONTEND_DIR%" (
    echo [ERROR] Frontend directory not found: %FRONTEND_DIR%
    EXIT /B 1
)

echo Frontend directory: %FRONTEND_DIR%

REM Check package.json
IF NOT EXIST "%FRONTEND_DIR%\package.json" (
    echo [ERROR] package.json not found in frontend directory
    EXIT /B 1
)

echo Installing frontend dependencies (this may take a few minutes)...
cd /d "%FRONTEND_DIR%"

npm install
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Frontend dependencies installation failed
    echo Please check:
    echo   1. Your network connection
    echo   2. Try using China mirror: npm config set registry https://registry.npmmirror.com
    echo   3. Then run: npm install
    EXIT /B 1
)

echo [OK] Frontend dependencies installed successfully

REM ========================================
REM Step 4: Verify Installation
REM ========================================
echo.
echo [4/4] Verifying installation...
echo.

REM Verify backend
echo Verifying backend dependencies...

REM Check FastAPI
python -c "import fastapi; print(fastapi.__version__)" >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [WARNING] FastAPI import failed
) ELSE (
    FOR /F "tokens=*" %%i IN ('python -c "import fastapi; print(fastapi.__version__)" 2^>^&1') DO (
        echo [OK] FastAPI version: %%i
    )
)

REM Check Uvicorn
python -c "import uvicorn; print(uvicorn.__version__)" >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Uvicorn import failed
) ELSE (
    FOR /F "tokens=*" %%i IN ('python -c "import uvicorn; print(uvicorn.__version__)" 2^>^&1') DO (
        echo [OK] Uvicorn version: %%i
    )
)

REM Check httpx
python -c "import httpx; print(httpx.__version__)" >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [WARNING] httpx import failed
) ELSE (
    FOR /F "tokens=*" %%i IN ('python -c "import httpx; print(httpx.__version__)" 2^>^&1') DO (
        echo [OK] httpx version: %%i
    )
)

REM Verify frontend
echo.
echo Verifying frontend dependencies...

IF EXIST "%FRONTEND_DIR%\node_modules" (
    echo [OK] node_modules directory exists
    
    REM Check React
    IF EXIST "%FRONTEND_DIR%\node_modules\react" (
        echo [OK] React is installed
    )
    
    REM Check TypeScript
    IF EXIST "%FRONTEND_DIR%\node_modules\typescript" (
        echo [OK] TypeScript is installed
    )
    
    REM Check Vite
    IF EXIST "%FRONTEND_DIR%\node_modules\vite" (
        echo [OK] Vite is installed
    )
) ELSE (
    echo [WARNING] node_modules directory not found
)

REM ========================================
REM Summary
REM ========================================
echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo Next steps:
echo.
echo 1. Start backend service:
echo    cd /d "%BACKEND_DIR%"
echo    python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
echo.
echo 2. Start frontend service (new terminal):
echo    cd /d "%FRONTEND_DIR%"
echo    npm run dev
echo.
echo 3. Run health check:
echo    cd /d "%FRONTEND_DIR%"
echo    npm run health
echo    OR
echo    python "%PROJECT_ROOT%scripts\health_check.py"
echo.
echo 4. Access the application:
echo    Frontend: http://127.0.0.1:3000
echo    Backend API docs: http://127.0.0.1:8000/docs
echo.
echo ========================================
echo.

REM Ask user if they want to start services now
SET /P START_SERVICES="Start services now? (y/n): "

IF /I "%START_SERVICES%"=="y" (
    echo.
    echo Starting backend service...
    cd /d "%BACKEND_DIR%"
    start cmd /k "title Backend - FastAPI && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
    echo [OK] Backend service started in new window
    echo.
    
    echo Starting frontend service...
    cd /d "%FRONTEND_DIR%"
    start cmd /k "title Frontend - React + Vite && npm run dev"
    echo [OK] Frontend service started in new window
    echo.
    
    echo Both services are starting...
    echo Frontend: http://127.0.0.1:3000
    echo Backend API: http://127.0.0.1:8000/docs
) ELSE (
    echo.
    echo Installation complete. You can start services manually using the commands above.
)

echo.
pause
