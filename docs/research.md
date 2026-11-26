# Research: Dope Wars and Candy Wars (overhaul phase 8)

Date: 2026-11-25. Scope: comparable games, what players say, what makers learned, and what to build next.
Pricing is context only; both games are free hobby games.

Evidence files (one per research area, each with its own source list):
[lineage.md](research/lineage.md), [modern-clones.md](research/modern-clones.md),
[trading-genre.md](research/trading-genre.md), [player-voice.md](research/player-voice.md),
[design-lessons.md](research/design-lessons.md), [replayability.md](research/replayability.md).

Limits. Reddit, Metafilter, Google Play and Steam review text could not be read. Player-voice counts come
from about 12 sources and about 25 comments, so they show direction, not prevalence. No interview with
John E. Dell or Ben Webb about balance was found. Claims from memory are marked (unsourced).

## 1. Summary

- The genre's appeal is one simple loop and one score; additions that keep the loop clean are praised [29][31].
- The top complaints are "repetitive" and "pointless once the debt is paid", and both match our phase-7 sim findings [28][14][7].
- The cheapest high-value additions need no server: a seeded RNG (seed replay, daily run, shareable link) and local stats [14][41][42].
- Online leaderboards and backends are fragile; one active clone removed its backend in 2025 [13].
- The candy re-skin is proven precedent (Sugar Wars, Prohibition 3: Candy Wars), so Candy Wars should stay strictly kid-safe [8][10].

## 2. Comparable games

| Name | Platform | Years | What it does better than us | Source |
|---|---|---|---|---|
| Drug Wars (John E. Dell) | DOS / IBM PC | 1984 | Cop encounter where you can be arrested, run or fight [1]; an effective maximum score of about $50M is cited [3] | [1][3] |
| Taipan! | Apple II, others | 1979 | Losses scale with cash carried; upgrades are trade-offs (cargo vs guns); warehouse with theft risk | [20] |
| dopewars (Ben Webb) | Unix / Windows, GPL | 1998-today (1.7.0 current) | AI players, networked multiplayer, renamable items, "antique" mode, translations | [4][5][6] |
| Beermat Dope Wars | Windows | about 1998-2005 | Reach: over 6.5M CNET downloads | [1] |
| TI-82/83 Drug Wars, DrugWars 2 | Graphing calculators | 1998, 1999 | Played in class; spread by hand-typed listings | [1][7] |
| Underworld: Drug Lords / Sugar Wars | iOS, Android | 2008-2014 | Sweets version on iOS reportedly had a few times more users than the drug version on Android; the source calls this a weak comparison and says the drug setting drew more interest | [8][9] |
| Prohibition 3: Candy Wars | iPhone | 2009 | Candy re-skin approved by Apple | [10] |
| Dope Wars (Weed Edition) | iOS | reviews 2020-2024 | Replayable seeds, timed 1-20 minute games, per-length leaderboards, achievements; 4.7 from 1.1K ratings | [14] |
| Dope Wars: Mobile | iOS | 2025 (v63) | Career mode, 12+ skill tree, achievements; dropped its backend and leaderboards in v60 | [13] |
| The Dope Game | Steam | — | 8 game lengths, 30 achievements, SFW mode; 79% of 187 reviews positive | [15] |
| DOPEFRONT | Browser | — | No sign-up; 15/30/60-day rounds; daily and all-time boards (server) | [16] |
| Watch Trader | HTML5, itch.io | — | Installs from the browser menu and works offline | [17] |
| Drug Lord 2 - Mafia Empire | itch.io | v1.1 | Records the score at each new day, so quitting still counts | [18] |
| Drug Wars 84 | iOS | v1.4 in 2025 | Faithful remake with custom item names; only 2 ratings, one buy-cap bug report | [11] |
| Lemonade Stand | Apple II (MECC) | 1973 | Classroom standard; weather explains demand | [21][23] |

## 3. What players praise and complain about

