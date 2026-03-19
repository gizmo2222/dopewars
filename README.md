# Dope Wars

A browser-based remake of the classic drug trading game. Buy low, sell high, pay off your debt, and make your fortune before time runs out. Choose from four themes: NYC (1984), Miami (1986), London, and the Frontier West.

![Game Screenshot](https://via.placeholder.com/800x400/0a0a0a/e8c840?text=DOPE+WARS)

---

## Play

Open `dopewars.html` in any browser — no server, no install, no dependencies. The game runs entirely client-side and saves your progress automatically between sessions using `localStorage`.

---

## How to Play

You start with cash, a debt to a loan shark, and 30 days to make your fortune. Your final score is **cash + bank − debt**.

### The Basics

- **Travel** between the six NYC boroughs to find different drug prices each day
- **Buy** drugs cheap in one location and **sell** them high in another
- Every trip to a new city costs one day and applies daily interest to your debt
- Run out of days with more debt than cash and you lose

### Managing Your Money

- **Cash** — what you carry on you; vulnerable to muggings and events
- **Bank** — safe storage; deposit cash here to protect it
- **Debt** — compounds daily; ignore it and it will bury you

Click the **Cash** or **Debt** labels in the Finances panel to deposit, withdraw, borrow, or repay.

### Upgrades (Black Market)

| Upgrade | Cost | Benefit |
|---|---|---|
| 🔫 9mm Pistol | $1,500 | Halves bust losses · 60% chance to scare off muggers |
| 📱 Burner Phone | $500 | Nearly full drug selection every market visit |
| 🚗 Stolen Honda | $3,000 | 1 free trip/day — no day lost, no interest accrued |
| 📞 Supplier Contact | $2,000 | Once per day, buy any drug at 25% off (up to half the available supply) |

### City Specialties

Each city has a specialty drug that is always available, priced ~20% cheaper, and stocked in larger quantities. The specialty is shown on each city button (★).

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

## Drugs

Each theme has its own set of drugs with different price ranges and volatility. The NYC theme (default) uses Cocaine, Heroin, Acid, Shrooms, PCP, Weed, Speed, and Ludes. Prices vary wildly between cities. The Burner Phone upgrade ensures nearly all drugs are available in every market.

---

## Versions

This repo contains three versions of the game:

### `dopewars.html` — Standalone browser game ⭐ recommended
Single HTML file. Open in a browser and play. No setup required. Sessions persist via `localStorage`.

### `dopewars.py` — Terminal version
Requires Python 3.7+ and the `rich` library.

```bash
pip install rich
python dopewars.py
```

### `app.py` + `templates/index.html` — Flask web app
Full client-server version with a Python backend. Game state is managed server-side.

```bash
pip install -r requirements.txt
python app.py
# Open http://localhost:5000
```

> **Note:** The Flask version stores game state in memory. Sessions are lost if the server restarts. For production use, replace the in-memory `GAMES` dict in `app.py` with a database or Redis store.

---

## Project Structure

```
dopewars.html          Standalone browser game (recommended)
dopewars.py            Terminal version (requires rich)
app.py                 Flask backend
templates/
  index.html           Web frontend for Flask version
passenger_wsgi.py      WSGI entry point (for Passenger-based hosting)
requirements.txt       Python dependencies
```

---

## High Scores

- **Browser version** — saved to `localStorage` in your browser
- **Terminal version** — saved to `~/.dopewars_scores.json`
- **Flask version** — saved to `~/.dopewars_scores.json` on the server

---

## License

Do whatever you want with it.
