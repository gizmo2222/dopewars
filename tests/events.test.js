'use strict';
// Random events, late-game events and headlines: applyEvent branches, showEvent/dismissEvent queue,
// maybeLateEvent eligibility, fire sale accept/decline, applyHeadline price moves. Both games.
const test = require('node:test');
const assert = require('node:assert/strict');
const { newGame, GAMES } = require('./harness');

// Theme-specific log / modal text, one entry per game.
const TXT = {
  dopewars: {
    bust: /^BUST! Lost (\d+) units to the cops/, gunNote: ' (gun reduced losses)',
    surge: 'Prices surged across the board!', cheap: 'Prices crashed — buy now!',
    drought: 'Drought hit — half the supply vanished.',
    mug: n => `Mugged for ${n}!`, mugBlocked: 'Mugger tried you — you flashed the piece and they ran.',
    find: (q, d) => `Found ${q}x ${d} in an alley!`, noRoom: 'You spot a stash but have no room to carry any of it.',
    sharkNone: "Loan shark's boys came by — nothing to collect.",
    shark: (t, p) => `Loan shark took ${t} (${p}% of your debt) as a reminder.`,
    bribeFail: `Couldn't afford the bribe — cop busted you instead.`, bribeOk: 'Paid a cop $200 to look away.',
    tip: (d, p) => `Snitch tip: ${d} is going for ${p} here — that's a steal.`, tipNone: 'Snitch had nothing useful to say.',
    burnedTitle: 'CONTACT BURNED', burnedLog: 'Contact burned — supplier unavailable for 3 days.',
    cornerTitle: 'MARKET CORNERED', cornerLog: (d, n) => `Rival cornered the ${d} market for ${n} days.`,
    tipTitle: 'TIP-OFF', tipLog: c => `Tip: avoid ${c} for the next 2 days.`,
    fireOk: (q, d, p) => `Fire sale: bought ${q}x ${d} at ${p} ea.`, fireNo: 'Not enough cash or space to take the deal.',
    fireNoThanks: 'Passed on the fire sale.',
    dryHeadline: 'is off the market today', heatHeadline: 'Cops are out in force. Bust losses worse today.',
  },
  candywars: {
    bust: /^INSPECTION! Lost (\d+) items to the principal/, gunNote: ' (hall pass reduced losses)',
    surge: 'Buying frenzy! Prices jumped everywhere!', cheap: 'Price crash — stock up now!',
    drought: 'Shortage! Half the supply ran out.',
    mug: n => `Bully took ${n} from you!`, mugBlocked: 'A bully tried to steal from you — you stood your ground and they backed off!',
    find: (q, d) => `Found ${q}x ${d} hidden behind the bleachers!`, noRoom: 'You spot a stash but have no room to carry any of it.',
    sharkNone: 'Parents checked in — you owe them nothing. Nice!',
    shark: (t, p) => `Parents collected ${t} (${p}% of what you owe) as a reminder to pay them back.`,
    bribeFail: `No candy bar to share — the hall monitor checked your bag!`, bribeOk: 'Gave the hall monitor a candy bar ($200) to look away.',
    tip: (d, p) => `Playground tip: ${d} is going for ${p} here — that's a steal!`, tipNone: 'Your friend had nothing useful to share.',
    burnedTitle: 'CLUB CARD DECLINED', burnedLog: 'Club card declined — no bulk deals for 3 days.',
    cornerTitle: 'BOUGHT OUT!', cornerLog: (d, n) => `Popular kid bought out all ${d} for ${n} days.`,
    tipTitle: 'INSPECTION WARNING', tipLog: c => `Warning: avoid ${c} for the next 2 days.`,
    fireOk: (q, d, p) => `Going-home sale: bought ${q}x ${d} at ${p} each.`, fireNo: 'Not enough coins or bag space to take the deal.',
    fireNoThanks: 'Passed on the going-home sale.',
    dryHeadline: 'is unavailable today', heatHeadline: 'Inspections are worse today.',
  },
};

// Random value that makes rnd(a, b) return x (rnd = floor(r * (b - a + 1)) + a).
const rv = (a, b, x) => (x - a + 0.5) / (b - a + 1);
// Random value that picks index i out of n.
const ix = (i, n) => (i + 0.5) / n;

function fresh(name, fields = {}) {
  const g = newGame(name, { events: 0 });
  g.ctx.__f = fields;
  g.run('Object.assign(G, __f)');
  g.json = expr => JSON.parse(g.run(`JSON.stringify(${expr})`));
  g.top = () => g.logLines()[0];
  g.topClass = () => g.el('log').children[0].className;
  return g;
}

