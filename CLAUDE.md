# Dope Wars & Candy Wars

Two single-file browser trading games with the same mechanics and different themes. `dopewars.html`
(adult, gritty street theme) and `candywars.html` (kid-safe candy theme). No build step, no
dependencies, no server: each file holds its own CSS, HTML and one inline `<script>`. State lives in
`localStorage`. Design direction for both themes is in `.impeccable.md`; player-facing rules in `README.md`.

## Run

Open the file in a browser:

```powershell
Start-Process .\dopewars.html
```

```powershell
Start-Process .\candywars.html
```

For browser tooling that needs http, serve the folder (Python 3 and Node 24 are installed), then open
`http://localhost:8080/dopewars.html`:

```powershell
python -m http.server 8080
```

## Test

The suite is the inline-script syntax check plus `node:test` regression tests (Node 24, no npm
packages). Run all of it:

```powershell
powershell -File tools\test.ps1 -Quiet
```

`tests\harness.js` loads a game's inline `<script>` into `node:vm` with a small DOM
(`tests\dom.js`, which parses the real HTML and `innerHTML`). `loadGame(name, {seed, storage})`
boots a game; `newGame(name, settingsOverrides)` starts one past the settings modal. In a test,
`game.run('G.cash')` evaluates code in the game's scope, `game.rig([0.1, 0.9])` fixes the next
`Math.random()` values, `game.flushTimers()` runs queued `setTimeout`s. Name tests
`<game>: <behaviour>` and loop over `GAMES` so each check covers both files.

`tests\smoke.test.js` covers boot and a random walk; `tests\bugs.test.js` has one regression test per fixed bug.
The module tests are `trade` (market, buy, sell, supplier), `events` (random, late-game, headlines),
`travel-shop` (travel, coat offer, upgrades), `money-save` (bank, loans, save, scores, game over) and `ui`
(settings, themes, render, trays), each `tests\<module>.test.js`; `tests\security.test.js` covers save,
settings and score validation and the CSP; `tests\balance.test.js` runs the balance bots once on each
file. `docs\coverage.md` lists what is still untested.