Counts are sources out of about 12 in [player-voice.md](research/player-voice.md); direction only.

Praise:

| Theme | Rough frequency | Sources |
|---|---|---|
| Simple loop, easy to learn | 4 of 12 | [28][29][32][34] |
| Addictive short sessions | about 5 | [28][30][31][34] |
| Nostalgia (calculators, class, learning to code) | strongest emotional driver | [7][2] |
| Risk management is the skill | 2 ([29] frames it as a wider design trend) | [29][31] |
| Small additions that keep the loop clean (average purchase price, minimal UI) | 2 | [30][31] |
| Replaying a fixed seed | 1 | [14] |
| Free | 2 | [28][32] |

Complaints:

| Theme | Rough frequency | Sources | Our phase-7 match |
|---|---|---|---|
| Repetitive, little variety or depth | 4 (most common) | [28][32][34] | Cheap items are dead weight |
| Too easy or pointless once the debt is paid | 2 | [7][14] | Upgrades cheap after week one; muggings trivial late |
| Debt or loan-shark deaths | 3 | [7][29][30] | Debt snowball on medium/hard |
| RNG decides runs early | 2 (one fan defends hard RNG) | [14][31] | — |
| Confusing loan and ending rules; asked for a warning | 1 | [30] | — |
| Ads and an aggressive ad-removal paywall | 1 | [32] | Not applicable; never build |
| Slow upgrade grind | 1 (mobile) | [32] | Opposite of our problem |

Observations:
- "Too easy once solved" and "debt kills you" coexist. Veterans are bored by the same knowledge new players lack [7][29].
- Guides disagree on the opening (pay debt first [33] vs ride it), so the opening is a real decision.
- Players want to see why they lost. The loan complaint [30] is a feedback gap, not a balance gap.
- No source says a trading-only clone is worse for lacking combat.

Already in our code (checked by search, so not proposed below):
- Average purchase price per item is tracked (`G.avgCost`) and shown in the stash with a profit percentage.
- Price change since the last market (`G.prevPrices`) and days since last visit (`G.lastVisit`) exist.
- A "DEBT CLEARED" log line exists. There is no forward debt projection.
- The medium preset ($2,000 cash, $5,000 debt, 30 days, 100 slots) is already close to the 1984 numbers [1][12],
  so a separate "classic" preset adds little.
- The four Candy Wars item lists have no obvious drug-slang names (a Slashdot commenter [10] pointed out that "rock candy" style names map to drug slang).

## 4. Lessons from makers and dead projects

- Dell adapted a classmate's commodities game as a school project and was surprised it spread [35][2]. It grew without a plan.
- Longevity is credited to simplicity and a single high-score goal with no unlock ladder [29].
- Online layers die first. Zynga's MMO-style version shut in December 2009 [1]. Dope Wars: Mobile removed its
  backend and leaderboards in v60 [13]. Watch Trader's to-do list of combat, hospital and weapons is unfinished [17].
- A faithful remake with nothing new gets little traction: Drug Wars 84 has 2 ratings [11].
- A clone maker copied the stash, found it nearly useless, and kept the turn limit short on purpose [36].
  Our safehouse is still unreachable in Dope Wars (nothing sets `G.hasSafehouse`) and absent in Candy Wars.
- A visible buy-cap bug was the main complaint about one remake [11]. Buy-max must never block an affordable buy.
- Drug themes meet uneven enforcement: Apple rejected Underworld: Drug Lords (2008) [9], pulled Weed Firm (2014) [37],
  rejected Go Kane! while Google Play allowed it [38], and removed drug-war shooters in 2017 [52][51].
  Candy re-skins passed [8][10], and kid candy clones are common on calculators and the web [22]. Violence against police or drug users is the content that draws removals [52].
- Large, rare events keep runs fresh; small ones fade as players adapt [39]. Unanswerable bad luck turns skill into roulette [40].
- Automation that removes friction makes trading games too easy (Port Royale 4 trade routes) [24].
- Determinism must be designed in. "Determinism is all or nothing." [41]. Replays break if the order of random calls changes [45].

