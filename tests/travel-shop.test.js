'use strict';
// Travel, coat/bag offers and the upgrades shop, in both games.
const test = require('node:test');
const assert = require('node:assert/strict');
const { newGame, GAMES } = require('./harness');

const noEvents = { events: 0 };
const OFFERS = [[50, 400], [75, 600], [40, 300], [100, 900], [30, 150], [60, 500]];
const UPG = {
  dopewars:  { gun: ['9mm Pistol', 'hasGun'], burner: ['Burner Phone', 'hasBurner'], car: ['Stolen Honda', 'hasCar'], supplier: ['Supplier Contact', 'hasSupplier'] },
  candywars: { gun: ['Hall Pass', 'hasGun'], burner: ['Walkie-Talkie', 'hasBurner'], car: ['Skateboard', 'hasCar'], supplier: ['Club Card', 'hasSupplier'] },
};
const PRICES = { gun: 1500, burner: 500, car: 3000, supplier: 2000 };

// A game with randomness out of the way: random events off, a constant high roll
// (no coat offer, no late event, no extra shark visit).
function calm(name, settings = {}) {
  const g = newGame(name, { ...noEvents, ...settings });
  g.run('var __q = []; var __fb = 0.99; Math.random = () => (__q.length ? __q.shift() : __fb)');
  return g;
}
const rigq = (g, vals) => g.run(`__q.push(...${JSON.stringify(vals)})`);
const logs = g => g.logLines().join('\n');

