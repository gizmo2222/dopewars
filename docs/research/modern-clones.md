# Modern clones and mobile/web versions of Drug Wars

Area: current Drug Wars-style games on iOS, Android, web, Steam and itch.io. Researched 2026-11-25. Monetisation is noted only as context for what players tolerate.

## Sources

1. Dope Wars: Mobile, App Store listing. https://apps.apple.com/app/id6748084044 (fetched 2026-11-25; v63, latest release about 4 days earlier)
2. Watch Trader, itch.io. https://plazatin.itch.io/watchtrader (fetched 2026-11-25)
3. The Dope Game, Steam. https://store.steampowered.com/app/466800/The_Dope_Game (fetched 2026-11-25)
4. dopewars 1.7.0, SourceForge project site. https://dopewars.sourceforge.io/ (fetched 2026-11-25)
5. Drug Lord 2 - Mafia Empire, update v1.1 devlog. https://thedgames.itch.io/drug-lord-2-mafia-empire/devlog/714669/update-v11 (fetched 2026-11-25)
6. Drug Wars 84, App Store listing. https://apps.apple.com/us/app/drug-wars-84/id1562074713 (fetched 2026-11-25)
7. DOPEFRONT, Kotaku game page. https://kotaku.com/games/dopefront (fetched 2026-11-25)
8. Dope Wars (Weed Edition), App Store listing. https://apps.apple.com/app/id1244425171 (fetched 2026-11-25)
9. Web search results for "Dope Wars browser game play online free daily leaderboard" (snippets only: Classic Reload, MyAbandonware, Dope Wars Classic Android with Google Play Games leaderboard). Seen 2026-11-25.
10. Web search results for Drug Dealer Simulator (Steam, Shacknews, GamingTrend, Game8). Seen 2026-11-25. https://shacknews.com/article/117832/drug-dealer-simulator-review-bad-trip

Not researched: Weed Firm, Cartel/Kingpin-named trading games, Urban Drug Empire beyond a search snippet. Nothing below about them is verified.

## Findings

### The faithful remakes (closest to what this repo is)

- Drug Wars 84 is a free iPhone recreation that says it follows the 1984 DOS game as closely as possible. It keeps to New York trading. Version 1.3 added saved custom item names and a rating shown at game end. [6]
- It has 2 ratings averaging 3.0, with one bug report where purchases stop after a few items. It collects no data. [6] A plain remake gets little traction and little feedback.
- Classic play also survives as browser-hosted DOS ports (Classic Reload, MyAbandonware, the latter flagged experimental). [9]
- The long-lived open source dopewars (GTK, Unix and Windows) keeps cops, guns, combat, loan shark and high scores, adds multiplayer, and has an "antique" mode matching the original. [4]
- Release 1.7.0 added GTK4 and a Swedish translation. [4] Translation is an easy reach feature for a text game.

### Browser and web versions

- Watch Trader is a free HTML5 clone based on BeerMat's Dope Wars v1.2.0, re-themed to watches. It has a Windows 98 look, eight cities none with an advantage, a random-name generator, and global leaderboards for online play. [2]
- The developer says it installs as an app from the browser menu and works offline. [2] Its to-do list still lists cop encounters, hospital healing, weapons and events. [2]
- DOPEFRONT runs in the browser on phone and desktop with no account. Prices shift with random events and with how many other players are in a city. It has six cities, 15/30/60-day rounds, daily and all-time leaderboards, and pixel-art police chases and muggings. [7]
- It also has supplier credit, a bank, guns, hired spies and player cartels. [7] The web version adds social and real-time layers, which need a server.
- Theme re-skins are common (watches [2], cannabis [8], late-90s desktop [7]), which matches this repo's themed approach.

### Mobile apps with progression layers

