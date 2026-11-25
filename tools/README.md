# Scripts

| Script | Purpose | Example |
|---|---|---|
| `tools\check-syntax.ps1` | Syntax-check the inline `<script>` of both game files with `node --check` | `powershell -File tools\check-syntax.ps1 -Quiet` |
| `tools\test.ps1` | Run the whole suite: syntax check, then the `node:test` regression tests in `tests\` | `powershell -File tools\test.ps1 -Quiet` |
| `tools\coverage.ps1` | Line and function coverage of both games' inline scripts under the test suite; `-Out` lists the untested code | `powershell -File tools\coverage.ps1 -Out coverage.md` |
| `tools\mutate.ps1` | Mutation testing: runs the suite against small code edits in a temp copy and lists the edits no test catches | `powershell -File tools\mutate.ps1 -Game dopewars -Sample 100` |
