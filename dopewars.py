#!/usr/bin/env python3
"""
DOPE WARS — Terminal Edition
Python port of the browser-based Dope Wars game.

Requires: pip install rich
"""

import random
import json
import datetime
from pathlib import Path
from typing import Optional, Dict, List, Tuple

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box
from rich.prompt import Prompt, IntPrompt
from rich.rule import Rule
from rich.text import Text

console = Console()

# ─── SCORES FILE ───
SCORES_FILE = Path.home() / ".dopewars_scores.json"

# ─── DATA ───
DRUGS = [
    {"name": "Cocaine", "base": 15000, "variance": 0.5, "street": "Snow"},
    {"name": "Heroin",  "base": 5000,  "variance": 0.6, "street": "Horse"},
    {"name": "Acid",    "base": 1000,  "variance": 0.8, "street": "Blotter"},
    {"name": "Weed",    "base": 300,   "variance": 0.5, "street": "Grass"},
    {"name": "Speed",   "base": 90,    "variance": 0.7, "street": "Crank"},
    {"name": "Ludes",   "base": 15,    "variance": 0.8, "street": "Buttons"},
    {"name": "Shrooms", "base": 750,   "variance": 0.6, "street": "Caps"},
    {"name": "PCP",     "base": 1000,  "variance": 0.7, "street": "Dust"},
]

CITIES = [
    {"name": "Bronx",      "desc": "Home turf"},
    {"name": "Manhattan",  "desc": "Big money"},
    {"name": "Brooklyn",   "desc": "Rough crowd"},
    {"name": "Queens",     "desc": "Quiet spots"},
    {"name": "Harlem",     "desc": "Hot market"},
    {"name": "Staten Is.", "desc": "Slow days"},
]

EVENTS = [
    {"title": "POLICE RAID!",     "msg": "Cops bust your stash! You lose half your drugs.",                        "type": "bust"},
    {"title": "PRICE SURGE",      "msg": "Someone cornered the market. Drug prices are WILD today.",              "type": "surge"},
    {"title": "DROUGHT",          "msg": "Supply dried up. Half the market is empty.",                            "type": "drought"},
    {"title": "MUGGER",           "msg": "Someone jacked you on the street. They took your cash.",               "type": "mug"},
    {"title": "FOUND STASH",      "msg": "You find a stash hidden in an abandoned lot. Score!",                  "type": "find"},
    {"title": "CHEAP SUPPLY",     "msg": "Prices crashed — a dealer is desperate to move product.",              "type": "cheap"},
    {"title": "LOAN SHARK VISIT", "msg": "The shark's boys paid you a visit. They took $500 as a 'reminder'.",   "type": "shark"},
    {"title": "COPS ON THE TAKE", "msg": "You slip a cop $200 to look the other way. Smart move.",              "type": "bribe"},
    {"title": "STREET TIP",       "msg": "A snitch whispers something useful in your ear.",                      "type": "tip"},
]

HEADLINES = [
    "NYPD REPORTS SURGE IN STREET DRUG ACTIVITY",
    "MAYOR PLEDGES CRACKDOWN ON BRONX DEALERS",
    "MYSTERIOUS SHORTAGE HITS CITY DRUG SUPPLY",
    "WALL ST. EXECS FUEL COCAINE DEMAND: SOURCES",
    "BROOKLYN TURF WAR LEAVES THREE HOSPITALIZED",
    "POLICE COMMISSIONER WARNS OF NEW TASK FORCE",
    "HARLEM RESIDENTS DEMAND END TO OPEN-AIR DEALING",
    "FEDS SEIZE RECORD HEROIN SHIPMENT AT PORT",
    "QUEENS DRUG PRICES HIT ALL-TIME HIGH",
    "UNDERCOVER OPERATION SWEEPS MANHATTAN SOUTH",
    "CITY COUNCIL DEBATES MANDATORY MINIMUMS BILL",
    "STATEN ISLAND FERRY USED IN SMUGGLING RING",
    "INFORMANT NETWORK EXPANDING, SAYS NYPD CHIEF",
    "DROUGHT CONDITIONS STRAIN SUPPLY LINES CITYWIDE",
    "LOCAL DEALER NETWORK DISRUPTED BY RIVAL CREW",
    "PRICES EXPECTED TO SPIKE FOLLOWING BORDER SEIZURE",
]

COAT_OFFERS = [
    {"desc": "A guy on the corner is selling a trench coat with deep pockets", "capacity": 50,  "price": 400},
    {"desc": "A vendor has a military surplus duffel — fits a lot of product",  "capacity": 75,  "price": 600},
    {"desc": "Someone's hawking a custom-lined jacket out of a van",            "capacity": 40,  "price": 300},
    {"desc": "A tailor offers to line your coat with hidden compartments",      "capacity": 100, "price": 900},
    {"desc": "A street kid is selling a stolen messenger bag",                  "capacity": 30,  "price": 150},
    {"desc": "A dock worker has an oversized work vest for sale",               "capacity": 60,  "price": 500},
]

