# Overhaul summary (round 1)

The overhaul was a quality pass over both games in nine phases, one session each. Each phase is on its
own branch (`overhaul/phase-1` to `overhaul/phase-9`), and each branch was cut from the one before it.
`overhaul/phase-9` therefore holds all of it: 19 commits on top of `main`, nothing pushed or merged.
Session 10 (`/land`) merges and deploys. The per-phase ledger is `docs/overhaul-state.md`, everything
logged but not applied is in `docs/overhaul-findings.md`, and the feature research is `docs/research.md`.

At the start there were no tests and no tools. At the end there are 719 `node:test` tests that pass on
both files, six scripts in `tools\`, 95-100% line coverage, and 91-100% of sampled mutants killed.

## What changed, per phase

| # | Phase | What changed | What was left (details in `docs/overhaul-findings.md`) |
|---|---|---|---|
| 1 | Map | Wrote `CLAUDE.md` (run, check, deploy, doc map) and `tools\check-syntax.ps1`. | None. |
| 2 | Bug hunt | Built the test harness (`tests\harness.js`, `tests\dom.js`, `tools\test.ps1`). Fixed 14 confirmed bugs in both games, with one regression test each: scoring twice after game over, theme Cancel re-theming the save, negative or zero trade quantities, event modals overwriting each other, event text contradicting the outcome, and 9 smaller ones. | 2 hardening candidates (old settings or saves) and the unreachable safehouse. |
| 3 | Tests | Built `tools\coverage.ps1` and `tools\mutate.ps1`, and added five module test files (641 tests). Line coverage went from 81% to 95% (Dope Wars) and from 85% to 99.9% (Candy Wars). Sampled mutants killed went from 16% to 91% / 100%. | Equivalent or unreachable mutants are listed. The safehouse is untested. |
| 4 | Security | Fixed stored XSS from a tampered save, an `endGame` crash on a malformed score list, and unfiltered settings. Saves are validated on load (`cleanSave`, `cleanSettings`), scores are filtered, and each file has a CSP `<meta>`. Added `tests\security.test.js`. | Deploy workflow hardening (SHA pin, `permissions:`, deploy key), `.claude/settings.local.json` still in git history, the old Flask secret on the server, Google Fonts privacy. None of these was changed: they are CI, secrets and server items. |
| 5 | Clean-up | `travel` calls `maybeEvent`. Removed dead clamps and an unreachable fallback. About 15 shared helpers replace copied code, and repeated inline styles became CSS classes. No behaviour change. | The unused score `debt` field, NaN from saves that lack `borrowedToday` / `carTripsToday`, inline `onclick` blocking a hash CSP, and merging the forks. |
| 6 | UI | Fixed 15 issues. Modals scroll, the phone header wraps, real buttons replace clickable divs, dialogs have roles, labels and focus, the breakpoint is 720px with 44px targets, text is 11px or larger, refusals show a toast, and the log is a live region. Built `tools\screens.ps1`. Across 87 screenshots, text under 11px went from 72 cases to 0 and overflow from 56 to 0. | Low polish items: loss styling, preset highlight, screen-reader glyphs, Candy Wars name wrapping. Highlighting the current run in high scores (needs a new saved field). |
| 7 | Balance | Built `tools\balance.ps1` / `balance.js` (8 bot strategies, both games, 8 themes, 3 difficulties, 960 + 576 games). End titles now scale with the theme's priciest item. Surge and drought headlines hit the item they name. Dialogs refuse when nothing can move. END GAME confirms while goods are unsold. The warning shows at 3 days left. Added 40 judged headlines. | Cheap items earn 0-1% of profit. A steep debt snowball for new players. Upgrades are cheap late. The burned-contact event is rare and muggings are trivial late. High scores mix themes in raw dollars. |
| 8 | Research | Wrote `docs/research.md`: 52 sources, 15 ranked features, a never-build list, and a verification pass. The evidence is in `docs/research/`. No code changed. | The player-voice sample is small (about 25 comments). |
| 9 | Wrap-up | Refreshed the `CLAUDE.md` doc map, which had drifted 10-60 lines, plus its test and tools sections. Fixed a broken `tools\balance.ps1` row in `tools\README.md`. Wrote this summary. | None. |

## Top ten things to do next

Ranked by value for effort. The research ranks (R1-R15) refer to `docs/research.md` section 6, and the
phase numbers refer to sections of `docs/overhaul-findings.md`. Every item applies to both files unless
it says otherwise. Every new saved field needs a `cleanSave` / `loadScores` check (see `CLAUDE.md`
Conventions).

1. **Decide the safehouse** (R12; phases 2, 5 and 7). In Dope Wars it is fully built but unreachable,
   because `hasSafehouse` is never set. Candy Wars has a leftover `G.safehouse = {}`. Either sell it in
   the upgrades shop with a theft risk, or delete it from both files. This is a decision for `/land`;
   until it is made, it blocks coverage of `dopewars.html:1572-1626`.
2. **Seeded RNG with seed replay and a `?seed=` link** (R1, size M). There are only 13 `Math.random`
   calls per file. It makes bug reports and `tools\balance.js` runs reproducible, and it is the base for
   item 9.
3. **High scores per theme and difficulty, with the end title** (R2, size S; phase 7). This fixes the
   mixed-dollar table now that title tiers differ per theme. It needs new saved score fields.
4. **End-of-game report card** (R3, size S): profit by item, interest paid, busts and muggings, and the
   best trade. It shows players why they lost and how little the cheap items earned (phase 7).
5. **Debt projection and borrow warning** (R5, size S; phase 7 debt snowball), for example "at this rate
   you owe $X on day N". It eases the steep start on medium and hard without changing the rates.
6. **Losses that scale with cash carried** (R4, size S; phase 7): muggings and shark visits take a share
   of cash, as in Taipan, so the late game keeps some risk. Re-run `tools\balance.ps1` afterwards.
7. **Harden the deploy workflow** (phase 4, Nick's call because it is CI and secrets). Pin
   `actions/checkout` to a SHA, add `permissions: contents: read`, and replace the SFTP password with a
   deploy key limited to the web root. Rotate the password once, and check the server for leftover Flask
   files.
8. **Small save hardening** (phase 5): `cleanSave` should default a missing `borrowedToday` or
   `carTripsToday` to 0 instead of letting NaN through. Decide whether to drop the unused score `debt`
   field. Both are a few lines and a test.
9. **Short games and a Daily Deal** (R7, then R6; needs item 2). Add 10- and 15-day lengths to the Game
   Length setting, then a once-a-day seeded run with copyable result text (with a clipboard fallback for
   non-HTTPS pages).
10. **Make cheap items matter, and give upgrades a lasting cost** (R8, R10, R9; phase 7): bulk-order
    or specialty events that pay only in volume, upgrades with trade-offs, and price memory gated by the
    info upgrade. These are bigger balance changes, so run `tools\balance.ps1` before and after.

After these: local achievements (R11), save export and import (R13), the Candy Wars demand forecast
(R14), bust as a choice (R15, size L), moving the inline `onclick` handlers to `addEventListener` for a
hash-based CSP, and self-hosting the fonts. The phase 6 low-polish list is in the findings file. Never
build: ads, in-app purchases, accounts, online leaderboards, chat, tracking, or a PWA (`docs/research.md`
section 7).

## Tools added during the overhaul

| Command | What it does |
|---|---|
| `powershell -File tools\test.ps1 -Quiet` | Syntax check plus the whole `node:test` suite |
| `powershell -File tools\check-syntax.ps1 -Quiet` | `node --check` of each file's inline script |
| `powershell -File tools\coverage.ps1 -Out $env:TEMP\coverage.md` | Line and function coverage of the inline scripts |
| `powershell -File tools\mutate.ps1 -Game dopewars -Sample 100` | Mutation testing on a temp copy |
| `powershell -File tools\screens.ps1 -Out $env:TEMP\screens` | Headless-Chrome screenshots of every screen at 3 widths |
| `powershell -File tools\balance.ps1 -Seeds 3 -Out $env:TEMP\balance` | Bot playthroughs and a balance report |
