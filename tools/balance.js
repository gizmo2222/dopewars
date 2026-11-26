'use strict';
// Balance simulator: plays many scripted games of each game file through tests/harness.js and logs the
// outcomes. Each game is one bot strategy x game x theme x difficulty x seed. Read-only on the repo.
//
//   node tools/balance.js --seeds 10 --out <dir>            all strategies, games, themes, difficulties
//   node tools/balance.js --seeds 2 --strategies greedy,idle --games dopewars
//
// Writes <out>/games.jsonl (one line per game) and <out>/summary.md (tables). Exits 1 if any game throws.

const fs = require('fs');
const path = require('path');
const { newGame, GAMES } = require('../tests/harness');

const PRESETS = {
  easy:   { days: 60, cash: 5000, debt: 0,     interest: 1.05, events: 0.20, coat: 200 },
  medium: { days: 30, cash: 2000, debt: 5000,  interest: 1.10, events: 0.38, coat: 100 },
  hard:   { days: 30, cash: 1000, debt: 10000, interest: 1.15, events: 0.50, coat: 50  },
};
const THEMES = { dopewars: ['nyc', 'miami', 'london', 'west'], candywars: ['neighborhood', 'fair', 'school', 'halloween'] };

// Instrumentation installed in the game's scope: counts events and records trades without changing them.
const PROBE = `
var __m = { ev:{}, late:{}, head:{}, bustUnits:0, bustValue:0, mugged:0, shark:0, interest:0, borrowed:0,
  fireOffered:0, fireTaken:0, fireUnits:0, coatOffered:0, coatTaken:0, coatAffordable:0, upgrades:{},
  profit:{}, sold:{}, bought:{}, peakNet:-Infinity, debtClearedDay:0, freeTrips:0, tippedBusts:0 };
(function () {
  const wrap = (name, fn) => { const orig = globalThis[name] || eval(name); globalThis[name] = fn(orig); eval(name + ' = globalThis.' + name); };
  wrap('applyEvent', o => function (t) {
    __m.ev[t] = (__m.ev[t] || 0) + 1;
    const c0 = G.cash, u0 = carried(), v0 = Object.keys(G.stash).reduce((s, k) => s + G.stash[k] * (G.avgCost[k] || 0), 0);
    const r = o(t);
    if (t === 'bust' || (t === 'bribe' && carried() < u0)) {
      __m.bustUnits += u0 - carried();
      __m.bustValue += v0 - Object.keys(G.stash).reduce((s, k) => s + G.stash[k] * (G.avgCost[k] || 0), 0);
    }
    if (t === 'mug') __m.mugged += c0 - G.cash;
    if (t === 'shark') __m.shark += c0 - G.cash;
    return r;
  });
  ['leFireSale', 'leMarketCornered', 'leTipOff', 'leBurnedContact'].forEach(n =>
    wrap(n, o => function () { __m.late[n] = (__m.late[n] || 0) + 1; if (n === 'leFireSale') __m.fireOffered++; return o.apply(this, arguments); }));
  wrap('applyHeadline', o => function () {
    const h0 = G.heatDay, p0 = Object.keys(G.prices).length; const r = o();
    const t = G.heatDay && !h0 ? 'heat' : Object.keys(G.prices).length < p0 ? 'drought' : 'other';
    __m.head[t] = (__m.head[t] || 0) + 1; return r;
  });
  wrap('maybeCoatOffer', o => function () { const r = o(); if (pendingCoatOffer) { __m.coatOffered++; if (G.cash >= pendingCoatOffer.price) __m.coatAffordable++; } return r; });
  wrap('sellDrug', o => function (n) {
    const c0 = G.cash, h0 = G.stash[n] || 0, avg = G.avgCost[n] || 0; const r = o(n);
    const q = h0 - (G.stash[n] || 0);
    if (q > 0) { __m.profit[n] = (__m.profit[n] || 0) + (G.cash - c0) - q * avg; __m.sold[n] = (__m.sold[n] || 0) + q; }
    return r;
  });
  wrap('executeBuy', o => function (n, q) { const h0 = G.stash[n] || 0; const r = o.apply(this, arguments); const d = (G.stash[n] || 0) - h0; if (d > 0) __m.bought[n] = (__m.bought[n] || 0) + d; return r; });
  wrap('travel', o => function (c) {
    const d0 = G.debt, day0 = G.day, tip = G.tippedCity === c && G.day + 1 <= (G.tippedExpiry || 0);
    const b0 = __m.ev.bust || 0;
    const r = o(c);
    if (G.day === day0) __m.freeTrips++; else __m.interest += G.debt - d0;
    if (tip && (__m.ev.bust || 0) > b0) __m.tippedBusts++;
    return r;
  });
})();
var BOT = {
  sell(n, q) { const e = document.getElementById('sqty_' + n); if (!e) return; e.value = String(q); sellDrug(n); },
  buy(n, q)  { const e = document.getElementById('qty_' + n);  if (!e) return; e.value = String(q); buyDrug(n); },
  input(a, amt) { openInput(a, ''); document.getElementById('inputField').value = String(amt); confirmInput(); },
  net() { return G.cash + G.bank - G.debt; },
};
`;

