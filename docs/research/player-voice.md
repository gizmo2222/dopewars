# Player voice: what players praise and complain about

Research area: recurring praise and complaints about Drug Wars / Dope Wars and its clones.

Limits, stated up front. Reddit and Metafilter were not readable (no Reddit thread surfaced in search; Metafilter returned 403). Google Play, Steam review text and MobyGames were not readable either. The evidence is about 25 individual comments and reviews across the sources below, plus aggregator summaries. Counts are therefore tallies of this small sample, not market-level frequencies. Treat them as direction only.

## Sources

1. Hacker News thread, "Drugwars for the TI-82/83/83 Calculators (2011)" (about 30 comments, 129 points per search snippet). https://hn.nuxt.dev/item/47448566 (opened)
2. HonestGamers review of Dope Wars (PC shareware). https://www.honestgamers.com/663/pc/dope-wars/review.html (opened)
3. Steam, The Dope Game, store page: 79% of 187 reviews positive, "Mostly Positive" (the search snippet said "Very Positive"; the fetched page said Mostly Positive). https://store.steampowered.com/app/466800/The_Dope_Game (opened)
4. Alex Lovendahl, "Drug Wars" retrospective, 2024-06-07 (read via a mirror). https://hn.jakechampion.name/reader/https://alexlovendahl.com/2024/06/07/drug-wars (opened)
5. Grand-screen roundup of Dope Wars (Weed Edition) Google Play reviews (auto-generated from the listing, not first-hand). https://grand-screen.com/games/dope-wars-weed-edition/ (opened)
6. itch.io comment thread on a Dope Wars-style game, with developer reply. https://itch.io/post/10854348 (opened)
7. Touch Tap Play, Drug Wars (mobile) tips, 2014. https://www.touchtapplay.com/drug-wars-cheats-tips-tricks-to-get-rich/ (opened)
8. itch.io, Drac Wars comments. https://raeleus.itch.io/drac-wars/comments (opened)
9. RAWG, The Dope Game reviews (two Steam reviews, 2018 and 2019). https://rawg.io/games/the-dope-game/reviews (opened)
10. Apple App Store, Dope Wars (Weed Edition): 4.7 of 5 from 1.1K ratings, four written reviews seen. https://apps.apple.com/app/id1244425171 (opened)
11. GameBrain aggregator summary for The Dope Game (seen in search result only; the page returned 404 on fetch). https://gamebrain.co/game/the-dope-game
12. Cyberly cheat page for Dope Wars (seen in search result only). https://www.cyberly.org/game-cheats/pc/dope-wars.html

## Findings

### Recurring praise

- Simple, instantly understood loop: buy low, move, sell high. [2][4][5][9]. The retrospective argues the basic math and the score as the only goal are why the game has lasted about forty years [4]. (4 of 12 sources)
- Addictive short sessions. HonestGamers calls it "highly addictive" [2]; Steam and itch reviewers say much the same [6][8][9]. (about 5 sources)
- Nostalgia is the strongest emotional driver. The HN thread is mostly TI-83 memories: playing in class, hand-typing listings, learning to program from it [1]. Clones that stay faithful are praised for it: "a perfect Dope Wars game" with no extra clutter [8].
- Risk management as the skill. Choosing between score and survival is cited as the interesting part [4][8].
- Small additions that do not disturb the loop earn praise: average-purchase-price tracking, short choose-your-own-adventure segments, clean minimal UI, ambient sound [6][8]. Price tracking is the one concrete feature named by players.
- Free and small. Free to play without paying is listed as a plus [2][5].
- Replayable scenarios. One App Store reviewer likes that a fixed seed lets you replay the same run [10].

### Recurring complaints

Tally in this sample (a source can count once per theme):

