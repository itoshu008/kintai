# API Status Check Script
Write-Host "API Status Check Starting..." -ForegroundColor Green

$endpoints = @(
    "http://localhost:8001",
    "http://localhost:8001/api/admin",
    "http://localhost:8001/api/admin/health",
    "http://localhost:8001/api/admin/departments",
    "http://localhost:8001/api/admin/employees",
    "http://localhost:8001/api/admin/master",
    "http://localhost:8001/m",
    "http://localhost:8001/master",
    "http://localhost:8001/admin-dashboard-2024",
    "http://localhost:8001/p",
    "http://localhost:8001/personal"
)

$success = 0
$error = 0

foreach ($url in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "SUCCESS: $url - $($response.StatusCode)" -ForegroundColor Green
            $success++
        } else {
            Write-Host "ERROR: $url - $($response.StatusCode)" -ForegroundColor Red
            $error++
        }
    }
    catch {
        Write-Host "ERROR: $url - $($_.Exception.Message)" -ForegroundColor Red
        $error++
    }
}

Write-Host ""
Write-Host "Summary: Success=$success, Error=$error" -ForegroundColor Cyan
