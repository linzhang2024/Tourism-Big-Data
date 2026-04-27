@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   旅游趋势分析平台 - 一键安装脚本
echo ========================================
echo.

REM 设置项目根目录
set PROJECT_ROOT=%~dp0
set BACKEND_DIR=%PROJECT_ROOT%backend
set FRONTEND_DIR=%PROJECT_ROOT%frontend

echo [1/4] 检查系统环境...
echo.

REM 检查 Python
echo 检查 Python 环境...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python，请先安装 Python 3.8+
    echo 下载地址: https://www.python.org/downloads/
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do (
    set PYTHON_VERSION=%%i
)
echo [OK] Python 版本: %PYTHON_VERSION%

REM 检查 Node.js
echo.
echo 检查 Node.js 环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 16+
    echo 下载地址: https://nodejs.org/
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version 2^>^&1') do (
    set NODE_VERSION=%%i
)
echo [OK] Node.js 版本: %NODE_VERSION%

REM 检查 npm
echo.
echo 检查 npm 环境...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 npm，可能是 Node.js 安装不完整
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version 2^>^&1') do (
    set NPM_VERSION=%%i
)
echo [OK] npm 版本: %NPM_VERSION%

echo.
echo [2/4] 安装后端 Python 依赖...
echo.

REM 检查后端目录
if not exist "%BACKEND_DIR%" (
    echo [错误] 后端目录不存在: %BACKEND_DIR%
    exit /b 1
)

echo 进入后端目录: %BACKEND_DIR%
cd /d "%BACKEND_DIR%"

REM 检查依赖文件
if not exist "requirements-backend.txt" (
    echo [警告] 未找到 requirements-backend.txt，尝试查找其他依赖文件...
    if exist "requirements.txt" (
        echo [OK] 找到 requirements.txt
        set REQ_FILE=requirements.txt
    ) else (
        echo [错误] 未找到任何依赖文件
        exit /b 1
    )
) else (
    set REQ_FILE=requirements-backend.txt
)

echo 安装依赖文件: %REQ_FILE%
echo.

REM 升级 pip
echo 升级 pip...
python -m pip install --upgrade pip >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] pip 升级失败，继续安装依赖...
) else (
    echo [OK] pip 已升级
)

echo.
echo 安装后端依赖...
pip install -r "%REQ_FILE%"
if %errorlevel% neq 0 (
    echo.
    echo [错误] 后端依赖安装失败
    echo 请检查网络连接或尝试手动安装: pip install -r %REQ_FILE%
    exit /b 1
)

echo.
echo [OK] 后端依赖安装完成

REM 检查根目录的 requirements.txt
if exist "%PROJECT_ROOT%requirements.txt" (
    echo.
    echo 检查根目录依赖...
    cd /d "%PROJECT_ROOT%"
    pip install -r requirements.txt >nul 2>&1
    if %errorlevel% neq 0 (
        echo [警告] 根目录依赖安装失败，但不影响核心功能
    ) else (
        echo [OK] 根目录依赖安装完成
    )
)

echo.
echo [3/4] 安装前端 npm 依赖...
echo.

REM 检查前端目录
if not exist "%FRONTEND_DIR%" (
    echo [错误] 前端目录不存在: %FRONTEND_DIR%
    exit /b 1
)

echo 进入前端目录: %FRONTEND_DIR%
cd /d "%FRONTEND_DIR%"

REM 检查 package.json
if not exist "package.json" (
    echo [错误] 未找到 package.json
    exit /b 1
)

echo 检查 package.json 配置...
echo.

REM 安装依赖
echo 安装前端依赖（这可能需要几分钟时间）...
echo.

npm install
if %errorlevel% neq 0 (
    echo.
    echo [错误] 前端依赖安装失败
    echo 请检查:
    echo   1. 网络连接是否正常
    echo   2. 尝试使用淘宝镜像: npm config set registry https://registry.npmmirror.com
    echo   3. 然后重新运行: npm install
    exit /b 1
)

echo.
echo [OK] 前端依赖安装完成

echo.
echo [4/4] 验证安装结果...
echo.

REM 验证后端依赖
echo 验证后端依赖...
cd /d "%BACKEND_DIR%"

REM 检查关键依赖
python -c "import fastapi; print(f'FastAPI: {fastapi.__version__}')" >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] FastAPI 导入失败
    set BACKEND_OK=0
) else (
    for /f "tokens=*" %%i in ('python -c "import fastapi; print(fastapi.__version__)" 2^>^&1') do (
        echo [OK] FastAPI 版本: %%i
    )
    set BACKEND_OK=1
)