## 5. Pricing

Not relevant: both games are free, with no ads or accounts. As context only: clones charge $0.99 (Weed Edition [14]),
$4.99 (The Dope Game [15]) or free with mode unlocks and coin packs up to $29.99 (Dope Wars: Mobile [13]).
The one monetisation complaint found was about ads and an aggressive ad-removal paywall [32], and one paid app
lists "no ads" as a selling point [13]. Free browser clones carry no monetisation [16][17].

## 6. Ranked features worth building here

Rank = evidence strength x fit x effort. All rows work offline with localStorage. "Both" means both files, with
Candy Wars wording kept kid-safe. Any new saved field needs a `cleanSave` / `loadScores` check, and saved text
reaching `innerHTML` goes through `esc` (CLAUDE.md).

| Rank | Feature | Why (evidence) | Fits no-server single-file? | Effort | Game(s) | Phase-7 problem touched |
|---|---|---|---|---|---|---|
| 1 | Seeded RNG; seed shown on game over; "replay this seed" and a `?seed=` link | Seed replay praised [14]; standard no-server method [41]; only 13 `Math.random` calls per file, so the retrofit is small | yes | M | Both | None directly; makes `tools\balance.js` runs reproducible |
| 2 | High-score table per theme and difficulty, showing the end title | Single score goal drives replay [29]; the original had an effective maximum of about $50M [3] | yes | S | Both | High scores mix themes in raw dollars |
| 3 | End-of-game report card: profit by item, interest paid, busts and muggings, best trade | Stats pages make runs distinct [27]; players want to see why they lost [30] | yes | S | Both | Shows cheap-item dead weight and interest cost to the player |
| 4 | Losses scale with cash carried (muggings, shark visits), Taipan style | Taipan! scales robbery with cash [20]; "no challenge after repayment" [14][7] | yes | S | Both | Muggings trivial late |
| 5 | Debt projection and borrow warning ("at this rate you owe $X on day N") | Loan confusion and request for a warning [30]; interest deaths [29][33] | yes | S | Both | Debt snowball on medium/hard |
| 6 | Daily Deal: UTC date as seed, one shared run per day, plus copyable result text | Daily runs popularised by Spelunky [42]; Wordle share text [43][44]; clipboard needs HTTPS and a fallback [46] | yes (needs rank 1) | M | Both; Candy share text has no network or names | None |
| 7 | Short game lengths (10 and 15 days) added to the Game Length setting (today 30, 60, 90) | 15/30/60 rounds [16]; 1-20 min games [14]; 8 lengths [15]; a reviewer suggests short games for challenge [14]; a maker kept turns short [36] | yes | S | Both | Too easy once solved |
| 8 | Make cheap items matter: bulk-order or specialty events that pay only in volume | Variety is the top complaint [28][32][34] | yes | M | Both | Cheap items are dead weight |
| 9 | Price memory: last seen price per item per city with "N days ago", gated by the info upgrade | Players ask for recent-price charts [25]; visible rules feel fair [26] | yes | M | Both | Gives the info upgrade lasting value (upgrades cheap late) |
| 10 | Upgrades with trade-offs (e.g. bigger bag draws more theft); the coat upgrade already doubles in price per purchase (`coatUpgradePrice`), so rising cost would extend to the other four only | Taipan! cargo vs guns [20]; friction-removing upgrades get exploited [26][24] | yes | M | Both | Upgrades cheap after week one |
| 11 | Local achievements (clear debt by day 10, profit from a cheap item, no busts) | 30 on Steam [15], dozens on mobile [13]; return hook, by analogy [49] | yes | M | Both | Can steer play to cheap items |
| 12 | Safehouse decision: wire it in as an upgrade with a theft risk, or delete it | Useless-stash lesson [36]; Taipan! warehouse risk [20]; code unreachable today | yes | S | Dope Wars (port only if kept) | Unreachable code from phase 2 |
| 13 | Export/import string for saves, scores and stats | Browsers may evict script storage (Safari 7 days, private mode) [47] | yes | S | Both | None |
| 14 | Candy Wars daily demand forecast (headlines already name the item whose price they move, so a "why prices moved" hint is mostly there) | Lemonade Stand weather lesson and classroom use [21][23] | yes | S | Candy Wars | None |
| 15 | Bust as a choice (pay, run, or fight in Dope Wars; pay or run from a hall monitor in Candy Wars) | Best-remembered original beat [1][2]; common in clones [15][4][14] | yes | L (balance risk) | Dope Wars full; Candy Wars non-violent | Late-game pressure |

