# Trooferz Sports Club - Unified Full-Stack Launcher (PowerShell)
$ErrorActionPreference = 'Stop'

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Trooferz Sports Club - Baner, Pune" -ForegroundColor Green
Write-Host "   Python 5 / Django REST Framework + React 18 / Vite" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'
$pythonVenv = Join-Path $backendDir 'venv\Scripts\python.exe'

# Fallback to system python if venv not found
if (-not (Test-Path $pythonVenv)) {
    $pythonCmd = "python"
} else {
    $pythonCmd = $pythonVenv
}

Write-Host "[1/3] Checking Database Migrations & Seed Data..." -ForegroundColor Yellow
Start-Process -FilePath $pythonCmd -ArgumentList "manage.py migrate --noinput" -WorkingDirectory $backendDir -Wait -NoNewWindow

Write-Host "[2/3] Launching Django REST API on http://127.0.0.1:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Django REST API...' -ForegroundColor Cyan; Set-Location '$backendDir'; & '$pythonCmd' manage.py runserver 8000"

Start-Sleep -Seconds 2

Write-Host "[3/3] Launching React 18 / Vite Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Vite Frontend...' -ForegroundColor Cyan; Set-Location '$frontendDir'; npm run dev"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Trooferz Sports Club is running successfully!" -ForegroundColor Green
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "  API Root:  http://127.0.0.1:8000/api/" -ForegroundColor White
Write-Host "  Django Admin: http://127.0.0.1:8000/admin/" -ForegroundColor White
Write-Host "  API Health: http://127.0.0.1:8000/api/health" -ForegroundColor White
Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  DEMO LOGIN CREDENTIALS:" -ForegroundColor Yellow
Write-Host "  - Admin:  admin@trooferz.com  / Admin@123" -ForegroundColor White
Write-Host "  - Staff:  staff@trooferz.com  / Staff@123" -ForegroundColor White
Write-Host "  - Member: member@trooferz.com / Member@123" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
