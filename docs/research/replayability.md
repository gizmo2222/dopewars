# Replayability features for short-session browser games

Research area for docs/research.md. Question: how do small single-session browser and roguelite games keep
players returning, and which of those features work with no server (localStorage only)?
Searched 2026-11-25. Pages read in full are marked "(opened)"; findings seen only in search-result text are
marked "(snippet)"; anything from memory or inference is marked "(unsourced)". No retention numbers for small
games were found; the evidence is developer write-ups, not studies.

## Sources

1. Daily Challenges and Shareable Seeds, No Server Required (opened) - https://solodevstack.com/blog/daily-challenges-shareable-seeds-no-server
2. The 24 hour ticket: examining daily runs, Game Developer (opened) - https://gamedeveloper.com/design/the-24-hour-ticket-examining-daily-runs-
3. 5 lines of code that made my roguelike worth playing every day, dev.to (snippet) - https://dev.to/yurukusa/5-lines-of-code-that-made-my-roguelike-worth-playing-every-day-3klj
4. Building Wordle in React: date-seeded daily mode and streaks, dev.to (snippet) - https://dev.to/shaishav_patel_271fdcd61a/building-wordle-in-react-date-seeded-daily-mode-two-pass-duplicate-letter-evaluation-and-streak-42e
5. Folks are 'saving' six years of Wordle, PC Gamer (snippet) - https://pcgamer.com/folks-are-saving-six-years-of-wordle-before-the-nyt-messes-with-it
6. He made Wordle for his partner. Now it's an online hit, Boston.com (snippet); see also The Spinoff https://thespinoff.co.nz/media/13-01-2022/those-coloured-boxes-on-twitter-are-new-zealands-fault - https://www.boston.com/news/national-news/2022/01/04/he-made-wordle-for-his-partner-now-its-an-online-hit/
7. How to keep players engaged and coming back to your idle game, GameAnalytics (snippet) - https://www.gameanalytics.com/blog/how-to-keep-players-engaged-and-coming-back-to-your-idle-game
8. Icy Tower design page: replay = inputs + PRNG seed in URL hash (snippet; looks like a generated design doc, treat as blueprint) - https://artificialanalysis.ai/microevals/icy-tower-1756919180105
9. CaveRibbon replay URLs and ghost, 2024-02-19 (opened) - https://memalign.github.io/p/caveribbon.html
10. MDN Clipboard.writeText (opened) - https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
11. MDN Web Share API (snippet) - https://developer.mozilla.org/docs/Web/API/Web_Share_API
12. minimal-pwa, chr15m (opened) - https://github.com/chr15m/minimal-pwa
13. MDN Storage quotas and eviction criteria (opened) - https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
14. Bulls and Cows goes offline: game to PWA, dev.to (snippet) - https://dev.to/yosolita1978/bulls-cows-goes-offline-how-i-turned-my-game-into-a-pwa-and-skipped-the-100-app-store-fee-3h4o
15. dopewars (SourceForge) 1.7.0 docs, adds multiplayer to the DOS original (snippet) - https://dopewars.sourceforge.io/docs
16. Candy Wars on itch.io, another clone in the genre (title only, not read) - https://ashleyrevlett.itch.io/candy-wars

## Findings

### 1. Daily seeded challenge (works fully offline)

- The usual no-server method: turn the date into a seed, feed a seeded PRNG, and everyone playing that day gets
  the same run. The whole simulation must run from one integer seed [1]. A dev.to Wordle clone does the same:
  the date picks the word, with no API call [4].
- Daily state sits in localStorage keyed by date; on load, if the saved date is today, restore it, otherwise
  reset. Streaks are a separate record that continues if the last win was yesterday or today [4].
- Spelunky is credited with popularising the daily run: a shared seed for 24 hours plus a leaderboard [2][3].
- The retention claim is anecdotal: dailies give a reason to return and extend a game's life; Rupeck Games
  reported a large daily player base with little drop-off, and Motion-Twin was content with about 7,000 Dead
  Cells runs a day [2]. No quantitative comparison against other designs was found.