// ── bot strategies ──────────────────────────────────────────────────────────────────────────────
// Each gets a ctx with helpers; act() trades at the current stop, pick() chooses the next city,
// fire()/coat() answer offers. Strategies are deliberately simple and reproducible.
const base = name => ({ name, act() {}, pick: pickRandom, fire: () => false, coat: () => false });

function pickRandom(g, rand) {
  const s = g.run('CITIES.map(c => c.name).filter(n => n !== G.city)');
  return s[Math.floor(rand() * s.length)];
}
function pickSmart(g) {
  // Longest since last visit (supply accumulates), never into an active tip-off.
  return g.run(`(() => {
    const tip = G.tippedCity && G.day + 1 <= (G.tippedExpiry || 0) ? G.tippedCity : null;
    const c = CITIES.map(c => c.name).filter(n => n !== G.city && n !== tip);
    c.sort((a, b) => (G.lastVisit[a] || 0) - (G.lastVisit[b] || 0));
    return c[0];
  })()`);
}

// Core trader logic in the game's scope. opts: sellAt (markup over avg cost), buyBelow (price position
// in the item's normal range, 0 = floor, 1 = ceiling),
// only (item filter: 'spike' | 'specialty' | null), payDebt + payAt (pay off when cash >= debt x payAt),
// upgrades, borrow, bank.
function traderAct(g, o) {
  g.ctx.__o = o;
  g.run(`(() => {
    const o = __o, last = G.day >= G.maxDays;
    const D = n => DRUGS.find(d => d.name === n), base = n => D(n).base;
    // position of today's price in the item's normal range [0.5, 0.5 + 2*variance] x base (0 = floor)
    const pos = n => (G.prices[n] / base(n) - 0.5) / (2 * D(n).variance);
    const edge = n => base(n) * (0.5 + D(n).variance) - G.prices[n];  // expected margin per unit
    // sell
    Object.keys(G.stash).forEach(n => {
      const p = G.prices[n]; if (!p || G.supplierBoughtDrug === n) return;
      if (last || p >= (G.avgCost[n] || 0) * o.sellAt) BOT.sell(n, G.stash[n]);
    });
    if (last) { if (G.debt > 0) payAllLoan(); return; }
    // debt
    // clear the debt in one go once trading capital would survive it (paying early starves the stash)
    if (o.payDebt && G.debt > 0 && (G.cash >= G.debt * o.payAt || G.day >= G.maxDays - 2)) payAllLoan();
    // upgrades
    if (o.upgrades) {
      const want = [['burner', 3], ['car', 3], ['supplier', 4], ['gun', 6]];
      want.forEach(([id, k]) => { const u = UPGRADES.find(x => x.id === id);
        if (!G[upgradeKey(id)] && G.cash >= u.price * k && G.day < G.maxDays - 5) { buyUpgrade(id); __m.upgrades[id] = G.day; } });
      while (G.cash >= coatUpgradePrice() * 4 && G.day < G.maxDays - 3) { buyCoatUpgrade(); __m.upgrades.coat = (__m.upgrades.coat || 0) + 1; }
    }
    if (o.borrow && G.day < G.maxDays - 5) { const r = DAILY_BORROW_LIMIT - G.borrowedToday; if (r > 0) BOT.input('borrow', r); }
    // supplier deal on the best-ratio item
    const spec = citySpecialty();
    let cands = Object.keys(G.prices).filter(n => G.market[n] > 0 && pos(n) < o.buyBelow);
    if (o.only === 'spike') cands = cands.filter(n => DRUGS.find(d => d.name === n).spike);
    if (o.only === 'specialty') cands = cands.filter(n => n === spec);
    cands.sort((a, b) => edge(b) - edge(a));
    if (o.upgrades && G.hasSupplier && !G.supplierUsedToday && G.supplierBurnedUntil < G.day && cands[0]) supplierBuy(cands[0]);
    // buy: highest-value good deals first (space is the constraint late, cash early)
    cands.sort((a, b) => edge(b) - edge(a));
    cands.forEach(n => { if (calcMaxQty(n) > 0) buyMax(n); });
    if (o.bank && G.cash > 3000) BOT.input('deposit', G.cash - 3000);
  })()`);
}

