<#
.SYNOPSIS
  Plays many scripted games of both game files and writes a balance report.
.DESCRIPTION
  Runs tools\balance.js: bot strategies (idle, random, greedy, trader, leverage, spikeOnly, specialist,
  fireOnly) play every theme of both games at every difficulty preset, one game per seed. Writes
  games.jsonl (one line per game) and summary.md (net worth, titles, item profit, events, offers,
  upgrades) to -Out. Reads the game files only; changes nothing in the repo. Exits non-zero if a game
  throws. Seeds 5 is 960 games and takes about ten minutes.
.PARAMETER Seeds
  Games per strategy, theme and difficulty (seeds 1..N). Default 5.
.PARAMETER Out
  Folder for games.jsonl and summary.md. Default $env:TEMP\balance.
.PARAMETER Strategies
  Comma-separated subset of strategies. Default all.
.PARAMETER Games
  Comma-separated subset of games (dopewars, candywars). Default both.
.PARAMETER Diffs
  Comma-separated subset of difficulties (easy, medium, hard). Default all.
.EXAMPLE
  powershell -File tools\balance.ps1 -Seeds 5 -Out $env:TEMP\balance
.EXAMPLE
  powershell -File tools\balance.ps1 -Seeds 2 -Strategies trader,idle -Games dopewars -Diffs hard
#>
param(
  [int]$Seeds = 5,
  [string]$Out = (Join-Path $env:TEMP 'balance'),
  [string]$Strategies,
  [string]$Games,
  [string]$Diffs
)
$ErrorActionPreference = 'Stop'
$nodeArgs = @((Join-Path $PSScriptRoot 'balance.js'), '--seeds', $Seeds, '--out', $Out)
if ($Strategies) { $nodeArgs += @('--strategies', $Strategies) }
if ($Games) { $nodeArgs += @('--games', $Games) }
if ($Diffs) { $nodeArgs += @('--diffs', $Diffs) }
& node @nodeArgs
exit $LASTEXITCODE