| Complaint | Sources | Notes |
|---|---|---|
| Repetitive, little variety or depth | [2][5][9][11] and a later-stage depth remark in the search summary | The most common complaint. Steam reviewer: once learned it becomes "knee-jerk clicking" [9]. |
| Too easy or pointless once solved | [1][10] | One HN commenter paid off the debt in six days and got bored [1]. An App Store reviewer says there is no challenge after early repayment and that after day 30 the game is pointless [10]. |
| RNG unfairness | [10][11] | Prices can dip so no profit is possible, or an early fight cannot be won [10]. GameBrain mentions frustrating RNG [11]. The counter-view: a developer and a fan say hard randomness is correct and matches the original [8]. |
| Debt or loan-shark deaths | [1][4][6] | HN: "this game was hard" [1]. The retrospective says interest grows quickly and can end the game outright, yet a bigger loan is the only way to a high score [4]. |
| Confusing loan rules and endings | [6] | A player was told the loan was not paid in time even after paying it off, and suspected buying without cash silently took a loan. The player asked for a warning [6]. The developer could not reproduce it. |
| Ads and ad-removal paywall | [5] | Ads annoying unless you pay; the paywall called aggressive. One Weed Edition App Store page shows no ad complaints [10]. |
| Slow upgrades or grind | [5] | Upgrades take a long time at higher levels. Specific to the mobile clone. |
| Bugs, UI friction | [5][9][11] | A map bug blocking progress [9]; slider-based buy/sell called frustrating in the summary of one clone [search summary]. |
| Presentation | [2][9] | Plain menus, minor sound, English only [2][9]. Not relevant to this repo. |

Observations:
- "Too easy once solved" and "debt kills you" coexist. The same strategy knowledge that makes veterans bored makes new players fail. Guides say to pay the debt first because interest compounds daily [7]; a cheat page says to ride the debt for a few days instead [12]. Players do not agree on the right opening, which is a sign the opening is a real decision, not a solved one.
- Early luck dominates. App Store and GameBrain RNG complaints are about runs decided in the first days [10][11].
- Players want to see why they lost. The loan-ending complaint [6] is a feedback problem, not a balance problem.

### Strategy lore players share

- Pay the loan early because of daily interest [7]. Record prices over several days [7]. Take the longest game length for higher scores [7]. Taking a big loan is how you get a high score [4].
- Easter-egg style price spikes (buying cocaine right away raised its price) were fondly remembered [1].
- Fighting and guns are a core memory of the original [2][4], but no source says the lack of combat is a flaw in a trading-only clone.

### Fit to this repo's known balance problems

- Dead-weight cheap items match "limited variety" [2][5].
- Steep debt snowball on medium/hard matches the debt-death theme [4][1].
- Upgrades cheap after week one is the opposite of the mobile "slow upgrades" grind complaint [5], so there is no player pressure to slow them, but it feeds "too easy once solved" [10].

## Ideas for this repo

1. Show average purchase price per item in the stash. Evidence: named as a nice detail by players [6][8]. Fits: yes, pure client-side state already in `G`.
2. Loan and interest transparency. Show a visible warning when a purchase or event adds debt, and a clear "debt cleared" state. Evidence: the confusing loan-ending report and request for a warning [6]; interest-driven deaths [4]. Fits: yes, UI copy only.
3. Replay a seed (shareable or "retry this run"). Evidence: a reviewer likes finding a seed and replaying the scenario [10]. Fits: yes with a seeded PRNG in the script and a seed shown on game over. It also lets players share a scenario by pasting a code. No server needed.
4. Make cheap items matter, to counter "repetitive, little variety" [2][5][9]. For example, location specialty events or small-volume bonuses. Evidence: variety is the top complaint; sim already shows cheap items are dead weight. Fits: yes, balance change.
5. Late-game pressure so the game is not pointless once the debt is gone [10][1]. The existing late events help; consider scaling event stakes with cash, or an end goal tied to the title system. Evidence: "pointless" after repayment [10], bored after six days [1]. Fits: yes.
6. Gentler or clearer opening for new players, such as a first-day hint toward early repayment, since guides push this [7] and deaths cluster in the debt snowball [4]. Keep hard mode unforgiving, because fans want not-easy and RNG that matches the original [8]. Fits: yes, difficulty presets already exist.
7. Per-theme high scores or normalised scores. Not supported by any source here (the repo's own sim finding). Mentioned only to say players did not raise it.

Do not build: ads or paywalls (the one monetisation complaint was about them [5]); more combat on the strength of these sources alone.

## Gaps for a later pass

- Reddit threads (r/retrogaming, r/TI_Calculators, r/incremental_games) and Metafilter were not read; Google Play and Steam review text were not seen directly.
- Frequency numbers above are from about 12 sources and about 25 individual comments, so no claim of percentage prevalence is made.
