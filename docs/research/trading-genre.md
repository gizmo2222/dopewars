# Wider trading-game genre and kid-friendly equivalents

Research for docs/research.md. Area: Taipan!, Lemonade Stand, Candy Wars clones, Elite, Port Royale,
idle/merchant games, classroom economics games. Searches run 2026-11-25. Claims marked (unsourced) are from memory.

## Sources

1. Taipan! (Wikipedia) - https://en.wikipedia.org/wiki/Taipan! - fetched 2026-11-25
2. Lemonade Stand (Wikipedia) - https://en.wikipedia.org/wiki/Lemonade_Stand - fetched 2026-11-25
3. Drug Wars (video game) (Wikipedia) - https://en.wikipedia.org/wiki/Drug_Wars_(video_game) - fetched 2026-11-25
4. Candy Wars clones, search results: ticalc.org archive (https://ticalc.org/archives/files/fileinfo/398/39865.html), Ashley Revlett's browser Candy Wars https://ashleyrevlett.itch.io/candy-wars, Gumwars https://sourceforge.net/projects/gumwars/ - search 2026-11-25
5. Lemonade Stand classroom resources, search results: https://econedlink.org/?p=464 , https://www.tamucc.edu/education/departments/cils/stem-literature/files/math-3-5/3-5_lemonade_stand.pdf , https://www.merlot.org/merlot/viewCompositeReview.htm?id=428115 , https://www.coolmathgames.com/0-lemonade-stand/play - search 2026-11-25
6. Port Royale 4 reviews, search results: https://www.thesixthaxis.com/2020/09/29/port-royale-4-review/ , https://gamingtrend.com/reviews/a-few-barnacles-on-the-hull-port-royale-4-review/ , https://primagames.com/gaming/port-royale-4-review - search 2026-11-25
7. Elite Dangerous market design, search results: https://forums.frontier.co.uk/threads/galactic-average-price-changes.549587/latest , https://pcgamer.com/elite-dangerouss-trading-systems-detailed-by-frontier (page body did not load; only the search listing was seen) - search 2026-11-25
8. The trials and tribulations of balancing your in-game economy - https://www.gamedeveloper.com/design/the-trials-and-tribulations-of-balancing-your-in-game-economy - fetched 2026-11-25
9. Player requests for price charts, search results: EVE forums https://forums-archive.eveonline.com/topic/494545 , GE Tracker https://ge-tracker.com/blog/graph-volume-bars-colours-explained , itch.io comments https://goldbargames.itch.io/crypto-traders/comments - search 2026-11-25
10. Classroom stock-market games, search results: https://www.ngpf.org/blog/behavioral-finance/think-you-can-beat-the-market-15-minutes-with-this-activity-should-cure-that-belief/ , https://cas.umw.edu/cee/the-stock-market-game/ , https://howthemarketworks.com/ - search 2026-11-25
11. End-of-run summary screens, search results: https://www.indiedb.com/games/cogmind/news/morgue-files , https://dev.to/yurukusa/50-lines-of-code-15-build-names-one-accidental-challenge-mode-1be1 , https://gamedeveloper.com/design/do-end-of-level-stat-break-downs-make-sense- - search 2026-11-25
12. Calculator games in class, search results: https://ticalc.org/community/articles/21.html?p=9 , https://news.slashdot.org/story/19/11/26/151247/how-texas-instruments-monopolized-math-class - search 2026-11-25
13. Retro Replay review of Taipan (Apple II), search listing only - https://retro-replay.com/db/apple-ii/taipan - search 2026-11-25

Coverage gaps: no source found on Taipan's price algorithm, Elite price history, idle-trading games, or any
documented school ban of Drug Wars. For sources 4-7 and 9-13 only search-result summaries were seen, not full pages.

## Findings

### Lineage and kid-friendly clones
- Drug Wars (1984, John E. Dell) was a high-school project, possibly inspired by Taipan!; 30 days, 100-slot coat,
  loan sharks, police you can fight or run from, and a score scaled so $50M is perfect. [3]
- Taipan! (1979) sets the template: buy low/sell high across seven ports, a moneylender, a bank, and a warehouse. [1]
- Candy-themed clones are old and common: TI-82/83 "Candy Wars" programs (one has you saving for a bike), a
  school-hallway candy browser game, and a PG-rated "Gumwars". [4] The calculator versions look fan-made. [4]
- Drug Wars spread through BBS, DOS, Windows (popular 1998-2005), TI calculators and mobile; some derivatives
  (PimpWars) are explicitly adult and unsuitable for children; Drug Lord 2 was rejected from the Apple App Store. [3]
- A 1980s review called Taipan! very fun and recommended it for older children. [1]

### Price memory and market information
- In Taipan!, arriving at a port can trigger an event that sharply moves one commodity's price. [1] Events as
  price shocks is the same pattern as this repo's surges, shortages and headlines.
- Players of trading games repeatedly ask for price charts: one commenter called a missing recent-price chart the biggest
  flaw of a trading game; EVE players asked for reference lines, multi-item graphs and a default 30-day window. [9]
- Volume shown next to price helps players read moves (GE Tracker). [9] A chart must agree with the trade log, or testers
  cannot tell when they bought or sold. [9]
- Visible rules make players accept an economy as fair (Puerto Rico and M.U.L.E. are the cited examples). [8]
- Elite's galactic-average prices are disputed; the forum claim that the average is hand-set is unverified. Station prices
  derive from that baseline, and regeneration is slower for expensive goods (community estimate). [7]

### Risk and reward choices
- Taipan! scales robbery, extortion and confiscation fines with the cash you carry, so a big pile is itself a risk. [1]
  The warehouse lets goods wait for better prices, but stored goods can be stolen. [1] Opium is the most profitable good
  and the most likely to be confiscated. [1]
- Drug Wars offers fight/run/keep-dealing police encounters, each with injury risk. [3] Taipan! lets you run, fight, or dump
  cargo to escape. [1]
- Lemonade Stand's main risk is weather: thunderstorms can wipe a day's profit and investment. [2] One reviewer found this
  leans heavily on luck. [5]

### Upgrades that change strategy
- Taipan! upgrades change play style, not just numbers: a bigger ship (+50 cargo) versus guns (each takes 10 cargo slots
  and draws bigger attacks). [1] A 2020s review says progression is reinvesting profit into ships and armaments. [13]
- Port Royale 4 reviewers noted wind modelling can cut a route from weeks to days, that automated trade routes can make
  the game far too easy while setting them up is tedious, and that manual trading becomes a chore after a few hours. [6]
  Lesson: automation upgrades need a cost or limit.
- Players cartel, hoard and use vendors as storage; any upgrade that removes friction gets exploited. [8]

### Debt and snowballing
- Taipan! lets you borrow up to twice your cash, and its original had a "negative debt" bug when overpaying, so repay input
  validation matters. [1]
- Uneven early resources compound (Age of Empires II wood example); automatic price adjustment can feel like a penalty. [8]
  This matches the repo's debt snowball finding.

### End-of-game reports
- Drug Wars ends with a score scaled to cash. [3] Taipan! lets you retire at one million net worth. [1]
- Developers report stats pages and auto-generated run names make each run feel distinct; roguelike morgue files list
  vitals, stats and a history of key events. [11] One commenter prefers comparing the last run to best or average runs
  over lifetime totals. [11]

### Classroom and kid-safe use
- Lemonade Stand (1973, MECC) ran 12 days with glasses, signs and price as the choices and shipped with Apple IIs;
  reviewers saw it as a good children's intro to business. [2] Weather versus demand is the standard lesson; teacher
  resources exist, but some versions have no assessment. [5]
- The Stock Market Game is a long-running classroom program (grades 4-12, groups of 3-5, $100,000 virtual cash). [10]
  NGPF has a short activity showing how hard beating the market is. [10]
- Calculator games were a known classroom distraction; no documented ban of Drug Wars was found. [12]
- A single-file offline game suits school machines: no account, no data collection (unsourced).

## Ideas for this repo

1. Price memory strip (last seen price per item per city, with "seen N days ago").
   Evidence: [9] players ask for recent-price charts; [8] transparency. Fit: yes. A small object in `G`, with a check in
   `cleanSave`; no server. Could be gated behind the info upgrade to keep it a strategy choice.
2. End-of-game report card: best trade, best city, days in debt, interest paid, profit by item, a named run style.
   Evidence: [11]; also teaches cause and effect in class. Fit: yes. Counters accumulate in `G`, render in game over.
   Also exposes the "cheap items are dead weight" finding to the player.
3. Cash-at-risk events scaled to what you carry (Taipan style) instead of flat losses.
   Evidence: [1]. Helps "muggings trivial late". Fit: yes, one formula change; update README and help.
4. Upgrades with trade-offs, not pure buffs (for example a bigger bag attracts more thieves, like guns costing cargo).
   Evidence: [1], [6]. Fit: yes. Addresses cheap upgrades after week one; needs simulation rebalance.
5. Candy Wars forecast: a daily hint at demand (weather-style) plus plain "why prices moved" text.
   Evidence: [2], [5]. Fit: yes, text only; teaches supply and demand gently.
6. Classroom round in Candy Wars: a typed seed code so a class plays the same 30 days, plus a copyable end summary.
   Evidence: [10] group play with shared setup; [5] teachers must build their own worksheets. Fit: yes, no server, but
   seeded RNG does not exist yet, so it is new work.
7. Candy Wars stash (Taipan warehouse analogue) with a theft risk. Evidence: [1]. Fit: yes; the code already exists in
   `dopewars.html` (safehouse).

Do not copy: overpay-style debt bugs [1]; fully automated trade routes [6]; adult-only spin-off content [3].
