@echo off
setlocal enabledelayedexpansion

echo 🔍 Verifying package-lock.json files...
echo.

set MISSING=0
set FOUND=0

:: Check service lockfiles
for %%s in (auth blockchain iot medicine mobile-gateway) do (
    if exist "services\%%s\package-lock.json" (
        echo ✅ %%s: lockfile exists
        set /a FOUND+=1
    ) else (
        echo ❌ %%s: lockfile MISSING
        set /a MISSING+=1
    )
)

:: Check web frontend
if exist "web\package-lock.json" (
    echo ✅ web: lockfile exists
    set /a FOUND+=1
) else (
    echo ❌ web: lockfile MISSING
    set /a MISSING+=1
)

:: Check mobile app (if exists)
if exist "mobile\" (
    if exist "mobile\package-lock.json" (
        echo ✅ mobile: lockfile exists
        set /a FOUND+=1
    ) else (
        echo ❌ mobile: lockfile MISSING
        set /a MISSING+=1
    )
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Summary: !FOUND! found, !MISSING! missing
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if !MISSING! gtr 0 (
    echo.
    echo ⚠️  !MISSING! lockfile(s) missing!
    echo.
    echo To fix this issue, run:
    echo   scripts\generate-lockfiles.bat
    echo.
    echo Or manually generate for each missing service:
    echo   cd services\^<service-name^>
    echo   npm install --package-lock-only
    echo   cd ..\..
    exit /b 1
) else (
    echo.
    echo ✅ All lockfiles present! Ready to build.
    exit /b 0
)
