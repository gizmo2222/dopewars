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
