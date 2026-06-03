# Khoi chay day du: Node (3000) + PHP (8080) — khong can double-click nhieu file
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$nodeExe = Join-Path $root ".tools\node\node.exe"
$phpCandidates = @(
    (Join-Path $root ".tools\php-run\php.exe"),
    (Join-Path $root ".tools\php-portable\php.exe"),
    (Join-Path $root ".tools\php\php.exe"),
    (Join-Path $root "php\php.exe"),
    "php"
)

function Find-Php {
    foreach ($c in $phpCandidates) {
        if ($c -eq "php") {
            $cmd = Get-Command php -ErrorAction SilentlyContinue
            if ($cmd) { return $cmd.Source }
        } elseif (Test-Path $c) {
            return $c
        }
    }
    return $null
}

$phpExe = Find-Php

if (Test-Path $nodeExe) {
    $nodeRunning = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    if (-not $nodeRunning) {
        Write-Host "[Node] Khoi dong http://127.0.0.1:3000 ..."
        Start-Process -FilePath $nodeExe -ArgumentList "app.js" -WorkingDirectory $root -WindowStyle Minimized
        Start-Sleep -Seconds 3
    } else {
        Write-Host "[Node] Port 3000 da chay"
    }
} else {
    Write-Host "[Node] Canh bao: khong tim thay .tools\node\node.exe"
}

if (-not $phpExe) {
    Write-Host "[PHP] LOI: Khong tim thay php.exe trong .tools\php\"
    exit 1
}

$phpRunning = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if (-not $phpRunning) {
    Write-Host "[PHP] Khoi dong http://127.0.0.1:8080/activate.php ..."
    Start-Process -FilePath $phpExe -ArgumentList "-S","127.0.0.1:8080","-t",$root -WorkingDirectory $root -WindowStyle Minimized
    Start-Sleep -Seconds 1
} else {
    Write-Host "[PHP] Port 8080 da chay"
}

Write-Host ""
Write-Host "San sang:"
Write-Host "  Admin  -> http://127.0.0.1:3000/admin"
Write-Host "  Portal -> http://127.0.0.1:8080/activate.php"
Write-Host "  Health -> http://127.0.0.1:3000/api/health"
Write-Host ""
