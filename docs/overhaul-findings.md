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

### Dead or duplicated code (for phase 5)
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