- Pitfall, repeated in two sources: any random call not tied to the seed makes two players diverge, and a
  wall-clock read during play breaks reproducibility. Retrofitting determinism is hard, so design for it early
  [1][3]. This repo calls `Math.random()` directly (tests use `game.rig`), so every call site would have to move
  to a seeded PRNG (unsourced, from CLAUDE.md test notes).
- Client clock and timezone: use a fixed UTC day so players share the same puzzle [4].
- Attempt policy is a design choice. Caveblazers allows one daily run; Dead Cells allows unlimited tries and
  keeps the best; OlliOlli allowed practice but counted one live attempt [2]. Unlimited tries invite
  memorising or replaying toward one perfect line; one try raises the stakes [2]. Without a server, one attempt
  cannot be enforced, only encouraged, since clearing localStorage resets it (unsourced inference).
- Luck: roguelike leaderboards can reward luck; one daily roguelike ranks only the first run and treats later
  runs as practice [3]. Relevant to a dice-driven trading game. A fixed seed removes luck differences between
  players but not decision quality.

### 2. Sharing results without a backend

- Wordle's share is plain text: an emoji grid that shows how you did without revealing the answer. Players
  first typed coloured squares by hand, the format was credited to New Zealand Twitter users, and the site
  added it later [6]. Press reports say players went from 90 to over 300,000 in the two months after sharing
  was added [6]; these figures are press-reported, not audited.
- Text pastes anywhere (chat, social) and needs no account or link [4].
- Copy to clipboard: `navigator.clipboard.writeText` is secure-context only (HTTPS), rejects with
  `NotAllowedError` if blocked, so wrap it in try/catch and call it from a click [10]. The Web Share API is also
  secure-context only and needs user activation [11]. Neither page says what happens on `file://`. The games
  are deployed over HTTPS, so it should work there, but a fallback (a selectable text box) is wise (unsourced).
- Shareable seed = URL parameter or hash carrying the seed. A friend opens the link and gets the same run [1].
  A browser roguelike gives every run a shareable URL [3].
- Sharing your own seeds adds a decentralised "beat my score" loop [3].

### 3. Ghost runs and replays without a server

- Pattern: record seed plus compact inputs, compress, Base64 into a URL hash or an exportable string; the
  receiver replays deterministically. Leaderboards become import/export of run strings [8].
- CaveRibbon shipped this. Full state exceeded URL limits of browsers and messaging apps. Three fixes: store
  only key positions and interpolate (about 4% of the data), regenerate the world from the seed, and pack into
  bytes before Base64. The previous run appears as a ghost opponent [9]. The replay breaks if the order of
  random calls changes between code versions [9].
- Fit for a trading game: a run is a short list of decisions (travel to X, buy N of item, sell, bank), far
  smaller than frame data (unsourced inference). A "ghost" would be a day-by-day net-worth line from your best
  or a friend's run, not a moving sprite.

### 4. Achievements, stats, run history

- Stats screens suit completionist players. Realm Grinder tracks many session and playthrough stats and its
  trophy system is credited with keeping long play fresh; Clicker Heroes has a dedicated Stats screen [7].
- Achievements can double as a return hook, since progress toward them continues even when you play rarely [7].
  Steam shows global per-achievement completion rates, a rarity pattern [7].
- The source is a vendor blog about idle games, not 30-day trading runs, so applicability is by analogy [7].
- All of this is local: achievements as a localStorage set of ids, history as an array of run summaries
  (unsourced; matches the existing `dopewars_scores` pattern in CLAUDE.md).
- Genre note: the SourceForge dopewars rewrite added multiplayer to the DOS original [15], and other clones
  exist, for example Candy Wars on itch.io [16]. I found no browser clone with daily seeds or shareable scores;
  that is absence of evidence only.

### 5. Leaderboards per mode

- True shared leaderboards need a server. Roll7 worked around Sony's leaderboard system for OlliOlli dailies
  with seven boards that reset by weekday [2]. Per-day boards are a design problem even with a server.
- Server-free substitutes: local per-mode boards in localStorage, and score strings pasted into chat (compared
  by social convention, not verified).
- Repo issue: high scores mix themes in raw dollars. Per-theme and per-difficulty boards, or a normalised
  score, fix that locally (unsourced, from task context).

### 6. Unlockables

