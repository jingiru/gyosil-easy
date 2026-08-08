$ErrorActionPreference = 'Stop'

$startScript = (Resolve-Path (Join-Path $PSScriptRoot 'start-server.ps1')).Path
$taskName = 'GyosilEasyServer'
$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScript`""

schtasks.exe /Create /SC ONLOGON /TN $taskName /TR $taskCommand /F

if ($LASTEXITCODE -ne 0) {
  throw '자동 시작 작업을 만들지 못했습니다. PowerShell을 관리자 권한으로 다시 실행해 주세요.'
}

Write-Host "자동 시작 작업 '$taskName'을 만들었습니다."
Write-Host "지금 시험하려면: schtasks.exe /Run /TN $taskName"
