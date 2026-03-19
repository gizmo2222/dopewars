# Dope Wars

A browser-based drug trading game. Buy low, sell high, pay off your debt, and make your fortune before time runs out.

![Game Screenshot](https://via.placeholder.com/800x400/0a0a0a/e8c840?text=DOPE+WARS)

---

## Play

Open `dopewars.html` in any browser — no server, no install, no dependencies. The game runs entirely client-side and saves your progress automatically between sessions using `localStorage`.

---

## How to Play

You start with cash, a debt to a loan shark, and 30 days to make your fortune. Your final score is **cash + bank − debt**.

### The Basics

- **Travel** between six cities to find different prices each day
- **Buy** cheap in one location and **sell** high in another
- Every trip costs one day and applies daily interest to your debt
- Run out of days with more debt than cash and you lose

### Managing Your Money

- **Cash** — what you carry on you; vulnerable to muggings and events
- **Bank** — safe storage; deposit cash here to protect it
- **Debt** — compounds daily; ignore it and it will bury you

Click the **Cash** or **Debt** labels in the Finances panel to deposit, withdraw, borrow, or repay.

### Upgrades (Black Market)

Upgrade names and icons vary by theme, but every theme has the same four upgrades:

| Upgrade | Cost | Benefit |
|---|---|---|
| Gun | $1,500 | Halves bust losses · 60% chance to scare off muggers |
| Burner | $500 | Nearly full drug selection every market visit |
| Car / Transport | $3,000 | 1 free trip/day — no day lost, no interest accrued |
| Supplier Contact | $2,000 | Once per day, buy any drug at 25% off (up to half the available supply) |

### City Specialties

Each city has a specialty drug (shown as ★ on the city button) that is always available, priced ~20% cheaper, and stocked in larger quantities than elsewhere.

### Random Events

Every time you travel there's a chance something happens — police raids, price surges, droughts, muggers, found stashes, loan shark visits, and tips from snitches. The Gun upgrade mitigates busts and muggings. Paying off your debt eliminates shark visits.

The loan shark won't visit before day 6. After day 15 the visits become increasingly frequent.

After day 15, late-game events can also occur:

| Event | Effect |
|---|---|
| Fire Sale | A dealer dumps bulk product cheap — one-time buy opportunity |
| Market Cornered | A rival buys out a drug citywide for 2–3 days |
| Tip-Off | Word that cops are planning a sweep of a specific city |
| Contact Burned | Your supplier gets picked up; unavailable for 3 days |

### Coat Offers

Occasionally a street vendor will offer extra carry capacity for a price. More space means bigger buys.

### Final Day

On the last day you cannot travel. A popup prompts you to sell your stash, settle your accounts, and end the game. You'll also receive a warning popup 3 days before the end.

---

## Themes

Select a theme in the Settings screen. Each theme has its own cities, drugs, and upgrade names.

| Theme | Setting | Cities | Drugs |
|---|---|---|---|
| **NYC Classic** | New York, 1984 | Bronx, Manhattan, Brooklyn, Queens, Harlem, Staten Is. | Cocaine, Heroin, Acid, Shrooms, PCP, Weed, Speed, Ludes |
| **Miami Vice** | Miami, 1986 | South Beach, Little Havana, Overtown, Coral Gables, Hialeah, Liberty City | Cocaine, Crack, Heroin, Hash, Weed, Quaaludes, Speed, Angel Dust |
| **London** | London, Now | Camden, Brixton, Hackney, Peckham, Lewisham, Shoreditch | Cocaine, MDMA, Heroin, Ketamine, Cannabis, Speed, Pills, Spice |
| **Wild West** | Frontier, 1881 | Tombstone, Dodge City, Deadwood, Abilene, El Paso, Santa Fe | Opium, Gold Dust, Laudanum, Dynamite, Stolen Guns, Whiskey, Tobacco, Snake Oil |

---

## Difficulty

| | Easy | Medium | Hard |
|---|---|---|---|
| **Days** | 60 | 30 | 30 |
| **Starting Cash** | $5,000 | $2,000 | $1,000 |
| **Starting Debt** | $0 | $5,000 | $10,000 |
| **Daily Interest** | 5% | 10% | 15% |
| **Event Chance** | 20% | 38% | 50% |
| **Carry Capacity** | 200 | 100 | 50 |

Presets are available in the Settings screen. Individual settings can be customised after selecting a preset.

---

## High Scores

Saved to `localStorage` in your browser.

---

## License

Do whatever you want with it.
