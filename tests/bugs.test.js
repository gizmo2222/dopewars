'use strict';
// Regression tests for the confirmed bug list (one or more tests per item).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadGame, newGame, GAMES } = require('./harness');

const noEvents = { events: 0 };
const scoresOf = g => JSON.parse(g.localStorage.getItem(g.name + '_scores') || '[]');

for (const name of GAMES) {
  // 1. endGame scores once
  test(`${name}: endGame run twice saves one score and marks the game ended`, () => {
    const g = newGame(name, noEvents);
    g.run('endGame()');
    g.run('endGame()');
    assert.equal(scoresOf(g).length, 1);
    assert.equal(g.G.ended, true);
  });

  test(`${name}: an ended save is not resumed on load`, () => {
    const g = newGame(name, noEvents);
    g.run('endGame()');
    const saved = g.localStorage.getItem(name + '_game');
    const g2 = loadGame(name, { storage: { [name + '_game']: saved } });
    assert.ok(!g2.logLines().some(l => /Session restored/.test(l)), 'save was not restored');
  });

  test(`${name}: after endGame settings has no Cancel and Escape does not close it`, () => {
    const g = newGame(name, noEvents);
    g.run('endGame()');
    g.run('openSettings()');
    assert.equal(g.el('settingsCancelBtn').style.display, 'none');
    g.key('Escape');
    assert.equal(g.hidden('settingsOverlay'), false);
  });

  // 2. selectTheme must not touch SETTINGS
  test(`${name}: selectTheme only toggles the active button`, () => {
    const g = newGame(name, noEvents);
    const before = g.run('SETTINGS.theme');
    const other = g.run('Object.keys(THEMES).find(k => k !== SETTINGS.theme)');
    g.call('selectTheme', other);
    assert.equal(g.run('SETTINGS.theme'), before);
    assert.equal(g.document.querySelector('#set-theme .sopt.active').dataset.theme, other);
    g.run('readSettings()');
    assert.equal(g.run('SETTINGS.theme'), other);
  });

  // 3. negative net worth keeps its sign
  test(`${name}: negative net worth shows a minus on game over and in high scores`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 0; G.bank = 0; G.debt = 5000; endGame()');
    assert.match(g.el('goScore').innerHTML, /Net Worth: -\$5,000/);
    assert.match(g.el('highScoreTable').innerHTML, /-\$5,000/);
  });

  // 4. event queue
  test(`${name}: a second event modal is queued, not overwritten`, () => {
    const g = newGame(name, noEvents);
    g.run("showEvent('FIRST', 'one'); showEvent('SECOND', 'two');");
    assert.equal(g.el('eventTitle').textContent, 'FIRST');
    g.run('dismissEvent()');
    assert.equal(g.hidden('eventOverlay'), false);
    assert.equal(g.el('eventTitle').textContent, 'SECOND');
    assert.equal(g.el('eventMsg').textContent, 'two');
    g.run('dismissEvent()');
    assert.equal(g.hidden('eventOverlay'), true);
  });

  test(`${name}: newGame clears the event queue`, () => {
    const g = newGame(name, noEvents);
    g.run("showEvent('FIRST', 'one'); showEvent('SECOND', 'two'); newGame();");
    g.run('dismissEvent()');
    assert.equal(g.hidden('eventOverlay'), true);
  });

  // 5. event text matches outcome
  test(`${name}: failed bribe, scared-off mugger and no-room find return an outcome message`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 100');
    assert.match(g.call('applyEvent', 'bribe'), /afford|bribe|candy bar/i);
    g.run('G.hasGun = true; G.cash = 1000');
    g.rig([0.1]);
    const mug = g.call('applyEvent', 'mug');
    assert.equal(typeof mug, 'string');
    assert.equal(g.G.cash, 1000);
    g.run('G.coat = carried()');
    assert.match(g.call('applyEvent', 'find'), /room|space|no/i);
  });

  test(`${name}: maybeEvent shows the outcome message, not the fixed text`, () => {
    const g = newGame(name, { events: 1 });
    g.run('G.cash = 100');
    const idx = g.run("EVENTS.findIndex(e => e.type === 'bribe')");
    g.rig([0.5, (idx + 0.5) / g.run('EVENTS.length')]);
    g.run('maybeEvent()');
    assert.match(g.el('eventMsg').textContent, /afford|bribe|candy bar/i);
  });

  // 6. burned contact lasts the 3 days it says
  test(`${name}: burned contact blocks exactly 3 days`, () => {
    const g = newGame(name, noEvents);
    g.run('G.hasSupplier = true; G.day = 20; leBurnedContact()');
    assert.equal(g.G.supplierBurnedUntil, 22);
  });

  // 7. drought removes random items
  test(`${name}: drought removes half the items at random, not the first half`, () => {
    let sawLater = false;
    for (let seed = 1; seed <= 20; seed++) {
      const g = newGame(name, noEvents, { seed });
      const keys = g.run('Object.keys(G.market)');
      const spec = g.run('(CITIES.find(c => c.name === G.city) || {}).specialty');
      const pool = keys.filter(k => k !== spec);
      g.run("applyEvent('drought')");
      const gone = pool.filter(k => !(k in g.G.market));
      assert.equal(gone.length, Math.floor(pool.length / 2));
      if (gone.some(k => pool.indexOf(k) >= Math.floor(pool.length / 2))) sawLater = true;
    }
    assert.ok(sawLater, 'some seed removed an item from the second half');
  });

  // 8. found stash updates average cost
  test(`${name}: found units count as cost 0 in the average cost`, () => {
    const g = newGame(name, noEvents);
    const d = g.run('DRUGS[0].name');
    g.run('G.coat = 500; G.stash[DRUGS[0].name] = 10; G.avgCost[DRUGS[0].name] = 100');
    g.rig([0, 0]); // item 0, 5 units
    g.run("applyEvent('find')");
    assert.equal(g.G.stash[d], 15);
    assert.equal(g.G.avgCost[d], 67);
    g.run('delete G.stash[DRUGS[0].name]; delete G.avgCost[DRUGS[0].name]');
    g.rig([0, 0]);
    g.run("applyEvent('find')");
    assert.equal(g.G.avgCost[d], 0);
  });

  // 9. cornered item leaves today's market
  test(`${name}: market cornered removes the item from today's market and prices`, () => {
    const g = newGame(name, noEvents);
    const d = g.run('DRUGS[0].name');
    g.run('G.market[DRUGS[0].name] = 50; G.prices[DRUGS[0].name] = 100');
    g.rig([0, 0]);
    g.run('leMarketCornered()');
    assert.equal(g.G.corneredDrug, d);
    assert.ok(!(d in g.G.market));
    assert.ok(!(d in g.G.prices));
  });

  // 10. quantities must be positive
  test(`${name}: negative or zero quantities are rejected, empty means 1`, () => {
    const g = newGame(name, noEvents);
    const d = g.run('DRUGS.find(d => G.prices[d.name] && G.prices[d.name] <= G.cash && G.market[d.name] > 0).name');
    g.ctx.__d = d;
    g.run('G.stash[__d] = 3; renderAll()');
    const cash0 = g.G.cash;
    g.run("document.getElementById('sqty_' + __d).value = '-5'; sellDrug(__d)");
    assert.equal(g.G.cash, cash0);
    assert.equal(g.G.stash[d], 3);
    assert.match(g.logLines()[0], /Enter a quantity of 1 or more/);
    g.run("document.getElementById('qty_' + __d).value = '0'; buyDrug(__d)");
    assert.equal(g.G.cash, cash0);
    assert.equal(g.G.stash[d], 3);
    g.run("document.getElementById('qty_' + __d).value = ''; buyDrug(__d)");
    assert.equal(g.G.stash[d], 4);
  });

  // 11. connect-supply block clears on any move
  test(`${name}: a free car trip clears supplierBoughtDrug`, () => {
    const g = newGame(name, noEvents);
    g.run('G.hasCar = true; G.supplierBoughtDrug = DRUGS[0].name');
    const day = g.G.day;
    g.call('travel', g.run('CITIES.find(c => c.name !== G.city).name'));
    assert.equal(g.G.day, day, 'was a free trip');
    assert.equal(g.G.supplierBoughtDrug, null);
  });

  // 13. zero amounts and no debt
  test(`${name}: zero amounts and paying with no debt log a short message`, () => {
    const g = newGame(name, noEvents);
    g.run("G.debt = 0; openInput('loan', 'x'); document.getElementById('inputField').value = 100; confirmInput()");
    assert.equal(g.logLines()[0], 'No debt to pay.');
    assert.ok(!g.logLines().some(l => /DEBT CLEARED/.test(l)));
    g.run("openInput('deposit', 'x'); document.getElementById('inputField').value = 0; confirmInput()");
    assert.equal(g.logLines()[0], 'Enter an amount above $0.');
    g.run("openInput('borrow', 'x'); document.getElementById('inputField').value = 0; confirmInput()");
    assert.equal(g.logLines()[0], 'Enter an amount above $0.');
    g.run('G.cash = 0; payAllLoan()');
    assert.equal(g.logLines()[0], 'No debt to pay.');
  });

  // 14. tray clicks do not bubble
  test(`${name}: every stat tray stops click propagation`, () => {
    const g = loadGame(name);
    const trays = g.document.querySelectorAll('.stat-tray');
    assert.ok(trays.length >= 2);
    for (const t of trays) assert.match(t.attrs.onclick || '', /stopPropagation/);
  });

  // 16. (phase 7) the amount dialog refuses impossible actions instead of logging a $0 success
  test(`${name}: the amount dialog does not open when there is nothing to move`, () => {
    const g = newGame(name, noEvents);
    for (const [setup, action] of [['G.cash = 0', 'deposit'], ['G.bank = 0', 'withdraw'], ['G.debt = 0', 'loan'],
      ['G.debt = 500; G.cash = 0', 'loan'], ['G.borrowedToday = DAILY_BORROW_LIMIT', 'borrow']]) {
      g.run(setup + `; openInput('${action}', 'x')`);
      assert.equal(g.hidden('inputOverlay'), true, `${action} after ${setup}`);
      assert.ok(!/[$]0(?![0-9,])/.test(g.logLines()[0]), g.logLines()[0]);
    }
    assert.ok(!g.logLines().some(l => /Deposited \$0|Withdrew \$0|Saved \$0|Took \$0|Paid \$0/.test(l)));
  });

  test(`${name}: confirming an amount after the cash is gone logs a refusal, not $0`, () => {
    const g = newGame(name, noEvents);
    g.run("G.cash = 500; openInput('deposit', 'x'); G.cash = 0; document.getElementById('inputField').value = 100; confirmInput()");
    assert.equal(g.G.bank, 0);
    assert.ok(!/[$]0(?![0-9,])/.test(g.logLines()[0]), g.logLines()[0]);
  });

  // 17. (phase 7) END GAME with an unsold stash warns first
  test(`${name}: END GAME warns once about an unsold stash, then ends on the next click`, () => {
    const g = newGame(name, noEvents);
    g.run('G.day = G.maxDays; G.stash[DRUGS[0].name] = 5; renderAll()');
    g.flushTimers(); g.run('dismissEvent()');
    g.run('confirmEndGame()');
    assert.equal(g.G.ended, false);
    assert.equal(g.hidden('eventOverlay'), false);
    assert.match(g.el('eventMsg').textContent, / 5 (units|pieces)/);
    g.run('dismissEvent(); confirmEndGame()');
    assert.equal(g.G.ended, true);
  });

  test(`${name}: END GAME with an empty stash ends at once`, () => {
    const g = newGame(name, noEvents);
    g.run('G.day = G.maxDays; G.stash = {}; confirmEndGame()');
    assert.equal(g.G.ended, true);
  });

  test(`${name}: the END GAME button calls confirmEndGame`, () => {
    const g = newGame(name, noEvents);
    g.run('G.day = G.maxDays; renderAll()');
    assert.match(g.el('cityGrid').innerHTML, /onclick="confirmEndGame\(\)"/);
  });
}

// 15. dopewars help names the real button
test('dopewars: help text names the END GAME button', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'dopewars.html'), 'utf8');
  assert.ok(!/WRAP UP/.test(html));
});
