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
| 2 | Bug hunt | todo | |
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