UPGRADES = [
    {"id": "gun",      "label": "9mm Pistol",      "price": 1500, "desc": "Halves bust losses. 60% chance to scare off muggers."},
    {"id": "burner",   "label": "Burner Phone",    "price": 500,  "desc": "Better connect info — nearly full drug selection every market."},
    {"id": "car",      "label": "Stolen Honda",    "price": 3000, "desc": "3 free trips per day — travel without losing a day."},
    {"id": "supplier", "label": "Supplier Contact","price": 2000, "desc": "Once per day, buy any drug at 50% of market price."},
]

CAR_FREE_TRIPS = 3


# ─── HELPERS ───
def fmt(n: int) -> str:
    return f"${abs(round(n)):,}"


def rnd(a: int, b: int) -> int:
    return random.randint(a, b)


# ─── GAME STATE ───
class Game:
    def __init__(self, settings: dict):
        self.day = 1
        self.max_days = settings["days"]
        self.cash = settings["cash"]
        self.bank = 0
        self.debt = settings["debt"]
        self.interest = settings["interest"]
        self.event_chance = settings["events"]
        self.city = "Bronx"
        self.coat = settings["coat"]

        self.stash: Dict[str, int] = {}
        self.prices: Dict[str, int] = {}
        self.prev_prices: Dict[str, int] = {}
        self.market: Dict[str, int] = {}
        self.avg_cost: Dict[str, int] = {}

        self.borrowed_today = 0
        self.car_trips_today = 0
        self.supplier_used_today = False

        self.has_gun = False
        self.has_burner = False
        self.has_car = False
        self.has_supplier = False

        self.log: List[Tuple[str, str]] = []  # (message, style)

        # Web-app extras
        self.starting_cash: int = settings["cash"]
        self.starting_debt: int = settings["debt"]
        self.pending_coat_offer: Optional[dict] = None
        self.game_over: bool = False

    @property
    def carried(self) -> int:
        return sum(self.stash.values())

    @property
    def net_worth(self) -> int:
        return self.cash + self.bank - self.debt

    def add_log(self, msg: str, style: str = ""):
        self.log.insert(0, (msg, style))
        if len(self.log) > 50:
            self.log.pop()

    # ─── MARKET ───
    def generate_market(self):
        self.prev_prices = dict(self.prices)
        self.prices = {}
        self.market = {}
        skip_chance = 0.05 if self.has_burner else 0.15
        for d in DRUGS:
            if random.random() < skip_chance:
                continue
            if d["name"] == "Cocaine" and random.random() < 0.05:
                price = rnd(80000, 120000)
            else:
                price = round(d["base"] * (0.5 + random.random() * d["variance"] * 2))
            self.prices[d["name"]] = price
            self.market[d["name"]] = rnd(5, 60)

    # ─── EVENTS ───
    def apply_event(self, ev_type: str):
        if ev_type == "bust":
            lost = 0
            fraction = 0.25 if self.has_gun else 0.5
            for k in list(self.stash.keys()):
                take = int(self.stash[k] * fraction)
                self.stash[k] -= take
                lost += take
                if self.stash[k] <= 0:
                    del self.stash[k]
            suffix = " (gun reduced losses)" if self.has_gun else ""
            self.add_log(f"BUST! Lost {lost} units to the cops{suffix}.", "red")

        elif ev_type == "surge":
            for k in self.prices:
                self.prices[k] = round(self.prices[k] * (1.5 + random.random()))
            self.add_log("Prices surged across the board!", "red")

        elif ev_type == "drought":
            keys = list(self.market.keys())
            for k in keys[: len(keys) // 2]:
                self.market.pop(k, None)
                self.prices.pop(k, None)
            self.add_log("Drought hit — half the supply vanished.", "red")

        elif ev_type == "mug":
            if self.has_gun and random.random() < 0.6:
                self.add_log("Mugger tried you — you flashed the piece and they ran.", "green")
                return
            take = min(self.cash, rnd(300, 1500))
            self.cash -= take
            self.add_log(f"Mugged for {fmt(take)}!", "red")

        elif ev_type == "find":
            d = random.choice(DRUGS)
            qty = min(rnd(5, 25), self.coat - self.carried)
            if qty > 0:
                self.stash[d["name"]] = self.stash.get(d["name"], 0) + qty
                self.add_log(f"Found {qty}x {d['name']} in an alley!", "green")

        elif ev_type == "cheap":
            for k in self.prices:
                self.prices[k] = round(self.prices[k] * 0.35)
            self.add_log("Prices crashed — buy now!", "green")

        elif ev_type == "shark":
            if self.debt <= 0:
                self.add_log("Loan shark's boys came by — nothing to collect.", "yellow")
                return
            take = min(self.cash, 500)
            self.cash -= take
            self.add_log(f"Loan shark took {fmt(take)} from you.", "red")

        elif ev_type == "bribe":
            take = min(self.cash, 200)
            self.cash -= take
            self.add_log(f"Paid a cop {fmt(take)} to look away.", "yellow")

        elif ev_type == "tip":
            best_drug = None
            best_ratio = float("inf")
            for d in DRUGS:
                if d["name"] in self.prices:
                    ratio = self.prices[d["name"]] / d["base"]
                    if ratio < best_ratio:
                        best_ratio = ratio
                        best_drug = d
            if best_drug:
                self.add_log(
                    f"Snitch tip: {best_drug['name']} is going for "
                    f"{fmt(self.prices[best_drug['name']])} here — that's a steal.",
                    "green",
                )
            else:
                self.add_log("Snitch had nothing useful to say.", "")

    # ─── TRAVEL ───
    def travel(self, city: str) -> Optional[dict]:
        """Travel to a city. Returns triggered event dict, or None."""
        if city == self.city:
            return None
        self.city = city

        free_trip = self.has_car and self.car_trips_today < CAR_FREE_TRIPS
        if free_trip:
            self.car_trips_today += 1
            self.add_log(
                f"Drove to {city} (free trip {self.car_trips_today}/{CAR_FREE_TRIPS} today).",
                "green",
            )
        else:
            self.day += 1
            self.debt = round(self.debt * self.interest)
            self.borrowed_today = 0
            self.car_trips_today = 0
            self.supplier_used_today = False
            self.add_log(f"Traveled to {city}. Day {self.day}.", "yellow")
            self.add_log(f">> {random.choice(HEADLINES)}", "dim")

        self.generate_market()

        event = None
        if random.random() < self.event_chance:
            ev = random.choice(EVENTS)
            if ev["type"] == "shark" and self.debt <= 0:
                ev = None
            if ev:
                self.apply_event(ev["type"])
                event = ev

        return event

    # ─── BUY / SELL ───
    def max_buy_qty(self, name: str) -> int:
        price = self.prices.get(name)
        if not price:
            return 0
        space = self.coat - self.carried
        return min(self.market.get(name, 0), space, self.cash // price)

    def buy(self, name: str, qty: int) -> bool:
        price = self.prices.get(name)
        if not price or qty <= 0:
            self.add_log("Cannot buy — no cash, space, or supply.", "red")
            return False
        prev_qty = self.stash.get(name, 0)
        prev_avg = self.avg_cost.get(name, 0)
        self.avg_cost[name] = round((prev_avg * prev_qty + price * qty) / (prev_qty + qty))
        self.cash -= price * qty
        self.stash[name] = prev_qty + qty
        self.market[name] = self.market.get(name, 0) - qty
        if self.market[name] <= 0:
            del self.market[name]
        self.add_log(
            f"Bought {qty}x {name} @ {fmt(price)} ea. (avg: {fmt(self.avg_cost[name])})",
            "green",
        )
        return True

    def sell(self, name: str, qty: int) -> bool:
        have = self.stash.get(name, 0)
        price = self.prices.get(name)
        if not have:
            self.add_log("You don't have that.", "red")
            return False
        if not price:
            self.add_log("No buyers here for that.", "red")
            return False
        qty = min(qty, have)
        self.cash += price * qty
        self.stash[name] -= qty
        if self.stash[name] <= 0:
            del self.stash[name]
            self.avg_cost.pop(name, None)
        self.add_log(f"Sold {qty}x {name} @ {fmt(price)} ea.", "green")
        return True

    def supplier_buy(self, name: str) -> bool:
        if not self.has_supplier:
            self.add_log("No supplier contact.", "red")
            return False
        if self.supplier_used_today:
            self.add_log("Already used the connect today.", "red")
            return False
        price = self.prices.get(name)
        if not price:
            self.add_log("No market price for that here.", "red")
            return False
        half_price = round(price / 2)
        qty = min(self.coat - self.carried, self.cash // half_price)
        if qty <= 0:
            self.add_log("Not enough cash or space for the connect deal.", "red")
            return False
        real_price = self.prices[name]
        self.prices[name] = half_price
        self.buy(name, qty)
        self.prices[name] = real_price
        self.supplier_used_today = True
        self.add_log(
            f"Connect hooked you up: {qty}x {name} at {fmt(half_price)} (50% off). Connect used for today.",
            "green",
        )
        return True

    # ─── UPGRADES ───
    def buy_upgrade(self, upgrade_id: str) -> bool:
        u = next((x for x in UPGRADES if x["id"] == upgrade_id), None)
        if not u:
            return False
        key = f"has_{upgrade_id}"
        if getattr(self, key):
            self.add_log("Already own that.", "red")
            return False
        if self.cash < u["price"]:
            self.add_log(f"Need {fmt(u['price'])} to buy {u['label']}.", "red")
            return False
        self.cash -= u["price"]
        setattr(self, key, True)
        self.add_log(f"Bought: {u['label']}.", "green")
        return True

    # ─── BANKING ───
    def deposit(self, amt: int):
        amt = min(max(amt, 0), self.cash)
        if amt <= 0:
            return
        self.cash -= amt
        self.bank += amt
        self.add_log(f"Deposited {fmt(amt)}.", "green")

    def withdraw(self, amt: int):
        amt = min(max(amt, 0), self.bank)
        if amt <= 0:
            self.add_log("Nothing in the bank to withdraw.", "red")
            return
        self.cash += amt
        self.bank -= amt
        self.add_log(f"Withdrew {fmt(amt)}.", "green")

    def pay_debt(self, amt: int):
        amt = min(max(amt, 0), self.cash, self.debt)
        if amt <= 0:
            self.add_log("No cash to pay debt with.", "red")
            return
        self.cash -= amt
        self.debt -= amt
        if self.debt < 0:
            self.debt = 0
        self.add_log(f"Paid {fmt(amt)} on debt. Remaining: {fmt(self.debt)}.", "green")
        if self.debt == 0:
            self.add_log("DEBT CLEARED! You are free!", "green")

    def borrow(self, amt: int):
        remaining = 10000 - self.borrowed_today
        if remaining <= 0:
            self.add_log("Loan shark won't lend any more today.", "red")
            return
        amt = min(max(amt, 0), remaining)
        if amt <= 0:
            return
        self.cash += amt
        self.debt += amt
        self.borrowed_today += amt
        self.add_log(
            f"Borrowed {fmt(amt)}. Total debt: {fmt(self.debt)}. "
            f"Remaining today: {fmt(remaining - amt)}.",
            "yellow",
        )

    # ─── COAT OFFER ───
    def maybe_coat_offer(self) -> Optional[dict]:
        if random.random() > 0.10:
            return None
        return random.choice(COAT_OFFERS)

    def accept_coat_offer(self, offer: dict):
        if self.cash < offer["price"]:
            self.add_log(f"Couldn't afford the coat offer ({fmt(offer['price'])}).", "red")
            return
        self.cash -= offer["price"]
        self.coat += offer["capacity"]
        self.add_log(
            f"Bought a new carry (+{offer['capacity']} capacity) for {fmt(offer['price'])}.",
            "green",
        )

    # ─── END GAME ───
    # ─── SERIALIZATION ───
    def to_dict(self) -> dict:
        return {
            "day":                  self.day,
            "max_days":             self.max_days,
            "cash":                 self.cash,
            "bank":                 self.bank,
            "debt":                 self.debt,
            "interest":             self.interest,
            "event_chance":         self.event_chance,
            "city":                 self.city,
            "coat":                 self.coat,
            "stash":                self.stash,
            "prices":               self.prices,
            "prev_prices":          self.prev_prices,
            "market":               self.market,
            "avg_cost":             self.avg_cost,
            "borrowed_today":       self.borrowed_today,
            "car_trips_today":      self.car_trips_today,
            "supplier_used_today":  self.supplier_used_today,
            "has_gun":              self.has_gun,
            "has_burner":           self.has_burner,
            "has_car":              self.has_car,
            "has_supplier":         self.has_supplier,
            "log":                  [list(e) for e in self.log],
            "starting_cash":        self.starting_cash,
            "starting_debt":        self.starting_debt,
            "pending_coat_offer":   self.pending_coat_offer,
            "game_over":            self.game_over,
        }

    @classmethod
    def from_dict(cls, d: dict) -> 'Game':
        settings = {
            "days":     d["max_days"],
            "cash":     0,
            "debt":     0,
            "interest": d["interest"],
            "events":   d["event_chance"],
            "coat":     0,
        }
        g = cls(settings)
        g.day                 = d["day"]
        g.max_days            = d["max_days"]
        g.cash                = d["cash"]
        g.bank                = d["bank"]
        g.debt                = d["debt"]
        g.city                = d["city"]
        g.coat                = d["coat"]
        g.stash               = d["stash"]
        g.prices              = {k: int(v) for k, v in d["prices"].items()}
        g.prev_prices         = {k: int(v) for k, v in d.get("prev_prices", {}).items()}
        g.market              = {k: int(v) for k, v in d["market"].items()}
        g.avg_cost            = {k: int(v) for k, v in d.get("avg_cost", {}).items()}
        g.borrowed_today      = d["borrowed_today"]
        g.car_trips_today     = d["car_trips_today"]
        g.supplier_used_today = d["supplier_used_today"]
        g.has_gun             = d["has_gun"]
        g.has_burner          = d["has_burner"]
        g.has_car             = d["has_car"]
        g.has_supplier        = d["has_supplier"]
        g.log                 = [tuple(e) for e in d.get("log", [])]
        g.starting_cash       = d.get("starting_cash", d["cash"])
        g.starting_debt       = d.get("starting_debt", d["debt"])
        g.pending_coat_offer  = d.get("pending_coat_offer")
        g.game_over           = d.get("game_over", False)
        return g

    def end_title(self) -> Tuple[str, str]:
        net = self.net_worth
        if net > 100000:
            return "KINGPIN!", "You OWN these streets. Nobody moves product without your say-so."
        elif net > 50000:
            return "MADE MAN", "Big earner. The bosses are watching. Keep it up."
        elif net > 10000:
            return "STREET HUSTLER", "Not bad. You survived and came out ahead."
        elif net > 0:
            return "SURVIVOR", "You made it out alive — barely. Try harder next time."
        else:
            return "BROKE & BURIED", "The loan shark owns everything you had. Game over for real."


# ─── HIGH SCORES ───
def load_scores() -> list:
    try:
        if SCORES_FILE.exists():
            return json.loads(SCORES_FILE.read_text())
    except Exception:
        pass
    return []


def save_score(net: int, settings: dict) -> list:
    scores = load_scores()
    scores.append({
        "net": net,
        "days": settings["days"],
        "cash": settings["cash"],
        "debt": settings["debt"],
        "interest": settings["interest"],
        "date": datetime.date.today().isoformat(),
    })
    scores.sort(key=lambda s: s["net"], reverse=True)
    scores = scores[:10]
    try:
        SCORES_FILE.write_text(json.dumps(scores, indent=2))
    except Exception:
        pass
    return scores


# ─── DISPLAY ───
def display(g: Game) -> Tuple[dict, dict]:
    """Render game state. Returns (drug_index, stash_index) number→name maps."""
    console.clear()

    interest_pct = round((g.interest - 1) * 100)
    days_left = g.max_days - g.day
    console.print(
        Panel(
            f"[bold yellow]DOPE WARS[/bold yellow]  "
            f"[dim]NYC 1984 · Day [bold]{g.day}[/bold]/{g.max_days} "
            f"({days_left} left) · {interest_pct}%/day interest[/dim]  "
            f"City: [bold]{g.city}[/bold]",
            style="yellow",
            expand=True,
        )
    )

    # Stats bar
    net_color = "green" if g.net_worth >= 0 else "red"
    stats = Table.grid(expand=True, padding=(0, 2))
    stats.add_column(justify="center")
    stats.add_column(justify="center")
    stats.add_column(justify="center")
    stats.add_column(justify="center")
    stats.add_column(justify="center")
    stats.add_row(
        f"[dim]CASH[/dim]\n[bold yellow]{fmt(g.cash)}[/bold yellow]",
        f"[dim]BANK[/dim]\n[bold yellow]{fmt(g.bank)}[/bold yellow]",
        f"[dim]DEBT[/dim]\n[bold red]{fmt(g.debt)}[/bold red]",
        f"[dim]CARRY[/dim]\n[bold yellow]{g.carried}/{g.coat}[/bold yellow]",
        f"[dim]NET WORTH[/dim]\n[bold {net_color}]{fmt(g.net_worth)}[/bold {net_color}]",
    )
    console.print(stats)

    # Owned upgrades
    badges = []
    if g.has_gun:
        badges.append("Gun")
    if g.has_burner:
        badges.append("Burner")
    if g.has_car:
        free_left = max(0, CAR_FREE_TRIPS - g.car_trips_today)
        badges.append(f"Car ({free_left} free trip{'s' if free_left != 1 else ''} left)")
    if g.has_supplier:
        badges.append(f"Connect ({'used' if g.supplier_used_today else 'ready'})")
    if badges:
        console.print(f"  [dim]Owned: {' · '.join(badges)}[/dim]")

    console.rule()

    # Market
    drug_index: Dict[str, str] = {}
    market_table = Table(title="MARKET", box=box.SIMPLE, title_style="bold yellow", expand=False)
    market_table.add_column("#",       justify="right",  style="dim", width=3)
    market_table.add_column("Drug",    style="bold",      min_width=10)
    market_table.add_column("Street",  style="dim",       min_width=8)
    market_table.add_column("Price",   justify="right",   min_width=10)
    market_table.add_column("Avail",   justify="right",   style="dim", min_width=5)
    market_table.add_column("",        width=2)  # trend

    i = 1
    for d in DRUGS:
        if d["name"] not in g.prices:
            continue
        price = g.prices[d["name"]]
        prev = g.prev_prices.get(d["name"])
        is_high = price > d["base"] * 1.5
        price_style = "red" if is_high else "green"
        trend = ""
        if prev:
            if price > prev:
                trend = "[red]▲[/red]"
            elif price < prev:
                trend = "[green]▼[/green]"
        drug_index[str(i)] = d["name"]
        market_table.add_row(
            str(i),
            d["name"],
            d["street"],
            f"[{price_style}]{fmt(price)}[/{price_style}]",
            str(g.market.get(d["name"], 0)),
            trend,
        )
        i += 1

    if not drug_index:
        console.print("[dim]No supply here today. Travel somewhere.[/dim]")
    else:
        console.print(market_table)

    # Stash
    stash_index: Dict[str, str] = {}
    all_stash = {k: v for k, v in g.stash.items() if v > 0}
    if all_stash:
        stash_table = Table(title="YOUR STASH", box=box.SIMPLE, title_style="bold yellow", expand=False)
        stash_table.add_column("#",        justify="right", style="dim", width=3)
        stash_table.add_column("Drug",     style="bold",    min_width=10)
        stash_table.add_column("Qty",      justify="right", min_width=5)
        stash_table.add_column("Sell @",   justify="right", style="green", min_width=10)
        stash_table.add_column("Avg cost", justify="right", style="dim",   min_width=10)
        stash_table.add_column("P/L",      justify="right", min_width=6)

        j = 1
        for name in sorted(all_stash):
            qty = g.stash.get(name, 0)
            sell_price = g.prices.get(name)
            avg = g.avg_cost.get(name)
            pl_str = ""
            if avg and sell_price:
                pct = round(((sell_price - avg) / avg) * 100)
                color = "green" if pct >= 0 else "red"
                sign = "+" if pct >= 0 else ""
                pl_str = f"[{color}]{sign}{pct}%[/{color}]"
            stash_index[str(j)] = name
            stash_table.add_row(
                str(j),
                name,
                str(qty),
                fmt(sell_price) if sell_price else "[dim]no buyers[/dim]",
                fmt(avg) if avg else "[dim]-[/dim]",
                pl_str,
            )
            j += 1
        console.print(stash_table)
    else:
        console.print("[dim]Empty pockets.[/dim]")

    # Log
    console.rule("[dim]STREET NEWS[/dim]")
    for msg, style in g.log[:6]:
        if style == "green":
            console.print(f"  [green]{msg}[/green]")
        elif style == "red":
            console.print(f"  [red]{msg}[/red]")
        elif style == "yellow":
            console.print(f"  [yellow]{msg}[/yellow]")
        elif style == "dim":
            console.print(f"  [dim]{msg}[/dim]")
        else:
            console.print(f"  {msg}")
    console.rule()

    return drug_index, stash_index


# ─── ACTIONS ───
def handle_travel(g: Game):
    console.print("\n[bold yellow]TRAVEL[/bold yellow]")
    for i, c in enumerate(CITIES, 1):
        if c["name"] == g.city:
            console.print(f"  [bold]{i}[/bold]. {c['name']}  [yellow]<-- you are here[/yellow]")
        else:
            console.print(f"  [bold]{i}[/bold]. {c['name']}  [dim]{c['desc']}[/dim]")
    if g.has_car:
        free_left = max(0, CAR_FREE_TRIPS - g.car_trips_today)
        console.print(f"\n  [dim]Car: {free_left} free trip(s) remaining today.[/dim]")

    choice = Prompt.ask("\n  Destination (number, or Enter to cancel)").strip()
    if not choice.isdigit():
        return
    idx = int(choice) - 1
    if not (0 <= idx < len(CITIES)):
        console.print("[red]Invalid choice.[/red]")
        return

    city = CITIES[idx]["name"]
    event = g.travel(city)

    if event:
        console.print(f"\n[bold red]  ⚡ {event['title']}[/bold red]")
        console.print(f"  {event['msg']}")
        Prompt.ask("  [dim]Press Enter to continue[/dim]")

    if g.day <= g.max_days:
        offer = g.maybe_coat_offer()
        if offer:
            console.print(f"\n[yellow]  STREET OFFER:[/yellow] {offer['desc']}.")
            console.print(f"  +{offer['capacity']} carry capacity for {fmt(offer['price'])}.")
            ans = Prompt.ask("  Buy it?", choices=["y", "n"], default="n")
            if ans == "y":
                g.accept_coat_offer(offer)
            else:
                g.add_log("Passed on the carry offer.", "")


def handle_buy(g: Game, drug_index: dict):
    if not drug_index:
        console.print("[red]No drugs available here.[/red]")
        return

    choice = Prompt.ask("\n  Which drug to buy (number)").strip()
    name = drug_index.get(choice)
    if not name:
        console.print("[red]Invalid choice.[/red]")
        return

    price = g.prices[name]
    max_qty = g.max_buy_qty(name)
    console.print(f"  [bold]{name}[/bold] @ {fmt(price)} ea.  |  Max you can buy: [yellow]{max_qty}[/yellow]")

    sub_options = "  1. Buy amount  2. Buy MAX"
    if g.has_supplier and not g.supplier_used_today:
        half = fmt(round(price / 2))
        sub_options += f"  3. Connect ({half} ea., fills your pockets)"
    sub = Prompt.ask(sub_options).strip()

    if sub == "1":
        qty = IntPrompt.ask("  Quantity", default=1)
        qty = min(qty, max_qty)
        if qty > 0:
            g.buy(name, qty)
        else:
            console.print("[red]Can't buy that many.[/red]")
    elif sub == "2":
        if max_qty > 0:
            g.buy(name, max_qty)
        else:
            console.print("[red]Cannot buy — no cash, space, or supply.[/red]")
    elif sub == "3" and g.has_supplier and not g.supplier_used_today:
        g.supplier_buy(name)


def handle_sell(g: Game, stash_index: dict):
    if not stash_index:
        console.print("[red]Nothing to sell.[/red]")
        return

    choice = Prompt.ask("\n  Which drug to sell (number from stash)").strip()
    name = stash_index.get(choice)
    if not name:
        console.print("[red]Invalid choice.[/red]")
        return

    qty = g.stash.get(name, 0)
    price = g.prices.get(name)
    if not price:
        console.print(f"[red]No buyers for {name} here. Travel somewhere else.[/red]")
        return

    console.print(f"  [bold]{name}[/bold]: you have [yellow]{qty}[/yellow], sell @ [green]{fmt(price)}[/green] ea.")
    sell_qty = IntPrompt.ask("  Quantity to sell", default=qty)
    g.sell(name, sell_qty)


def handle_banking(g: Game):
    console.print(f"\n[bold yellow]BANK[/bold yellow]  Cash: {fmt(g.cash)}  Bank: {fmt(g.bank)}")
    console.print("  1. Deposit  2. Withdraw  3. Withdraw all")
    choice = Prompt.ask("  Action").strip()
    if choice == "1":
        amt = IntPrompt.ask("  Deposit how much", default=0)
        g.deposit(amt)
    elif choice == "2":
        amt = IntPrompt.ask("  Withdraw how much", default=0)
        g.withdraw(amt)
    elif choice == "3":
        g.withdraw(g.bank)


def handle_loan(g: Game):
    console.print(
        f"\n[bold yellow]LOAN SHARK[/bold yellow]  "
        f"Debt: [red]{fmt(g.debt)}[/red]  Cash: {fmt(g.cash)}  "
        f"Borrow limit today: {fmt(max(0, 10000 - g.borrowed_today))}"
    )
    console.print("  1. Borrow more  2. Pay partial  3. Pay all")
    choice = Prompt.ask("  Action").strip()
    if choice == "1":
        amt = IntPrompt.ask("  Borrow how much", default=0)
        g.borrow(amt)
    elif choice == "2":
        amt = IntPrompt.ask("  Pay how much", default=0)
        g.pay_debt(amt)
    elif choice == "3":
        g.pay_debt(g.debt)


def handle_upgrades(g: Game):
    console.print("\n[bold yellow]BLACK MARKET UPGRADES[/bold yellow]")
    for i, u in enumerate(UPGRADES, 1):
        owned = getattr(g, f"has_{u['id']}")
        if owned:
            status = "[green]OWNED[/green]"
        elif g.cash >= u["price"]:
            status = f"[yellow]{fmt(u['price'])}[/yellow]"
        else:
            status = f"[red]{fmt(u['price'])} (need more cash)[/red]"
        console.print(f"  [bold]{i}[/bold]. {u['label']} ({status})")
        console.print(f"     [dim]{u['desc']}[/dim]")

    choice = Prompt.ask("\n  Buy which upgrade (number, or Enter to cancel)").strip()
    if choice.isdigit():
        idx = int(choice) - 1
        if 0 <= idx < len(UPGRADES):
            g.buy_upgrade(UPGRADES[idx]["id"])


def show_high_scores(scores: list = None):
    if scores is None:
        scores = load_scores()
    console.print("\n[bold yellow]HIGH SCORES[/bold yellow]")
    if not scores:
        console.print("[dim]No scores yet.[/dim]")
        return
    t = Table(box=box.SIMPLE)
    t.add_column("Rank",      width=5)
    t.add_column("Net Worth", justify="right", min_width=12)
    t.add_column("Settings",  style="dim")
    t.add_column("Date",      style="dim", min_width=10)
    for i, s in enumerate(scores):
        rank = "👑" if i == 0 else f"#{i + 1}"
        color = "green" if s["net"] >= 0 else "red"
        interest_pct = round((s["interest"] - 1) * 100)
        t.add_row(
            rank,
            f"[{color}]{fmt(s['net'])}[/{color}]",
            f"{s['days']}d · ${s['cash']:,} start · {interest_pct}% int",
            s.get("date", ""),
        )
    console.print(t)


# ─── SETTINGS ───
def get_settings() -> dict:
    console.clear()
    console.print(Panel("[bold yellow]DOPE WARS — NEW YORK CITY 1984[/bold yellow]", style="yellow"))
    console.print("\n[bold yellow]SETTINGS[/bold yellow]  (press Enter to keep default)\n")

    def pick(label: str, options: list, default):
        console.print(f"[bold]{label}[/bold]")
        for i, (desc, val) in enumerate(options, 1):
            marker = "  [yellow]◀ default[/yellow]" if val == default else ""
            console.print(f"  {i}. {desc}{marker}")
        choice = Prompt.ask("  Choose", default="").strip()
        if choice.isdigit():
            idx = int(choice) - 1
            if 0 <= idx < len(options):
                return options[idx][1]
        return default

    days = pick("Game Length", [
        ("30 days  (Standard)", 30),
        ("60 days  (Extended)", 60),
        ("90 days  (Marathon)", 90),
    ], 30)

    console.print()
    cash = pick("Starting Cash", [
        ("$2,000  (Standard)", 2000),
        ("$5,000  (Head start)", 5000),
        ("$500    (Hardcore)", 500),
    ], 2000)

    console.print()
    debt = pick("Starting Debt", [
        ("$5,000  (Standard)", 5000),
        ("$0      (Clean slate)", 0),
        ("$15,000 (Deep in it)", 15000),
    ], 5000)

    console.print()
    interest = pick("Daily Interest Rate", [
        ("10%  (Standard)", 1.10),
        ("5%   (Relaxed)", 1.05),
        ("20%  (Brutal)", 1.20),
    ], 1.10)

    console.print()
    events = pick("Event Frequency", [
        ("Normal  (38% chance)", 0.38),
        ("Quiet   (20% chance)", 0.20),
        ("Chaotic (60% chance)", 0.60),
    ], 0.38)

    console.print()
    coat = pick("Starting Carry Capacity", [
        ("100  (Standard)", 100),
        ("50   (Tight)", 50),
        ("200  (Loaded)", 200),
    ], 100)

    return {
        "days": days,
        "cash": cash,
        "debt": debt,
        "interest": interest,
        "events": events,
        "coat": coat,
    }


# ─── GAME OVER ───
def game_over(g: Game, settings: dict):
    net = g.net_worth
    title, flavor = g.end_title()
    color = "green" if net >= 0 else "red"

    console.clear()
    console.print(Panel(f"[bold yellow]{title}[/bold yellow]", style="yellow", expand=False))
    console.print(f"\n  Cash on hand : [yellow]{fmt(g.cash)}[/yellow]")
    console.print(f"  Bank         : [yellow]{fmt(g.bank)}[/yellow]")
    console.print(f"  Debt owed    : [red]-{fmt(g.debt)}[/red]")
    console.print(f"\n  [bold {color}]Net Worth: {fmt(net)}[/bold {color}]")
    console.print(f"\n  [dim]{flavor}[/dim]\n")

    scores = save_score(net, settings)
    show_high_scores(scores)


# ─── MAIN LOOP ───
def main():
    while True:
        settings = get_settings()
        g = Game(settings)
        g.generate_market()

        interest_pct = round((settings["interest"] - 1) * 100)
        g.add_log(f"Welcome to Dope Wars. {settings['days']} days. Make your fortune.", "yellow")
        if settings["debt"] > 0:
            g.add_log(f"You owe {fmt(settings['debt'])} to the loan shark at {interest_pct}%/day.", "red")

        running = True
        while running:
            drug_index, stash_index = display(g)

            if g.day > g.max_days:
                Prompt.ask("\n[bold red]TIME'S UP![/bold red]  Press Enter to see your results")
                break

            console.print(
                "\n[bold yellow]ACTIONS[/bold yellow]  "
                "[bold]T[/bold] Travel  "
                "[bold]B[/bold] Buy  "
                "[bold]S[/bold] Sell  "
                "[bold]D[/bold] Bank  "
                "[bold]L[/bold] Loan Shark  "
                "[bold]U[/bold] Upgrades  "
                "[bold]H[/bold] High Scores  "
                "[bold]Q[/bold] Quit"
            )
            action = Prompt.ask("Action").strip().upper()

            if action == "T":
                handle_travel(g)
                if g.day > g.max_days:
                    display(g)
                    Prompt.ask("\n[bold red]TIME'S UP![/bold red]  Press Enter to see your results")
                    running = False
            elif action == "B":
                handle_buy(g, drug_index)
            elif action == "S":
                handle_sell(g, stash_index)
            elif action == "D":
                handle_banking(g)
            elif action == "L":
                handle_loan(g)
            elif action == "U":
                handle_upgrades(g)
            elif action == "H":
                show_high_scores()
                Prompt.ask("[dim]Press Enter to continue[/dim]")
            elif action == "Q":
                console.print("[dim]Later.[/dim]")
                return

        game_over(g, settings)

        ans = Prompt.ask("\nPlay again?", choices=["y", "n"], default="y")
        if ans == "n":
            break


if __name__ == "__main__":
    main()