Coverage and mutation testing (node's own `--experimental-test-coverage` misreads the HTML files, so use these):

```powershell
powershell -File tools\coverage.ps1 -Out $env:TEMP\coverage.md
```

```powershell
powershell -File tools\mutate.ps1 -Game dopewars -Lines 1218-1298
```

`mutate.ps1` edits a temp copy one operator or number at a time and lists the edits no test catches;
a full run of one game is about 600 mutants and several minutes.

Balance and screenshots (phase 7 and phase 6 tools): `balance.ps1` has bots play whole games headless
(`node tools\balance.js --seeds 1 --out $env:TEMP\bal` is a 192-game check in about 4 minutes);
`screens.ps1` drives headless Chrome over CDP for every screen at phone, tablet and desktop widths.

```powershell
powershell -File tools\balance.ps1 -Seeds 3 -Out $env:TEMP\balance
```

```powershell
powershell -File tools\screens.ps1 -Out $env:TEMP\screens
```

Scripts are indexed in `tools\README.md`.

## Deploy

Pushing to `main` deploys: `.github/workflows/deploy.yml` SFTPs both HTML files to the metacrystal.com
web root (host keys pinned in `.github/known_hosts`). Do not push to `main` without meaning to deploy.

## The two files are forks of each other

`candywars.html` is a re-theme of `dopewars.html`; code is near-identical, with internal names still
drug-flavoured (`buyDrug`, `G.hasGun`, `G.coat`, `corneredDrug`). A fix in one file almost always
needs the same fix in the other. Known drift:
- The **safehouse** (stash goods away from busts) exists only in Dope Wars (`dopewars.html:502-511`
  modal, `:1572-1626` code). Candy Wars still creates `G.safehouse = {}` but has no UI for it.
- Candy Wars names: coat offer = "bag offer", fire sale = "going-home sale".

## Doc map

Line numbers are for `dopewars.html` / `candywars.html` (refreshed in overhaul phase 9). Functions sit at
two-space indent inside the one `<script>`, so `Select-String -Pattern '^  function name' .\dopewars.html`
finds any of them if these drift.

| Area | dopewars.html | candywars.html | Key symbols |
|---|---|---|---|
| CSS | 10-383 | 10-384 | theme vars at top of `<style>` |
| Header, main layout (travel, market, stats, stash, log) | 385-468 | 386-468 | `#cityDisplay`, `#headerSub`, `#log` |
| Event / coat (bag) / fire-sale modals | 469-501 | 469-501 | `#eventOverlay`, `#coatOverlay`, `#fireSaleOverlay` |
| Safehouse modal | 502-511 | — | `#safehouseOverlay` |
| Settings / help / high-score modals | 512-646 | 502-632 | `#settingsOverlay`, `#helpOverlay`, `#helpTiers`, `#highScoresOverlay` |
| Amount input dialog, game-over screen, toast | 647-673 | 633-659 | `#inputOverlay`, `#gameOver`, `#toast` |
| Data: themes (cities, items, prices, upgrade names, headlines, copy) | 676-883 | 662-870 | `DRUGS`, `THEMES` |
| Data: random events | 884-895 | 871-882 | `EVENTS` |
| State, modal open/close, settings, presets, theme switch | 896-1021 | 883-1004 | `G`, `SETTINGS`, `SETTING_KEYS`, `PRESETS` (972/955), `applyPreset`, `themeOf`, `applyTheme`, `readSettings`, `startFromSettings` |
| Helpers | 1022-1028 | 1005-1011 | `rnd`, `fmt`, `gameInProgress`, `carried`, `citySpecialty` |
| New game / state shape | 1029-1065 | 1012-1048 | `newGame` (the `G` object fields) |
| Market generation | 1066-1098 | 1049-1079 | `generateMarket` |
| Random events, END GAME confirm | 1099-1217 | 1080-1197 | `maybeEvent`, `applyEvent`, `showEvent`, `confirmEndGame`, `dismissEvent` |
| Buy / sell / supplier | 1218-1298 | 1198-1278 | `calcMaxQty`, `addStock`, `executeBuy`, `readQty`, `buyDrug`, `buyMax`, `supplierBuy`, `sellDrug` |
| Late-game events (after day 15) | 1299-1377 | 1279-1353 | `maybeLateEvent`, `leBurnedContact`, `leFireSale`, `leMarketCornered`, `leTipOff` |
| Headlines | 1378-1403 | 1354-1379 | `applyHeadline` (headlines carry an `item:` tag) |
| Travel (day tick, interest, events) | 1404-1461 | 1380-1429 | `travel`, `CAR_FREE_TRIPS`, `DAILY_BORROW_LIMIT` |
| Coat / bag offer | 1462-1503 | 1430-1471 | `COAT_OFFERS`, `maybeCoatOffer`, `acceptCoatOffer` |
| Upgrades shop | 1504-1571 | 1472-1538 | `UPGRADES`, `coatUpgradePrice`, `renderShop`, `buyUpgrade`, `buyCoatUpgrade` |
| Safehouse | 1572-1626 | — | `openSafehouse`, `shStash`, `shRetrieve` |
| Amount input (bank, borrow, repay) | 1627-1699 | 1539-1611 | `inputBlocked`, `openInput`, `confirmInput`, `payDebt`, `payAllLoan`, `withdrawAll` |
| Persistence and save validation | 1700-1763 | 1612-1675 | `saveGame`, `esc`, `cleanSettings`, `cleanSave`, `loadSavedGame`; keys `dopewars_game` / `_settings` / `_scores` (`candywars_*`) |
| High scores | 1764-1800 | 1676-1712 | `loadScores`, `saveScore`, `renderHighScores` |
| Game over | 1801-1836 | 1713-1748 | `titleTiers`, `endGame` |
| Log, render | 1837-2015 | 1749-1914 | `addLog` (`'bad'` also toasts), `renderAll`, `syncTopSections`, `renderMarket`, `renderStash`, `renderCities` |
| Trays, keyboard, start-up | 2016-2054 | 1915-1953 | `closeTray`, `toggleTray`, keydown handler, start block |

## Conventions

- Keep each game a single self-contained HTML file; the only external resource is Google Fonts.
- Update `README.md` (and the in-game help modal) with any rule or balance change.
- `SETTINGS.interest` is a multiplier (1.10 = 10%/day); `SETTINGS.events` is a per-trip probability.
- Saved data is untrusted: `loadSavedGame` resumes a save only if `cleanSave` and `cleanSettings` pass
  (theme item and city names only, finite numbers), and `loadScores` drops malformed entries. Any new
  saved field needs a check there, and saved text reaching `innerHTML` goes through `esc`.
- Each file has a CSP `<meta>` (inline script and styles, Google Fonts only); a new external resource
  must be added to it.
- Overhaul: progress in `docs/overhaul-state.md`, results and the top ten next steps in
  `docs/overhaul-summary.md`, deferred items in `docs/overhaul-findings.md`, ranked features in
  `docs/research.md`.
