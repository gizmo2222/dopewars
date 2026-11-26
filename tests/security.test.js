'use strict';
// Phase 4 (security): saved data from localStorage is checked before it reaches innerHTML.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadGame, newGame, GAMES } = require('./harness');

const noEvents = { events: 0 };
const XSS = '<img src=x onerror=alert(1)>';

// A fresh game's save, as a parsed object, plus the game it came from.
function goodSave(name) {
  const g = newGame(name, noEvents);
  g.run('saveGame()');
  return { g, save: JSON.parse(g.localStorage.getItem(name + '_game')) };
}
// Store `save` in g's localStorage and try to resume it.
function tryLoad(g, save, settings) {
  g.localStorage.setItem(g.name + '_game', JSON.stringify(save));
  if (settings !== undefined) g.localStorage.setItem(g.name + '_settings', JSON.stringify(settings));
  return g.run('loadSavedGame()');
}

for (const name of GAMES) {
  test(`${name}: a save with an HTML item name in the stash is not resumed`, () => {
    const { g, save } = goodSave(name);
    save.stash[XSS] = 5;
    assert.equal(tryLoad(g, save), false);
    // Booting with it starts a new game, and nothing from it reaches the page.
    const g2 = loadGame(name, { storage: { [name + '_game']: JSON.stringify(save) } });
    assert.equal(g2.run('Object.keys(G.stash).length'), 0);
    assert.doesNotMatch(g2.el('stashList').innerHTML, /<img/);
  });

  test(`${name}: a save with unknown names or non-numbers anywhere is not resumed`, () => {
    const bad = [
      s => { s.city = XSS; },
      s => { s.coat = '100<b>'; },
      s => { s.market = { [XSS]: 1 }; },
      s => { s.avgCost = { [Object.keys(s.prices)[0] || 'x']: 'NaN' }; },
      s => { s.safehouse = { [XSS]: 1 }; },
      s => { s.lastVisit = { [XSS]: 1 }; },
      s => { s.stash = null; },
      s => { s.corneredDrug = XSS; },
      s => { s.tippedCity = XSS; },
      s => { s.pendingFireSale = { drug: XSS, qty: 1, price: 1 }; },
      s => { s.coatsBought = '1'; },
    ];
    bad.forEach((spoil, i) => {
      const { g, save } = goodSave(name);
      spoil(save);
      assert.equal(tryLoad(g, save), false, `case ${i}`);
    });
  });

  test(`${name}: a JSON __proto__ key in the stash is not resumed`, () => {
    const { g } = goodSave(name);
    const raw = g.localStorage.getItem(name + '_game').replace('"stash":{', '"stash":{"__proto__":1,');
    g.localStorage.setItem(name + '_game', raw);
    assert.equal(g.run('loadSavedGame()'), false);
  });

  test(`${name}: a legitimate save with stock, a fire sale and older missing fields resumes`, () => {
    const { g, save } = goodSave(name);
    const item = g.run('DRUGS[0].name');
    save.stash[item] = 3;
    save.pendingFireSale = { drug: item, qty: 2, price: 10 };
    save.corneredDrug = item;
    delete save.avgCost; delete save.lastVisit; delete save.safehouse; delete save.prevPrices;
    assert.equal(tryLoad(g, save), true);
    assert.equal(g.run('G.stash[DRUGS[0].name]'), 3);
    assert.equal(g.run('[typeof G.avgCost, typeof G.lastVisit, typeof G.safehouse].join()'), 'object,object,object');
  });

  test(`${name}: saved settings keep only known keys with finite numbers`, () => {
    const { g, save } = goodSave(name);
    const days = g.run('SETTINGS.days');
    assert.equal(tryLoad(g, save, { days: '<b>9</b>', cash: 777, extra: XSS, theme: 'bogus' }), true);
    assert.equal(g.run('SETTINGS.days'), days);
    assert.equal(g.run('SETTINGS.cash'), 777);
    assert.equal(g.run('"extra" in SETTINGS'), false);
  });

  test(`${name}: a rejected save leaves the current settings untouched`, () => {
    const { g, save } = goodSave(name);
    save.city = XSS;
    assert.equal(tryLoad(g, save, { cash: 777 }), false);
    assert.notEqual(g.run('SETTINGS.cash'), 777);
  });

  test(`${name}: a non-array high-score list does not stop the game ending`, () => {
    for (const stored of ['{}', '5', 'null', '"x"']) {
      const g = newGame(name, noEvents);
      g.localStorage.setItem(name + '_scores', stored);
      assert.equal(g.run('JSON.stringify(loadScores())'), '[]');
      g.run('endGame()');
      assert.equal(g.hidden('gameOver'), false, stored);
    }
  });

  test(`${name}: malformed high-score entries are dropped and the date is escaped`, () => {
    const g = newGame(name, noEvents);
    const ok = { net: 5, days: 30, cash: 100, debt: 0, interest: 1.1, date: XSS };
    g.localStorage.setItem(name + '_scores', JSON.stringify([ok, { net: 1 }, { ...ok, days: '<b>' }, null, 3]));
    assert.equal(g.run('loadScores().length'), 1);
    g.run('renderHighScores(loadScores())');
    const html = g.el('highScoreTable').innerHTML;
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /&#60;img/);
  });

  test(`${name}: the page declares a Content-Security-Policy that blocks remote scripts`, () => {
    const html = fs.readFileSync(path.join(__dirname, '..', name + '.html'), 'utf8');
    const m = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html);
    assert.ok(m, 'CSP meta tag');
    assert.match(m[1], /default-src 'none'/);
    assert.match(m[1], /script-src 'unsafe-inline';/);
    assert.ok(m.index < html.indexOf('fonts.googleapis.com/css2'), 'CSP comes before the font stylesheet');
  });
}
