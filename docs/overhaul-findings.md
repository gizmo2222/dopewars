# Overhaul findings not fixed

Findings the overhaul did not fix: refuted, unconfirmed, deferred for a decision, or out of a phase's scope.
Each entry says which phase raised it, the evidence, and what would settle it.

## Phase 2: bug hunt

Method: 4 hunters (areas: market/trading, events/travel, money/upgrades/persistence, UI/settings/render),
each covering all five bug classes, then 4 disprovers checking every finding against the code and the
git history. 17 findings after dedupe: 14 confirmed and fixed in both games with tests in
`tests\bugs.test.js` (merge of the phase-2 worker branch), 3 below.

### old-settings-start-throws (refuted; hardening candidate)
- Claim: a `dopewars_settings` value saved by an older build (button values the current settings modal
  no longer has) makes `readSettings` find no active button and throw on START NEW GAME.
- Why refuted: no deployed build wrote those values. The fix that changed them (40730a2) predates the
  first deploy (a2be255), so no player's storage holds them.
- Still true: `readSettings` has no null guard for a missing `.active` button. Worth a one-line guard in
  phase 4 or 5 if settings shapes change again.

### old-save-missing-lastvisit (unconfirmed; hardening candidate)
- Claim: a save from before `G.lastVisit` existed loads without it and crashes or misprices travel.
- Disprovers split: one refuted it (`lastVisit` landed in 8c33c97, before the first deploy), one rated
  it a real low-severity risk for any future field added to `G`.
- Suggested hardening: in `loadSavedGame`, merge the parsed save over a fresh `newGame()` state shape
  so missing fields get defaults. Candidate for phase 4 (unsafe data handling) or phase 5.

### safehouse-unreachable (Dope Wars only; needs a product decision)
- Claim: the safehouse (`#safehouseOverlay`, `openSafehouse`, `shStash`, `shRetrieve`) cannot be reached.
- Evidence: nothing sets `G.hasSafehouse`, `UPGRADES` has no safehouse entry, and nothing calls
  `openSafehouse`. Candy Wars creates `G.safehouse = {}` and has no UI at all.
- Not fixed because the fix is a choice, not a bug fix: wire it up as an upgrade (and port it to Candy
  Wars) or delete it. Left for phase 5 (dead code) or `/land`.

## Phase 3: tests

Method: `tools\coverage.ps1` (V8 coverage mapped to each inline script) to list the untested paths, five
module test files written by workers, then `tools\mutate.ps1` per module range to find mutants the tests
miss. No game bugs turned up. What the survivors and the coverage gaps show:

### Dead or duplicated code (for phase 5; resolved in phase 5 except the safehouse)
- `maybeEvent` is never called in either game: `travel()` inlines its own event roll. It is tested
  directly, but either `travel` should call it or it should go.
- `if (G.debt < 0) G.debt = 0` in `confirmInput` (dw 1605 / cw 1517) and `payAllLoan` (dw 1623 / cw 1535)
  can never fire: repayments are already capped at the debt.
- The `maybeLateEvent` fallback `eligible[eligible.length - 1].fn()` (dw 1268 / cw 1242) is unreachable:
  the weighted pick always lands first. Both games' only uncovered lines besides the safehouse.
- The safehouse (dw 1374-1377 rent in `travel`, 1525-1575, 1851-1852 in `renderStash`) is untested
  because nothing can reach it (see `safehouse-unreachable` above).

### Equivalent mutants (no test can kill them; listed so nobody chases them)
- `applyEvent` bust `Math.min(0.9, ...)`: the fraction is at most 0.7, so the cap never binds.
- `|| 0` / `: 0` defaults that never see a falsy value: `executeBuy` `avgCost || 0` (dw 1182 / cw 1161),
  `supplierBuy` `market || 0` (dw 1215 / cw 1194), the travel tip-off `|| 0` (dw 1384 / cw 1352),
  `renderCities` `freeLeft ... : 0` (dw 1873 / cw 1772).
- `buyMax` `qty <= 0` -> `< 0` (dw 1203 / cw 1182): zero falls through to a no-op buy.
- `G.day > 15` -> `>= 15` (dw 1400 / cw 1366) only shifts the first late-event day; tests pin day 16+.
- The `setTimeout` delay of 50 ms (dw 1905 / cw 1804); safehouse-only lines in `renderStash`
  (dw 1825, 1836, 1849; cw 1744).

### Observations, not bugs
- The settings modal shows Cancel on first load, because `newGame()` runs at boot and sets `G.day = 1`.
  Cancel then keeps the default game, which is harmless.
- There is no bank interest; only the loan accrues. README and help agree, so this is by design.

## Phase 4: security

Fixed in both games, with tests in `tests\security.test.js`:
- A tampered `localStorage` save could put HTML into `innerHTML` and inline `onclick` strings. That is self or stored XSS on the shared metacrystal.com origin.
- A score list that wasn't an array crashed `endGame` after `G.ended` was set, so the game-over screen never showed.
- Saved settings were `Object.assign`ed with no filtering.

Saves are now validated on load, scores are filtered, the score date is escaped, and each file has a CSP `<meta>`. The items below were logged, not fixed, because they touch CI, secrets or the server.

