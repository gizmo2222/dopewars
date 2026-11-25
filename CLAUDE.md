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
settings and score validation and the CSP. `docs\coverage.md` lists what is still untested.

Coverage and mutation testing (node's own `--experimental-test-coverage` misreads the HTML files, so use these):

```powershell
powershell -File tools\coverage.ps1 -Out $env:TEMP\coverage.md
```

```powershell
powershell -File tools\mutate.ps1 -Game dopewars -Lines 1168-1248
```

`mutate.ps1` edits a temp copy one operator or number at a time and lists the edits no test catches;
a full run of one game is about 600 mutants and several minutes.

Scripts are indexed in `tools\README.md`.

## Deploy

Pushing to `main` deploys: `.github/workflows/deploy.yml` SFTPs both HTML files to the metacrystal.com
web root (host keys pinned in `.github/known_hosts`). Do not push to `main` without meaning to deploy.

## The two files are forks of each other

`candywars.html` is a re-theme of `dopewars.html`; code is near-identical, with internal names still
drug-flavoured (`buyDrug`, `G.hasGun`, `G.coat`, `corneredDrug`). A fix in one file almost always
needs the same fix in the other. Known drift:
- The **safehouse** (stash goods away from busts) exists only in Dope Wars (`dopewars.html:482-491`
  modal, `:1513-1563` code). Candy Wars still creates `G.safehouse = {}` but has no UI for it.
- Candy Wars names: coat offer = "bag offer", fire sale = "going-home sale".

## Doc map

Line numbers are for `dopewars.html` / `candywars.html`.

| Area | dopewars.html | candywars.html | Key symbols |
|---|---|---|---|
| CSS | 9-368 | 9-369 | theme vars at top of `<style>` |
| Header, main layout (travel, market, stats, stash, log) | 372-448 | 373-448 | `#cityDisplay`, `#headerSub` |
| Event / coat (bag) / fire-sale modals | 449-481 | 449-481 | `#eventOverlay`, `#coatOverlay`, `#fireSaleOverlay` |
| Safehouse modal | 482-491 | — | `#safehouseOverlay` |
| Settings / help / high-score modals | 492-631 | 482-617 | `#settingsOverlay`, `#helpOverlay`, `#highScoresOverlay` |
| Amount input dialog, game-over screen | 632-658 | 618-644 | `#inputOverlay`, `#gameOver` |
| Data: themes (cities, items, prices, upgrade names, copy) | 660-848 | 646-835 | `THEMES` |
| Data: random events | 849-864 | 836-851 | `EVENTS` |
| Settings, presets, theme switch | 865-983 | 852-966 | `SETTINGS`, `PRESETS` (932/915), `applyPreset`, `applyTheme`, `readSettings`, `startFromSettings` |
| Helpers | 984-988 | 967-971 | `rnd`, `fmt`, `carried` |
| New game / state shape | 989-1026 | 972-1009 | `newGame` (the `G` object fields) |
| Market generation | 1027-1059 | 1010-1040 | `generateMarket` |
| Random events | 1060-1167 | 1041-1147 | `maybeEvent`, `applyEvent`, `showEvent`, `dismissEvent` |
| Buy / sell / supplier | 1168-1248 | 1148-1226 | `calcMaxQty`, `executeBuy`, `buyDrug`, `buyMax`, `supplierBuy`, `sellDrug` |
| Late-game events (after day 15) | 1249-1330 | 1227-1304 | `maybeLateEvent`, `leFireSale`, `leMarketCornered`, `leTipOff`, `leBurnedContact` |
| Headlines | 1331-1353 | 1305-1327 | `applyHeadline` |
| Travel (day tick, interest, events) | 1354-1417 | 1328-1382 | `travel`, `CAR_FREE_TRIPS` |
| Coat / bag offer | 1418-1458 | 1383-1423 | `COAT_OFFERS`, `maybeCoatOffer`, `acceptCoatOffer` |
| Upgrades shop | 1459-1523 | 1424-1487 | `UPGRADES`, `renderShop`, `buyUpgrade`, `buyCoatUpgrade` |
| Safehouse | 1524-1575 | — | `openSafehouse`, `shStash`, `shRetrieve` |
| Amount input (bank, borrow, repay) | 1576-1636 | 1488-1548 | `openInput`, `confirmInput`, `payAllLoan`, `withdrawAll` |
| Persistence | 1637-1665 | 1549-1577 | `saveGame`, `loadSavedGame`; keys `dopewars_game` / `_settings` / `_scores` (`candywars_*`) |
| High scores | 1666-1700 | 1578-1612 | `loadScores`, `saveScore`, `renderHighScores` |
| Game over | 1701-1726 | 1613-1638 | `endGame` |
| Log, render | 1727-1909 | 1639-1808 | `addLog`, `renderAll`, `renderMarket`, `renderStash`, `renderCities` |
| Trays, keyboard, start-up | 1910-1945 | 1809-1844 | `toggleTray`, keydown handler, start block |

## Conventions

- Keep each game a single self-contained HTML file; the only external resource is Google Fonts.
- Update `README.md` (and the in-game help modal) with any rule or balance change.
- `SETTINGS.interest` is a multiplier (1.10 = 10%/day); `SETTINGS.events` is a per-trip probability.
- Saved data is untrusted: `loadSavedGame` resumes a save only if `cleanSave` and `cleanSettings` pass
  (theme item and city names only, finite numbers), and `loadScores` drops malformed entries. Any new
  saved field needs a check there, and saved text reaching `innerHTML` goes through `esc`.
- Each file has a CSP `<meta>` (inline script and styles, Google Fonts only); a new external resource
  must be added to it.
- Overhaul progress: `docs/overhaul-state.md`.
