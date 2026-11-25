# Scripts

| Script | Purpose | Example |
|---|---|---|
| `tools\check-syntax.ps1` | Syntax-check the inline `<script>` of both game files with `node --check` | `powershell -File tools\check-syntax.ps1 -Quiet` |
| `tools\test.ps1` | Run the whole suite: syntax check, then the `node:test` regression tests in `tests\` | `powershell -File tools\test.ps1 -Quiet` |
| `tools\coverage.ps1` | Line and function coverage of both games' inline scripts under the test suite; `-Out` lists the untested code | `powershell -File tools\coverage.ps1 -Out coverage.md` |
| `tools\mutate.ps1` | Mutation testing: runs the suite against small code edits in a temp copy and lists the edits no test catches | `powershell -File tools\mutate.ps1 -Game dopewars -Sample 100` |
| `tools\screens.ps1` | Screenshot every screen of both games at phone, tablet and desktop widths (headless Chrome, no npm packages), plus `report.json` layout checks | `powershell -File tools\screens.ps1 -Out $env:TEMP\screens` |
| `tools\balance.ps1` | Balance simulator: bot strategies play every theme and difficulty of both games by seed; writes `games.jsonl` and a `summary.md` report | `powershell -File tools\balance.ps1 -Seeds 5 -Out $env:TEMP\balance` |
