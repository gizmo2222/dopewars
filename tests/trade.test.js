'use strict';
// Market generation, buying, selling and the supplier deal.
const test = require('node:test');
const assert = require('node:assert/strict');
const { newGame, GAMES } = require('./harness');

const noEvents = { events: 0 };
const J = JSON.stringify;

// Starts a game and returns it with handy facts about the current city and drug list.
function setup(name) {
  const g = newGame(name, noEvents);
  const drugs = g.run('DRUGS.map(d => ({ name: d.name, base: d.base, variance: d.variance, spike: !!d.spike }))');
  const specialty = g.run('CITIES.find(c => c.name === G.city).specialty');
  return { g, drugs, specialty };
}

// Builds the Math.random() sequence generateMarket consumes, drug by drug.
// plan[name] = { skip, spike, price, qty }: raw random values (unset = 0.5).
function rigMarket(g, drugs, specialty, plan = {}, cornered = null) {
  const seq = [];
  const skipChance = g.run('G.hasBurner') ? 0.05 : 0.15;
  for (const d of drugs) {
    if (d.name === cornered) continue;
    const p = plan[d.name] || {};
    const isSpec = d.name === specialty;
    if (!isSpec) {
      const skip = p.skip ?? 0.5;
      seq.push(skip);
      if (skip < skipChance) continue;
    }
    if (d.spike) seq.push(p.spike ?? 0.5);
    seq.push(p.price ?? 0.5); // rnd() roll for a spike, the variance roll otherwise
    seq.push(p.qty ?? 0.5);
  }
  g.rig(seq);
}

const formula = (d, r, spec) => {
  const p = Math.round(d.base * (0.5 + r * d.variance * 2));
  return spec ? Math.round(p * 0.8) : p;
};

function stock(g, name, price, qty) {
  g.run(`G.prices[${J(name)}] = ${price}; G.market[${J(name)}] = ${qty};`);
}
const setQty = (g, id, v) => { g.el(id).value = String(v); };
const lastLog = g => g.logLines()[0];
const inObj = (g, obj, key) => g.run(`${J(key)} in ${obj}`);

