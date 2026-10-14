@echo off
title Trooferz Sports Club Launcher
echo ========================================================
echo   Trooferz Sports Club - Mini Project Launcher
echo ========================================================
echo Starting Backend (Port 5000)...
start "Trooferz Backend" cmd /k "cd backend && npm run dev"

echo Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

echo Starting Frontend (Port 5173)...
start "Trooferz Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo   System running successfully!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5000
echo   Health:   http://localhost:5000/api/health
echo ========================================================
pause
