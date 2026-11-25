<#
.SYNOPSIS
  Mutation testing: changes the game code one small edit at a time and lists edits no test catches.
.DESCRIPTION
  Runs tools\mutate.js for one game. Each mutant (an operator, boolean or number changed in the code
  after `const SETTINGS = {`) is written to a temp copy of the repo and the node:test suite runs
  against it; a mutant whose tests still pass "survived" and points at an untested behaviour. The
  repo itself is never modified. Exits non-zero only on bad arguments or if the unmutated suite fails.
.PARAMETER Game
  dopewars or candywars.
.PARAMETER Sample
  Run only this many mutants, picked with -Seed. Default: all of them (about 600 per game, ~7 min).
.PARAMETER Seed
  Seed for -Sample. Default 1.
.PARAMETER Lines
  Only mutate this HTML line range, e.g. 1168-1248.
.PARAMETER Jobs
  Mutants run at once. Default: half the CPUs.
.PARAMETER Out
  Markdown file to write the surviving mutants to (otherwise they are printed).
.PARAMETER List
  Print the mutants that would run and stop.
.EXAMPLE
  powershell -File tools\mutate.ps1 -Game dopewars -Sample 100
.EXAMPLE
  powershell -File tools\mutate.ps1 -Game candywars -Lines 1148-1226 -Out mutants.md
#>
param(
  [Parameter(Mandatory = $true)][ValidateSet('dopewars', 'candywars')][string]$Game,
  [int]$Sample = 0,
  [int]$Seed = 1,
  [string]$Lines,
  [int]$Jobs = 0,
  [string]$Out,
  [switch]$List
)
$ErrorActionPreference = 'Stop'
$nodeArgs = @((Join-Path $PSScriptRoot 'mutate.js'), '--game', $Game, '--seed', "$Seed")
if ($Sample -gt 0) { $nodeArgs += @('--sample', "$Sample") }
if ($Lines) { $nodeArgs += @('--lines', $Lines) }
if ($Jobs -gt 0) { $nodeArgs += @('--jobs', "$Jobs") }
if ($Out) { $nodeArgs += @('--out', $Out) }
if ($List) { $nodeArgs += '--list' }
& node @nodeArgs
exit $LASTEXITCODE
