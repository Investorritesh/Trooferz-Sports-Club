@echo off
title Trooferz Sports Club Launcher
echo ========================================================
echo   Trooferz Sports Club - Django + React Launcher
echo ========================================================

echo [1/3] Checking Database Migrations...
cd /d "%~dp0backend"
if exist venv\Scripts\python.exe (
    venv\Scripts\python.exe manage.py migrate --noinput
    echo Starting Django REST API (Port 8000)...
    start "Trooferz Django Backend" cmd /k "venv\Scripts\python.exe manage.py runserver 8000"
) else (
    python manage.py migrate --noinput
    echo Starting Django REST API (Port 8000)...
    start "Trooferz Django Backend" cmd /k "python manage.py runserver 8000"
)

echo Waiting for backend initialization...
timeout /t 2 /nobreak >nul

echo [2/3] Starting Frontend (Port 5173)...
cd /d "%~dp0frontend"
start "Trooferz React Frontend" cmd /k "npm run dev"

echo.
echo ========================================================
echo   Trooferz Sports Club is running!
echo   Frontend:  http://localhost:5173
echo   API Root:  http://127.0.0.1:8000/api/
echo   Admin:     http://127.0.0.1:8000/admin/
echo   Health:    http://127.0.0.1:8000/api/health
echo --------------------------------------------------------
echo   DEMO CREDENTIALS:
echo   Admin:  admin@trooferz.com  / Admin@123
echo   Staff:  staff@trooferz.com  / Staff@123
echo   Member: member@trooferz.com / Member@123
echo ========================================================
pause
