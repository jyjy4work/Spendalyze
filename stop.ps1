# Spendalyze - Dev server stopper
# Kills processes listening on ports 3000 (Frontend) and 8000 (Backend).

function Stop-Port($port, $label) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        $conns | ForEach-Object {
            $processId = $_.OwningProcess
            try {
                Stop-Process -Id $processId -Force -ErrorAction Stop
                Write-Host "[$label] :$port (PID $processId) stopped" -ForegroundColor Green
            } catch {
                Write-Host "[$label] :$port kill failed: $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "[$label] :$port not running" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== Spendalyze Shutdown ===" -ForegroundColor Cyan
Stop-Port 8000 "Backend"
Stop-Port 3000 "Frontend"
Write-Host ""
