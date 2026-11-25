'use strict';
// Smoke tests: each game boots under the harness, starts a game and survives a short scripted run.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, newGame, GAMES } = require('./harness');

for (const name of GAMES) {
  test(`${name}: first boot shows settings and has a day-1 game`, () => {
    const g = loadGame(name);
    assert.equal(g.hidden('settingsOverlay'), false);
    assert.equal(g.G.day, 1);
    assert.ok(g.el('marketList').children.length > 0, 'market rendered');
  });

  test(`${name}: start from settings uses the active options`, () => {
    const g = loadGame(name);
    g.run("applyPreset('easy'); startFromSettings();");
    assert.equal(g.G.maxDays, 60);
    assert.equal(g.G.cash, 5000);
    assert.equal(g.hidden('settingsOverlay'), true);
  });

  test(`${name}: buy, travel, sell round trip keeps cash and stash consistent`, () => {
    const g = newGame(name, { events: 0 });
    const drug = g.run('DRUGS.find(d => G.prices[d.name] && G.prices[d.name] <= G.cash && G.market[d.name] > 0).name');
    g.ctx.__d = drug;
    const price = g.run('G.prices[__d]');
    const cash0 = g.G.cash;
    g.run('buyDrug(__d)');
    assert.equal(g.run('G.stash[__d]'), 1);
    assert.equal(g.G.cash, cash0 - price);
    const dest = g.run('CITIES.find(c => c.name !== G.city).name');
    g.call('travel', dest);
    g.flushTimers();
    assert.equal(g.G.day, 2);
    assert.equal(g.G.city, dest);
  });

  test(`${name}: a seeded 30-day random walk never throws or goes NaN`, () => {
    for (let seed = 1; seed <= 5; seed++) {
      const g = newGame(name, {}, { seed });
      for (let i = 0; i < 40 && g.G.day <= g.G.maxDays; i++) {
        g.run(`(() => {
          const ds = DRUGS.filter(d => G.prices[d.name] && G.market[d.name] > 0);
          if (ds.length) buyMax(ds[Math.floor(Math.random() * ds.length)].name);
          Object.keys(G.stash).forEach(n => { if (G.prices[n] && Math.random() < 0.5) {
            const el = document.getElementById('sqty_' + n); if (el) el.value = G.stash[n]; sellDrug(n); } });
          if (!document.getElementById('eventOverlay').classList.contains('hidden')) dismissEvent();
          const cs = CITIES.filter(c => c.name !== G.city);
          travel(cs[Math.floor(Math.random() * cs.length)].name);
        })()`);
        g.flushTimers();
        for (const k of ['cash', 'bank', 'debt', 'day']) assert.ok(Number.isFinite(g.G[k]), `${k} finite (seed ${seed})`);
      }
    }
  });
}
