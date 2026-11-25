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
| 5 | Clean-up | done | overhaul/phase-5 |
| 6 | UI | done | overhaul/phase-6 |
| 7 | Simulation / game balance | done | overhaul/phase-7 |
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

### 5. Clean-up (done)
- Applied the safe simplifications in both games, with no behaviour change. `travel` calls `maybeEvent`. The dead debt clamps and the `maybeLateEvent` fallback are gone. About 15 helpers replace copied code (`addStock`, `readQty`, `payDebt`, `themeOf`, `badge`...). Unused CSS rules were removed, and repeated inline styles are now classes (`.modal-ok.alt`, `.setting-row.sep`, `.help-h`). `.overlay` and `.input-overlay` share one rule. There are 663 tests, all passing (2 new `maybeEvent` tests). A Playwright check found every element's computed style unchanged at 1280px and 375px.
- Risky items are logged in `docs\overhaul-findings.md` under "Phase 5", not applied: the unused score `debt` field, NaN from saves missing `borrowedToday` or `carTripsToday`, the unreachable safehouse (/land decides), inline `onclick` blocking a hash CSP, and merging the forks. There are no dependencies.
- Choices made without asking: a workflow of 10 Opus finders and verifiers produced the list. Three Sonnet appliers then ran one after another in this checkout (script edits, then CSS/HTML), and the session reviewed each diff. Phase 6 should know two things. The header buttons' look now lives in `.action-btn`, which is used only there. The CLAUDE.md doc map lines have shifted by about 10-60 lines (phase 9 refreshes them).

### 6. UI (done)
- Fixed 15 issues in both games. Four were high: modals now scroll instead of being cut off, the phone header wraps, city cells and the Cash/Debt toggles are real buttons, and dialogs have roles, labels and focus on open, with no Enter double-fire. Eleven were medium: the layout fills the window, the breakpoint is 720px with 44px tap targets, text is 11px or larger, refusals show a toast, the log is a live region, END GAME is no longer faded on the last day, safehouse rows wrap, help reads the interest rate and upgrades from the code, and Candy Wars copy and plurals were fixed. Before and after, across 87 screenshots: text under 11px went from 72 cases to 0, overflow from 56 to 0, touch targets under 32px from 143 to 0 on phone and tablet (57 remain on desktop, mouse only), and no screen scrolls sideways. There are 697 tests, all passing.
- 21 items are logged in `docs\overhaul-findings.md` under "Phase 6", not applied. Phase 7 should take three of them because they change the game flow: the amount dialog opens for impossible actions, there is no END GAME confirm while the stash is unsold, and the days-left warning timing. The rest are low polish, a new saved field (highlighting the current run in high scores), or redesigns.
- Choices made without asking: I wrote `tools\screens.ps1` (headless Chrome over CDP) instead of using Playwright, whose Chromium is broken here. 6 Opus auditors and 1 triage judge picked 15 fixes. 4 Sonnet builders ran one after another in this checkout. I reviewed every diff and added three fixes of my own: no toast while a modal is open, no toast for the starting-debt line, and 44px targets below 720px. For phase 7, two things to know: `addLog(msg, 'bad')` now also shows a toast (pass `false` as the third argument to stop it), and the CLAUDE.md doc map lines have shifted by about 30-60.

### 7. Simulation / game balance (done)
- New `tools\balance.ps1` / `tools\balance.js` plays whole games headless with 8 bot strategies over both games, 8 themes and 3 difficulties. The before-grid was 960 games and the after-grid 576. Four fixes went into both games. The end titles now scale with the theme's priciest item (500x / 100x / 20x its base price; before, the fixed $100k top title went to every competent run). Surge and drought headlines now hit the item they name. The three game-flow items from phase 6 are done: dialogs refuse when there is nothing to move, END GAME confirms while goods are unsold, and the warning shows at 3 days left. 40 new headlines were added after an Opus judge rejected 40 of the 80 drafted. There are 719 tests, all passing.
- Logged in `docs\overhaul-findings.md` under "Phase 7", not applied: cheap items are dead weight (0-1% of profit, a genre trait with capped carry); the debt snowball is steep for new players on medium and hard; upgrades are cheap after the first week; the burned-contact event is rare and muggings are trivial late; the Candy Wars safehouse still has no UI; high scores mix themes in raw dollars.
- Choices made without asking: I scaled the titles instead of rebalancing prices, because the themes line up once net worth is divided by the top price. The new headlines were drafted by Sonnet and judged by Opus, at most 5 per theme. Each theme's original last headline stays last, because `calm()` in `travel-shop.test.js` rolls 0.99 and must get the harmless surge. For phase 8: `node tools\balance.js --seeds 1` gives a quick 192-game check, and the doc map lines have shifted by about 10-50 (endGame is now at dopewars.html ~1808).