### Deploy workflow (`.github/workflows/deploy.yml`; CI config, not changed)
- `actions/checkout@v5` is pinned by tag, not by commit SHA. Pin it to a SHA.
- There is no `permissions:` block, so the job gets the repo's default token scope. Add `permissions: contents: read`.
- SFTP logs in through `sshpass` with a password secret. A deploy key limited to the web root would be safer.
- The server username and web-root path appear in the public workflow. This is low risk, but it helps an attacker guess the account.
- Deploys before commit 0add383 ran with `StrictHostKeyChecking=no`, so they could have been intercepted. This is low risk, and rotating the SFTP password once is cheap.
- The workflow was also checked for expression injection and is clean: no `github.event.*` text reaches a `run:` step.

### History and server
- A removed `.claude/settings.local.json` is still in public git history. It holds no secrets, but it does show the local username and paths. Rewriting history is Nick's call, so it was not done.
- An app since removed from the repo (a Flask app) defaulted `secret_key` to `"change-me-in-production"`. Check that no old `.py` files or running instance are left on the server.

### Notes
- Google Fonts CSS cannot use SRI because it varies by browser, and it shows Google every visitor, which is a privacy concern, not a bug. Self-hosting the fonts would fix both and let the CSP drop the Google hosts.
- The CSP needs `script-src 'unsafe-inline'` because every button uses an inline `onclick`. Moving them to `addEventListener` would allow a hash-based CSP; that is a phase 5 candidate.
- Two equivalent mutants in `esc`: inside the regex character class, `<`→`<=` and `>`→`>=` still match the same characters.
- There are no npm packages, so no dependencies to audit. The `tools\*.ps1` scripts pass argv arrays to `spawn`, and their deletes stay inside `mkdtemp` folders.

## Phase 5: clean-up

Applied in both games (behaviour unchanged, the suite passes): `travel` now calls `maybeEvent` instead
of an inline copy; the dead `G.debt < 0` clamps and the unreachable `maybeLateEvent` fallback are gone;
shared helpers replace copied code (`SETTING_KEYS` loops, `themeOf`, `renderHeaderSub`, `gameInProgress`,
`payDebt`, `coatUpgradePrice`, `upgradeKey`, `citySpecialty`, `addStock`, `readQty`, `fireSaleMax`, the
render `badge` helper); `supplierBuy` passes its price to `executeBuy` instead of swapping `G.prices`;
`DAILY_BORROW_LIMIT` names the 10000; repeated inline styles became CSS classes.

Logged, not applied (behaviour or product changes, or against the project's conventions):
- `saveScore` stores a `debt` field that nothing reads; `money-save.test.js` asserts it. Dropping it
  changes the saved score format, so it is left for /land to decide.
- A crafted save that lacks `borrowedToday` or `carTripsToday` passes `cleanSave` and later yields NaN
  in the borrow limit and free-trip count. Defaulting them to 0 in `cleanSave` is a small behaviour change.
- `cleanSave` checks `isObj` on fields that the later per-key checks would also reject. Kept as defence in depth.
- The safehouse in Dope Wars is still unreachable (`hasSafehouse` is never set). Delete it or add it to
  the shop: a product decision for /land. Candy Wars still creates an unused `G.safehouse = {}`.
- Inline `onclick` handlers force `script-src 'unsafe-inline'`. Moving ~100 handlers to `addEventListener`
  is a large rewrite of both files; deferred.
- Merging the two forks into one file with a theme switch would remove most duplication but breaks the
  "one self-contained file per game" convention and the per-game deploy.
- `readSettings` has no guard for a missing input element; all inputs exist in both files, so it is only
  a hardening note.
- No dependencies: there is no `package.json`, and the only external resource is Google Fonts.
- The CLAUDE.md doc map line numbers have shifted again; phase 9 refreshes them.

## Phase 6: UI

Fixed in both games (15 items): overlays scroll so no modal is cut off; the phone header wraps; city cells
and the Cash/Debt toggles are real buttons; dialogs have roles, labels and focus on open; Enter no longer
double-fires on a focused button; the panels fill the window instead of `calc(100vh - 52px)`; the
breakpoint moved to 720px with 44px tap targets; text is 11px or larger; refusals show a toast; the log
is a live region; END GAME is not faded on the last day; safehouse rows wrap; help reads the interest
rate and upgrade list from the code; Candy Wars copy and singular/plural wording.

Logged, not applied:
- Phase 7 (they change the game flow): the amount dialog opens for impossible actions and logs a $0
  success (`bugs.test.js` pins that flow); no END GAME confirm while the stash is unsold; the days-left
  warning could start at `maxDays - 3`.
- Low polish, cut to keep the list at 15: a losing game over is styled like a win (toggle a `.loss`
  class in `endGame`); the difficulty preset is not highlighted when settings match one; glyphs and emoji
  are read aloud and price trend is shown only by symbol and colour; the qty input border has low
  contrast; help's GOT IT is only at the bottom; game-over score rows are centred; BUY/MAX are disabled
  with no reason shown; Candy Wars market names wrap to 2-3 lines at phone and tablet widths; at tablet
  width the Candy Wars "OWE PARENTS ▾" label wraps its arrow onto a second line (unchanged from before).
- Highlighting the current run in high scores needs a new saved field and with it new `loadScores` checks.
- Font preconnect or non-blocking font CSS: a small gain, but the `media=print` trick needs an inline
  handler and causes a flash of unstyled text.
- Rejected as redesigns or taste: moving Finances above the market on phones, removing
  `syncTopSections` (it keeps the two column titles aligned), zebra rows, Candy Wars rounded corners,
  restyling the input dialog.
