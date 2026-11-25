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

There is no test suite yet (as of overhaul phase 1). The only check is a syntax check of each file's
inline script:

```powershell
powershell -File tools\check-syntax.ps1 -Quiet
```

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
| Data: random events | 849-860 | 836-847 | `EVENTS` |
| Settings, presets, theme switch | 864-983 | 851-966 | `SETTINGS`, `PRESETS` (931/914), `applyPreset`, `applyTheme`, `readSettings`, `startFromSettings` |
| Helpers | 984-988 | 967-971 | `rnd`, `fmt`, `carried` |
| New game / state shape | 989-1024 | 972-1007 | `newGame` (the `G` object fields) |
| Market generation | 1025-1057 | 1008-1038 | `generateMarket` |
| Random events | 1058-1160 | 1039-1140 | `maybeEvent`, `applyEvent`, `showEvent`, `dismissEvent` |
| Buy / sell / supplier | 1161-1237 | 1141-1215 | `calcMaxQty`, `executeBuy`, `buyDrug`, `buyMax`, `supplierBuy`, `sellDrug` |
| Late-game events (after day 15) | 1238-1317 | 1216-1291 | `maybeLateEvent`, `leFireSale`, `leMarketCornered`, `leTipOff`, `leBurnedContact` |
| Headlines | 1318-1340 | 1292-1314 | `applyHeadline` |
| Travel (day tick, interest, events) | 1341-1406 | 1315-1371 | `travel`, `CAR_FREE_TRIPS` |
| Coat / bag offer | 1407-1447 | 1372-1412 | `COAT_OFFERS`, `maybeCoatOffer`, `acceptCoatOffer` |
| Upgrades shop | 1448-1512 | 1413-1476 | `UPGRADES`, `renderShop`, `buyUpgrade`, `buyCoatUpgrade` |
| Safehouse | 1513-1564 | — | `openSafehouse`, `shStash`, `shRetrieve` |
| Amount input (bank, borrow, repay) | 1565-1623 | 1477-1535 | `openInput`, `confirmInput`, `payAllLoan`, `withdrawAll` |
| Persistence | 1624-1652 | 1536-1564 | `saveGame`, `loadSavedGame`; keys `dopewars_game` / `_settings` / `_scores` (`candywars_*`) |
| High scores | 1653-1687 | 1565-1599 | `loadScores`, `saveScore`, `renderHighScores` |
| Game over | 1688-1710 | 1600-1622 | `endGame` |
| Log, render | 1711-1893 | 1623-1792 | `addLog`, `renderAll`, `renderMarket`, `renderStash`, `renderCities` |
| Trays, keyboard, start-up | 1894-1926 | 1793-1825 | `toggleTray`, keydown handler, start block |

## Conventions

- Keep each game a single self-contained HTML file; the only external resource is Google Fonts.
- Update `README.md` (and the in-game help modal) with any rule or balance change.
- `SETTINGS.interest` is a multiplier (1.10 = 10%/day); `SETTINGS.events` is a per-trip probability.
- Overhaul progress: `docs/overhaul-state.md`.
