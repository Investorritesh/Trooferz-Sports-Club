# Trooferz Sports Club - PowerShell Launcher
$ErrorActionPreference = 'Stop'
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Trooferz Sports Club & Turf Management System" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting Backend API on http://localhost:5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root/backend'; npm run dev"

Start-Sleep -Seconds 3

Write-Host "Starting Frontend UI on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root/frontend'; npm run dev"

Write-Host "Both services launched successfully!" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Green
