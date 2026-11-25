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
| 3 | Tests | todo | |
| 4 | Security | todo | |
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