Notes on the ranking:
- Ranks 1, 2, 3 and 5 are small and directly answer either a player complaint or a phase-7 finding.
- Rank 6 depends on rank 1. Without a server, "one attempt per day" can only be encouraged, not enforced (our reasoning; [42] does not discuss enforcement).
- Rank 15 has the strongest nostalgia but the largest balance cost, and no source says players miss it in a trading-only clone.
- Not ranked: PWA install. A service worker is a second file and conflicts with the single-file rule and CSP [48][50].

## 7. Never build

- Ads, ad-removal paywalls, in-app purchases or coin packs. The only monetisation complaint was about ads [32]; pay-to-win coin packs [13] do not fit a free game.
- Accounts, online leaderboards or a backend. They need a server and get removed when they cost too much [13][1].
- Multiplayer, chat or shared prices. Server needed [16][4]; online chat is not acceptable for Candy Wars.
- Analytics, tracking or any data collection, above all in Candy Wars. Jason Scott warned against an adware dopewars build [35].
- Violence against police or drug users as a reward loop. It is the content class that drew removals [52]; never in Candy Wars.
- Drug-slang candy names in Candy Wars [10].
- Automated trade routes or anything that plays the game for the player [24].
- Features copied only because the original had them [36], and menu-heavy RPG filler [19].
- An "enforced" one-attempt daily. It cannot be enforced locally (reasoning, not sourced).

## 8. Sources

Sources marked (snippet) were seen in search results only, per the evidence files. Sources 13, 14 and 41 were re-opened for this report.