const STRATEGIES = {
  idle: { ...base('idle'), act(g) { if (g.G.day >= g.G.maxDays) g.run('payAllLoan()'); } },
  random: {
    ...base('random'),
    act(g, rand) {
      g.ctx.__r = [rand(), rand(), rand(), rand(), rand()];
      g.run(`(() => { const r = __r, last = G.day >= G.maxDays;
        const held = Object.keys(G.stash); if (held.length && (last || r[0] < 0.5)) held.forEach(n => G.prices[n] && BOT.sell(n, G.stash[n]));
        if (last) { payAllLoan(); return; }
        const av = Object.keys(G.prices).filter(n => G.market[n] > 0);
        if (av.length && r[1] < 0.6) { const n = av[Math.floor(r[2] * av.length)]; const m = calcMaxQty(n); if (m > 0) BOT.buy(n, 1 + Math.floor(r[3] * m)); }
        if (r[4] < 0.1 && G.debt > 0) payAllLoan();
      })()`);
    },
    fire: (g, rand) => rand() < 0.5,
    coat: (g, rand) => rand() < 0.5,
  },
  greedy:     { ...base('greedy'),     act: g => traderAct(g, { sellAt: 1.15, buyBelow: 0.3, payDebt: true, payAt: 2 }), pick: pickSmart },
  trader:     { ...base('trader'),     act: g => traderAct(g, { sellAt: 1.15, buyBelow: 0.3, payDebt: true, payAt: 2, upgrades: true }), pick: pickSmart,
                fire: g => g.run('G.pendingFireSale && fireSaleMax(G.pendingFireSale) > 0'), coat: g => g.run('pendingCoatOffer && G.cash >= pendingCoatOffer.price * 2') },
  leverage:   { ...base('leverage'),   act: g => traderAct(g, { sellAt: 1.15, buyBelow: 0.3, payDebt: false, payAt: 2, upgrades: true, borrow: true }), pick: pickSmart,
                fire: g => g.run('G.pendingFireSale && fireSaleMax(G.pendingFireSale) > 0'), coat: g => g.run('pendingCoatOffer && G.cash >= pendingCoatOffer.price * 2') },
  spikeOnly:  { ...base('spikeOnly'),  act: g => traderAct(g, { sellAt: 1.3, buyBelow: 0.25, payDebt: true, payAt: 2, only: 'spike' }), pick: pickSmart },
  specialist: { ...base('specialist'), act: g => traderAct(g, { sellAt: 1.2, buyBelow: 0.4, payDebt: true, payAt: 2, only: 'specialty' }), pick: pickSmart },
  fireOnly:   { ...base('fireOnly'),   act: g => traderAct(g, { sellAt: 1.15, buyBelow: 0, payDebt: true, payAt: 2 }), pick: pickSmart,
                fire: g => g.run('G.pendingFireSale && fireSaleMax(G.pendingFireSale) > 0') },
};

// ── one game ────────────────────────────────────────────────────────────────────────────────────
function prng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function popups(g, s, rand) {
  for (let i = 0; i < 20; i++) {
    g.flushTimers();
    if (!g.hidden('fireSaleOverlay')) { g.run(s.fire(g, rand) ? 'acceptFireSale()' : 'declineFireSale()'); if (g.run('__m.lastFire !== G.day') && g.run('Object.keys(G.stash).length')) {} continue; }
    if (!g.hidden('coatOverlay'))     { g.run(s.coat(g, rand) ? 'acceptCoatOffer()' : 'declineCoatOffer()'); continue; }
    if (!g.hidden('eventOverlay'))    { g.run('dismissEvent()'); continue; }
    return;
  }
}

