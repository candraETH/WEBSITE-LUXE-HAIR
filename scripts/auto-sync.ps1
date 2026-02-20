param(
  [int]$IntervalSeconds = 20,
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$gitExe = "git"
if (Test-Path "C:\Program Files\Git\cmd\git.exe") {
  $gitExe = "C:\Program Files\Git\cmd\git.exe"
}

Write-Host "Auto sync started in: $repoRoot"
Write-Host "Branch: $Branch | Interval: $IntervalSeconds detik"
Write-Host "Stop dengan Ctrl + C"

while ($true) {
  try {
    $changes = & $gitExe status --porcelain

    if ($changes -and $changes.Count -gt 0) {
      Write-Host "`nPerubahan terdeteksi. Menjalankan auto commit + push..."

      & $gitExe add -A

      $staged = & $gitExe diff --cached --name-only
      if (-not $staged) {
        Start-Sleep -Seconds $IntervalSeconds
        continue
      }

      $commitMessage = "auto-sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
      & $gitExe commit -m $commitMessage | Out-Host

      if ($LASTEXITCODE -eq 0) {
        & $gitExe push origin $Branch | Out-Host
        if ($LASTEXITCODE -eq 0) {
          Write-Host "Push sukses."
        }
      }
    }
  }
  catch {
    Write-Host "Auto sync error: $($_.Exception.Message)"
  }

  Start-Sleep -Seconds $IntervalSeconds
}
