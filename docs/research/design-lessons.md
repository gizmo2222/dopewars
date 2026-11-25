# Design lessons, postmortems and dead projects

Research area for docs/research.md. Scope: what makers of Drug Wars-style and short-session trading games learned about balance, replayability and drug-theme content issues, and which clones died.

Honest summary up front: no interview with John E. Dell or Ben Webb that discusses balance was found, and no real postmortem from a Drug Wars clone maker. The Wired history piece could not be fetched (blocked). What exists is retrospectives, app-store takedown coverage, and forum comments. Findings below are labelled by how strong the source is.

## Sources

1. Drug Wars (video game), Wikipedia. https://en.wikipedia.org/wiki/Drug_Wars_(video_game) (fetched)
2. "Drug Wars: the MS-DOS Grand Theft Auto", Dazed. https://www.dazeddigital.com/artsandculture/article/20119/1/drug-wars-the-ms-dos-grand-theft-auto (fetched; includes Dell's own account)
3. "ASCII" blog post on Drug Wars, Jason Scott (contacted Dell directly). https://ascii.textfiles.com/archives/899 (fetched)
4. "Drug Wars", Alex Lovendahl, 2024-06-07. https://alexlovendahl.com/2024/06/07/drug-wars (fetched)
5. Why Underworld: Drug Lords is hoping but not expecting an iOS comeback, PocketGamer.biz. http://www.pocketgamer.biz/why-underworld-drug-lords-is-hoping-but-not-expecting-an-ios-comeback/ (fetched)
6. After its Apple rejection, Underworld: Drug Lords is now all about sweets, PocketGamer. https://www.pocketgamer.com/underworld-sugar-wars/after-its-apple-rejection-underworld-drug-lords-is-now-all-about-sweets (fetched)
7. Sugar-Coated Drug-Dealing Game Approved For iPhone (Prohibition 3: Candy Wars), Slashdot, 2009-01-21. https://apple.slashdot.org/story/09/01/21/1949215/sugar-coated-drug-dealing-game-approved-for-iphone/funny-comments (fetched)
8. Drug Wars 84, App Store listing. https://apps.apple.com/us/app/drug-wars-84/id1562074713 (fetched; version 1.4 dated 2025-07-07)
9. "The Standard of the App Store", Game Developer, May 2014. https://www.gamedeveloper.com/business/the-standard-of-the-app-store (fetched)
10. Developer comment on a Drug Wars-style game (stash, short turn limit), itch.io. https://itch.io/post/1251656 (fetched)
11. Apple Pulls Top Free iOS App 'Weed Firm', MacRumors, 2014-05-21. https://macrumors.com/2014/05/21/weed-firm-pulled-from-app-store (seen in search result summary only)
12. Go Kane! drug-dealing sim banned from iOS, PocketGamer. https://www.pocketgamer.com/go-kane/go-kane-is-a-drug-dealing-sim-that-was-banned-from-ios-but-is-now-available-on-a/ (fetched; no developer quotes)
13. Apple pulls games about the Philippines drug war, MacRumors, 2017-11-29. https://www.macrumors.com/2017/11/29/apple-pulls-games-philippines-drugs-war (search result summary only)
14. dopewars project site (Ben Webb), SourceForge. https://dopewars.sourceforge.io/ (search result summary only)
15. How Event-Driven Game Design Keeps the Player Guessing, Game Developer. https://www.gamedeveloper.com/design/how-event-driven-game-design-keeps-the-player-guessing (search result summary only)
16. When Randomized Game Design goes too Far, Game Wisdom. https://game-wisdom.com/critical/randomness-game-design (search result summary only)

## Findings

### Origin and what Dell said
- Dell wrote the game as a high school student for a computer class, first on a TRS-80, later rewritten for the IBM PC; he adapted a classmate's commodities-trading game by swapping the goods for drugs and adding travel between places for price swings [3]. Wikipedia says he was likely inspired by Taipan! (1979) [1]; a commenter in [3] argues the mechanics closely match Taipan!.
- Dell never planned to sell it and forgot it after leaving for college; he was surprised by its later spread [3]. He said he was astounded it became popular [2].
- His teacher disliked the R-rated content, yet he still got an A [2]. The edgy subject was a big part of its appeal to students [2][4].
- Gap: no Dell or Webb interview on balance or tuning was found.

### What the original set up (balance reference)
- Start with $2,000, owe loan sharks $5,500, 30 days, 100 slots, six drugs, one-day trips; scoring tops out at $50 million [1][4]. Loan interest grows fast and can end the run, and one analysis argues a bigger loan is the only route to a strong score, so the design pushes players to take risk [4].
- Random events are muggings, price spikes and crashes, found stock, gun and pocket offers, and cop fights with fight/run/surrender choices [1]. This repo has no cop combat, so it differs from the original there.
- Gap: no published simulation or optimal-strategy analysis of the original was found, so this repo's own simulation results are the best balance evidence available.

