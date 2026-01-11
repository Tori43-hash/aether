@echo off
echo ========================================
echo   Stopping Aether Development Server
echo ========================================
echo.

REM Stop Frontend and Backend (close their windows)
echo [1/2] Stopping Frontend and Backend...
taskkill /FI "WINDOWTITLE eq Aether Frontend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Aether Backend*" /F >nul 2>&1
echo       Frontend and Backend stopped
echo.

REM Stop PostgreSQL
echo [2/2] Stopping PostgreSQL...
pg_ctl stop -D "%USERPROFILE%\scoop\apps\postgresql\current\data" -m fast >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo       PostgreSQL stopped
) else (
    echo       PostgreSQL was not running
)
echo.

echo ========================================
echo   All services stopped!
echo ========================================
echo.
echo Press any key to exit...
pause >nul