function playOne(gameName, theme, diff, strategy, seed) {
  const s = STRATEGIES[strategy];
  const g = newGame(gameName, { ...PRESETS[diff], theme }, { seed });
  g.run(PROBE);
  // count fire-sale takes by wrapping acceptFireSale after the probe exists
  g.run(`(() => { const o = acceptFireSale; acceptFireSale = function () { const u0 = carried(); o(); if (carried() > u0) { __m.fireTaken++; __m.fireUnits += carried() - u0; } }; })()`);
  g.run(`(() => { const o = acceptCoatOffer; acceptCoatOffer = function () { const c0 = G.coat; o(); if (G.coat > c0) __m.coatTaken++; }; })()`);
  const rand = prng(seed * 7919 + 13);
  let guard = 0;
  while (!g.run('G.ended') && guard++ < 400) {
    popups(g, s, rand);
    s.act(g, rand);
    g.run('__m.peakNet = Math.max(__m.peakNet, BOT.net()); if (!__m.debtClearedDay && G.debt <= 0 && ' + PRESETS[diff].debt + ' > 0) __m.debtClearedDay = G.day;');
    if (g.run('G.day >= G.maxDays')) { popups(g, s, rand); s.act(g, rand); g.run('endGame()'); break; }
    g.run(`travel(${JSON.stringify(s.pick(g, rand))})`);
  }
  popups(g, s, rand);
  const m = g.run('JSON.parse(JSON.stringify(__m))');
  const G = g.G;
  return {
    game: gameName, theme, diff, strategy, seed,
    net: G.cash + G.bank - G.debt, cash: G.cash, bank: G.bank, debt: G.debt, day: G.day, coat: G.coat,
    leftover: Object.values(G.stash).reduce((a, b) => a + b, 0),
    title: g.el('goTitle').textContent,
    ...m,
  };
}

// ── summary ─────────────────────────────────────────────────────────────────────────────────────
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const k = n => Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.abs(n) >= 1e3 ? Math.round(n / 1e3) + 'k' : String(Math.round(n));

