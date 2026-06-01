@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ==========================================
:: StoryForge AI - 快捷启动脚本
:: ==========================================

title StoryForge AI

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║        StoryForge AI - 快捷启动          ║
echo  ║    本地化 AI 小说与跑团辅助创作平台       ║
echo  ╚══════════════════════════════════════════╝
echo.

:: 切换到脚本所在目录
cd /d "%~dp0"

:: 检查 Node.js 是否安装
echo [1/4] 检查 Node.js 环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18.17 或更高版本
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo       Node.js 版本: %NODE_VERSION%

:: 检查 npm 是否可用
npm --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 npm
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo       npm 版本: %NPM_VERSION%
echo.

:: 检查并安装依赖
echo [2/4] 检查项目依赖...
if not exist "node_modules" (
    echo       首次运行，正在安装依赖（可能需要几分钟）...
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo       依赖安装完成
) else (
    echo       依赖已存在，跳过安装
)
echo.

:: 检查并初始化数据库
echo [3/4] 检查数据库...
if not exist "prisma\storyforge.db" (
    echo       首次运行，正在初始化数据库...
    call npx prisma db push
    if errorlevel 1 (
        echo [错误] 数据库初始化失败
        pause
        exit /b 1
    )
    call npx prisma generate
    if errorlevel 1 (
        echo [错误] Prisma 客户端生成失败
        pause
        exit /b 1
    )
    echo       数据库初始化完成
) else (
    echo       数据库已存在
    :: 确保 Prisma 客户端是最新的
    call npx prisma generate >nul 2>&1
)
echo.

:: 启动开发服务器
echo [4/4] 启动开发服务器...
echo.
echo  ──────────────────────────────────────────
echo   应用启动后请访问: http://localhost:3000
echo   按 Ctrl+C 可停止服务器
echo  ──────────────────────────────────────────
echo.

:: 打开浏览器（延迟 3 秒等待服务器启动）
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: 启动 Next.js 开发服务器
call npm run dev
