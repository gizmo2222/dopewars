'use strict';
// Balance simulator smoke test: the bots finish games on both files without throwing, and the
// strategies separate (a trading bot beats doing nothing).
const test = require('node:test');
const assert = require('node:assert');
const { GAMES } = require('./harness');
const { playOne, summarize, STRATEGIES } = require('../tools/balance');

for (const game of GAMES) {
  const theme = game === 'dopewars' ? 'nyc' : 'neighborhood';
  test(`${game}: balance bots finish a game with every strategy`, () => {
    const rows = Object.keys(STRATEGIES).map(s => playOne(game, theme, 'medium', s, 1));
    for (const r of rows) {
      assert.ok(Number.isFinite(r.net), `${r.strategy} net`);
      assert.ok(r.day >= 30, `${r.strategy} reached the last day (day ${r.day})`);
      assert.ok(r.title, `${r.strategy} saw the game-over screen`);
    }
    assert.match(summarize(rows), /# Balance run/);
  });
  test(`${game}: balance trader beats idle`, () => {
    const idle = playOne(game, theme, 'medium', 'idle', 2), trader = playOne(game, theme, 'medium', 'trader', 2);
    assert.ok(trader.net > idle.net, `trader ${trader.net} vs idle ${idle.net}`);
  });
}
