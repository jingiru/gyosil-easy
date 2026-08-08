$ErrorActionPreference = 'Stop'

$repositoryRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $repositoryRoot

$npmCommand = Get-Command npm.cmd -ErrorAction Stop
& $npmCommand.Source start