function summarize(rows) {
  const out = [];
  const group = (keyFn) => { const m = new Map(); rows.forEach(r => { const key = keyFn(r); if (!m.has(key)) m.set(key, []); m.get(key).push(r); }); return m; };
  out.push(`# Balance run\n\n${rows.length} games.\n`);
  out.push('## Net worth by strategy and difficulty (all themes, both games)\n');
  out.push('| strategy | diff | n | win% (net>0) | p10 | median | p90 | max | top title% |');
  out.push('|---|---|---|---|---|---|---|---|---|');
  for (const [key, rs] of group(r => r.strategy + '|' + r.diff)) {
    const nets = rs.map(r => r.net);
    out.push(`| ${key.replace('|', ' | ')} | ${rs.length} | ${Math.round(100 * rs.filter(r => r.net > 0).length / rs.length)} | ${k(pct(nets, 0.1))} | ${k(pct(nets, 0.5))} | ${k(pct(nets, 0.9))} | ${k(Math.max(...nets))} | ${Math.round(100 * rs.filter(r => r.title === 'KINGPIN!' || r.title === 'CANDY TYCOON!').length / rs.length)} |`);
  }
  out.push('\n## Median net by theme (trader strategy)\n');
  out.push('| game | theme | easy | medium | hard |');
  out.push('|---|---|---|---|---|');
  for (const gname of GAMES) for (const th of THEMES[gname]) {
    const cell = d => { const rs = rows.filter(r => r.game === gname && r.theme === th && r.diff === d && r.strategy === 'trader'); return rs.length ? k(pct(rs.map(r => r.net), 0.5)) : '-'; };
    out.push(`| ${gname} | ${th} | ${cell('easy')} | ${cell('medium')} | ${cell('hard')} |`);
  }
  out.push('\n## Realised profit by item (trader + greedy, all difficulties), per theme\n');
  for (const gname of GAMES) for (const th of THEMES[gname]) {
    const rs = rows.filter(r => r.game === gname && r.theme === th && (r.strategy === 'trader' || r.strategy === 'greedy'));
    if (!rs.length) continue;
    const tot = {}, sold = {};
    rs.forEach(r => { Object.entries(r.profit).forEach(([n, v]) => tot[n] = (tot[n] || 0) + v); Object.entries(r.sold).forEach(([n, v]) => sold[n] = (sold[n] || 0) + v); });
    const sum = Object.values(tot).reduce((a, b) => a + b, 0) || 1;
    out.push(`- ${gname}/${th}: ` + Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([n, v]) => `${n} ${Math.round(100 * v / sum)}% (${k(sold[n] || 0)} sold)`).join(', '));
  }
  out.push('\n## Events per game (all rows)\n');
  const evTot = {}, lateTot = {}, headTot = {};
  rows.forEach(r => { Object.entries(r.ev).forEach(([n, v]) => evTot[n] = (evTot[n] || 0) + v); Object.entries(r.late).forEach(([n, v]) => lateTot[n] = (lateTot[n] || 0) + v); Object.entries(r.head).forEach(([n, v]) => headTot[n] = (headTot[n] || 0) + v); });
  out.push('- random events: ' + Object.entries(evTot).map(([n, v]) => `${n} ${(v / rows.length).toFixed(2)}`).join(', '));
  out.push('- late events: ' + Object.entries(lateTot).map(([n, v]) => `${n} ${(v / rows.length).toFixed(2)}`).join(', '));
  out.push('- headlines: ' + Object.entries(headTot).map(([n, v]) => `${n} ${(v / rows.length).toFixed(2)}`).join(', '));
  out.push('\n## Offers, upgrades, losses (by strategy)\n');
  out.push('| strategy | fire offered | fire taken | fire units | coat offered | coat affordable | coat taken | bust units | bust value | mugged | shark | interest | tip busts | leftover units | debt cleared (median day) |');
  out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const [key, rs] of group(r => r.strategy)) {
    const av = f => k(rs.reduce((s, r) => s + f(r), 0) / rs.length);
    const cleared = rs.filter(r => r.debtClearedDay).map(r => r.debtClearedDay);
    out.push(`| ${key} | ${av(r => r.fireOffered)} | ${av(r => r.fireTaken)} | ${av(r => r.fireUnits)} | ${av(r => r.coatOffered)} | ${av(r => r.coatAffordable)} | ${av(r => r.coatTaken)} | ${av(r => r.bustUnits)} | ${av(r => r.bustValue)} | ${av(r => r.mugged)} | ${av(r => r.shark)} | ${av(r => r.interest)} | ${av(r => r.tippedBusts)} | ${av(r => r.leftover)} | ${cleared.length ? pct(cleared, 0.5) + ' (' + Math.round(100 * cleared.length / rs.length) + '%)' : '-'} |`);
  }
  out.push('\n## Upgrade purchases (trader, leverage): share of games and median day\n');
  for (const st of ['trader', 'leverage']) {
    const rs = rows.filter(r => r.strategy === st); if (!rs.length) continue;
    const parts = ['burner', 'car', 'supplier', 'gun'].map(id => { const d = rs.filter(r => r.upgrades[id]).map(r => r.upgrades[id]); return `${id} ${Math.round(100 * d.length / rs.length)}%${d.length ? ' d' + pct(d, 0.5) : ''}`; });
    parts.push('coat upgrades avg ' + (rs.reduce((s, r) => s + (r.upgrades.coat || 0), 0) / rs.length).toFixed(1));
    out.push(`- ${st}: ${parts.join(', ')}`);
  }
  out.push('\n## Trader: upgrades owned vs median net (medium)\n');
  const tm = rows.filter(r => r.strategy === 'trader' && r.diff === 'medium');
  for (const id of ['burner', 'car', 'supplier', 'gun']) {
    const y = tm.filter(r => r.upgrades[id]).map(r => r.net), n = tm.filter(r => !r.upgrades[id]).map(r => r.net);
    out.push(`- ${id}: with ${y.length} games median ${k(pct(y, 0.5))}, without ${n.length} median ${k(pct(n, 0.5))}`);
  }
  return out.join('\n') + '\n';
}

// ── main ────────────────────────────────────────────────────────────────────────────────────────
function main(argv) {
  const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
  const seeds = parseInt(arg('seeds', '5'), 10);
  const out = arg('out', path.join(require('os').tmpdir(), 'balance'));
  const strategies = arg('strategies', Object.keys(STRATEGIES).join(',')).split(',');
  const games = arg('games', GAMES.join(',')).split(',');
  const diffs = arg('diffs', Object.keys(PRESETS).join(',')).split(',');
  for (const s of strategies) if (!STRATEGIES[s]) { console.error('unknown strategy ' + s); process.exit(1); }
  fs.mkdirSync(out, { recursive: true });
  const rows = [];
  let errors = 0;
  for (const gname of games) for (const theme of THEMES[gname]) for (const diff of diffs) for (const st of strategies) for (let seed = 1; seed <= seeds; seed++) {
    try { rows.push(playOne(gname, theme, diff, st, seed)); }
    catch (e) { errors++; console.error(`ERROR ${gname}/${theme}/${diff}/${st}/${seed}: ${e.stack}`); }
  }
  fs.writeFileSync(path.join(out, 'games.jsonl'), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(path.join(out, 'summary.md'), summarize(rows));
  console.log(`${rows.length} games, ${errors} errors -> ${out}`);
  return errors ? 1 : 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { playOne, summarize, STRATEGIES, PRESETS, THEMES };
