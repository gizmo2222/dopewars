# Overhaul state

Round 1, branch prefix `overhaul/` (branches `overhaul/phase-N`, each cut from the previous phase's branch).
Base branch: `main` (pushing `main` deploys to metacrystal.com; never push it during phases 1-9).

## Applicability (read by the orchestrator)

- Phase 6 (UI / front end): APPLIES. Both games are browser front ends (`dopewars.html`, `candywars.html`).
- Phase 7 (simulation / game balance): APPLIES. Both are turn-based trading games with random events.
- Phase 8 (product research): APPLIES. Public web game with many comparable Drug Wars-style clones;
  research is about features and design, pricing is not relevant (free hobby game).

## Phases

| # | Phase | Status | Branch |
|---|---|---|---|
| 1 | Map | done | overhaul/phase-1 |
| 2 | Bug hunt | done | overhaul/phase-2 |
| 3 | Tests | done | overhaul/phase-3 |
| 4 | Security | done | overhaul/phase-4 |
| 5 | Clean-up | todo | |
| 6 | UI | todo | |
| 7 | Simulation / game balance | todo | |
| 8 | Research | todo | |
| 9 | Wrap-up | todo | |
| 10 | Land | todo | |

## Notes per phase

### 1. Map (done)
- Wrote `CLAUDE.md` (run, check, deploy, doc map with line ranges for both files) and
  `tools\check-syntax.ps1` (node --check of each file's inline script; the only "suite" so far).
- The two HTML files are near-identical forks (~1.9k lines each): every fix usually needs doing in both.
  Known drift: safehouse exists only in Dope Wars; Candy Wars keeps an unused `G.safehouse`.
- No test harness exists. Phase 2 needs one for regression tests: suggest Node's built-in `node:test`
  loading the inline script into `vm` with a small DOM stub, under `tests\`, run by a `tools\` script.
- Choice made without asking: did this phase directly rather than with a workflow, since the repo is two
  files and mapping them took a few greps.

### 2. Bug hunt (done)
- Built the suite: `tests\harness.js` + `tests\dom.js` (game script in node:vm with a mini DOM, seeded
  Math.random), smoke tests, and `tools\test.ps1 -Quiet` (syntax check + node:test; 43 tests pass).
- Fixed 14 confirmed bugs in both games, one test each in `tests\bugs.test.js`: repeat scoring after
  game over, theme Cancel re-theming the save, negative/zero trade quantities, event modals overwriting
  each other, event text contradicting outcome, plus 9 smaller ones. 3 unfixed are in `docs\overhaul-findings.md`.
- Choices made without asking: the workflow used 4 area hunters (each covering all five bug classes) and
  4 disprovers, 8 agents, not one per area x class; the dead safehouse code is left for phase 5 or /land
  to wire up or delete. Phase 3: measure coverage with `node --test --experimental-test-coverage`.

### 3. Tests (done)
- Built `tools\coverage.ps1` (V8 coverage mapped to the inline scripts, since node's own misreads the HTML) and `tools\mutate.ps1`; five workers wrote `tests\{trade,events,travel-shop,money-save,ui}.test.js`. The suite now has 641 tests, all passing. Line coverage went from 81.4% to 95.3% (dopewars) and from 85.3% to 99.9% (candywars). On a seeded 150-mutant sample per game, mutants killed went from 16% to 91.3% (dopewars) and from 16% to 100% (candywars).
- No game bugs found. Every survivor is equivalent, unreachable, or in the unreachable safehouse (all listed in `docs\overhaul-findings.md`). Phase 5 leads: `maybeEvent` is never called (`travel` inlines it), dead `G.debt < 0` clamps, an unreachable `maybeLateEvent` fallback, and the safehouse to wire up or delete.
- Choices made without asking: 5 Sonnet workers, not one per function. Their worktrees were cut from `main`, so only their new test files were copied in and their branches were deleted unmerged. The safehouse was left untested. A seeded 150-mutant sample stood in for full ~600-mutant runs. Phase 4 can run `tools\coverage.ps1` again after any fix.

### 4. Security (done)
- Three findings were confirmed and fixed in both games: XSS from a tampered save, an `endGame` crash from a malformed score list, and unfiltered settings. A save now resumes only if every name is from the theme and every number is finite (`cleanSave`, `cleanSettings`). Scores are filtered, the score date is escaped, and a CSP `<meta>` was added. `tests\security.test.js` adds 18 tests (659 pass). In a real browser, fonts load and travel and buy work, with no CSP violations.
- CI, secrets and server items are logged in `docs\overhaul-findings.md`, not fixed: checkout isn't SHA-pinned, there's no `permissions:` block, SFTP uses a password, and `.claude/settings.local.json` is still in history. Phase 5 leads: the inline `onclick` handlers block a stricter CSP, and the CLAUDE.md doc map line numbers after the helpers have shifted by about 45 lines (phase 9 refreshes them).
- Choices made without asking: an independent sweep and two Opus verifiers stood in for a full workflow. Saved data is validated once at load rather than escaped at every `innerHTML` sink. An unknown saved theme falls back to the default theme. The gitignored `.claude/launch.json` was emptied by mistake and recreated with one python "static" server config.
