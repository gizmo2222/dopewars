<#
.SYNOPSIS
  Runs the whole check suite: the inline-script syntax check, then the node:test regression tests.
.DESCRIPTION
  Runs tools\check-syntax.ps1, then `node --test` over tests\*.test.js. The tests load each game's
  inline <script> into node:vm with a mini DOM (tests\dom.js, tests\harness.js). Changes nothing in
  the repo. Exits non-zero if anything fails.
.PARAMETER Filter
  Only run tests whose name matches this pattern (passed to node --test-name-pattern).
.PARAMETER Quiet
  Print only failures and the final pass/fail counts.
.EXAMPLE
  powershell -File tools\test.ps1 -Quiet
.EXAMPLE
  powershell -File tools\test.ps1 -Filter "candywars"
#>
param(
  [string]$Filter,
  [switch]$Quiet
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$syntaxArgs = @('-NoProfile', '-File', (Join-Path $PSScriptRoot 'check-syntax.ps1'))
if ($Quiet) { $syntaxArgs += '-Quiet' }
& powershell @syntaxArgs
if ($LASTEXITCODE -ne 0) { Write-Host 'FAIL syntax check'; exit 1 }

$nodeArgs = @('--test', '--test-reporter=spec')
if ($Filter) { $nodeArgs += "--test-name-pattern=$Filter" }
$nodeArgs += (Join-Path $root 'tests\*.test.js')
$ErrorActionPreference = 'Continue'
$out = & node @nodeArgs 2>&1 | ForEach-Object { "$_" } | Where-Object { $_ -notmatch 'RemoteException' }
$code = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($Quiet) {
  $failing = $false
  foreach ($line in $out) {
    if ($line -match 'failing tests:') { $failing = $true }
    if ($failing -or $line -match '^\s*\S*\s*(tests|pass|fail) \d+') { Write-Host $line }
  }
} else {
  $out | ForEach-Object { Write-Host $_ }
}
exit $code
