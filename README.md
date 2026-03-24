# Dope Wars & Candy Wars

Two browser-based trading games — same mechanics, different themes.

| | Dope Wars | Candy Wars |
|---|---|---|
| **File** | `dopewars.html` | `candywars.html` |
| **Setting** | Gritty street trading | Kid-friendly candy entrepreneurship |
| **Debt** | Loan shark | Allowance advance from parents |
| **Busts** | Police raids | Principal inspections |
| **Muggers** | Street criminals | Bullies |
| **Upgrades** | Gun, Burner, Stolen Honda, Supplier Contact | Hall Pass, Walkie-Talkie, Skateboard, Club Card |

Both run entirely in the browser — no server, no install, no dependencies. Progress is saved automatically via `localStorage`.

---

## How to Play

You start with some cash, a debt, and 30 days to make your fortune. Your final score is **cash + bank − debt**.

### The Basics

- **Travel** between six locations to find different prices each day
- **Buy** cheap in one location and **sell** high in another
- Every trip costs one day and applies daily interest to your debt
- Run out of days with more debt than cash and you lose

### Managing Your Money

- **Cash** — what you carry; vulnerable to events
- **Bank / Piggy Bank** — safe storage; deposit here to protect it
- **Debt** — compounds daily; ignore it and it will bury you

Click the **Cash** or **Debt** labels in the Finances panel to deposit, withdraw, borrow, or repay.

### Upgrades

Upgrade names vary by theme, but every version has the same four:

| Role | Cost | Benefit |
|---|---|---|
| Protection | $1,500 | Halves inspection/bust losses · 60% chance to scare off threats |
| Info | $500 | Nearly full item selection every market visit |
| Transport | $3,000 | 1 free trip/day — no day lost, no interest accrued |
| Supplier | $2,000 | Once per day, buy any item at 25% off (up to half available supply) |

### Location Specialties

Each location has a specialty item (shown as ★) that is always available, priced ~20% cheaper, and stocked in larger quantities.

### Random Events

Every time you travel there's a chance something happens — inspections, price surges, shortages, theft, found stashes, debt collector visits, and tips. The Protection upgrade mitigates inspections and theft. Paying off your debt stops collector visits.

Debt collector visits are blocked before day 6. After day 15 they become increasingly frequent.

After day 15, late-game events can also occur:

| Event | Effect |
|---|---|
| Fire Sale / Going-Home Sale | Bulk item dump at a steep discount — one-time buy opportunity |
| Market Cornered / Bought Out | A rival clears out an item for 2–3 days |
| Tip-Off / Inspection Warning | Warning that a sweep is planned for a specific location |
| Contact Burned / Club Card Declined | Supplier unavailable for 3 days |

### Bag / Carry Offers

Occasionally you'll be offered extra carry capacity for a price. More space means bigger buys.

### Final Day

On the last day you cannot travel. Sell your stash, settle your accounts, and hit **End Game**. A warning appears 3 days before the end.

---

## Themes

### Dope Wars

| Theme | Setting | Locations | Items |
|---|---|---|---|
| **NYC Classic** | New York, 1984 | Bronx, Manhattan, Brooklyn, Queens, Harlem, Staten Is. | Cocaine, Heroin, Acid, Shrooms, PCP, Weed, Speed, Ludes |
| **Miami Vice** | Miami, 1986 | South Beach, Little Havana, Overtown, Coral Gables, Hialeah, Liberty City | Cocaine, Crack, Heroin, Hash, Weed, Quaaludes, Speed, Angel Dust |
| **London** | London, Now | Camden, Brixton, Hackney, Peckham, Lewisham, Shoreditch | Cocaine, MDMA, Heroin, Ketamine, Cannabis, Speed, Pills, Spice |
| **Wild West** | Frontier, 1881 | Tombstone, Dodge City, Deadwood, Abilene, El Paso, Santa Fe | Opium, Gold Dust, Laudanum, Dynamite, Stolen Guns, Whiskey, Tobacco, Snake Oil |

### Candy Wars

| Theme | Setting | Locations | Items |
|---|---|---|---|
| **The Neighborhood** | Summer break | Playground, The Mall, School Yard, Corner Store, The Park, Arcade | Chocolate Bar, Gummy Bears, Jawbreaker, Lollipop, Sour Worms, Bubble Gum, Chips, Candy Corn |
| **Summer Fair** | County fair | Main Gate, Ferris Wheel, Food Court, Midway Games, Prize Booth, Petting Zoo | Cotton Candy, Funnel Cake, Caramel Apple, Kettle Corn, Corn Dog, Mini Donuts, Lemonade, Snow Cone |
| **School Days** | Lunchtime | Cafeteria, Library, Gym, Art Room, Computer Lab, Playground | Chocolate Milk, Fruit Snacks, Pizza Slice, Granola Bar, Pudding Cup, Apple Juice, Pretzels, Animal Crackers |
| **Halloween Night** | Oct 31 | Spooky Street, Haunted House, Candy Lane, Pumpkin Patch, Gym Dance, Pine Avenue | Reeses Cup, Kit Kat, Full Size Bar, M&Ms, Skittles, Twizzlers, Nerds, Candy Corn |

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

Presets are available in Settings. Individual settings can be customised after selecting a preset.

---

## High Scores

Saved to `localStorage` in your browser. Dope Wars and Candy Wars maintain separate leaderboards.

---

## License

Do whatever you want with it.