1. Drug Wars (video game), Wikipedia. https://en.wikipedia.org/wiki/Drug_Wars_(video_game)
2. Drug Wars: the MS-DOS Grand Theft Auto, Dazed. https://www.dazeddigital.com/artsandculture/article/20119/1/drug-wars-the-ms-dos-grand-theft-auto
3. Drug Wars (1984) design notes, KN86 docs. https://kn86-docs-gca3d.kinsta.page/influences/inspiration/drug-wars/
4. dopewars documentation, SourceForge. https://dopewars.sourceforge.io/docs/
5. dopewars news, SourceForge. https://dopewars.sourceforge.io/news.html
6. dopewars README, GitHub (benmwebb). https://github.com/benmwebb/dopewars/blob/main/README.md
7. Drugwars for the TI-82/83 (HN thread mirror). https://hn.nuxt.dev/item/47448566
8. Underworld: Drug Lords is now all about sweets, PocketGamer. https://www.pocketgamer.com/underworld-sugar-wars/after-its-apple-rejection-underworld-drug-lords-is-now-all-about-sweets
9. Why Underworld: Drug Lords is hoping for an iOS comeback, PocketGamer.biz. http://www.pocketgamer.biz/why-underworld-drug-lords-is-hoping-but-not-expecting-an-ios-comeback/
10. Sugar-Coated Drug-Dealing Game Approved For iPhone, Slashdot. https://apple.slashdot.org/story/09/01/21/1949215/sugar-coated-drug-dealing-game-approved-for-iphone/funny-comments
11. Drug Wars 84, App Store. https://apps.apple.com/us/app/drug-wars-84/id1562074713
12. Drug Wars (1984), MobyGames (snippet). https://www.mobygames.com/game/9520
13. Dope Wars: Mobile, App Store. https://apps.apple.com/app/id6748084044
14. Dope Wars (Weed Edition), App Store. https://apps.apple.com/app/id1244425171
15. The Dope Game, Steam. https://store.steampowered.com/app/466800/The_Dope_Game
16. DOPEFRONT, Kotaku. https://kotaku.com/games/dopefront
17. Watch Trader, itch.io. https://plazatin.itch.io/watchtrader
18. Drug Lord 2 - Mafia Empire, update v1.1. https://thedgames.itch.io/drug-lord-2-mafia-empire/devlog/714669/update-v11
19. Drug Dealer Simulator review, Shacknews (snippet). https://shacknews.com/article/117832/drug-dealer-simulator-review-bad-trip
20. Taipan!, Wikipedia. https://en.wikipedia.org/wiki/Taipan!
21. Lemonade Stand, Wikipedia. https://en.wikipedia.org/wiki/Lemonade_Stand
22. Candy Wars, itch.io (snippet). https://ashleyrevlett.itch.io/candy-wars
23. Lemonade Stand classroom resource, EconEdLink (snippet). https://econedlink.org/?p=464
24. Port Royale 4 review, TheSixthAxis (snippet). https://www.thesixthaxis.com/2020/09/29/port-royale-4-review/
25. EVE Online forum, market price charts (snippet). https://forums-archive.eveonline.com/topic/494545
26. Balancing your in-game economy, Game Developer. https://www.gamedeveloper.com/design/the-trials-and-tribulations-of-balancing-your-in-game-economy
27. 50 lines of code, 15 build names, dev.to (snippet). https://dev.to/yurukusa/50-lines-of-code-15-build-names-one-accidental-challenge-mode-1be1
28. Dope Wars review, HonestGamers. https://www.honestgamers.com/663/pc/dope-wars/review.html
29. Drug Wars, Alex Lovendahl, 2024-06-07. https://alexlovendahl.com/2024/06/07/drug-wars (read via https://hn.jakechampion.name/reader/https://alexlovendahl.com/2024/06/07/drug-wars)
30. itch.io comment on a Dope Wars-style game (loan confusion). https://itch.io/post/10854348
31. Drac Wars comments, itch.io. https://raeleus.itch.io/drac-wars/comments
32. Dope Wars (Weed Edition) review roundup, Grand-screen. https://grand-screen.com/games/dope-wars-weed-edition/
33. Drug Wars cheats and tips, Touch Tap Play. https://www.touchtapplay.com/drug-wars-cheats-tips-tricks-to-get-rich/
34. The Dope Game reviews, RAWG. https://rawg.io/games/the-dope-game/reviews
35. Drug Wars, Jason Scott, ASCII blog. https://ascii.textfiles.com/archives/899
36. Developer comment on stash and turn limit, itch.io. https://itch.io/post/1251656
37. Apple pulls Weed Firm, MacRumors (snippet). https://macrumors.com/2014/05/21/weed-firm-pulled-from-app-store
38. Go Kane! banned from iOS, PocketGamer. https://www.pocketgamer.com/go-kane/go-kane-is-a-drug-dealing-sim-that-was-banned-from-ios-but-is-now-available-on-a/
39. How event-driven game design keeps the player guessing, Game Developer (snippet). https://www.gamedeveloper.com/design/how-event-driven-game-design-keeps-the-player-guessing
40. When randomized game design goes too far, Game Wisdom (snippet). https://game-wisdom.com/critical/randomness-game-design
41. Daily challenges and shareable seeds, no server required, SoloDevStack. https://solodevstack.com/blog/daily-challenges-shareable-seeds-no-server
42. The 24 hour ticket: examining daily runs, Game Developer. https://gamedeveloper.com/design/the-24-hour-ticket-examining-daily-runs-
43. He made Wordle for his partner, Boston.com (snippet). https://www.boston.com/news/national-news/2022/01/04/he-made-wordle-for-his-partner-now-its-an-online-hit/
44. Building Wordle in React: date-seeded daily mode and streaks, dev.to (snippet). https://dev.to/shaishav_patel_271fdcd61a/building-wordle-in-react-date-seeded-daily-mode-two-pass-duplicate-letter-evaluation-and-streak-42e
45. CaveRibbon replay URLs and ghost. https://memalign.github.io/p/caveribbon.html
46. Clipboard.writeText, MDN. https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
47. Storage quotas and eviction criteria, MDN. https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
48. minimal-pwa, chr15m. https://github.com/chr15m/minimal-pwa
49. Keeping players coming back to your idle game, GameAnalytics (snippet). https://www.gameanalytics.com/blog/how-to-keep-players-engaged-and-coming-back-to-your-idle-game
50. Bulls and Cows goes offline: game to PWA, dev.to (snippet). https://dev.to/yosolita1978/bulls-cows-goes-offline-how-i-turned-my-game-into-a-pwa-and-skipped-the-100-app-store-fee-3h4o
51. The standard of the App Store, Game Developer. https://www.gamedeveloper.com/business/the-standard-of-the-app-store
52. Apple pulls games about the Philippines drug war, MacRumors (snippet). https://www.macrumors.com/2017/11/29/apple-pulls-games-philippines-drugs-war