for (const name of GAMES) {
  // ---- travel ----
  test(`${name}: travelling to the current city does nothing`, () => {
    const g = calm(name);
    const day = g.G.day;
    g.call('travel', g.G.city);
    assert.equal(g.G.day, day);
    assert.ok(!/Traveled/.test(logs(g)));
  });

  test(`${name}: a paid trip moves the city, adds a day, resets the daily counters and logs it`, () => {
    const g = calm(name);
    g.run("G.borrowedToday = 500; G.supplierUsedToday = true; G.heatDay = true; G.supplierBoughtDrug = 'x'; G.carTripsToday = 1");
    const to = g.run('CITIES[1].name');
    g.call('travel', to);
    assert.equal(g.G.city, to);
    assert.equal(g.G.day, 2);
    assert.equal(g.G.borrowedToday, 0);
    assert.equal(g.G.supplierUsedToday, false);
    assert.equal(g.G.heatDay, false);
    assert.equal(g.G.supplierBoughtDrug, null);
    assert.equal(g.G.carTripsToday, 0);
    assert.ok(g.logLines().includes(`Traveled to ${to}. Day 2.`));
    assert.equal(g.el('dayDisplay').textContent, '2');
  });

  test(`${name}: debt grows by the interest multiplier, rounded; cash and bank do not change`, () => {
    const g = calm(name, { interest: 1.1 });
    g.run('G.debt = 1234; G.cash = 777; G.bank = 999');
    g.call('travel', g.run('CITIES[1].name'));
    assert.equal(g.G.debt, 1357);
    assert.equal(g.G.cash, 777);
    assert.equal(g.G.bank, 999);
    g.call('travel', g.run('CITIES[2].name'));
    assert.equal(g.G.debt, 1493);
  });

  test(`${name}: zero debt stays zero and a 1.0 multiplier adds no interest`, () => {
    const g = calm(name, { interest: 1.1 });
    g.run('G.debt = 0');
    g.call('travel', g.run('CITIES[1].name'));
    assert.equal(g.G.debt, 0);
    const h = calm(name, { interest: 1.0 });
    h.run('G.debt = 5000');
    h.call('travel', h.run('CITIES[1].name'));
    assert.equal(h.G.debt, 5000);
  });

  test(`${name}: with a car the first trip of a day is free, the second costs a day`, () => {
    const g = calm(name, { interest: 1.1 });
    g.run('G.hasCar = true; G.debt = 1000; G.borrowedToday = 300; G.supplierUsedToday = true; G.heatDay = true');
    g.run('var hl = 0; applyHeadline = () => { hl++; }');
    g.call('travel', g.run('CITIES[1].name'));
    assert.equal(g.G.day, 1);
    assert.equal(g.G.debt, 1000);
    assert.equal(g.G.carTripsToday, 1);
    assert.equal(g.G.borrowedToday, 300);
    assert.equal(g.G.supplierUsedToday, true);
    assert.equal(g.G.heatDay, true);
    assert.equal(g.run('hl'), 0, 'no headline on a free trip');
    assert.match(logs(g), /for free/);
    g.call('travel', g.run('CITIES[2].name'));
    assert.equal(g.G.day, 2);
    assert.equal(g.G.debt, 1100);
    assert.equal(g.G.carTripsToday, 0);
    assert.equal(g.G.borrowedToday, 0);
    assert.equal(g.run('hl'), 1, 'headline on a paid trip');
    // new day: free again
    g.call('travel', g.run('CITIES[3].name'));
    assert.equal(g.G.day, 2);
  });

  test(`${name}: without a car there are no free trips`, () => {
    const g = calm(name);
    g.call('travel', g.run('CITIES[1].name'));
    g.call('travel', g.run('CITIES[2].name'));
    assert.equal(g.G.day, 3);
    assert.equal(g.G.carTripsToday, 0);
    assert.equal(g.run('CAR_FREE_TRIPS'), 1);
  });

  test(`${name}: a trip regenerates the market`, () => {
    const g = calm(name);
    g.run('var gm = 0; generateMarket = () => { gm++; }');
    g.call('travel', g.run('CITIES[1].name'));
    g.run('G.hasCar = true');
    g.call('travel', g.run('CITIES[2].name'));
    assert.equal(g.run('gm'), 2);
  });

  test(`${name}: travelling re-renders the screen`, () => {
    const g = calm(name);
    g.call('travel', g.run('CITIES[1].name'));
    assert.match(g.el('cityDisplay').textContent, new RegExp(g.run('CITIES[1].name'), 'i'));
    assert.match(g.el('daysLeft').textContent, new RegExp(`${g.G.maxDays - 2} days left`));
  });

  test(`${name}: the trip after the last day ends the game; the last day itself does not`, () => {
    const g = calm(name);
    g.run('G.maxDays = 10; G.day = 8; G.shown3DayWarning = true');
    g.call('travel', g.run('CITIES[1].name'));
    assert.equal(g.G.day, 9);
    assert.equal(g.G.ended, false);
    g.call('travel', g.run('CITIES[2].name'));
    assert.equal(g.G.day, 10);
    assert.equal(g.G.ended, false);
    g.run('__fb = 0');
    g.call('travel', g.run('CITIES[1].name'));
    assert.equal(g.G.day, 11);
    assert.equal(g.G.ended, true);
    assert.equal(g.hidden('gameOver'), false);
    assert.equal(g.hidden('coatOverlay'), true, 'no coat offer after the game ended');
  });

  test(`${name}: a free trip on the last day does not end the game`, () => {
    const g = calm(name);
    g.run('G.maxDays = 10; G.day = 10; G.hasCar = true; G.shown3DayWarning = true');
    g.call('travel', g.run('CITIES[1].name'));
    assert.equal(g.G.ended, false);
    assert.equal(g.G.day, 10);
  });

  test(`${name}: the 3-day warning shows once, when 2 days or fewer remain`, () => {
    const g = calm(name);
    g.run('G.maxDays = 30; G.day = 26');
    g.call('travel', g.run('CITIES[1].name'));
    assert.equal(g.G.day, 27);
    assert.equal(g.G.shown3DayWarning, false);
    assert.equal(g.hidden('eventOverlay'), true);
    g.call('travel', g.run('CITIES[2].name'));
    assert.equal(g.G.day, 28);
    assert.equal(g.G.shown3DayWarning, true);
    assert.equal(g.hidden('eventOverlay'), false);
    assert.match(g.el('eventTitle').textContent, /^3 DAYS LEFT/);
    g.call('dismissEvent');
    g.call('travel', g.run('CITIES[1].name'));
    assert.equal(g.hidden('eventOverlay'), true, 'not shown again');
  });

  // ---- tip-off ----
  test(`${name}: ignoring a tip busts you in the tipped city and clears the tip`, () => {
    const g = calm(name);
    const to = g.run('CITIES[1].name');
    g.run(`G.stash = { A: 10 }; G.tippedCity = ${JSON.stringify(to)}; G.tippedExpiry = 5`);
    g.call('travel', to);
    assert.equal(g.G.stash.A, 5);
    assert.match(logs(g), /ignored the (tip|warning)/);
    assert.equal(g.G.tippedCity, null);
    assert.equal(g.G.tippedExpiry, 0);
  });

  test(`${name}: a tip for another city is kept, and an expired tip is cleared without a bust`, () => {
    const g = calm(name);
    const a = g.run('CITIES[1].name'), b = g.run('CITIES[2].name');
    g.run(`G.stash = { A: 10 }; G.tippedCity = ${JSON.stringify(b)}; G.tippedExpiry = 5`);
    g.call('travel', a);
    assert.equal(g.G.stash.A, 10);
    assert.equal(g.G.tippedCity, b);
    assert.equal(g.G.tippedExpiry, 5);
    g.run('G.day = 5');
    g.call('travel', g.run('CITIES[3].name'));
    assert.equal(g.G.day, 6);
    assert.equal(g.G.stash.A, 10);
    assert.equal(g.G.tippedCity, null);
    assert.equal(g.G.tippedExpiry, 0);
  });

  test(`${name}: a tip still counts on its expiry day`, () => {
    const g = calm(name);
    const to = g.run('CITIES[1].name');
    g.run(`G.stash = { A: 10 }; G.tippedCity = ${JSON.stringify(to)}; G.tippedExpiry = 2`);
    g.call('travel', to);
    assert.equal(g.G.day, 2);
    assert.equal(g.G.stash.A, 5);
  });

  // ---- random events on travel ----
  function spied(g) {
    g.run("var shown = []; showEvent = (t, m) => { shown.push(t); }; generateMarket = () => {}; applyHeadline = () => {}; maybeCoatOffer = () => {}; maybeLateEvent = () => {}");
  }
  const shownList = g => JSON.parse(JSON.stringify(g.run('shown')));
  const sharkRoll = 6.5 / 9; // rnd(0, 8) -> index 6, the loan shark event

  test(`${name}: with events on, a travel event is picked and shown`, () => {
    const g = calm(name, { events: 1 });
    spied(g);
    g.run('__fb = 0.99');
    rigq(g, [0.5, 0]); // passes the event roll, picks EVENTS[0]
    g.call('travel', g.run('CITIES[1].name'));
    assert.deepEqual(shownList(g), [g.run('EVENTS[0].title')]);
  });

  test(`${name}: the loan shark event is blocked on days 1-5 and when there is no debt`, () => {
    assert.equal(newGame(name).run('EVENTS[6].type'), 'shark');
    const early = calm(name, { events: 1 });
    spied(early);
    early.run('G.day = 4; G.debt = 1000; __fb = 0.99');
    rigq(early, [0.5, sharkRoll]);
    early.call('travel', early.run('CITIES[1].name')); // day 5
    assert.equal(early.G.day, 5);
    assert.deepEqual(shownList(early), []);

    const clear = calm(name, { events: 1 });
    spied(clear);
    clear.run('G.day = 9; G.debt = 0; __fb = 0.99');
    rigq(clear, [0.5, sharkRoll]);
    clear.call('travel', clear.run('CITIES[1].name'));
    assert.deepEqual(shownList(clear), []);

    const ok = calm(name, { events: 1 });
    spied(ok);
    ok.run('G.day = 5; G.debt = 1000; __fb = 0.99');
    rigq(ok, [0.5, sharkRoll]);
    ok.call('travel', ok.run('CITIES[1].name')); // day 6
    assert.equal(ok.G.day, 6);
    assert.deepEqual(shownList(ok), [ok.run('EVENTS[6].title')]);
  });

  test(`${name}: the event roll is compared with SETTINGS.events`, () => {
    const g = calm(name, { events: 0.3 });
    spied(g);
    g.run('__fb = 0.99');
    rigq(g, [0.31, 0]);
    g.call('travel', g.run('CITIES[1].name'));
    assert.deepEqual(shownList(g), []);
    rigq(g, [0.29, 0]);
    g.call('travel', g.run('CITIES[2].name'));
    assert.equal(shownList(g).length, 1);
  });

  test(`${name}: after day 15 an indebted player may get an extra loan shark visit`, () => {
    const g = calm(name);
    spied(g);
    g.run('G.hasCar = true; G.day = 20; G.debt = 1000; __fb = 0.05');
    g.call('travel', g.run('CITIES[1].name')); // free trip, day stays 20: chance 0.10
    assert.deepEqual(shownList(g), [g.run('EVENTS[6].title')]);
    assert.match(logs(g), /(took|collected) [$]200/);
  });

  test(`${name}: the extra shark visit needs debt, day over 15, and a low enough roll`, () => {
    const mk = (day, debt, roll) => {
      const g = calm(name);
      spied(g);
      g.run(`G.maxDays = 100; G.hasCar = true; G.day = ${day}; G.debt = ${debt}; __fb = ${roll}`);
      g.call('travel', g.run('CITIES[1].name'));
      return shownList(g).length;
    };
    assert.equal(mk(20, 0, 0.05), 0, 'no debt');
    assert.equal(mk(15, 1000, 0.01), 0, 'day 15');
    assert.equal(mk(16, 1000, 0.01), 1, 'day 16 chance 0.02');
    assert.equal(mk(20, 1000, 0.11), 0, 'roll above chance 0.10');
    assert.equal(mk(50, 1000, 0.29), 1, 'chance capped at 0.30');
    assert.equal(mk(50, 1000, 0.31), 0, 'chance does not exceed the cap');
  });

  test(`${name}: late-game events only run on paid trips after day 15`, () => {
    const mk = (day, car) => {
      const g = calm(name);
      spied(g);
      g.run(`var late = 0; maybeLateEvent = () => { late++; }; G.hasCar = ${car}; G.day = ${day}`);
      g.call('travel', g.run('CITIES[1].name'));
      return g.run('late');
    };
    assert.equal(mk(14, false), 0); // arrives day 15
    assert.equal(mk(15, false), 1); // arrives day 16
    assert.equal(mk(20, true), 0); // free trip
  });

  test(`${name}: a log-returning event shows its log line, others show their canned text`, () => {
    const g = calm(name, { events: 1 });
    g.run('var msgs = []; showEvent = (t, m) => { msgs.push(m); }; generateMarket = () => {}; applyHeadline = () => {}; maybeCoatOffer = () => {}; maybeLateEvent = () => {}');
    g.run('G.stash = { A: 10 }');
    rigq(g, [0.5, 0]); // bust returns its log text
    g.call('travel', g.run('CITIES[1].name'));
    assert.match(g.run('msgs[0]'), /Lost 5 (units|items)/);
    assert.equal(g.G.stash.A, 5);
    rigq(g, [0.5, 1.5 / 9]); // surge returns nothing, so the event's own message is shown
    g.call('travel', g.run('CITIES[2].name'));
    assert.equal(g.run('msgs[1]'), g.run('EVENTS[1].msg'));
  });

  test(`${name}: the extra shark visit shows the event's own message`, () => {
    const g = calm(name);
    spied(g);
    g.run('var msgs = []; showEvent = (t, m) => { msgs.push(m); }');
    g.run('G.hasCar = true; G.day = 20; G.debt = 1000; __fb = 0.05');
    g.call('travel', g.run('CITIES[1].name'));
    assert.equal(g.run('msgs.length'), 1);
    assert.equal(g.run('msgs[0]'), g.run('EVENTS[6].msg'));
  });

  test(`${name}: boundary rolls and tiny debts around the shark rules`, () => {
    // a debt of 1 still allows the shark event and the extra visit
    const a = calm(name, { events: 1 });
    spied(a);
    a.run('G.day = 9; G.debt = 1; __fb = 0.99');
    rigq(a, [0.5, sharkRoll]);
    a.call('travel', a.run('CITIES[1].name'));
    assert.equal(shownList(a).length, 1);
    const b = calm(name);
    spied(b);
    b.run('G.maxDays = 100; G.hasCar = true; G.day = 20; G.debt = 1; __fb = 0.05');
    b.call('travel', b.run('CITIES[1].name'));
    assert.equal(shownList(b).length, 1);
    // a roll exactly equal to the chance does not trigger
    const c = calm(name);
    spied(c);
    c.run('G.hasCar = true; G.day = 20; G.debt = 1000; __fb = 0.1');
    c.call('travel', c.run('CITIES[1].name'));
    assert.equal(shownList(c).length, 0);
    const d = calm(name, { events: 0.3 });
    spied(d);
    d.run('__fb = 0.99');
    rigq(d, [0.3, 0]);
    d.call('travel', d.run('CITIES[1].name'));
    assert.equal(shownList(d).length, 0);
  });

  test(`${name}: a tip for another city survives until the day after its expiry`, () => {
    const g = calm(name);
    const b = g.run('CITIES[2].name');
    g.run(`G.tippedCity = ${JSON.stringify(b)}; G.tippedExpiry = 2`);
    g.call('travel', g.run('CITIES[1].name')); // day 2
    assert.equal(g.G.tippedCity, b);
    g.call('travel', g.run('CITIES[3].name')); // day 3
    assert.equal(g.G.tippedCity, null);
  });

  // ---- coat / bag offers ----
  test(`${name}: each offer shows its capacity and price`, () => {
    OFFERS.forEach(([cap, price], i) => {
      const g = calm(name);
      rigq(g, [0.05, (i + 0.5) / 6]);
      g.call('maybeCoatOffer');
      assert.equal(g.hidden('coatOverlay'), false);
      const msg = g.el('coatOfferMsg').textContent;
      assert.ok(msg.includes(`+${cap} `), msg);
      assert.ok(msg.includes('$' + price.toLocaleString() + '. Interested?'), msg);
      assert.deepEqual([g.run('pendingCoatOffer.capacity'), g.run('pendingCoatOffer.price')], [cap, price]);
    });
  });

  test(`${name}: the coat offer appears on a roll of 0.10 or less and not above`, () => {
    const g = calm(name);
    rigq(g, [0.1, 0]);
    g.call('maybeCoatOffer');
    assert.equal(g.hidden('coatOverlay'), false);
    const h = calm(name);
    rigq(h, [0.11, 0]);
    h.call('maybeCoatOffer');
    assert.equal(h.hidden('coatOverlay'), true);
    assert.equal(h.run('pendingCoatOffer'), null);
  });

  test(`${name}: travel can raise a coat offer`, () => {
    const g = calm(name);
    g.run('generateMarket = () => {}; applyHeadline = () => {}; __fb = 0.05');
    g.call('travel', g.run('CITIES[1].name'));
    assert.equal(g.hidden('coatOverlay'), false);
  });

  test(`${name}: accepting an offer pays for it and adds capacity`, () => {
    const g = calm(name);
    g.run('G.cash = 1000');
    const coat = g.G.coat;
    rigq(g, [0.05, 0]); // 50 for 400
    g.call('maybeCoatOffer');
    g.call('acceptCoatOffer');
    assert.equal(g.G.cash, 600);
    assert.equal(g.G.coat, coat + 50);
    assert.equal(g.hidden('coatOverlay'), true);
    assert.equal(g.run('pendingCoatOffer'), null);
    assert.ok(logs(g).includes('+50 ') && logs(g).includes('$400.'), logs(g));
    assert.ok(g.el('cashDisplay').textContent.includes('600'));
    g.call('acceptCoatOffer'); // nothing pending any more
    assert.equal(g.G.cash, 600);
    assert.equal(g.G.coat, coat + 50);
  });

  test(`${name}: an offer can be bought with exactly enough cash`, () => {
    const g = calm(name);
    g.run('G.cash = 400');
    rigq(g, [0.05, 0]);
    g.call('maybeCoatOffer');
    g.call('acceptCoatOffer');
    assert.equal(g.G.cash, 0);
  });

  test(`${name}: accepting without enough cash buys nothing and says so`, () => {
    const g = calm(name);
    g.run('G.cash = 399');
    const coat = g.G.coat;
    rigq(g, [0.05, 0]);
    g.call('maybeCoatOffer');
    g.call('acceptCoatOffer');
    assert.equal(g.G.cash, 399);
    assert.equal(g.G.coat, coat);
    assert.equal(g.hidden('coatOverlay'), true);
    assert.equal(g.run('pendingCoatOffer'), null);
    assert.match(g.logLines()[0], /Couldn't afford the (coat|bag) offer \(\$400\)/);
  });

  test(`${name}: declining an offer closes it, logs it and drops the offer`, () => {
    const g = calm(name);
    g.run('G.cash = 1000');
    const coat = g.G.coat;
    rigq(g, [0.05, 0]);
    g.call('maybeCoatOffer');
    g.call('declineCoatOffer');
    assert.equal(g.hidden('coatOverlay'), true);
    assert.equal(g.run('pendingCoatOffer'), null);
    assert.match(g.logLines()[0], /^Passed on the (carry|bag) offer\.$/);
    g.call('acceptCoatOffer');
    assert.equal(g.G.cash, 1000);
    assert.equal(g.G.coat, coat);
  });

  // ---- upgrades ----
  for (const id of Object.keys(PRICES)) {
    const [label, key] = UPG[name][id];
    test(`${name}: buying ${id} costs ${PRICES[id]}, sets ${key} and logs it`, () => {
      const g = calm(name);
      g.run(`G.cash = ${PRICES[id] + 123}`);
      g.call('buyUpgrade', id);
      assert.equal(g.G.cash, 123);
      assert.equal(g.G[key], true);
      assert.match(g.logLines()[0], new RegExp(`^Bought: ${label}!?\\.?$`));
    });

    test(`${name}: ${id} with exactly its price is affordable, one dollar less is not`, () => {
      const g = calm(name);
      g.run(`G.cash = ${PRICES[id]}`);
      g.call('buyUpgrade', id);
      assert.equal(g.G.cash, 0);
      assert.equal(g.G[key], true);
      const h = calm(name);
      h.run(`G.cash = ${PRICES[id] - 1}`);
      h.call('buyUpgrade', id);
      assert.equal(h.G.cash, PRICES[id] - 1);
      assert.equal(h.G[key], false);
      assert.ok(h.logLines()[0].startsWith(`Need $${PRICES[id].toLocaleString()} to buy ${label}`), h.logLines()[0]);
    });

    test(`${name}: ${id} cannot be bought twice`, () => {
      const g = calm(name);
      g.run(`G.cash = 100000; G.${key} = true`);
      g.call('buyUpgrade', id);
      assert.equal(g.G.cash, 100000);
      assert.match(g.logLines()[0], /^Already (own that\.|have that!)$/);
    });
  }

  test(`${name}: each upgrade only sets its own flag`, () => {
    const g = calm(name);
    g.run('G.cash = 100000');
    g.call('buyUpgrade', 'burner');
    assert.deepEqual(['hasGun', 'hasBurner', 'hasCar', 'hasSupplier'].map(k => g.G[k]), [false, true, false, false]);
  });

  test(`${name}: the coat upgrade costs 1500, doubles each time, and adds 30 capacity`, () => {
    const g = calm(name);
    g.run('G.cash = 100000');
    const coat = g.G.coat;
    g.call('buyCoatUpgrade');
    assert.equal(g.G.cash, 98500);
    assert.equal(g.G.coat, coat + 30);
    assert.equal(g.G.coatsBought, 1);
    const line = g.logLines()[0];
    assert.ok(line.includes('+30 ') && line.includes('$1,500') && line.includes(`${coat + 30}`), line);
    g.call('buyCoatUpgrade');
    assert.equal(g.G.cash, 95500);
    g.call('buyCoatUpgrade');
    assert.equal(g.G.cash, 89500);
    assert.equal(g.G.coat, coat + 90);
    assert.equal(g.G.coatsBought, 3);
  });

  test(`${name}: the coat upgrade needs the full price`, () => {
    const g = calm(name);
    g.run('G.coatsBought = 2; G.cash = 5999');
    const coat = g.G.coat;
    g.call('buyCoatUpgrade');
    assert.equal(g.G.cash, 5999);
    assert.equal(g.G.coat, coat);
    assert.equal(g.G.coatsBought, 2);
    assert.ok(g.logLines()[0].startsWith('Need $6,000 for the '), g.logLines()[0]);
    g.run('G.cash = 6000');
    g.call('buyCoatUpgrade');
    assert.equal(g.G.cash, 0);
    assert.equal(g.G.coatsBought, 3);
  });

  test(`${name}: a save without coatsBought still prices the coat upgrade at 1500`, () => {
    const g = calm(name);
    g.run('delete G.coatsBought; G.cash = 1500');
    g.call('buyCoatUpgrade');
    assert.equal(g.G.cash, 0);
    assert.equal(g.G.coatsBought, 1);
    const h = calm(name);
    h.run('delete G.coatsBought; G.cash = 0');
    h.call('renderShop');
    assert.ok(h.el('shopList').innerHTML.includes('$1,500'));
  });

  // ---- shop rendering ----
  const rows = g => g.el('shopList').children;
  const btn = r => r.querySelector('button');

  test(`${name}: the shop lists four upgrades and the coat upgrade with prices`, () => {
    const g = calm(name);
    g.run('G.cash = 0');
    g.call('renderShop');
    const r = rows(g);
    assert.equal(r.length, 5);
    ['$1,500', '$500', '$3,000', '$2,000', '$1,500'].forEach((p, i) => {
      assert.ok(r[i].innerHTML.includes(`<div class="drug-price">${p}</div>`), r[i].innerHTML);
    });
    ['gun', 'burner', 'car', 'supplier'].forEach((id, i) => {
      assert.ok(r[i].innerHTML.includes(UPG[name][id][0]));
      assert.ok(r[i].innerHTML.includes(`buyUpgrade('${id}')`));
    });
    assert.ok(r[4].innerHTML.includes('buyCoatUpgrade()'));
    g.call('renderShop');
    assert.equal(rows(g).length, 5, 'rendering again replaces the rows');
  });

  test(`${name}: shop buttons are disabled when unaffordable and enabled when affordable`, () => {
    const g = calm(name);
    g.run('G.cash = 1499');
    g.call('renderShop');
    assert.deepEqual([0, 1, 2, 3, 4].map(i => btn(rows(g)[i]).disabled), [true, false, true, true, true]);
    g.run('G.cash = 3000');
    g.call('renderShop');
    assert.deepEqual([0, 1, 2, 3, 4].map(i => btn(rows(g)[i]).disabled), [false, false, false, false, false]);
    assert.equal(btn(rows(g)[0]).textContent, 'BUY');
  });

  test(`${name}: an owned upgrade shows OWNED and a disabled button`, () => {
    const g = calm(name);
    g.run('G.cash = 100000; G.hasCar = true');
    g.call('renderShop');
    assert.equal(btn(rows(g)[2]).textContent, 'OWNED');
    assert.equal(btn(rows(g)[2]).disabled, true);
    assert.equal(btn(rows(g)[0]).textContent, 'BUY');
    assert.equal(btn(rows(g)[0]).disabled, false);
  });

  test(`${name}: the coat row shows the doubled price and current capacity`, () => {
    const g = calm(name);
    g.run('G.cash = 3000; G.coatsBought = 1');
    g.call('renderShop');
    const r = rows(g)[4];
    assert.ok(r.innerHTML.includes('$3,000'));
    assert.ok(r.innerHTML.includes(`Current: ${g.G.coat}.`), r.innerHTML);
    assert.equal(btn(r).disabled, false);
    g.run('G.cash = 2999');
    g.call('renderShop');
    assert.equal(btn(rows(g)[4]).disabled, true);
  });

  test(`${name}: buying an upgrade refreshes the shop`, () => {
    const g = calm(name);
    g.run('G.cash = 600');
    g.call('buyUpgrade', 'burner');
    assert.equal(btn(rows(g)[1]).textContent, 'OWNED');
  });
}
