@echo off
setlocal enabledelayedexpansion

REM PharmaTrust Clean Build Script for Windows
REM This script performs a complete clean build of all Docker services

echo.
echo ========================================
echo    PharmaTrust Clean Build Script
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop and try again.
    exit /b 1
)
echo [OK] Docker is running

REM Check if docker compose is available
docker compose version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] docker compose command not found. Please install Docker Compose v2+
    exit /b 1
)
echo [OK] Docker Compose is available

REM Step 1: Verify lockfiles
echo.
echo ========================================
echo Step 1: Verifying package-lock.json files
echo ========================================
if exist "scripts\verify-lockfiles.bat" (
    call scripts\verify-lockfiles.bat
    if errorlevel 1 (
        echo [ERROR] Some lockfiles are missing
        echo [INFO] Run: scripts\generate-lockfiles.bat
        exit /b 1
    )
    echo [OK] All lockfiles present
) else (
    echo [WARNING] Lockfile verification script not found, skipping...
)

REM Step 2: Stop all running containers
echo.
echo ========================================
echo Step 2: Stopping all containers
echo ========================================
docker compose ps -q >nul 2>&1
if not errorlevel 1 (
    docker compose down -v --remove-orphans
    echo [OK] Containers stopped and volumes removed
) else (
    echo [INFO] No running containers to stop
)

REM Step 3: Clean Docker system
echo.
echo ========================================
echo Step 3: Cleaning Docker system
echo ========================================
set /p CLEANUP="Remove ALL unused Docker data (images, containers, volumes)? [y/N] "
if /i "%CLEANUP%"=="y" (
    docker system prune -af --volumes
    echo [OK] Docker system cleaned
) else (
    echo [INFO] Removing only PharmaTrust images...
    docker images | findstr pharmatrust > temp_pharmatrust_images.txt
    set /a IMGCOUNT=0
    for /f "tokens=3" %%i in (temp_pharmatrust_images.txt) do (
        docker rmi -f %%i >nul 2>&1
        set /a IMGCOUNT+=1
    )
    del temp_pharmatrust_images.txt
    if %IMGCOUNT% gtr 0 (
        echo [OK] PharmaTrust images removed
    ) else (
        echo [INFO] No PharmaTrust images found to remove
    )

REM Step 4: Build images
echo.
echo ========================================
echo Step 4: Building Docker images
echo ========================================
echo [INFO] This may take 5-15 minutes depending on your internet speed...
echo.

REM Build with no cache for clean build
docker compose build --no-cache --progress=plain
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed. Check the error messages above.
    echo.
    echo [INFO] Troubleshooting tips:
    echo   1. Check your internet connection
    echo   2. Try: npm config set fetch-timeout 120000
    echo   3. If behind proxy, set npm proxy config
    echo   4. See TROUBLESHOOTING.md for more help
    exit /b 1
)
echo [OK] All images built successfully

REM Step 5: Start services
echo.
echo ========================================
echo Step 5: Starting services
echo ========================================

REM Start infrastructure first
echo [INFO] Starting infrastructure services (mongo, redis, mosquitto)...
docker compose up -d mongo redis mosquitto

REM Wait for health checks
echo [INFO] Waiting 30 seconds for infrastructure health checks...
timeout /t 30 /nobreak >nul

REM Check infrastructure health
docker compose ps mongo redis mosquitto | findstr "unhealthy" >nul 2>&1
if not errorlevel 1 (
    echo [ERROR] Some infrastructure services are unhealthy
    docker compose ps mongo redis mosquitto
    exit /b 1
)
echo [OK] Infrastructure services are healthy

REM Start application services
echo [INFO] Starting application services...
docker compose up -d auth medicine iot blockchain mobile-gateway

REM Wait for health checks
echo [INFO] Waiting 30 seconds for application services health checks...
timeout /t 30 /nobreak >nul

REM Start web and gateway
echo [INFO] Starting web frontend and API gateway...
docker compose up -d web nginx

REM Wait for final health checks
echo [INFO] Waiting 30 seconds for final health checks...
timeout /t 30 /nobreak >nul

REM Step 6: Verify deployment
echo.
echo ========================================
echo Step 6: Verifying deployment
echo ========================================

REM Check all services status
docker compose ps | findstr /C:"unhealthy" /C:"Exit" >nul 2>&1
if not errorlevel 1 (
    echo [ERROR] Some services failed to start properly
    echo.
    docker compose ps
    echo.
    echo [INFO] Check logs with: docker compose logs [service-name]
    exit /b 1
)

REM Display status
echo.
docker compose ps
echo.

REM Test endpoints
echo [INFO] Testing endpoints...

REM Test web UI
curl -f -s http://localhost >nul 2>&1
if not errorlevel 1 (
    echo [OK] Web UI is accessible at http://localhost
) else (
    echo [WARNING] Web UI is not responding yet (may need more time)
)

REM Test API services
for %%p in (4001 4002 4003 4004 4010) do (
    curl -f -s http://localhost:%%p/health >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Service on port %%p is healthy
    ) else (
        echo [WARNING] Service on port %%p not responding (may need more time)
    )
)

REM Summary
echo.
echo ========================================
echo    Build and deployment complete!
echo ========================================
echo.
echo [INFO] Access the application:
echo   * Web UI:        http://localhost
echo   * API Gateway:   http://localhost/api
echo   * Auth Service:  http://localhost:4001
echo   * Medicine:      http://localhost:4002
echo   * IoT:           http://localhost:4003
echo   * Blockchain:    http://localhost:4004
echo   * Mobile GW:     http://localhost:4010
echo.
echo [INFO] Demo credentials:
echo   * Manufacturer:  mfg1 / demo123
echo   * Supplier:      sup1 / demo123
echo   * Pharmacist:    phm1 / demo123
echo   * Admin:         admin / admin123
echo.
echo [INFO] Useful commands:
echo   * View logs:     docker compose logs -f [service]
echo   * Stop all:      docker compose down
echo   * Restart:       docker compose restart [service]
echo   * Check status:  docker compose ps
echo.
echo [OK] Setup complete!
echo.

exit /b 0
