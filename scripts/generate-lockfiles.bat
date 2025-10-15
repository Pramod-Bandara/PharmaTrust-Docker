@echo off
setlocal enabledelayedexpansion

echo 📦 Generating missing package-lock.json files...
echo.

set GENERATED=0
set SKIPPED=0

:: Function to generate lockfile for a directory
:: %1 = directory path, %2 = service name
call :generate_lockfile "services\auth" "auth"
call :generate_lockfile "services\blockchain" "blockchain"
call :generate_lockfile "services\iot" "iot"
call :generate_lockfile "services\medicine" "medicine"
call :generate_lockfile "services\mobile-gateway" "mobile-gateway"
call :generate_lockfile "web" "web"

:: Check mobile if exists
if exist "mobile\" (
    call :generate_lockfile "mobile" "mobile"
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Summary: !GENERATED! generated, !SKIPPED! skipped
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if !GENERATED! gtr 0 (
    echo.
    echo ✅ Lockfiles generated successfully!
    echo.
    echo Next steps:
    echo   1. Commit the new lockfiles: git add */package-lock.json
    echo   2. Build Docker images: docker compose build
    echo   3. Start services: docker compose up -d
) else (
    echo.
    echo ℹ️  No lockfiles needed to be generated.
)

exit /b 0

:: Function to generate lockfile
:generate_lockfile
set "dir=%~1"
set "name=%~2"

if not exist "%dir%\package-lock.json" (
    echo 🔨 Generating lockfile for %name%...

    :: Check if package.json exists
    if not exist "%dir%\package.json" (
        echo    ⚠️  Warning: package.json not found in %dir%
        exit /b 1
    )

    :: Generate lockfile only
    pushd "%dir%"
    npm install --package-lock-only 2>nul
    popd

    if exist "%dir%\package-lock.json" (
        echo    ✅ Lockfile created successfully
        set /a GENERATED+=1
    ) else (
        echo    ❌ Failed to create lockfile
    )
) else (
    echo ⏭️  Skipping %name% (lockfile already exists)
    set /a SKIPPED+=1
)

exit /b 0
