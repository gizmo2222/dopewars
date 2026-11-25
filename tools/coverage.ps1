<#
.SYNOPSIS
  Measures line and function coverage of both games' inline scripts while the node:test suite runs.
.DESCRIPTION
  Runs tools\coverage.js, which runs tests\*.test.js with NODE_V8_COVERAGE set and maps the V8 data
  onto each game's inline <script> (node's own --experimental-test-coverage misreads HTML files).
  Prints one summary line per game. Writes nothing in the repo unless -Out is given. Exits non-zero
  if the tests fail or a game is under -Min.
.PARAMETER Out
  Markdown file to write the list of never-called functions and untested lines to.
.PARAMETER Min
  Minimum line coverage percentage for each game; below it the script exits 1.
.EXAMPLE
  powershell -File tools\coverage.ps1
.EXAMPLE
  powershell -File tools\coverage.ps1 -Out docs\coverage.md -Min 90
#>
param(
  [string]$Out,
  [double]$Min = -1
)
$ErrorActionPreference = 'Stop'
$nodeArgs = @((Join-Path $PSScriptRoot 'coverage.js'))
if ($Out) { $nodeArgs += @('--out', $Out) }
if ($Min -ge 0) { $nodeArgs += @('--min', "$Min") }
& node @nodeArgs
exit $LASTEXITCODE
