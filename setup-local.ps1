$ErrorActionPreference = 'Stop'

Write-Host "Trooferz Sports Club - local setup" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is not installed or not available in PATH."
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Copy-IfMissing($source, $destination) {
  if (-not (Test-Path $destination)) {
    Copy-Item $source $destination
    Write-Host "Created $destination" -ForegroundColor Green
  }
}

Copy-IfMissing (Join-Path $root 'backend/.env.example') (Join-Path $root 'backend/.env')
Copy-IfMissing (Join-Path $root 'frontend/.env.example') (Join-Path $root 'frontend/.env')

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
npm --prefix (Join-Path $root 'backend') install

Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
npm --prefix (Join-Path $root 'frontend') install

Write-Host "Setup files are ready." -ForegroundColor Green
Write-Host "1. Start MySQL from XAMPP." -ForegroundColor White
Write-Host "2. Import database/schema.sql then database/seed.sql in phpMyAdmin." -ForegroundColor White
Write-Host "3. Review backend/.env and frontend/.env." -ForegroundColor White
Write-Host "4. Start backend: npm --prefix backend run dev" -ForegroundColor White
Write-Host "5. Start frontend: npm --prefix frontend run dev" -ForegroundColor White
