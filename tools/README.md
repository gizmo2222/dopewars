# Scripts

| Script | Purpose | Example |
|---|---|---|
| `tools\check-syntax.ps1` | Syntax-check the inline `<script>` of both game files with `node --check` | `powershell -File tools\check-syntax.ps1 -Quiet` |
| `tools\test.ps1` | Run the whole suite: syntax check, then the `node:test` regression tests in `tests\` | `powershell -File tools\test.ps1 -Quiet` |
