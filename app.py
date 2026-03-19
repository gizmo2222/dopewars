"""
DOPE WARS — Flask Web App
Run:  python app.py
Then open http://localhost:5000

NOTE: Game state is stored in memory. It is lost on server restart.
      For production, swap GAMES dict for Redis or a database.
"""

import os
import uuid
from flask import Flask, request, jsonify, session, render_template

from dopewars import Game, load_scores, save_score, fmt

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "change-me-in-production")

# In-memory store: session_id → game state dict
GAMES: dict = {}


# ─── SESSION HELPERS ───

def sid() -> str:
    if "sid" not in session:
        session["sid"] = str(uuid.uuid4())
    return session["sid"]


def load_game() -> Game:
    data = GAMES.get(sid())
    return Game.from_dict(data) if data else None


def save_game(g: Game):
    GAMES[sid()] = g.to_dict()


# ─── ROUTES ───

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/new_game", methods=["POST"])
def api_new_game():
    data = request.get_json()
    settings = {
        "days":     int(data.get("days",     30)),
        "cash":     int(data.get("cash",     2000)),
        "debt":     int(data.get("debt",     5000)),
        "interest": float(data.get("interest", 1.10)),
        "events":   float(data.get("events",   0.38)),
        "coat":     int(data.get("coat",     100)),
    }
    g = Game(settings)
    g.generate_market()
    interest_pct = round((settings["interest"] - 1) * 100)
    g.add_log(f"Welcome to Dope Wars. {settings['days']} days. Make your fortune.", "warn")
    if settings["debt"] > 0:
        g.add_log(f"You owe {fmt(settings['debt'])} to the loan shark at {interest_pct}%/day.", "bad")
    save_game(g)
    return jsonify(g.to_dict())


@app.route("/api/state")
def api_state():
    g = load_game()
    if not g:
        return jsonify({"error": "no game"}), 404
    return jsonify(g.to_dict())


@app.route("/api/travel", methods=["POST"])
def api_travel():
    g = load_game()
    if not g:
        return jsonify({"error": "no game"}), 404
    city = request.get_json()["city"]
    event = g.travel(city)
    if g.day > g.max_days:
        g.game_over = True
    else:
        offer = g.maybe_coat_offer()
        if offer:
            g.pending_coat_offer = offer
    save_game(g)
    state = g.to_dict()
    state["triggered_event"] = event
    return jsonify(state)


@app.route("/api/coat_offer", methods=["POST"])
def api_coat_offer():
    g = load_game()
    accept = request.get_json().get("accept", False)
    offer = g.pending_coat_offer
    if offer:
        if accept:
            g.accept_coat_offer(offer)
        else:
            g.add_log("Passed on the carry offer.", "")
    g.pending_coat_offer = None
    save_game(g)
    return jsonify(g.to_dict())


@app.route("/api/buy", methods=["POST"])
def api_buy():
    g = load_game()
    data = request.get_json()
    qty = min(int(data.get("qty", 1)), g.max_buy_qty(data["name"]))
    g.buy(data["name"], qty)
    save_game(g)
    return jsonify(g.to_dict())


@app.route("/api/buy_max", methods=["POST"])
def api_buy_max():
    g = load_game()
    name = request.get_json()["name"]
    qty = g.max_buy_qty(name)
    if qty > 0:
        g.buy(name, qty)
    else:
        g.add_log("Cannot buy — no cash, space, or supply.", "bad")
    save_game(g)
    return jsonify(g.to_dict())


@app.route("/api/supplier_buy", methods=["POST"])
def api_supplier_buy():
    g = load_game()
    g.supplier_buy(request.get_json()["name"])
    save_game(g)
    return jsonify(g.to_dict())


@app.route("/api/sell", methods=["POST"])
def api_sell():
    g = load_game()
    data = request.get_json()
    name = data["name"]
    qty = int(data.get("qty", g.stash.get(name, 0)))
    g.sell(name, qty)
    save_game(g)
    return jsonify(g.to_dict())


@app.route("/api/deposit", methods=["POST"])
def api_deposit():
    g = load_game()
    g.deposit(int(request.get_json()["amount"]))
    save_game(g)
    return jsonify(g.to_dict())


@app.route("/api/withdraw", methods=["POST"])
def api_withdraw():
    g = load_game()
    data = request.get_json()
    amt = int(data.get("amount", g.bank))
    g.withdraw(amt)
    save_game(g)
    return jsonify(g.to_dict())


@app.route("/api/borrow", methods=["POST"])
def api_borrow():
    g = load_game()
    g.borrow(int(request.get_json()["amount"]))
    save_game(g)
    return jsonify(g.to_dict())


@app.route("/api/pay_debt", methods=["POST"])
def api_pay_debt():
    g = load_game()
    data = request.get_json()
    amt = int(data.get("amount", g.debt))
    g.pay_debt(amt)
    save_game(g)
    return jsonify(g.to_dict())


@app.route("/api/buy_upgrade", methods=["POST"])
def api_buy_upgrade():
    g = load_game()
    g.buy_upgrade(request.get_json()["id"])
    save_game(g)
    return jsonify(g.to_dict())


@app.route("/api/scores")
def api_scores():
    return jsonify(load_scores())


@app.route("/api/save_score", methods=["POST"])
def api_save_score():
    g = load_game()
    if not g:
        return jsonify([])
    settings = {
        "days":     g.max_days,
        "cash":     g.starting_cash,
        "debt":     g.starting_debt,
        "interest": g.interest,
    }
    return jsonify(save_score(g.net_worth, settings))


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
