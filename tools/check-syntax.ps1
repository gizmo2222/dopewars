<#
.SYNOPSIS
  Syntax-checks the inline <script> of each game HTML file with node --check.
.DESCRIPTION
  Extracts the single inline <script> block from dopewars.html and candywars.html into a temp
  file and runs `node --check` on it. Changes nothing in the repo. Exits non-zero on any failure.
.PARAMETER Path
  HTML files to check. Defaults to dopewars.html and candywars.html in the repo root.
.PARAMETER Quiet
  Print only failures.
.EXAMPLE
  powershell -File tools\check-syntax.ps1 -Quiet
#>
param(
  [string[]]$Path = @(
    (Join-Path $PSScriptRoot '..\dopewars.html'),
    (Join-Path $PSScriptRoot '..\candywars.html')
  ),
  [switch]$Quiet
)
$ErrorActionPreference = 'Stop'
$failed = 0
foreach ($file in $Path) {
  $html = [System.IO.File]::ReadAllText((Resolve-Path $file))
  $m = [regex]::Match($html, '(?s)<script>(.*?)</script>')
  if (-not $m.Success) { Write-Host "FAIL $file : no inline <script> block"; $failed++; continue }
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("check-" + [guid]::NewGuid().ToString('N') + '.js')
  [System.IO.File]::WriteAllText($tmp, $m.Groups[1].Value)
  $ErrorActionPreference = 'Continue'
  $out = & node --check $tmp 2>&1 | ForEach-Object { "$_" } | Where-Object { $_ -notmatch 'RemoteException' }
  $code = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
  Remove-Item $tmp -Force
  if ($code -ne 0) { Write-Host "FAIL $file"; $out | ForEach-Object { Write-Host "  $_" }; $failed++ }
  elseif (-not $Quiet) { Write-Host "ok   $file" }
}
if ($failed -gt 0) { exit 1 }
exit 0
