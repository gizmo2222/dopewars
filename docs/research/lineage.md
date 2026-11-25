# Research: The Drug Wars lineage

Area: John E. Dell's 1984 original, Ben Webb's dopewars, calculator and mobile ports, and what fans remember.
Method: web search and page fetches, 2026-11-25. Claims marked "(unsourced)" are from memory. Several hoped-for facts (bank, hospital, bodyguards, per-version feature lists) could not be confirmed from pages opened.

## Sources

1. Drug Wars (video game), Wikipedia - https://en.wikipedia.org/wiki/Drug_Wars_(video_game) - fetched 2026-11-25
2. Drug Wars: the MS-DOS Grand Theft Auto, Dazed - https://www.dazeddigital.com/artsandculture/article/20119/1/drug-wars-the-ms-dos-grand-theft-auto - fetched 2026-11-25
3. Drug Wars (1984) design notes, KN86 docs - https://kn86-docs-gca3d.kinsta.page/influences/inspiration/drug-wars/ - fetched 2026-11-25
4. dopewars documentation index - https://dopewars.sourceforge.io/docs/ - fetched 2026-11-25
5. dopewars News page - https://dopewars.sourceforge.io/news.html - fetched 2026-11-25
6. dopewars README (GitHub, benmwebb) - https://github.com/benmwebb/dopewars/blob/main/README.md - fetched 2026-11-25
7. dopewars man page (Ubuntu) - https://manpages.ubuntu.com/manpages/xenial/man6/dopewars.6.html - fetched 2026-11-25
8. "Drugwars for the TI-82/83/83 Calculators (2011)", HN mirror - https://hn.nuxt.dev/item/47448566 - fetched 2026-11-25
9. Make: the best TI-83 RPGs ever - https://makezine.com/article/home/fun-games/the-best-ti-83-rpgs-ever - seen in search 2026-11-25
10. After its Apple rejection, Underworld: Drug Lords is now all about sweets, PocketGamer - https://www.pocketgamer.com/underworld-sugar-wars/after-its-apple-rejection-underworld-drug-lords-is-now-all-about-sweets - fetched 2026-11-25
11. Drug Wars 84, App Store listing - https://apps.apple.com/us/app/-/id1562074713 - seen in search 2026-11-25
12. Drug Wars (1984) on MobyGames - https://www.mobygames.com/game/9520 - seen in search 2026-11-25

## Findings

### The 1984 original
- Written by John E. Dell as a high school project and released in 1984 for IBM PC compatibles; a turn-based trading game with a 30-day limit [1]. Dazed adds that Dell earned an A but his teacher disliked the R-rated content [2]. Origin details conflict between sources (platform, 1983 vs 1984) [1][2].
- Core loop: travel between New York areas, one day per trip; buy and sell six drugs; start with $2,000, 100 pocket spaces and no weapon [1]. MobyGames summarises the premise as owing $5,500 with about a month to repay [12].
- The loan shark gives starting capital at high interest and must be repaid fast or you lose; more can be borrowed [1]. The exact 1984 rate is not confirmed by any source opened [1][3].
- Guns and extra coat space are occasionally offered during travel [1]. This is the model for our coat/bag offers.
- Officer Hardass and deputies appear randomly; options are surrender, run, fight (needs a gun), or keep dealing. Each choice risks injury, and ten hits kill you. Killing the cops pays a cash reward [1].
- Random events: muggings, price spikes and crashes, found drugs [1][3].
- Final score is cash scaled against about $50 million as the maximum [1][3].
- Design lessons from one commentator: hard turn cap creates tension, arbitrage across places is the core decision, compounding debt forces aggression, volatility is the content, limited inventory makes purchases commitments [3].

### Ben Webb's dopewars (open source)
- Free Unix/Win32 rewrite, GPL, descended from Dell's game; ncurses and GTK clients; single-player and networked multiplayer [4][7].
- Players start in debt to a loan shark, police are hostile, goal is maximum money [4][6]. In multiplayer players can shoot each other and steal drugs; a server operator can change the city [4].
- Computer-controlled players arrived in 1.4.2 (May 1999); improved fight handling in 1.4.3 (June 1999); graphical client in 1.5.0 (2001); sound in 1.5.7 (2002) [5].
- Configuration: drug and gun names are renamable through config files; high scores go to a configurable file; a public metaserver lists servers; "antique" mode (`-a`) keeps closer to the original [4][6][7].
- Not confirmed from opened pages: bank, hospital, bodyguards, gun shop details. From memory, dopewars has a bank, hospital and "bitches" (bodyguards) (unsourced).

### Calculator and mobile ports
- Michael Swain's TI-83/83+ port of the TI-82 Drug Wars appeared in 1998 [1]. DrugWars 2: International (1999) added RPG elements including cop fights; PimpWars (1995) added addiction and a simple driving sim [1].
- Other ports listed: Palm OS, Newton, Pebble, Mac Dashboard, web, Linux [1]. Drug Wars 84 on iOS advertises a faithful recreation of the DOS game [11].
- Zynga's social version became an MMORPG-style game (workers, fight club, casino, missions) and was shut down in December 2009 [1]. GTA Chinatown Wars reused the idea with six drugs, price trends on a map and tips by email [1].

### What fans remember fondly
- Playing in class on a graphing calculator, fear of teachers finding it, typing code in by hand from printed listings, and it being a gateway to programming [8][9].
- The thrill of the underworld theme despite basic graphics; price swings and busts, buying guns, chasing the top high score, and killing Officer Hardass for cash [2].
- Kid-safe rebrands are a repeated pattern: a commenter renamed it to trade soda on a TI-89 [8]; Underworld: Drug Lords, rejected by Apple, returned as Sugar Wars with candy and the same gameplay [10]. This validates Candy Wars.
- Dell forgot the game for about 15 years; its source spread on BBS boards without his involvement [2].

## Ideas for this repo

1. Cop encounter as a one-tap choice (pay, run, or fight) during a bust event.
   Evidence: the best-remembered beat of the original [1][2]. Busts are currently automatic losses. Fits single-file: a modal plus a few probabilities. The protection upgrade already has a scare-off chance, which maps to the gun. Candy theme: a "hall monitor" with no violence.
2. Named recurring antagonist with a cash bounty for beating him (Officer Hardass analogue).
   Evidence: fans cite killing him [2]. Cheap flavour text plus a rare reward. Fits.
3. Faithful "classic" preset: 30 days, $2,000 cash, $5,500 debt, 100 slots, 6 items, original score scale.
   Evidence: original start values [1][12]; dopewars has an antique mode [7]. Fits as a settings preset; also gives a reference point for the known debt-snowball problem.
4. Score against a fixed theme-scaled maximum (the original scaled to about $50M [1][3]), shown as a percentage or grade.
   Evidence: addresses the mixed-theme raw-dollar high score problem. Fits.
5. Injury or health with a hospital stop that costs a day and money.
   Evidence: original has ten hits to die [1]; hospital in dopewars is unsourced here. Adds a state field and balance work; fits, medium effort.
6. Renamable items via custom settings.
   Evidence: dopewars lets players rename drugs and guns [6]. Fits: a custom-theme form saved in localStorage; low effort.
7. Shareable score code or daily seed instead of an online server.
   Evidence: dopewars multiplayer and metaserver need servers [4][5]; fans recall high-score competition [2]. A copy-paste result string and a daily seed fit with no server; true multiplayer does not.
8. Keep the two themes clearly separated and keep Candy Wars free of drug-glorifying mechanics.
   Evidence: Apple rejection led to the Sugar Wars reskin [10]. Policy, not code.