### Why it lasts (replayability)
- Endurance is credited to simplicity: easy maths, clear risk against reward, a single high score as the goal with no milestone unlocks, and solo play [4].
- The mechanic is separable from the theme: the same buy-low/sell-high loop shows up in space trading and in Animal Crossing's turnip market [4]. This supports the repo's theme-swapping design.
- Re-releases and rewrites kept it alive: Webb's free Unix/Win32 rewrite added multiplayer and an "antique" mode that stays close to the original [14]; Beermat's Windows version passed 6.5 million downloads on CNET [1]; calculator ports spread it in schools [1][3].
- Event design general lesson: large events sustain replayability, while small ones fade as players adapt [15]. Too much random bad luck makes a run feel like roulette rather than skill [16].

### What clone makers learned (thin evidence)
- One maker copied the original's stash feature, then found it nearly useless after playing their own game; they also deliberately kept the turn limit short, preferring too brief to dragging [10]. Relevant to this repo's safehouse (Dope Wars only).
- The Drug Wars 84 iOS recreation gets short, mixed reviews: praised as fast and fun for small groups, but one reviewer reports a bug that blocks buying more than a few items even when affordable [8]. Buy-quantity caps are a visible failure mode.
- Many ports add RPG layers and cop fights (DrugWars 2: International) or other trades (PimpWars, Pimp Wyld) [1]. Nothing found says players preferred these; treat as untested.

### Legal and content issues with drug themes
- Apple rejected Underworld: Drug Lords in 2008 for its drug theme despite a 17+ rating, reportedly saying drug content would not pass. The developer re-skinned it to sweets; the drug version drew more interest but the sweets version more downloads [5]. In 2014 the developer submitted Sugar Wars as a backup and the game stayed on Google Play [5][6].
- Sugar Wars swapped drugs for sweets and left the rest unchanged [6]. Catamount's Prohibition 3: Candy Wars, a reskin of Dope Wars, was approved for iPhone in 2009 with a candy-ban premise [7]. This is direct precedent for candywars.html. Commenters noted that candy names can still read as drug slang (rock candy, sugar sticks) [7]; avoid such names in the candy theme.
- Enforcement is inconsistent: Weed Firm reached top free on the App Store and was then pulled in May 2014; similar games stayed [11]. Go Kane! was rejected by Apple but allowed on Google Play [12]. A developer essay calls Apple's standards unpredictable [9].
- Google Play was more tolerant of drug-dealing sims than Apple in these cases [11][12]. Apple also removed Philippine drug-war shooter games in 2017 after an advocacy group objected, which shows that glorifying violence against drug users draws action even where trading does not [13].
- Mitigation that exists today: Drug Wars 84 sits on the App Store at 18+ with an explicit disclaimer against condoning drug use, trafficking or violence toward police [8].
- Not applicable to this repo: it is a free web game, so store policy does not bind it, but hosts, ad networks and social platforms may.
- Unverified: claims that school districts tried to ban TI-83 calculators over the game came from a low-quality page; I found no reliable source (unsourced).

### What never to build (from the evidence)
- Do not copy a feature only because the original had it (stash) [10].
- Do not let death by bad luck dominate: random hits with no counterplay turn skill into roulette [16].
- Do not add violence against police or drug users as a reward loop; it is the content class that drew removals [13] and it is not in this repo.
- Do not use thin candy-for-drug name swaps in Candy Wars [7].
- Do not add adware or tracking to a free clone; Scott warns against a dopewars.com build with adware [3].

## Ideas for this repo

1. Keep candy names clearly non-slang in candywars.html. Evidence [7]. Fits fully; copy edit only. Also frame it as the shipped answer to [5][6][7].
2. Add a single-objective, theme-neutral score and end screen so score stays the one goal (high-score chase) [4]. Fits fully; addresses the known problem that high scores mix themes in raw dollars (e.g. rank titles or percent of a par score).
3. Review the safehouse against the "useless stash" lesson [10]: check in simulation whether it changes outcomes, and fold it away if not. Fits (analysis plus possible removal); needs the existing simulator.
4. Guard the loan snowball so risk stays optional but not fatal early, since the original makes a bigger loan the path to a top score [4] while this repo's simulation shows new players on medium/hard snowballing. Fits fully (tuning only); consider a gentler first week or a visible debt projection.
5. Make late events large and rare rather than frequent and small [15], and keep bad luck answerable by choices (protection upgrade, bank) [16]. Fits fully.
6. Bug-class test: confirm buy-max and quantity caps never block affordable purchases, mirroring the Drug Wars 84 complaint [8]. Fits; add a regression test.
7. An "antique/classic" difficulty preset close to the original numbers ($2,000 cash, $5,500 debt, 30 days), modelled on Webb's antique mode [14][1]. Fits fully; presets already exist.

Not recommended: cop fight/run combat, RPG layers, multiplayer (needs a server), extra vice trades; no evidence players wanted them and they conflict with the short-session, no-server design [1][14].
