# Spendalyze - Dev server launcher
# Usage: .\start.ps1

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

Write-Host ""
Write-Host "=== Spendalyze Dev Server ===" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------------------------------------
# 1. Backend setup (first run: venv + pip install)
# -----------------------------------------------------------------------------
$Venv = Join-Path $Backend "venv"
$VenvActivate = Join-Path $Venv "Scripts\Activate.ps1"

if (-not (Test-Path $VenvActivate)) {
    Write-Host "[backend] venv not found -> creating..." -ForegroundColor Yellow
    Push-Location $Backend
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "python not found. Install Python 3.11+ first." -ForegroundColor Red
        Pop-Location
        exit 1
    }
    & $VenvActivate
    pip install -r requirements.txt
    Pop-Location
    Write-Host "[backend] deps installed" -ForegroundColor Green
} else {
    Write-Host "[backend] venv OK" -ForegroundColor Green
}

# -----------------------------------------------------------------------------
# 2. Frontend setup (first run: npm install)
# -----------------------------------------------------------------------------
$NodeModules = Join-Path $Frontend "node_modules"

if (-not (Test-Path $NodeModules)) {
    Write-Host "[frontend] node_modules not found -> npm install..." -ForegroundColor Yellow
    Push-Location $Frontend
    npm install
    Pop-Location
    Write-Host "[frontend] deps installed" -ForegroundColor Green
} else {
    Write-Host "[frontend] node_modules OK" -ForegroundColor Green
}

# -----------------------------------------------------------------------------
# 3. Launch servers in separate terminals
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "Starting servers..." -ForegroundColor Cyan
Write-Host "  - Backend  : http://localhost:8000  (health: /health)"
Write-Host "  - Frontend : http://localhost:3000"
Write-Host ""
Write-Host "To stop: Ctrl+C in each window, or run .\stop.ps1"
Write-Host ""

$BackendCmd = "Set-Location '$Backend'; & '$VenvActivate'; Write-Host '>>> Backend on :8000' -ForegroundColor Green; uvicorn main:app --reload --port 8000"
$FrontendCmd = "Set-Location '$Frontend'; Write-Host '>>> Frontend on :3000' -ForegroundColor Green; npm run dev"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCmd
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCmd

Start-Sleep -Seconds 3
Write-Host "Opening browser..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Done! Two PowerShell windows should be open." -ForegroundColor Green