python -c "import uvicorn; print(uvicorn.__version__)" >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] Uvicorn 导入失败
    set BACKEND_OK=0
) else (
    for /f "tokens=*" %%i in ('python -c "import uvicorn; print(uvicorn.__version__)" 2^>^&1') do (
        echo [OK] Uvicorn 版本: %%i
    )
)

python -c "import httpx; print(httpx.__version__)" >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] httpx 导入失败
    set BACKEND_OK=0
) else (
    for /f "tokens=*" %%i in ('python -c "import httpx; print(httpx.__version__)" 2^>^&1') do (
        echo [OK] httpx 版本: %%i
    )
)

REM 验证前端依赖
echo.
echo 验证前端依赖...
cd /d "%FRONTEND_DIR%"

if exist "node_modules" (
    echo [OK] node_modules 目录存在
    
    REM 检查关键依赖
    if exist "node_modules\react" (
        for /f "tokens=2 delims==^"" %%i in ('findstr /C:"version" node_modules\react\package.json 2^>^&1') do (
            echo [OK] React 已安装
        )
    )
    
    if exist "node_modules\typescript" (
        echo [OK] TypeScript 已安装
    )
    
    if exist "node_modules\vite" (
        echo [OK] Vite 已安装
    )
    
    set FRONTEND_OK=1
) else (
    echo [警告] node_modules 目录不存在
    set FRONTEND_OK=0
)

echo.
echo ========================================
echo   安装完成总结
echo ========================================
echo.

if "%BACKEND_OK%"=="1" (
    echo [√] 后端依赖安装成功
) else (
    echo [×] 后端依赖安装可能存在问题
)

if "%FRONTEND_OK%"=="1" (
    echo [√] 前端依赖安装成功
) else (
    echo [×] 前端依赖安装可能存在问题
)

echo.
echo ========================================
echo   下一步操作指南
echo ========================================
echo.
echo 1. 启动后端服务:
echo    cd /d "%BACKEND_DIR%"
echo    python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
echo.
echo 2. 启动前端服务:
echo    cd /d "%FRONTEND_DIR%"
echo    npm run dev
echo.
echo 3. 运行健康检查:
echo    cd /d "%FRONTEND_DIR%"
echo    npm run health
echo    或
echo    python "%PROJECT_ROOT%scripts\health_check.py"
echo.
echo 4. 访问应用:
echo    前端: http://127.0.0.1:3000
echo    后端 API 文档: http://127.0.0.1:8000/docs
echo.
echo ========================================
echo   安装脚本执行完毕
echo ========================================
echo.

REM 询问是否启动服务
echo 是否现在启动服务?
echo [1] 启动后端服务
echo [2] 启动前端服务
echo [3] 同时启动前后端服务
echo [4] 不启动，退出
echo.
set /p START_CHOICE="请选择 (1-4): "

if "%START_CHOICE%"=="1" (
    echo.
    echo 启动后端服务...
    cd /d "%BACKEND_DIR%"
    start cmd /k "title 后端服务 - FastAPI && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
    echo [OK] 后端服务已在新窗口启动
    echo 访问: http://127.0.0.1:8000/docs
) else if "%START_CHOICE%"=="2" (
    echo.
    echo 启动前端服务...
    cd /d "%FRONTEND_DIR%"
    start cmd /k "title 前端服务 - React + Vite && npm run dev"
    echo [OK] 前端服务已在新窗口启动
    echo 访问: http://127.0.0.1:3000
) else if "%START_CHOICE%"=="3" (
    echo.
    echo 启动后端服务...
    cd /d "%BACKEND_DIR%"
    start cmd /k "title 后端服务 - FastAPI && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
    echo [OK] 后端服务已在新窗口启动
    
    echo.
    echo 启动前端服务...
    cd /d "%FRONTEND_DIR%"
    start cmd /k "title 前端服务 - React + Vite && npm run dev"
    echo [OK] 前端服务已在新窗口启动
    
    echo.
    echo 两个服务已在独立窗口启动
    echo 前端: http://127.0.0.1:3000
    echo 后端 API: http://127.0.0.1:8000/docs
) else (
    echo.
    echo 已选择不启动服务，安装脚本退出。
)

echo.
pause