for (const name of GAMES) {
  // ---------- generateMarket ----------
  test(`${name}: generateMarket with mid rolls gives formula prices and stock`, () => {
    const { g, drugs, specialty } = setup(name);
    rigMarket(g, drugs, specialty);
    g.run('generateMarket()');
    for (const d of drugs) {
      const spec = d.name === specialty;
      assert.equal(g.run(`G.prices[${J(d.name)}]`), formula(d, 0.5, spec), d.name + ' price');
      assert.equal(g.run(`G.market[${J(d.name)}]`), spec ? 90 : 35, d.name + ' stock');
    }
  });

  test(`${name}: generateMarket prices and stock stay in range over many markets`, () => {
    const { g, drugs } = setup(name);
    const cities = g.run('CITIES.map(c => c.name)');
    for (let i = 0; i < 300; i++) {
      g.run(`G.city = ${J(cities[i % cities.length])}; G.day = ${1 + i}; generateMarket()`);
      const spec = g.run('CITIES.find(c => c.name === G.city).specialty');
      const prices = g.run('G.prices'), market = g.run('G.market');
      for (const d of drugs) {
        const isSpec = d.name === spec;
        if (isSpec) assert.ok(d.name in prices, 'specialty always present');
        if (!(d.name in prices)) { assert.ok(!(d.name in market)); continue; }
        const lo = Math.round(Math.round(d.base * 0.5) * (isSpec ? 0.8 : 1));
        const hi = d.spike ? Math.round(d.base * 3.5) : Math.round(d.base * (0.5 + d.variance * 2));
        assert.ok(prices[d.name] >= lo - 1 && prices[d.name] <= hi, `${d.name} ${prices[d.name]} in [${lo},${hi}]`);
        assert.ok(market[d.name] >= (isSpec ? 60 : 10), 'stock lower bound');
      }
    }
  });

  test(`${name}: a non-specialty drug can be out of stock, the specialty never is`, () => {
    const { g, drugs, specialty } = setup(name);
    const other = drugs.find(d => d.name !== specialty).name;
    rigMarket(g, drugs, specialty, { [other]: { skip: 0.1 } });
    g.run('generateMarket()');
    assert.equal(inObj(g, 'G.prices', other), false);
    assert.equal(inObj(g, 'G.market', other), false);
    assert.equal(inObj(g, 'G.prices', specialty), true);
    assert.equal(g.run('Object.keys(G.prices).length'), drugs.length - 1);
  });

  test(`${name}: skip chance is 15% normally and 5% with a burner phone`, () => {
    for (const burner of [false, true]) {
      const { g, drugs, specialty } = setup(name);
      g.run(`G.hasBurner = ${burner}`);
      const other = drugs.find(d => d.name !== specialty).name;
      // 0.10 is below 0.15 (skipped) but above 0.05 (kept)
      rigMarket(g, drugs, specialty, { [other]: { skip: 0.1 } });
      g.run('generateMarket()');
      assert.equal(inObj(g, 'G.prices', other), burner, `burner=${burner}`);
    }
    const { g, drugs, specialty } = setup(name);
    const other = drugs.find(d => d.name !== specialty).name;
    rigMarket(g, drugs, specialty, { [other]: { skip: 0.16 } });
    g.run('generateMarket()');
    assert.equal(inObj(g, 'G.prices', other), true);
  });

  test(`${name}: the specialty is priced 20% under the base formula`, () => {
    const { g, drugs, specialty } = setup(name);
    rigMarket(g, drugs, specialty, { [specialty]: { price: 0.9 } });
    g.run('generateMarket()');
    const d = drugs.find(x => x.name === specialty);
    const full = Math.round(d.base * (0.5 + 0.9 * d.variance * 2));
    assert.equal(g.run(`G.prices[${J(specialty)}]`), Math.round(full * 0.8));
  });

  test(`${name}: price spike and crash ends of the roll range`, () => {
    const { g, drugs, specialty } = setup(name);
    const sp = drugs.find(d => d.spike);
    assert.ok(sp && sp.name !== specialty);
    const q = J(sp.name);
    // spike: roll < 0.05, then rnd(2x, 3.5x)
    rigMarket(g, drugs, specialty, { [sp.name]: { spike: 0.01, price: 0 } });
    g.run('generateMarket()');
    assert.equal(g.run(`G.prices[${q}]`), Math.round(sp.base * 2));
    rigMarket(g, drugs, specialty, { [sp.name]: { spike: 0.01, price: 0.999999 } });
    g.run('generateMarket()');
    assert.equal(g.run(`G.prices[${q}]`), Math.round(sp.base * 3.5));
    // no spike at 0.05 or above: ordinary formula, crash at roll 0
    rigMarket(g, drugs, specialty, { [sp.name]: { spike: 0.05, price: 0 } });
    g.run('generateMarket()');
    assert.equal(g.run(`G.prices[${q}]`), Math.round(sp.base * 0.5));
    rigMarket(g, drugs, specialty, { [sp.name]: { spike: 0.9, price: 0.999999 } });
    g.run('generateMarket()');
    assert.equal(g.run(`G.prices[${q}]`), formula(sp, 0.999999, false));
  });

  test(`${name}: only the flagged drug rolls for a spike`, () => {
    const { g, drugs, specialty } = setup(name);
    const plain = drugs.find(d => !d.spike && d.name !== specialty);
    rigMarket(g, drugs, specialty, { [plain.name]: { price: 0.01 } });
    g.run('generateMarket()');
    assert.equal(g.run(`G.prices[${J(plain.name)}]`), formula(plain, 0.01, false));
  });

  test(`${name}: supply grows with days since the last visit, capped`, () => {
    const { g, drugs, specialty } = setup(name);
    const other = drugs.find(d => d.name !== specialty).name;
    const cases = [[0, 0, 0], [1, 8, 12], [5, 40, 60], [10, 80, 120], [30, 80, 120]];
    for (const [days, accN, accS] of cases) {
      g.run(`G.day = 40; G.lastVisit[G.city] = ${40 - days};`);
      if (days === 0) g.run('delete G.lastVisit[G.city]');
      rigMarket(g, drugs, specialty);
      g.run('generateMarket()');
      assert.equal(g.run(`G.market[${J(other)}]`), 35 + accN, `normal after ${days} days`);
      assert.equal(g.run(`G.market[${J(specialty)}]`), 90 + accS, `specialty after ${days} days`);
      assert.equal(g.run('G.lastVisit[G.city]'), 40);
    }
  });

  test(`${name}: a cornered drug is missing until the corner expires`, () => {
    const { g, drugs, specialty } = setup(name);
    const c = drugs.find(d => d.name !== specialty).name;
    g.run(`G.day = 5; G.corneredDrug = ${J(c)}; G.corneredUntil = 5;`);
    rigMarket(g, drugs, specialty, {}, c);
    g.run('generateMarket()');
    assert.equal(inObj(g, 'G.prices', c), false);
    assert.equal(g.run('G.corneredDrug'), c);
    g.run('G.day = 6');
    rigMarket(g, drugs, specialty);
    g.run('generateMarket()');
    assert.equal(inObj(g, 'G.prices', c), true);
    assert.equal(g.run('G.corneredDrug'), null);
    assert.equal(g.run('G.corneredUntil'), 0);
  });

  test(`${name}: generateMarket keeps the old prices in prevPrices`, () => {
    const { g, drugs, specialty } = setup(name);
    const before = g.run('({ ...G.prices })');
    rigMarket(g, drugs, specialty);
    g.run('generateMarket()');
    assert.deepEqual(g.run('({ ...G.prevPrices })'), before);
    const second = g.run('({ ...G.prices })');
    rigMarket(g, drugs, specialty);
    g.run('generateMarket()');
    assert.deepEqual(g.run('({ ...G.prevPrices })'), second);
  });

  // ---------- calcMaxQty ----------
  test(`${name}: calcMaxQty is the smallest of stock, space and what cash buys`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name;
    g.run('G.coat = 100; G.cash = 1000;');
    stock(g, n, 100, 50);
    assert.equal(g.call('calcMaxQty', n), 10, 'cash limit');
    g.run('G.cash = 1099');
    assert.equal(g.call('calcMaxQty', n), 10, 'cash is floored');
    g.run('G.cash = 100000');
    assert.equal(g.call('calcMaxQty', n), 50, 'stock limit');
    g.run(`G.stash = { [${J(drugs[1].name)}]: 70 }`);
    assert.equal(g.call('calcMaxQty', n), 30, 'coat space counts everything carried');
    g.run('G.coat = 70');
    assert.equal(g.call('calcMaxQty', n), 0, 'full coat');
  });

  test(`${name}: calcMaxQty is 0 with no price, or no stock`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name;
    g.run(`delete G.prices[${J(n)}]; G.market[${J(n)}] = 20;`);
    assert.equal(g.call('calcMaxQty', n), 0);
    stock(g, n, 10, 0);
    assert.equal(g.call('calcMaxQty', n), 0);
    g.run(`delete G.market[${J(n)}]`);
    assert.equal(g.call('calcMaxQty', n), 0);
  });

  // ---------- executeBuy ----------
  test(`${name}: executeBuy updates cash, stash, stock and logs the purchase`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name, q = J(n);
    g.run('G.cash = 5000');
    stock(g, n, 100, 10);
    g.call('executeBuy', n, 4);
    assert.equal(g.run('G.cash'), 4600);
    assert.equal(g.run(`G.stash[${q}]`), 4);
    assert.equal(g.run(`G.market[${q}]`), 6);
    assert.equal(g.run(`G.avgCost[${q}]`), 100);
    assert.match(lastLog(g), /Bought 4x .* @ \$100 /);
    assert.match(lastLog(g), /\(avg cost: \$100\)/);
  });

  test(`${name}: buying all the stock removes the item from the market`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name;
    g.run('G.cash = 5000');
    stock(g, n, 100, 10);
    g.call('executeBuy', n, 10);
    assert.equal(inObj(g, 'G.market', n), false);
    assert.equal(g.run(`G.stash[${J(n)}]`), 10);
  });

  test(`${name}: average cost is the weighted mean after repeated buys`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name, q = J(n);
    g.run('G.cash = 100000; G.coat = 1000');
    stock(g, n, 100, 50);
    g.call('executeBuy', n, 3);
    stock(g, n, 200, 50);
    g.call('executeBuy', n, 2);
    assert.equal(g.run(`G.avgCost[${q}]`), 140, '(300+400)/5');
    assert.match(lastLog(g), /\(avg cost: \$140\)/);
    stock(g, n, 151, 50);
    g.call('executeBuy', n, 1); // 851/6 = 141.83 rounds to 142
    assert.equal(g.run(`G.avgCost[${q}]`), 142);
    assert.equal(g.run(`G.stash[${q}]`), 6);
    assert.equal(g.run('G.cash'), 100000 - 300 - 400 - 151);
  });

  test(`${name}: executeBuy refuses zero or negative quantity and a missing price`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name, q = J(n);
    g.run('G.cash = 5000');
    stock(g, n, 100, 10);
    for (const qty of [0, -3]) {
      g.call('executeBuy', n, qty);
      assert.equal(g.run('G.cash'), 5000);
      assert.equal(inObj(g, 'G.stash', n), false);
      assert.equal(g.run(`G.market[${q}]`), 10);
      assert.match(lastLog(g), /^(Cannot|Can't) buy/);
    }
    g.run(`delete G.prices[${q}]`);
    g.call('executeBuy', n, 2);
    assert.equal(g.run('G.cash'), 5000);
    assert.equal(inObj(g, 'G.stash', n), false);
    assert.match(lastLog(g), /^(Cannot|Can't) buy/);
  });

  // ---------- buyDrug / buyMax ----------
  test(`${name}: buyDrug buys the quantity typed in the box`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name;
    g.run('G.cash = 5000');
    stock(g, n, 100, 10);
    g.run('renderAll()');
    setQty(g, 'qty_' + n, 3);
    g.call('buyDrug', n);
    assert.equal(g.run(`G.stash[${J(n)}]`), 3);
    assert.equal(g.run('G.cash'), 4700);
  });

  test(`${name}: buyDrug treats a blank or bad box as 1 and caps at the max`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name, q = J(n);
    g.run('G.cash = 350');
    stock(g, n, 100, 10);
    g.run('renderAll()');
    setQty(g, 'qty_' + n, '');
    g.call('buyDrug', n);
    assert.equal(g.run(`G.stash[${q}]`), 1);
    g.run('renderAll()');
    setQty(g, 'qty_' + n, 'abc');
    g.call('buyDrug', n);
    assert.equal(g.run(`G.stash[${q}]`), 2);
    g.run('renderAll()');
    setQty(g, 'qty_' + n, 99);
    g.call('buyDrug', n); // cash 150 -> only 1 more
    assert.equal(g.run(`G.stash[${q}]`), 3);
    assert.equal(g.run('G.cash'), 50);
  });

  test(`${name}: buyDrug with no cash logs a failure and changes nothing`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name;
    g.run('G.cash = 50');
    stock(g, n, 100, 10);
    g.run('renderAll()');
    setQty(g, 'qty_' + n, 5);
    g.call('buyDrug', n);
    assert.equal(g.run('G.cash'), 50);
    assert.equal(inObj(g, 'G.stash', n), false);
    assert.match(lastLog(g), /^(Cannot|Can't) buy/);
  });

  test(`${name}: buyMax buys as much as cash, space and stock allow`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name, q = J(n);
    g.run('G.cash = 1050; G.coat = 100');
    stock(g, n, 100, 50);
    g.call('buyMax', n);
    assert.equal(g.run(`G.stash[${q}]`), 10);
    assert.equal(g.run('G.cash'), 50);
    assert.equal(g.run(`G.market[${q}]`), 40);
  });

  test(`${name}: buyMax with nothing affordable logs one failure`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name;
    g.run('G.cash = 99');
    stock(g, n, 100, 50);
    const before = g.logLines().length;
    g.call('buyMax', n);
    assert.equal(g.run('G.cash'), 99);
    assert.equal(inObj(g, 'G.stash', n), false);
    assert.equal(g.logLines().length, before + 1);
    assert.match(lastLog(g), /^(Cannot|Can't) buy/);
  });

  // ---------- sellDrug ----------
  test(`${name}: a partial sale pays price times quantity and keeps the rest`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name, q = J(n);
    g.run(`G.cash = 0; G.stash = { [${q}]: 10 }; G.avgCost = { [${q}]: 80 };`);
    stock(g, n, 120, 5);
    g.run('renderAll()');
    setQty(g, 'sqty_' + n, 4);
    g.call('sellDrug', n);
    assert.equal(g.run('G.cash'), 480);
    assert.equal(g.run(`G.stash[${q}]`), 6);
    assert.equal(g.run(`G.avgCost[${q}]`), 80, 'avg cost unchanged by a partial sale');
    assert.match(lastLog(g), /Sold 4x .* @ \$120 /);
  });

  test(`${name}: selling the whole stack removes stash and avgCost`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name, q = J(n);
    g.run(`G.cash = 10; G.stash = { [${q}]: 7 }; G.avgCost = { [${q}]: 80 };`);
    stock(g, n, 120, 5);
    g.run('renderAll()');
    setQty(g, 'sqty_' + n, 7);
    g.call('sellDrug', n);
    assert.equal(g.run('G.cash'), 850);
    assert.equal(inObj(g, 'G.stash', n), false);
    assert.equal(inObj(g, 'G.avgCost', n), false);
  });

  test(`${name}: selling more than you hold sells what you have; blank box sells 1`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name, q = J(n);
    g.run(`G.cash = 0; G.stash = { [${q}]: 3 }; G.avgCost = { [${q}]: 80 };`);
    stock(g, n, 100, 5);
    g.run('renderAll()');
    setQty(g, 'sqty_' + n, '');
    g.call('sellDrug', n);
    assert.equal(g.run('G.cash'), 100);
    assert.equal(g.run(`G.stash[${q}]`), 2);
    g.run('renderAll()');
    setQty(g, 'sqty_' + n, 50);
    g.call('sellDrug', n);
    assert.equal(g.run('G.cash'), 300);
    assert.equal(inObj(g, 'G.stash', n), false);
    assert.match(lastLog(g), /Sold 2x /);
  });

  test(`${name}: selling does not change market stock`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name, q = J(n);
    g.run(`G.stash = { [${q}]: 3 };`);
    stock(g, n, 100, 5);
    g.run('renderAll()');
    setQty(g, 'sqty_' + n, 3);
    g.call('sellDrug', n);
    assert.equal(g.run(`G.market[${q}]`), 5);
  });

  test(`${name}: sellDrug refuses when you hold none`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name, q = J(n);
    g.run(`G.cash = 0; G.stash = { [${q}]: 1 };`);
    stock(g, n, 100, 5);
    g.run('renderAll()');
    g.run('G.stash = {}'); // the box still exists, the stack is gone
    g.call('sellDrug', n);
    assert.equal(g.run('G.cash'), 0);
    assert.match(lastLog(g), /have that/);
  });

  test(`${name}: sellDrug refuses when nobody buys it today`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name, q = J(n);
    g.run(`G.cash = 0; G.stash = { [${q}]: 2 };`);
    stock(g, n, 100, 5);
    g.run('renderAll()');
    g.run(`delete G.prices[${q}]`);
    g.call('sellDrug', n);
    assert.equal(g.run('G.cash'), 0);
    assert.equal(g.run(`G.stash[${q}]`), 2);
    assert.match(lastLog(g), /(No buyers|Nobody's buying)/);
  });

  test(`${name}: supplier-bought goods cannot be sold in the same city`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name, q = J(n);
    g.run(`G.cash = 0; G.stash = { [${q}]: 3 }; G.supplierBoughtDrug = ${q};`);
    stock(g, n, 100, 5);
    g.run('renderAll()');
    setQty(g, 'sqty_' + n, 3);
    g.call('sellDrug', n);
    assert.equal(g.run('G.cash'), 0);
    assert.equal(g.run(`G.stash[${q}]`), 3);
    assert.match(lastLog(g), /Can't sell/);
    // a different item still sells
    const other = drugs[1].name;
    g.run(`G.stash[${J(other)}] = 2`);
    stock(g, other, 50, 5);
    g.run('renderAll()');
    setQty(g, 'sqty_' + other, 2);
    g.call('sellDrug', other);
    assert.equal(g.run('G.cash'), 100);
  });

  // ---------- supplierBuy ----------
  const supplier = (g, drug, { price = 100, stockQty = 40, cash = 100000, coat = 100 } = {}) => {
    g.run(`G.hasSupplier = true; G.cash = ${cash}; G.coat = ${coat}; G.supplierBurnedUntil = 0; G.supplierUsedToday = false; G.supplierBoughtDrug = null;`);
    stock(g, drug, price, stockQty);
  };

  test(`${name}: supplierBuy without a supplier does nothing`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name;
    supplier(g, n);
    g.run('G.hasSupplier = false');
    g.call('supplierBuy', n);
    assert.equal(g.run('G.cash'), 100000);
    assert.equal(inObj(g, 'G.stash', n), false);
    assert.equal(g.run('G.supplierUsedToday'), false);
    assert.equal(g.run('G.supplierBoughtDrug'), null);
    assert.equal(g.run(`G.market[${J(n)}]`), 40);
    assert.equal(lastLog(g), name === 'dopewars' ? 'No supplier contact.' : "You don't have a club card.");
  });

  test(`${name}: supplierBuy takes half the stock at 25% off`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name, q = J(n);
    supplier(g, n);
    g.call('supplierBuy', n);
    assert.equal(g.run(`G.stash[${q}]`), 20, 'half of 40');
    assert.equal(g.run('G.cash'), 100000 - 20 * 75);
    assert.equal(g.run(`G.market[${q}]`), 20);
    assert.equal(g.run(`G.prices[${q}]`), 100, 'market price restored');
    assert.equal(g.run(`G.avgCost[${q}]`), 75);
    assert.equal(g.run('G.supplierUsedToday'), true);
    assert.equal(g.run('G.supplierBoughtDrug'), n);
    assert.match(lastLog(g), /20x .* at \$75 \(25% off\)/);
  });

  test(`${name}: supplierBuy rounds the discount price and halves odd stock down`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name;
    supplier(g, n, { price: 101, stockQty: 15 });
    g.call('supplierBuy', n);
    assert.equal(g.run(`G.stash[${J(n)}]`), 7, 'floor(15/2)');
    assert.equal(g.run('G.cash'), 100000 - 7 * 76, 'round(101*0.75)=76');
  });

  test(`${name}: supplierBuy is limited by coat space`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name;
    supplier(g, n, { coat: 12 });
    g.run(`G.stash = { [${J(drugs[1].name)}]: 5 }`);
    g.call('supplierBuy', n);
    assert.equal(g.run(`G.stash[${J(n)}]`), 7, 'space 12-5');
  });

  test(`${name}: supplierBuy is limited by cash`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name;
    supplier(g, n, { cash: 760 }); // 760/75 = 10.13
    g.call('supplierBuy', n);
    assert.equal(g.run(`G.stash[${J(n)}]`), 10);
    assert.equal(g.run('G.cash'), 10);
  });

  test(`${name}: supplierBuy can only be used once a day`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name;
    supplier(g, n);
    g.call('supplierBuy', n);
    const cash = g.run('G.cash');
    g.call('supplierBuy', n);
    assert.equal(g.run('G.cash'), cash);
    assert.equal(g.run(`G.stash[${J(n)}]`), 20);
    assert.match(lastLog(g), /Already used/);
  });

  test(`${name}: supplierBuy is blocked while the contact is burned`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name;
    supplier(g, n);
    g.run('G.day = 5; G.supplierBurnedUntil = 7');
    g.call('supplierBuy', n);
    assert.equal(inObj(g, 'G.stash', n), false);
    assert.match(lastLog(g), /3 day\(s\) left/);
    g.run('G.supplierBurnedUntil = 5');
    g.call('supplierBuy', n);
    assert.match(lastLog(g), /1 day\(s\) left/, 'burned through today inclusive');
    assert.equal(inObj(g, 'G.stash', n), false);
    g.run('G.supplierBurnedUntil = 4');
    g.call('supplierBuy', n);
    assert.equal(g.run(`G.stash[${J(n)}]`), 20);
  });

  test(`${name}: supplierBuy fails with no price, thin supply, or no cash or space`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name;
    supplier(g, n);
    g.run(`delete G.prices[${J(n)}]`);
    g.call('supplierBuy', n);
    assert.equal(g.run('G.supplierUsedToday'), false);
    assert.match(lastLog(g), /(No market price|Nobody's trading)/);
    stock(g, n, 100, 1); // floor(1/2) = 0
    g.call('supplierBuy', n);
    assert.equal(g.run('G.supplierUsedToday'), false);
    assert.match(lastLog(g), /Not enough supply/);
    stock(g, n, 100, 40);
    g.run('G.cash = 74');
    g.call('supplierBuy', n);
    assert.match(lastLog(g), /Not enough (cash|coins)/);
    g.run('G.cash = 100000; G.coat = 0');
    g.call('supplierBuy', n);
    assert.match(lastLog(g), /Not enough (cash|coins)/);
    assert.equal(g.run('G.supplierUsedToday'), false);
    assert.equal(inObj(g, 'G.stash', n), false);
    assert.equal(g.run('G.cash'), 100000);
  });

  test(`${name}: supplierBuy blends into the average cost of existing stock`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name, q = J(n);
    supplier(g, n, { price: 100, stockQty: 20 });
    g.run(`G.stash = { [${q}]: 10 }; G.avgCost = { [${q}]: 125 };`);
    g.call('supplierBuy', n); // buys 10 at 75
    assert.equal(g.run(`G.stash[${q}]`), 20);
    assert.equal(g.run(`G.avgCost[${q}]`), 100);
  });

  // ---------- boundaries ----------
  test(`${name}: a skip roll of exactly 15% keeps the drug`, () => {
    const { g, drugs, specialty } = setup(name);
    const other = drugs.find(d => d.name !== specialty).name;
    rigMarket(g, drugs, specialty, { [other]: { skip: 0.15 } });
    g.run('generateMarket()');
    assert.equal(inObj(g, 'G.prices', other), true);
  });

  test(`${name}: buying leaves one in stock when one is left over`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name;
    g.run('G.cash = 5000');
    stock(g, n, 100, 5);
    g.call('executeBuy', n, 4);
    assert.equal(g.run(`G.market[${J(n)}]`), 1);
  });

  test(`${name}: buyMax buys a single unit when only one is possible`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name;
    g.run('G.cash = 150');
    stock(g, n, 100, 50);
    g.call('buyMax', n);
    assert.equal(g.run(`G.stash[${J(n)}]`), 1);
    assert.equal(g.run('G.cash'), 50);
  });

  test(`${name}: selling leaves a stack of one in the stash`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name, q = J(n);
    g.run(`G.cash = 0; G.stash = { [${q}]: 3 }; G.avgCost = { [${q}]: 80 };`);
    stock(g, n, 100, 5);
    g.run('renderAll()');
    setQty(g, 'sqty_' + n, 2);
    g.call('sellDrug', n);
    assert.equal(g.run(`G.stash[${q}]`), 1);
    assert.equal(g.run(`G.avgCost[${q}]`), 80);
  });

  test(`${name}: supplierBuy works with exactly 2 in stock and cash for exactly one`, () => {
    const { g, drugs } = setup(name);
    const n = drugs[0].name;
    supplier(g, n, { stockQty: 2, cash: 75 });
    g.call('supplierBuy', n);
    assert.equal(g.run(`G.stash[${J(n)}]`), 1);
    assert.equal(g.run('G.cash'), 0);
    assert.equal(g.run('G.supplierUsedToday'), true);
  });

  for (const bad of ['0', '-2']) {
    test(`${name}: a quantity of ${bad} is rejected when buying and selling`, () => {
      const { g, drugs } = setup(name);
      const n = drugs[0].name, q = J(n);
      g.run(`G.cash = 5000; G.stash = { [${q}]: 3 }; G.avgCost = { [${q}]: 80 };`);
      stock(g, n, 100, 10);
      g.run('renderAll()');
      setQty(g, 'qty_' + n, bad);
      g.call('buyDrug', n);
      assert.match(lastLog(g), /Enter a quantity of 1 or more/);
      assert.equal(g.run('G.cash'), 5000);
      assert.equal(g.run(`G.stash[${q}]`), 3);
      assert.equal(g.run(`G.market[${q}]`), 10);
      g.run('addLog("marker", "warn")');
      setQty(g, 'sqty_' + n, bad);
      g.call('sellDrug', n);
      assert.match(lastLog(g), /Enter a quantity of 1 or more/);
      assert.equal(g.run('G.cash'), 5000);
      assert.equal(g.run(`G.stash[${q}]`), 3);
    });
  }
}