- Dope Wars: Mobile (Tenuki Software) is free with in-app purchases and no ads or energy timers. It has Career Mode (climb by completing challenges), a skill tree of 12+ skills unlocked with in-game coins, dozens of achievements, profile pictures and titles, and dynamic events (price crashes, enforcers, debts due). [1]
- Its release notes say the backend, leaderboards included, was removed in v60. [1] A leaderboard is a maintenance burden; this app dropped it. It holds 4.3 from 121 ratings. [1]
- Dope Wars (Weed Edition) on iOS: $0.99 with in-app purchases, 4.7 from 1.1K ratings. Starts with $2,000 and a $5,500 loan shark debt. It adds a police stand-off, weapons and storage, a bank with interest, a doctor, tips from an old lady, timed games of 1 to 20 minutes, Game Center leaderboards per game length, achievements, and seeds to replay the same scenario. [8]
- One reviewer on its page said the game lacks challenge after the early days. [8] This echoes this repo's own "upgrades cheap after week one" and "muggings trivial late" findings.
- Dope Wars Classic (Android) is reported with an online leaderboard through Google Play Games (search snippet only). [9]

### Steam and PC

- The Dope Game (Steam, $4.99, free demo): 18 locations, 16 drugs, 35+ weapons and 10 armours, 8 game lengths, hireable crew including animals, Holiday, SFW and Hard modes, 30 achievements, Steam Cloud. Reviews are Mostly Positive (79% of 187). [3]
- Its extras are cheap (a $0.99 add-on, a $1.99 soundtrack). [3] It ships an SFW mode, the same split this repo makes with Candy Wars. [3]
- Drug Dealer Simulator (Byterunners) is a different genre: first-person, cartel shipments, recipe mixing. Reviewers called the loop solid but shallow in danger, and the sequel scored 66/100 on Game8 for menu-heavy filler. [10]
- Takeaway: depth added as menus and filler is criticised; mechanics-driven additions (mixing) are praised. [10]

### Itch.io fan remakes

- Drug Lord 2 - Mafia Empire posts the leaderboard score automatically when a new in-game day starts. [5] That removes a submit step and makes the score count even if the player quits.

### Patterns across clones

- Common additions: leaderboards (online or Game Center) [2][5][7][8][9]; achievements [1][3][8]; fight-or-run with cops, weapons and health [3][4][8]; seeds or alternate game lengths [3][7][8]; SFW or re-themed variants [2][3][7][8].
- Rare: story and map progression (only a skill tree and career mode in [1]).
- Players tolerate paid game modes and cosmetic packs, and one app markets "no ads" as a plus [1]; free web clones carry no monetisation [2][7].
- Online features are fragile: one app removed its backend [1], and Watch Trader's to-do list is long and unfinished [2].

## Ideas for this repo

1. Seed code with replay, plus a daily seed from the date. Evidence: seeds are a feature in [8]; 8 game lengths in [3]. Fits: yes, no server; the seed is computed locally and scores are compared by sharing a text code. Also helps simulation and tests.
2. Local achievements with a trophy list. Evidence: 30 in [3], dozens in [1], Game Center in [8]. Fits: yes, localStorage; needs a validated saved field per CLAUDE.md. A good use for the dead cheap items (e.g. "trade every item") and the safehouse.
3. Short game lengths (e.g. a 10-day quick game). Evidence: 15/30/60 in [7], 1 to 20 minute games in [8], 8 lengths in [3]. Fits: yes; only `SETTINGS` and presets change. Check the interest balance.
4. Record the run on every day change so quitting still scores. Evidence: [5]. Fits: yes locally.
5. Installable PWA with offline support. Evidence: Watch Trader installs from the browser menu and works offline [2]. Fits: partly; needs a manifest and service worker, which conflicts with the single-file rule and the CSP, so weigh it first.
6. Optional light fight-or-run encounter, Dope Wars only, with a health stat. Evidence: [3][4][8] all have it; the repo lacks it. Fits: mechanically yes, but a large balance change, and Candy Wars would need a kid-safe version. Largest, lowest-confidence idea.
7. Copy-to-clipboard share-score text as a stand-in for online leaderboards. Evidence: boards exist in [2][7][8], yet one app removed its backend [1]. Fits: yes, no server.
8. Do not build: multiplayer, shared pricing and cartels [7] and online leaderboards [2][7] all need a server; cosmetic or mode purchases [1] are out of scope for a free hobby game.
