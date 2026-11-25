<#
.SYNOPSIS
  Screenshots every screen of both games at phone, tablet and desktop widths.
.DESCRIPTION
  Runs tools\screens.js, which drives headless Chrome (installed Chrome or Edge first, then a
  Playwright Chromium build) over the DevTools protocol with no npm packages. For each game, width
  and screen it loads the file with empty localStorage, runs a setup snippet (open a modal, play a
  few turns, end the game) and saves <game>-<width>-<screen>.png. It also writes report.json with
  automated checks per shot: horizontal overflow, tap targets under 32px, text under 11px and
  unnamed buttons. Writes only into -Out. Exits non-zero if a screen's setup fails.
.PARAMETER Out
  Folder for the PNGs and report.json. Created if missing. Default: $env:TEMP\dopewars-screens.
.PARAMETER Games
  Comma-separated games to capture: dopewars, candywars.
.PARAMETER Widths
  Comma-separated widths: phone (375), tablet (768), desktop (1280).
.PARAMETER Screens
  Comma-separated screen names (see SCREENS in tools\screens.js); all by default.
.PARAMETER Chrome
  Path to chrome.exe or msedge.exe, when the automatic search picks a broken one.
.PARAMETER WhatIf
  Print how many screenshots would be written, and write nothing.
.EXAMPLE
  powershell -File tools\screens.ps1 -Out $env:TEMP\screens
.EXAMPLE
  powershell -File tools\screens.ps1 -Out $env:TEMP\screens -Games candywars -Widths phone -Screens main,help
#>
param(
  [string]$Out = (Join-Path $env:TEMP 'dopewars-screens'),
  [string]$Games = 'dopewars,candywars',
  [string]$Widths = 'phone,tablet,desktop',
  [string]$Screens,
  [string]$Chrome,
  [switch]$WhatIf
)
$ErrorActionPreference = 'Stop'
$nodeArgs = @((Join-Path $PSScriptRoot 'screens.js'), '--out', $Out, '--games', $Games, '--widths', $Widths)
if ($Screens) { $nodeArgs += @('--screens', $Screens) }
if ($Chrome) { $nodeArgs += @('--chrome', $Chrome) }
if ($WhatIf) { $nodeArgs += '--dry-run' }
& node @nodeArgs
exit $LASTEXITCODE