for (const name of GAMES) {
  const T = TXT[name];
  const drugName = (g, i) => g.run(`DRUGS[${i}].name`);
  const drugBase = (g, i) => g.run(`DRUGS[${i}].base`);

  /* ───────── maybeEvent ───────── */
  test(`${name}: maybeEvent does nothing when the roll is above the event chance`, () => {
    const g = fresh(name, { cash: 1000 });
    g.run('SETTINGS.events = 0.5');
    g.rig([0.51, 0]);
    g.run('maybeEvent()');
    assert.equal(g.hidden('eventOverlay'), true);
    assert.equal(g.run('G.cash'), 1000);
  });

  test(`${name}: maybeEvent fires on a roll just below the event chance and shows the log text`, () => {
    const g = fresh(name, { cash: 1000 });
    g.run('SETTINGS.events = 0.5');
    const bribe = g.run("EVENTS.findIndex(e => e.type === 'bribe')");
    const n = g.run('EVENTS.length');
    g.rig([0.4999, ix(bribe, n)]);
    g.run('maybeEvent()');
    assert.equal(g.hidden('eventOverlay'), false);
    assert.equal(g.run('G.cash'), 800);
    assert.equal(g.el('eventTitle').textContent, g.run(`EVENTS[${bribe}].title`));
    assert.equal(g.el('eventMsg').textContent, T.bribeOk);
  });

  test(`${name}: maybeEvent does nothing when the roll equals the event chance`, () => {
    const g = fresh(name, { cash: 1000 });
    g.run('SETTINGS.events = 0.5');
    g.rig([0.5, 0]);
    g.run('maybeEvent()');
    assert.equal(g.hidden('eventOverlay'), true);
  });

  test(`${name}: maybeEvent blocks the shark event before day 6 and when debt is cleared`, () => {
    const g = fresh(name);
    g.run('SETTINGS.events = 1');
    const shark = g.run("EVENTS.findIndex(e => e.type === 'shark')");
    const n = g.run('EVENTS.length');
    g.run('G.day = 3; G.debt = 1000');
    g.rig([0, ix(shark, n)]);
    g.run('maybeEvent()');
    assert.equal(g.hidden('eventOverlay'), true);
    g.run('G.day = 8; G.debt = 0');
    g.rig([0, ix(shark, n)]);
    g.run('maybeEvent()');
    assert.equal(g.hidden('eventOverlay'), true);
  });

  test(`${name}: maybeEvent falls back to the event's own message when the effect has no log text`, () => {
    const g = fresh(name);
    const cheap = g.run("EVENTS.findIndex(e => e.type === 'cheap')");
    g.run('SETTINGS.events = 1');
    g.rig([0, ix(cheap, g.run('EVENTS.length'))]);
    g.run('maybeEvent()');
    assert.equal(g.el('eventTitle').textContent, g.run(`EVENTS[${cheap}].title`));
    assert.equal(g.el('eventMsg').textContent, g.run(`EVENTS[${cheap}].msg`));
  });

  test(`${name}: maybeEvent picks the first and last events at the ends of the roll`, () => {
    const g = fresh(name);
    g.run('SETTINGS.events = 1');
    g.rig([0, 0]);
    g.run('maybeEvent()');
    assert.equal(g.el('eventTitle').textContent, g.run('EVENTS[0].title'));
    g.run('dismissEvent()');
    g.rig([0, 0.9999]);
    g.run('maybeEvent()');
    assert.equal(g.el('eventTitle').textContent, g.run('EVENTS[EVENTS.length - 1].title'));
  });

  /* ───────── applyEvent: bust ───────── */
  const bustCases = [
    { label: 'no gun', gun: false, heat: false, lost: 7, left: { A: 5, B: 2 } },
    { label: 'gun', gun: true, heat: false, lost: 3, left: { A: 8, B: 3 } },
    { label: 'heat day', gun: false, heat: true, lost: 9, left: { A: 3, B: 2 } },
    { label: 'gun and heat day', gun: true, heat: true, lost: 5, left: { A: 6, B: 3 } },
  ];
  for (const c of bustCases) {
    test(`${name}: bust takes the right share of the stash (${c.label})`, () => {
      const g = fresh(name, { stash: { A: 10, B: 4 }, hasGun: c.gun, heatDay: c.heat });
      g.run("applyEvent('bust')");
      assert.deepEqual(g.json('G.stash'), c.left);
      const line = g.top();
      assert.equal(Number(T.bust.exec(line)[1]), c.lost);
      assert.equal(line.includes(T.gunNote), c.gun);
      assert.equal(line.includes(' (heat day)'), c.heat);
      assert.equal(g.topClass(), 'log-entry bad');
    });
  }

  test(`${name}: bust removes a stash entry that is empty and leaves an empty stash alone`, () => {
    const g = fresh(name, { stash: { A: 0, B: 1 } });
    g.run("applyEvent('bust')");
    assert.deepEqual(g.json('G.stash'), { B: 1 });
    g.run("G.stash = {}; applyEvent('bust')");
    assert.equal(Number(T.bust.exec(g.top())[1]), 0);
  });

  /* ───────── surge / cheap ───────── */
  test(`${name}: surge multiplies every price by 1.5 plus a random 0..1`, () => {
    const g = fresh(name, { prices: { A: 100, B: 200 } });
    g.rig([0.2, 0.4]);
    g.run("applyEvent('surge')");
    assert.deepEqual(g.json('G.prices'), { A: 170, B: 380 });
    assert.equal(g.top(), T.surge);
    assert.equal(g.topClass(), 'log-entry bad');
  });

  test(`${name}: cheap supply cuts every price to 35% and rounds`, () => {
    const g = fresh(name, { prices: { A: 100, B: 33 } });
    g.run("applyEvent('cheap')");
    assert.deepEqual(g.json('G.prices'), { A: 35, B: 12 });
    assert.equal(g.top(), T.cheap);
    assert.equal(g.topClass(), 'log-entry good');
  });

  /* ───────── drought ───────── */
  test(`${name}: drought removes half the non-specialty goods and keeps the city specialty`, () => {
    const g = fresh(name);
    const spec = g.run('CITIES.find(c => c.name === G.city).specialty');
    const all = g.json('DRUGS.map(d => d.name)');
    g.run('G.market = {}; G.prices = {}; DRUGS.forEach(d => { G.market[d.name] = 5; G.prices[d.name] = 100; });');
    g.rig(new Array(20).fill(0));
    g.run("applyEvent('drought')");
    const others = all.filter(n => n !== spec);
    const gone = others.slice(0, Math.floor(others.length / 2));
    const left = all.filter(n => !gone.includes(n));
    assert.equal(gone.length, 3);
    assert.deepEqual(Object.keys(g.json('G.market')).sort(), left.sort());
    assert.deepEqual(Object.keys(g.json('G.prices')).sort(), left.sort());
    assert.ok(left.includes(spec));
    assert.equal(g.top(), T.drought);
    assert.equal(g.topClass(), 'log-entry bad');
  });

  test(`${name}: drought picks which goods vanish at random`, () => {
    const g = fresh(name);
    const spec = g.run('CITIES.find(c => c.name === G.city).specialty');
    g.run('G.market = {}; G.prices = {}; DRUGS.forEach(d => { G.market[d.name] = 5; G.prices[d.name] = 100; });');
    // Always pick the last remaining candidate.
    g.rig(new Array(20).fill(0.9999));
    g.run("applyEvent('drought')");
    const others = g.json('DRUGS.map(d => d.name)').filter(n => n !== spec);
    const gone = others.slice(others.length - 3);
    const market = Object.keys(g.json('G.market'));
    assert.equal(market.length, 5);
    for (const n of gone) assert.ok(!market.includes(n), n);
    assert.ok(market.includes(others[0]));
  });

  test(`${name}: drought removes only half of a short list, rounding down`, () => {
    const g = fresh(name);
    const spec = g.run('CITIES.find(c => c.name === G.city).specialty');
    const names = g.json('DRUGS.map(d => d.name)').filter(n => n !== spec).slice(0, 2);
    g.ctx.__n = names;
    g.run('G.market = {}; G.prices = {}; __n.forEach(n => { G.market[n] = 5; G.prices[n] = 100; });');
    g.rig([0, 0, 0]);
    g.run("applyEvent('drought')");
    assert.equal(Object.keys(g.json('G.market')).length, 1);
    const one = fresh(name);
    one.ctx.__n = names.slice(0, 1);
    one.run('G.market = {}; G.prices = {}; __n.forEach(n => { G.market[n] = 5; G.prices[n] = 100; });');
    one.run("applyEvent('drought')");
    assert.equal(Object.keys(one.json('G.market')).length, 1);
  });

  /* ───────── mug ───────── */
  test(`${name}: mug takes a random 300..1500 from cash`, () => {
    const g = fresh(name, { cash: 5000 });
    g.rig([0]);
    g.run("applyEvent('mug')");
    assert.equal(g.run('G.cash'), 4700);
    assert.equal(g.top(), T.mug('$300'));
    g.rig([0.9999]);
    g.run("applyEvent('mug')");
    assert.equal(g.run('G.cash'), 3200);
    assert.equal(g.top(), T.mug('$1,500'));
    assert.equal(g.topClass(), 'log-entry bad');
  });

  test(`${name}: mug cannot take more cash than the player has`, () => {
    const g = fresh(name, { cash: 100 });
    g.rig([0.5]);
    g.run("applyEvent('mug')");
    assert.equal(g.run('G.cash'), 0);
    assert.equal(g.top(), T.mug('$100'));
  });

  test(`${name}: mug is blocked 60% of the time when the player has a gun`, () => {
    const g = fresh(name, { cash: 2000, hasGun: true });
    g.rig([0.59]);
    g.run("applyEvent('mug')");
    assert.equal(g.run('G.cash'), 2000);
    assert.equal(g.top(), T.mugBlocked);
    assert.equal(g.topClass(), 'log-entry good');
    // A roll of 0.6 is not below the threshold, so the mugging goes ahead.
    g.rig([0.6, 0]);
    g.run("applyEvent('mug')");
    assert.equal(g.run('G.cash'), 1700);
    // And without a gun the block roll is never made.
    const n = fresh(name, { cash: 2000 });
    n.rig([0]);
    n.run("applyEvent('mug')");
    assert.equal(n.run('G.cash'), 1700);
  });

  /* ───────── find ───────── */
  test(`${name}: find adds 5..25 of a random good with zero average cost`, () => {
    const g = fresh(name, { stash: {}, avgCost: { [drugName(fresh(name), 2)]: 77 } });
    g.rig([ix(2, 8), rv(5, 25, 12)]);
    g.run("applyEvent('find')");
    const d = drugName(g, 2);
    assert.deepEqual(g.json('G.stash'), { [d]: 12 });
    assert.equal(g.json('G.avgCost')[d], 0);
    assert.equal(g.top(), T.find(12, d));
    assert.equal(g.topClass(), 'log-entry good');
  });

  test(`${name}: find dilutes the average cost of goods already held`, () => {
    const g = fresh(name);
    const d = drugName(g, 1);
    g.ctx.__d = d;
    g.run('G.stash[__d] = 10; G.avgCost[__d] = 100;');
    g.rig([ix(1, 8), rv(5, 25, 10)]);
    g.run("applyEvent('find')");
    assert.equal(g.json('G.stash')[d], 20);
    assert.equal(g.json('G.avgCost')[d], 50);
  });

  test(`${name}: find is capped by free space`, () => {
    const g = fresh(name, { coat: 13, stash: { Other: 10 } });
    g.rig([0, rv(5, 25, 20)]);
    g.run("applyEvent('find')");
    assert.equal(g.json('G.stash')[drugName(g, 0)], 3);
    assert.equal(g.top(), T.find(3, drugName(g, 0)));
  });

  test(`${name}: find with a full coat says there is no room and adds nothing`, () => {
    const g = fresh(name, { coat: 10, stash: { Other: 10 } });
    g.rig([0, rv(5, 25, 20)]);
    g.run("applyEvent('find')");
    assert.deepEqual(g.json('G.stash'), { Other: 10 });
    assert.equal(g.top(), T.noRoom);
    assert.equal(g.topClass(), 'log-entry warn');
  });

  /* ───────── shark ───────── */
  test(`${name}: shark with no debt collects nothing`, () => {
    const g = fresh(name, { cash: 1000, debt: 0 });
    g.run("applyEvent('shark')");
    assert.equal(g.run('G.cash'), 1000);
    assert.equal(g.top(), T.sharkNone);
    assert.equal(g.topClass(), 'log-entry warn');
  });

  test(`${name}: shark takes 10..25 percent of the debt, at least $200`, () => {
    let g = fresh(name, { cash: 5000, debt: 10000 });
    g.rig([rv(10, 25, 10)]);
    g.run("applyEvent('shark')");
    assert.equal(g.run('G.cash'), 4000);
    assert.equal(g.top(), T.shark('$1,000', 10));
    assert.equal(g.topClass(), 'log-entry bad');

    g = fresh(name, { cash: 5000, debt: 10000 });
    g.rig([rv(10, 25, 25)]);
    g.run("applyEvent('shark')");
    assert.equal(g.run('G.cash'), 2500);
    assert.equal(g.top(), T.shark('$2,500', 25));

    g = fresh(name, { cash: 5000, debt: 1000 });
    g.rig([rv(10, 25, 10)]);
    g.run("applyEvent('shark')");
    assert.equal(g.run('G.cash'), 4800);
    assert.equal(g.top(), T.shark('$200', 10));
  });

  test(`${name}: shark cannot take more cash than the player has`, () => {
    const g = fresh(name, { cash: 50, debt: 10000 });
    g.rig([rv(10, 25, 20)]);
    g.run("applyEvent('shark')");
    assert.equal(g.run('G.cash'), 0);
    assert.equal(g.top(), T.shark('$50', 20));
  });

  /* ───────── bribe ───────── */
  test(`${name}: bribe costs $200 when the player can pay, exactly $200 included`, () => {
    for (const cash of [200, 5000]) {
      const g = fresh(name, { cash, stash: { A: 10 } });
      g.run("applyEvent('bribe')");
      assert.equal(g.run('G.cash'), cash - 200);
      assert.deepEqual(g.json('G.stash'), { A: 10 });
      assert.equal(g.top(), T.bribeOk);
      assert.equal(g.topClass(), 'log-entry warn');
    }
  });

  test(`${name}: bribe the player cannot afford turns into a bust`, () => {
    const g = fresh(name, { cash: 199, stash: { A: 10 } });
    g.run("applyEvent('bribe')");
    assert.equal(g.run('G.cash'), 199);
    assert.deepEqual(g.json('G.stash'), { A: 5 });
    assert.equal(g.top(), T.bribeFail);
    assert.equal(g.topClass(), 'log-entry bad');
    assert.match(g.logLines()[1], T.bust);
  });

  /* ───────── tip ───────── */
  test(`${name}: tip names the good with the lowest price relative to its base`, () => {
    const g = fresh(name);
    const a = drugName(g, 0), b = drugName(g, 1), c = drugName(g, 2);
    g.ctx.__p = { [a]: drugBase(g, 0) * 2, [b]: drugBase(g, 1) * 0.5, [c]: drugBase(g, 2) * 0.8 };
    g.run('G.prices = __p');
    g.run("applyEvent('tip')");
    assert.equal(g.top(), T.tip(b, '$' + (drugBase(g, 1) * 0.5).toLocaleString()));
    assert.equal(g.topClass(), 'log-entry good');
    // Same prices in the opposite order of listing still pick the cheapest ratio.
    g.ctx.__p = { [c]: drugBase(g, 2) * 0.3, [b]: drugBase(g, 1) * 0.5 };
    g.run('G.prices = __p');
    g.run("applyEvent('tip')");
    assert.equal(g.top(), T.tip(c, '$' + (drugBase(g, 2) * 0.3).toLocaleString()));
  });

  test(`${name}: tip with nothing on the market has nothing useful`, () => {
    const g = fresh(name, { prices: {} });
    g.run("applyEvent('tip')");
    assert.equal(g.top(), T.tipNone);
    assert.equal(g.topClass(), 'log-entry ');
  });

  test(`${name}: an unknown event type changes nothing`, () => {
    const g = fresh(name, { cash: 500 });
    const before = g.logLines().length;
    g.run("applyEvent('nope')");
    assert.equal(g.run('G.cash'), 500);
    assert.equal(g.logLines().length, before);
  });

  /* ───────── showEvent / dismissEvent ───────── */
  test(`${name}: showEvent fills the modal and shows it; dismissEvent hides it and re-renders`, () => {
    const g = fresh(name);
    assert.equal(g.hidden('eventOverlay'), true);
    g.call('showEvent', 'HELLO', 'World msg');
    assert.equal(g.hidden('eventOverlay'), false);
    assert.equal(g.el('eventTitle').textContent, 'HELLO');
    assert.equal(g.el('eventMsg').textContent, 'World msg');
    g.run('G.cash = 4321');
    g.run('dismissEvent()');
    assert.equal(g.hidden('eventOverlay'), true);
    assert.equal(g.el('cashDisplay').textContent, '$4,321');
  });

  test(`${name}: events shown while one is open queue up and appear in order on dismiss`, () => {
    const g = fresh(name);
    g.call('showEvent', 'ONE', 'first');
    g.call('showEvent', 'TWO', 'second');
    g.call('showEvent', 'THREE', 'third');
    assert.equal(g.el('eventTitle').textContent, 'ONE');
    assert.equal(g.el('eventMsg').textContent, 'first');
    g.run('dismissEvent()');
    assert.equal(g.hidden('eventOverlay'), false);
    assert.equal(g.el('eventTitle').textContent, 'TWO');
    assert.equal(g.el('eventMsg').textContent, 'second');
    g.run('dismissEvent()');
    assert.equal(g.hidden('eventOverlay'), false);
    assert.equal(g.el('eventTitle').textContent, 'THREE');
    g.run('dismissEvent()');
    assert.equal(g.hidden('eventOverlay'), true);
  });

  test(`${name}: showEndGameModal shows the final day notice`, () => {
    const g = fresh(name);
    g.run('showEndGameModal()');
    assert.equal(g.hidden('eventOverlay'), false);
    assert.equal(g.el('eventTitle').textContent, name === 'dopewars' ? 'FINAL DAY' : 'LAST DAY!');
    assert.match(g.el('eventMsg').textContent, /^Time's up/);
  });

  /* ───────── maybeLateEvent ───────── */
  const all = { day: 20, hasSupplier: true, supplierBurnedUntil: 0, corneredDrug: null, corneredUntil: 0, tippedCity: null, tippedExpiry: 0 };
  const lateRun = (fields, roll, pick) => {
    const g = fresh(name, { ...all, ...fields });
    const before = g.run('[G.supplierBurnedUntil, !!G.pendingFireSale, G.corneredDrug, G.tippedCity].map(String)');
    g.rig([roll, pick, 0, 0, 0, 0]);
    g.run('maybeLateEvent()');
    const after = g.run('[G.supplierBurnedUntil, !!G.pendingFireSale, G.corneredDrug, G.tippedCity].map(String)');
    const names = ['burned', 'fire', 'cornered', 'tip'];
    const changed = names.filter((n, i) => before[i] !== after[i]);
    assert.ok(changed.length <= 1, changed.join());
    return changed[0] || 'none';
  };

  test(`${name}: maybeLateEvent only fires on a roll of 0.28 or less`, () => {
    assert.equal(lateRun({}, 0.28, 0.99), 'tip');
    assert.equal(lateRun({}, 0.2801, 0.99), 'none');
    assert.equal(lateRun({}, 0.99, 0.99), 'none');
  });

  test(`${name}: maybeLateEvent picks by weight when every event is eligible`, () => {
    // weights: burned 1, fire 3, cornered 2, tip 4 (total 10)
    const picks = [[0, 'burned'], [0.05, 'burned'], [0.1, 'burned'], [0.11, 'fire'], [0.4, 'fire'], [0.41, 'cornered'],
      [0.6, 'cornered'], [0.61, 'tip'], [0.99, 'tip']];
    for (const [p, expect] of picks) assert.equal(lateRun({}, 0, p), expect, `pick ${p}`);
  });

  test(`${name}: late event contact-burned needs a supplier who is not already burned`, () => {
    // Without a supplier only fire(3) cornered(2) tip(4) remain: 0.05 -> r=0.45 -> fire
    assert.equal(lateRun({ hasSupplier: false }, 0, 0.05), 'fire');
    // Already burned (until >= day) is not eligible, burned until the day before is.
    assert.equal(lateRun({ supplierBurnedUntil: 20 }, 0, 0.05), 'fire');
    assert.equal(lateRun({ supplierBurnedUntil: 25 }, 0, 0.05), 'fire');
    assert.equal(lateRun({ supplierBurnedUntil: 19 }, 0, 0.05), 'burned');
  });

  test(`${name}: late event market-cornered is skipped while a corner is still running`, () => {
    // eligible without cornered: burned 1, fire 3, tip 4 (total 8). pick 0.5 -> r=4 -> fire(1+3).. use 0.6 -> r=4.8 -> tip
    const base = { corneredDrug: 'X', corneredUntil: 22 };
    assert.equal(lateRun(base, 0, 0.6), 'tip');
    assert.equal(lateRun({ ...base, corneredUntil: 20 }, 0, 0.6), 'tip'); // day == until: still cornered
    // Corner over (day > until): cornered is back in the mix, pick 0.6 -> r=6 -> cornered
    assert.equal(lateRun({ ...base, corneredUntil: 19 }, 0, 0.6), 'cornered');
  });

  test(`${name}: late event tip-off is skipped while a tip is active`, () => {
    // without tip: burned 1, fire 3, cornered 2 (total 6); 0.99 -> cornered
    assert.equal(lateRun({ tippedCity: 'Somewhere', tippedExpiry: 22 }, 0, 0.99), 'cornered');
  });

  test(`${name}: late event fire sale is always possible`, () => {
    const g = fresh(name, { ...all, hasSupplier: false, corneredDrug: 'X', corneredUntil: 99, tippedCity: 'Y', tippedExpiry: 99 });
    g.rig([0, 0.99, 0, 0, 0, 0]);
    g.run('maybeLateEvent()');
    assert.ok(g.run('G.pendingFireSale'));
    assert.equal(g.hidden('fireSaleOverlay'), false);
  });

  /* ───────── late events ───────── */
  test(`${name}: contact burned lasts through day+2 and says so`, () => {
    const g = fresh(name, { day: 20 });
    g.run('leBurnedContact()');
    assert.equal(g.run('G.supplierBurnedUntil'), 22);
    assert.equal(g.hidden('eventOverlay'), false);
    assert.equal(g.el('eventTitle').textContent, T.burnedTitle);
    assert.match(g.el('eventMsg').textContent, /3 days/);
    assert.equal(g.top(), T.burnedLog);
    assert.equal(g.topClass(), 'log-entry bad');
  });

  test(`${name}: fire sale offer picks a good, 80..150 units, 25-30% of base price`, () => {
    const g = fresh(name, { cash: 100000, coat: 1000 });
    g.rig([ix(3, 8), rv(80, 150, 100), 0.5]);
    g.run('leFireSale()');
    const d = drugName(g, 3), base = drugBase(g, 3);
    const price = Math.round(base * 0.275);
    assert.deepEqual(g.json('G.pendingFireSale'), { drug: d, qty: 100, price });
    assert.equal(g.hidden('fireSaleOverlay'), false);
    const msg = g.el('fireSaleMsg').textContent;
    assert.ok(msg.includes('100 units of ' + d), msg);
    assert.ok(msg.includes('$' + price.toLocaleString() + ' each'), msg);
    assert.ok(msg.includes(`(${Math.round(price / base * 100)}% of `), msg);
    assert.ok(msg.includes('up to 100 units'), msg);
    // Extremes of the price roll.
    g.rig([0, 0, 0]);
    g.run('leFireSale()');
    assert.deepEqual(g.json('G.pendingFireSale'), { drug: drugName(g, 0), qty: 80, price: Math.round(drugBase(g, 0) * 0.25) });
  });

  test(`${name}: fire sale offer tells the player how many units they can afford and carry`, () => {
    // Weed/Bubble Gum is index 5: base 300, price 0.25 -> 75.
    let g = fresh(name, { cash: 750, coat: 1000 });
    g.rig([ix(5, 8), rv(80, 150, 100), 0]);
    g.run('leFireSale()');
    assert.ok(g.el('fireSaleMsg').textContent.includes('up to 10 units'), g.el('fireSaleMsg').textContent);
    g = fresh(name, { cash: 100000, coat: 130, stash: { Other: 100 } });
    g.rig([ix(5, 8), rv(80, 150, 100), 0]);
    g.run('leFireSale()');
    assert.ok(g.el('fireSaleMsg').textContent.includes('up to 30 units'), g.el('fireSaleMsg').textContent);
    g = fresh(name, { cash: 100000, coat: 100 });
    g.rig([ix(5, 8), rv(80, 150, 90), 0]);
    g.run('leFireSale()');
    assert.ok(g.el('fireSaleMsg').textContent.includes('up to 90 units'), g.el('fireSaleMsg').textContent);
  });

  test(`${name}: accepting a fire sale buys the full lot, updates stash, average cost and cash`, () => {
    const d = 'Widget';
    const g = fresh(name, { cash: 10000, coat: 300, stash: {}, avgCost: {}, pendingFireSale: { drug: d, qty: 100, price: 50 } });
    g.run('document.getElementById("fireSaleOverlay").classList.remove("hidden")');
    g.run('acceptFireSale()');
    assert.equal(g.hidden('fireSaleOverlay'), true);
    assert.equal(g.run('G.pendingFireSale'), null);
    assert.equal(g.run('G.cash'), 5000);
    assert.deepEqual(g.json('G.stash'), { [d]: 100 });
    assert.equal(g.json('G.avgCost')[d], 50);
    assert.equal(g.top(), T.fireOk(100, d, '$50'));
    assert.equal(g.topClass(), 'log-entry good');
    assert.equal(g.el('cashDisplay').textContent, '$5,000');
  });

  test(`${name}: accepting a fire sale blends the average cost with goods already held`, () => {
    const d = 'Widget';
    const g = fresh(name, { cash: 10000, coat: 300, stash: { [d]: 20 }, avgCost: { [d]: 80 }, pendingFireSale: { drug: d, qty: 60, price: 50 } });
    g.run('acceptFireSale()');
    assert.equal(g.json('G.stash')[d], 80);
    assert.equal(g.json('G.avgCost')[d], 58); // (80*20 + 50*60) / 80 = 57.5, rounds up
  });

  test(`${name}: accepting a fire sale is limited by free space`, () => {
    const d = 'Widget';
    const g = fresh(name, { cash: 100000, coat: 130, stash: { Other: 100 }, pendingFireSale: { drug: d, qty: 100, price: 50 } });
    g.run('acceptFireSale()');
    assert.equal(g.json('G.stash')[d], 30);
    assert.equal(g.run('G.cash'), 100000 - 1500);
    assert.equal(g.top(), T.fireOk(30, d, '$50'));
  });

  test(`${name}: accepting a fire sale is limited by cash`, () => {
    const d = 'Widget';
    const g = fresh(name, { cash: 1234, coat: 1000, pendingFireSale: { drug: d, qty: 100, price: 50 } });
    g.run('acceptFireSale()');
    assert.equal(g.json('G.stash')[d], 24);
    assert.equal(g.run('G.cash'), 34);
  });

  test(`${name}: accepting a fire sale with no cash or no space buys nothing`, () => {
    const d = 'Widget';
    let g = fresh(name, { cash: 49, coat: 1000, pendingFireSale: { drug: d, qty: 100, price: 50 } });
    g.run('acceptFireSale()');
    assert.deepEqual(g.json('G.stash'), {});
    assert.equal(g.run('G.cash'), 49);
    assert.equal(g.top(), T.fireNo);
    assert.equal(g.topClass(), 'log-entry bad');
    assert.equal(g.hidden('fireSaleOverlay'), true);
    assert.equal(g.run('G.pendingFireSale'), null);

    g = fresh(name, { cash: 9999, coat: 10, stash: { Other: 10 }, pendingFireSale: { drug: d, qty: 100, price: 50 } });
    g.run('acceptFireSale()');
    assert.deepEqual(g.json('G.stash'), { Other: 10 });
    assert.equal(g.run('G.cash'), 9999);
    assert.equal(g.top(), T.fireNo);
  });

  test(`${name}: accepting with no pending offer just closes the modal`, () => {
    const g = fresh(name, { cash: 1000, pendingFireSale: null });
    const before = g.logLines().length;
    g.run('document.getElementById("fireSaleOverlay").classList.remove("hidden")');
    g.run('acceptFireSale()');
    assert.equal(g.hidden('fireSaleOverlay'), true);
    assert.equal(g.run('G.cash'), 1000);
    assert.equal(g.logLines().length, before);
  });

  test(`${name}: declining a fire sale closes the modal, clears the offer and logs it`, () => {
    const g = fresh(name, { cash: 1000, pendingFireSale: { drug: 'Widget', qty: 100, price: 50 } });
    g.run('document.getElementById("fireSaleOverlay").classList.remove("hidden")');
    g.run('declineFireSale()');
    assert.equal(g.hidden('fireSaleOverlay'), true);
    assert.equal(g.run('G.pendingFireSale'), null);
    assert.equal(g.run('G.cash'), 1000);
    assert.deepEqual(g.json('G.stash'), {});
    assert.equal(g.top(), T.fireNoThanks);
    assert.equal(g.topClass(), 'log-entry ');
  });

  test(`${name}: market cornered removes one good for 2 or 3 days`, () => {
    for (const [days, r] of [[2, 0], [3, 0.9999]]) {
      const g = fresh(name, { day: 18 });
      const d = drugName(g, 4);
      g.run('G.market = {}; G.prices = {}; DRUGS.forEach(x => { G.market[x.name] = 5; G.prices[x.name] = 100; });');
      g.rig([ix(4, 8), r]);
      g.run('leMarketCornered()');
      assert.equal(g.run('G.corneredDrug'), d);
      assert.equal(g.run('G.corneredUntil'), 18 + days);
      assert.equal(Object.keys(g.json('G.market')).length, 7);
      assert.equal(Object.keys(g.json('G.prices')).length, 7);
      assert.ok(!(d in g.json('G.market')) && !(d in g.json('G.prices')));
      assert.equal(g.hidden('eventOverlay'), false);
      assert.equal(g.el('eventTitle').textContent, T.cornerTitle);
      assert.ok(g.el('eventMsg').textContent.includes(d), g.el('eventMsg').textContent);
      assert.ok(g.el('eventMsg').textContent.includes(`${days} days`), g.el('eventMsg').textContent);
      assert.equal(g.top(), T.cornerLog(d, days));
      assert.equal(g.topClass(), 'log-entry bad');
    }
  });

  test(`${name}: tip-off targets another city and lasts through day+2`, () => {
    const g = fresh(name, { day: 18 });
    const cities = g.json('CITIES.map(c => c.name)');
    const here = g.run('G.city');
    const others = cities.filter(c => c !== here);
    g.rig([0]);
    g.run('leTipOff()');
    assert.equal(g.run('G.tippedCity'), others[0]);
    assert.equal(g.run('G.tippedExpiry'), 20);
    assert.equal(g.hidden('eventOverlay'), false);
    assert.equal(g.el('eventTitle').textContent, T.tipTitle);
    assert.ok(g.el('eventMsg').textContent.includes(others[0]), g.el('eventMsg').textContent);
    assert.ok(g.el('eventMsg').textContent.includes('2 days'));
    assert.equal(g.top(), T.tipLog(others[0]));
    assert.equal(g.topClass(), 'log-entry warn');
    // The last pick is never the current city.
    g.rig([0.9999]);
    g.run('leTipOff()');
    assert.equal(g.run('G.tippedCity'), others[others.length - 1]);
    assert.notEqual(g.run('G.tippedCity'), here);
  });

  /* ───────── headlines ───────── */
  const HL = "HEADLINES = [{text:'H-SURGE',type:'surge'},{text:'H-DRY',type:'drought'},{text:'H-HEAT',type:'heat'},{text:'H-NEUTRAL',type:'neutral'}];";
  const pickHl = i => ix(i, 4);

  test(`${name}: surge headline raises one good's price by 1.3 to 1.7 times`, () => {
    const g = fresh(name, { prices: { A: 100, B: 200, C: 300 } });
    g.run(HL);
    g.rig([pickHl(0), ix(1, 3), 0.5]);
    g.run('applyHeadline()');
    assert.deepEqual(g.json('G.prices'), { A: 100, B: 300, C: 300 });
    assert.equal(g.top(), '📰 H-SURGE — B prices are up.');
    assert.equal(g.topClass(), 'log-entry headline');
    g.rig([pickHl(0), ix(2, 3), 0]);
    g.run('applyHeadline()');
    assert.equal(g.json('G.prices').C, 390);
    g.rig([pickHl(0), ix(0, 3), 0.9999]);
    g.run('applyHeadline()');
    assert.equal(g.json('G.prices').A, 170);
  });

  test(`${name}: surge headline with an empty market is only news`, () => {
    const g = fresh(name, { prices: {} });
    g.run(HL);
    g.rig([pickHl(0)]);
    g.run('applyHeadline()');
    assert.deepEqual(g.json('G.prices'), {});
    assert.equal(g.top(), '📰 H-SURGE');
    assert.equal(g.topClass(), 'log-entry headline');
  });

  test(`${name}: drought headline removes one non-specialty good from market and prices`, () => {
    const g = fresh(name);
    g.run(HL);
    const spec = g.run('CITIES.find(c => c.name === G.city).specialty');
    g.run('G.market = {}; G.prices = {}; DRUGS.forEach(x => { G.market[x.name] = 5; G.prices[x.name] = 100; });');
    const pool = g.json('DRUGS.map(d => d.name)').filter(n => n !== spec);
    g.rig([pickHl(1), ix(2, pool.length)]);
    g.run('applyHeadline()');
    const gone = pool[2];
    assert.ok(!(gone in g.json('G.market')));
    assert.ok(!(gone in g.json('G.prices')));
    assert.equal(Object.keys(g.json('G.market')).length, 7);
    assert.equal(Object.keys(g.json('G.prices')).length, 7);
    assert.ok(spec in g.json('G.prices'));
    assert.equal(g.top(), `📰 H-DRY — ${gone} ${T.dryHeadline}.`);
    assert.equal(g.topClass(), 'log-entry headline');
    // The last roll still lands on a non-specialty good.
    const h = fresh(name);
    h.run(HL);
    h.run('G.market = {}; G.prices = {}; DRUGS.forEach(x => { G.market[x.name] = 5; G.prices[x.name] = 100; });');
    h.rig([pickHl(1), 0.9999]);
    h.run('applyHeadline()');
    assert.ok(spec in h.json('G.prices'));
    assert.ok(!(pool[pool.length - 1] in h.json('G.prices')));
  });

  test(`${name}: drought headline falls back to the specialty when it is the only good left`, () => {
    const g = fresh(name);
    g.run(HL);
    const spec = g.run('CITIES.find(c => c.name === G.city).specialty');
    g.ctx.__s = spec;
    g.run('G.market = {}; G.prices = {}; G.market[__s] = 5; G.prices[__s] = 100;');
    g.rig([pickHl(1), 0]);
    g.run('applyHeadline()');
    assert.deepEqual(g.json('G.prices'), {});
    assert.deepEqual(g.json('G.market'), {});
    assert.equal(g.top(), `📰 H-DRY — ${spec} ${T.dryHeadline}.`);
  });

  test(`${name}: drought headline with an empty market is only news`, () => {
    const g = fresh(name, { prices: {} });
    g.run(HL);
    g.rig([pickHl(1)]);
    g.run('applyHeadline()');
    assert.equal(g.top(), '📰 H-DRY');
  });

  test(`${name}: heat headline makes it a heat day`, () => {
    const g = fresh(name, { heatDay: false });
    g.run(HL);
    g.rig([pickHl(2)]);
    g.run('applyHeadline()');
    assert.equal(g.run('G.heatDay'), true);
    assert.equal(g.top(), `📰 H-HEAT — ${T.heatHeadline}`);
    assert.equal(g.topClass(), 'log-entry headline');
  });

  test(`${name}: neutral headline is only news`, () => {
    const g = fresh(name, { prices: { A: 100 }, heatDay: false });
    g.run(HL);
    g.rig([pickHl(3)]);
    g.run('applyHeadline()');
    assert.equal(g.run('G.heatDay'), false);
    assert.deepEqual(g.json('G.prices'), { A: 100 });
    assert.equal(g.top(), '📰 H-NEUTRAL');
    assert.equal(g.topClass(), 'log-entry headline');
  });

  test(`${name}: real headlines each have a text and a known type`, () => {
    const g = fresh(name);
    const hs = g.json('HEADLINES');
    assert.ok(hs.length > 0);
    for (const h of hs) {
      assert.ok(h.text && h.text.length > 0);
      assert.ok(['surge', 'drought', 'heat', 'neutral'].includes(h.type), h.type);
    }
  });

  test(`${name}: find can pick the last good and a full 25 units`, () => {
    const g = fresh(name, { coat: 1000 });
    g.rig([0.9999, 0.9999]);
    g.run("applyEvent('find')");
    assert.deepEqual(g.json('G.stash'), { [drugName(g, 7)]: 25 });
  });

  test(`${name}: find with exactly one free slot still adds one unit`, () => {
    const g = fresh(name, { coat: 11, stash: { Other: 10 } });
    g.rig([0, rv(5, 25, 20)]);
    g.run("applyEvent('find')");
    assert.equal(g.json('G.stash')[drugName(g, 0)], 1);
  });

  test(`${name}: find with no recorded average cost for goods held sets it to zero`, () => {
    const g = fresh(name, { coat: 1000, avgCost: {} });
    g.ctx.__d = drugName(g, 0);
    g.run('G.stash[__d] = 10');
    g.rig([0, rv(5, 25, 10)]);
    g.run("applyEvent('find')");
    assert.equal(g.json('G.avgCost')[drugName(g, 0)], 0);
  });

  test(`${name}: shark collects from a debt of just $1 (minimum $200)`, () => {
    const g = fresh(name, { cash: 1000, debt: 1 });
    g.rig([0]);
    g.run("applyEvent('shark')");
    assert.equal(g.run('G.cash'), 800);
  });

  test(`${name}: tip prefers the first good when two have the same price ratio`, () => {
    const g = fresh(name);
    g.ctx.__p = { [drugName(g, 1)]: drugBase(g, 1), [drugName(g, 0)]: drugBase(g, 0) };
    g.run('G.prices = __p');
    g.run("applyEvent('tip')");
    assert.equal(g.top(), T.tip(drugName(g, 0), '$' + drugBase(g, 0).toLocaleString()));
  });

  test(`${name}: fire sale lot can be a full 150 units`, () => {
    const g = fresh(name, { coat: 1000, cash: 100000 });
    g.rig([0, 0.9999, 0]);
    g.run('leFireSale()');
    assert.equal(g.json('G.pendingFireSale').qty, 150);
  });

  test(`${name}: accepting a fire sale for a single unit works`, () => {
    const g = fresh(name, { cash: 50, coat: 1000, pendingFireSale: { drug: 'Widget', qty: 100, price: 50 } });
    g.run('acceptFireSale()');
    assert.deepEqual(g.json('G.stash'), { Widget: 1 });
    assert.equal(g.run('G.cash'), 0);
  });

  test(`${name}: accepting a fire sale with no recorded average cost for goods held`, () => {
    const g = fresh(name, { cash: 10000, coat: 1000, stash: { Widget: 10 }, avgCost: {}, pendingFireSale: { drug: 'Widget', qty: 10, price: 50 } });
    g.run('acceptFireSale()');
    assert.equal(g.json('G.avgCost').Widget, 25);
  });

  test(`${name}: drought headline works when the current city is unknown`, () => {
    const g = fresh(name, { city: 'Nowhere' });
    g.run(HL);
    g.run('G.market = {}; G.prices = {}; DRUGS.forEach(x => { G.market[x.name] = 5; G.prices[x.name] = 100; });');
    g.rig([pickHl(1), 0]);
    g.run('applyHeadline()');
    assert.equal(Object.keys(g.json('G.prices')).length, 7);
  });
}
