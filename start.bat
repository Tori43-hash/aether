@echo off
echo ========================================
echo   Starting Aether Development Server
echo ========================================
echo.

REM Start PostgreSQL
echo [1/3] Starting PostgreSQL...
pg_ctl status -D "%USERPROFILE%\scoop\apps\postgresql\current\data" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    pg_ctl start -D "%USERPROFILE%\scoop\apps\postgresql\current\data" -l "%USERPROFILE%\scoop\apps\postgresql\current\data\pg.log"
    echo       PostgreSQL started!
) else (
    echo       PostgreSQL already running
)
echo.

REM Start Backend
echo [2/3] Starting Backend (NestJS)...
cd /d "%~dp0server"
start "Aether Backend" cmd /k "npm run start:dev"
echo       Backend starting on http://localhost:3100
echo.

REM Start Frontend
echo [3/3] Starting Frontend (Vite)...
cd /d "%~dp0"
start "Aether Frontend" cmd /k "npm run dev"
echo       Frontend starting on http://localhost:3000
echo.

echo ========================================
echo   All services started!
echo ========================================
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:3100/api
echo   Database:  localhost:5432
echo.
echo Press any key to exit this window...
pause >nul