## 9. Verification

Fact-check on 2026-11-25. 18 sources re-opened, 21 claim groups checked: 15 supported, 4 partly supported, 2 unsupported, 0 unreachable.

- Supported: [14] seeds, 1-20 minute timed games, per-length leaderboards, achievements, 4.7 from 1.1K, $0.99,
  "no challenge" after repaying the loan and the short-games suggestion; [13] career mode, 12+ skills, achievements,
  backend removed in v60, v63, $29.99 coin pack, "no ads"; [15] 8 lengths, 30 achievements, SFW mode, 79% of 187,
  $4.99; [16] no sign-up, 15/30/60-day rounds, daily and all-time boards; [20] robbery scales with cash, guns cost
  hold space, warehouse theft; [1] Beermat 6.5M downloads, Zynga version shut December 2009, run or fight the cops;
  [11] v1.4 in 2025, 2 ratings, custom names, buy-cap bug review; [41] determinism quote and date-as-seed daily;
  [42] Spelunky origin of daily runs; [47] Safari 7-day eviction and private-mode deletion; [36] stash found
  useless, short turn limit on purpose; [30] loan confusion and request for a warning; [5] dopewars 1.7.0, AI
  players, networking, antique mode, translations; [29] simplicity and a single score; [10] Prohibition 3: Candy
  Wars approved, January 2009.
- Partly supported, reworded: [3] gives about $50M as an effective maximum, not a score shown against it;
  [29] treats risk management as a wider design trend; [10] the drug-slang names were one commenter's
  observation, not a complaint; [1] gives $2,000 and 30 days but no starting debt figure.
- Unsupported, fixed: "candy re-skin got more downloads" ([8] has no comparison; [9] compares iOS sweets with
  Android drugs and calls it weak); "one attempt per day cannot be enforced" is not in [42] and is now marked as
  reasoning.
- Code check (searched `dopewars.html` and `candywars.html`): none of the 15 ranked features exists. Confirmed
  13 `Math.random` calls and no seed per file; `saveScore` stores no theme, difficulty or title; `endGame` shows
  only cash, bank, debt and net; muggings take a flat `rnd(300, 1500)`; no debt projection, daily mode,
  achievements, save export or bust choice; game lengths are 30/60/90; `prevPrices` is per item, not per city;
  nothing in `UPGRADES` sets `G.hasSafehouse`. Two rows were narrowed: rank 10 (the coat price already doubles)
  and rank 14 (headlines already name the item they move).