- No sourced example of unlockable themes or modes in small browser games was found. By reasoning only:
  unlocking via achievements ties into the return hook in [7], and unlock state is a localStorage flag
  (unsourced).

### 7. Offline PWA install

- Installability needs a manifest linked from the HTML head; a service worker caches assets on install and
  serves them offline [14]. Service workers need a web server (HTTPS or localhost) and do not run from
  `file://` [14].
- minimal-pwa has a single-file variant that builds its manifest in JavaScript and installs without a service
  worker; its page does not discuss offline behaviour [12]. Sources disagree on whether a service worker is
  required for install, and browser rules change, so test in current Chrome and Edge.
- Safari can delete script-created storage after 7 days without user interaction when tracking prevention is
  on; private browsing usually wipes storage at session end; on low disk, least-recently-used origins go first
  unless `navigator.storage.persist()` was granted [13]. The page does not name localStorage in these rules,
  so applying them to it is an inference. Saved runs, streaks and achievements are therefore not guaranteed.
- localStorage is per origin: a save copied to another site did not carry over [5].
- The CSP in each HTML file would need `manifest-src` and `worker-src` allowances, and a service worker is a
  second file, which conflicts with the single-file rule in CLAUDE.md (unsourced; verify blob-URL workers
  before assuming they are allowed).

## Which features need no server

| Feature | Server needed | Notes |
|---|---|---|
| Daily seed (UTC date as seed) | No | Needs a fully seeded RNG [1][3] |
| Custom seed in URL | No | Same RNG requirement [1] |
| Emoji or text result share | No | Clipboard is secure-context only [10] |
| Streak, stats, history, achievements | No | localStorage, can be evicted [13] |
| Ghost or replay string | No | Seed plus compact moves, size limits [8][9] |
| Per-mode local leaderboard | No | Local only |
| Global leaderboard, enforced one attempt | Yes | Cannot be done locally |
| PWA offline install | HTTPS host plus extra file | Conflicts with single-file rule [12][14] |

## Ideas for this repo

1. Seeded RNG plus a "Daily Deal" mode. Same market, events and headlines for everyone on a UTC day.
   Evidence: [1][2][3]. Fits a no-server single-file game: yes. The main cost is routing every `Math.random()`
   (market, events, late events, offers) through one seeded function; the test harness already controls
   randomness through `game.rig`, so a seed hook is testable. It also makes balance simulations reproducible.
2. Copyable Wordle-style result text: theme, days, final net worth, title earned, a short emoji strip of net
   worth per day, and a seed link. Evidence: [4][6][10]. Fits: yes. Needs a clipboard fallback. Keep Dope Wars
   wording out of the Candy Wars share text.
3. Share a seed through a URL (`?seed=`) so friends replay the same run. Evidence: [1][3]. Fits: yes; depends
   on idea 1. It also answers the luck problem for head-to-head play.
4. Run history and stats screen (runs, best by theme and difficulty, average net worth, busts). Evidence: [7]
   by analogy. Fits: yes, in localStorage; extend the scores store and its `loadScores` validation, with `esc`
   on any saved text reaching `innerHTML` (per CLAUDE.md). Splitting boards per theme and difficulty also fixes
   the mixed-theme high score problem.
5. A small set of achievements (clear debt by day 10, no busts, profit from a cheap item, all upgrades).
   Evidence: [7] by analogy. Fits: yes. They can steer players to dead-weight cheap items and underused
   mechanics from the balance findings; that benefit is my reasoning, not a cited result.
6. Export/import of stats and a best-run string to guard against storage eviction, and later a net-worth ghost
   of your best run. Evidence: [13] for eviction, [8][9] for run strings. Fits: yes. Version the seed scheme,
   because replays break when the random call order changes [9].

Not recommended: a global leaderboard (needs a server), enforced one-attempt dailies, and PWA install while the
single-file rule holds. A manifest-only install [12] is a possible later experiment, but sources conflict.

## Open questions

- Do clipboard and Web Share work on `file://`? The opened MDN page did not say.
- Best share-text length and emoji set for chat apps: not researched.
- No sourced evidence for unlockable themes, or for how small-game achievements affect return rate.
