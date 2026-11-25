'use strict';
// UI layer: settings, presets, themes, modals, rendering, trays and keyboard, in both games.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, newGame, GAMES } = require('./harness');

const noEvents = { events: 0 };
const PRESETS = {
  easy:   { days: 60, cash: 5000, debt: 0,     interest: 1.05, events: 0.20, coat: 200 },
  medium: { days: 30, cash: 2000, debt: 5000,  interest: 1.10, events: 0.38, coat: 100 },
  hard:   { days: 30, cash: 1000, debt: 10000, interest: 1.15, events: 0.50, coat: 50 },
};
const GROUPS = { days: 'set-days', cash: 'set-cash', debt: 'set-debt', interest: 'set-interest', events: 'set-events', coat: 'set-coat' };
const activeVal = (g, id) => parseFloat(g.document.querySelector(`#${id} .sopt.active`).dataset.val);
const activeCount = (g, id) => g.document.querySelectorAll(`#${id} .sopt.active`).length;
const buttons = el => el.querySelectorAll('button');
const btnByText = (el, re) => buttons(el).find(b => re.test(b.textContent));

/** Put one drug on the market with fixed numbers; returns its name. */
function setMarket(g, { price = 100, prev = 0, avail = 5, cash = 1000, coat = 100, index = 0 } = {}) {
  const name = g.run(`DRUGS[${index}].name`);
  g.ctx.__p = { [name]: price };
  g.ctx.__v = prev ? { [name]: prev } : {};
  g.ctx.__m = { [name]: avail };
  g.run(`G.prices = __p; G.prevPrices = __v; G.market = __m; G.cash = ${cash}; G.coat = ${coat}; G.stash = {}; renderMarket();`);
  return name;
}
const marketRow = g => g.el('marketList').children[0];

for (const name of GAMES) {
  const firstTheme = name === 'dopewars' ? 'nyc' : 'neighborhood';

  // ---------- settings, presets ----------
  test(`${name}: SETTINGS defaults match the medium preset and the first theme`, () => {
    const g = loadGame(name);
    assert.equal(g.run('SETTINGS.theme'), firstTheme);
    for (const k of Object.keys(PRESETS.medium)) assert.equal(g.run(`SETTINGS.${k}`), PRESETS.medium[k], k);
  });

  for (const [preset, vals] of Object.entries(PRESETS)) {
    test(`${name}: applyPreset(${preset}) selects its value in every setting group`, () => {
      const g = newGame(name, noEvents);
      g.call('applyPreset', preset);
      for (const [k, id] of Object.entries(GROUPS)) {
        assert.equal(activeCount(g, id), 1, id);
        assert.equal(activeVal(g, id), vals[k], `${preset} ${k}`);
      }
      const act = g.document.querySelectorAll('#set-difficulty .sopt.active');
      assert.equal(act.length, 1);
      assert.equal(act[0].dataset.preset, preset);
    });
  }

  test(`${name}: PRESETS constant holds the documented values`, () => {
    const g = loadGame(name);
    for (const p of Object.keys(PRESETS)) assert.deepEqual(JSON.parse(g.run(`JSON.stringify(PRESETS.${p})`)), PRESETS[p]);
  });

  test(`${name}: applying a preset then starting a game uses the preset numbers`, () => {
    const g = loadGame(name, { seed: 3 });
    g.call('applyPreset', 'hard');
    g.run('startFromSettings()');
    assert.equal(g.run('G.cash'), 1000);
    assert.equal(g.run('G.debt'), 10000);
    assert.equal(g.run('G.maxDays'), 30);
    assert.equal(g.run('G.coat'), 50);
    assert.equal(g.run('SETTINGS.interest'), 1.15);
    assert.equal(g.run('SETTINGS.events'), 0.5);
    assert.ok(g.hidden('settingsOverlay'));
    assert.match(g.el('headerSub').textContent, /15%\/DAY INTEREST/);
  });

  test(`${name}: easy preset starts a 60-day game with no debt`, () => {
    const g = loadGame(name, { seed: 3 });
    g.call('applyPreset', 'easy');
    g.run('startFromSettings()');
    assert.equal(g.run('G.maxDays'), 60);
    assert.equal(g.run('G.debt'), 0);
    assert.equal(g.run('G.cash'), 5000);
    assert.match(g.el('headerSub').textContent, /^60 DAYS/);
    assert.match(g.el('headerSub').textContent, /5%\/DAY/);
  });

  test(`${name}: clicking a single setting button clears the difficulty preset, theme and preset buttons do not`, () => {
    const g = newGame(name, noEvents);
    g.call('applyPreset', 'hard');
    const theme = g.document.querySelectorAll('#set-theme .sopt')[1];
    theme.click();
    assert.equal(g.document.querySelectorAll('#set-difficulty .sopt.active').length, 1, 'theme click keeps preset');
    assert.ok(theme.classList.contains('active'));
    const days = g.document.querySelectorAll('#set-days .sopt')[2];
    days.click();
    assert.equal(g.document.querySelectorAll('#set-difficulty .sopt.active').length, 0, 'manual click clears preset');
    assert.ok(days.classList.contains('active'));
    assert.equal(activeCount(g, 'set-days'), 1);
    const p = g.document.querySelector('#set-difficulty .sopt[data-preset=easy]');
    p.click();
    assert.ok(p.classList.contains('active'));
    assert.equal(g.document.querySelectorAll('#set-difficulty .sopt.active').length, 1);
  });

  test(`${name}: readSettings copies the highlighted buttons into SETTINGS`, () => {
    const g = newGame(name, noEvents);
    const other = g.run('Object.keys(THEMES)[1]');
    g.call('selectTheme', other);
    g.call('applyPreset', 'easy');
    g.run('readSettings()');
    assert.equal(g.run('SETTINGS.theme'), other);
    for (const k of Object.keys(PRESETS.easy)) assert.equal(g.run(`SETTINGS.${k}`), PRESETS.easy[k], k);
  });

  test(`${name}: openSettings shows the overlay and highlights the current SETTINGS`, () => {
    const g = newGame(name, noEvents);
    const other = g.run('Object.keys(THEMES)[2]');
    g.ctx.__p = PRESETS.hard;
    g.run(`Object.assign(SETTINGS, __p); SETTINGS.theme = ${JSON.stringify(other)}; openSettings();`);
    assert.equal(g.hidden('settingsOverlay'), false);
    for (const [k, id] of Object.entries(GROUPS)) assert.equal(activeVal(g, id), PRESETS.hard[k], k);
    const t = g.document.querySelectorAll('#set-theme .sopt.active');
    assert.equal(t.length, 1);
    assert.equal(t[0].dataset.theme, other);
  });

  test(`${name}: settings Cancel button shows only while a game is in progress`, () => {
    const g = newGame(name, noEvents);
    g.run('openSettings()');
    assert.equal(g.el('settingsCancelBtn').style.display, '');
    g.run('G.ended = true; openSettings()');
    assert.equal(g.el('settingsCancelBtn').style.display, 'none');
    g.run('G.ended = false; G.day = G.maxDays + 1; openSettings()');
    assert.equal(g.el('settingsCancelBtn').style.display, 'none');
    g.run('G.day = G.maxDays; openSettings()');
    assert.equal(g.el('settingsCancelBtn').style.display, '');
    g.run('G.day = 0; openSettings()');
    assert.equal(g.el('settingsCancelBtn').style.display, 'none');
  });

  test(`${name}: closeSettings hides the settings modal`, () => {
    const g = newGame(name, noEvents);
    g.run('openSettings()');
    g.run('closeSettings()');
    assert.ok(g.hidden('settingsOverlay'));
  });

  test(`${name}: first load with no save opens the settings modal`, () => {
    const g = loadGame(name);
    assert.equal(g.hidden('settingsOverlay'), false);
    assert.equal(g.run('G.day'), 1);
  });

  // ---------- themes ----------
  test(`${name}: applyTheme swaps drugs, cities, headlines and upgrade labels for every theme`, () => {
    const g = loadGame(name);
    const ids = g.run('Object.keys(THEMES)');
    assert.ok(ids.length >= 4);
    const seen = new Set();
    for (const id of ids) {
      g.call('applyTheme', id);
      assert.ok(g.run(`DRUGS === THEMES.${id}.drugs && CITIES === THEMES.${id}.cities && HEADLINES === THEMES.${id}.headlines`), id);
      assert.ok(g.run(`THEMES.${id}.upgrades.every(u => { const x = UPGRADES.find(y => y.id === u.id); return x.icon === u.icon && x.short === u.short && x.label === u.label && x.desc === u.desc; })`), id);
      seen.add(g.run('CITIES[0].name'));
    }
    assert.equal(seen.size, ids.length, 'each theme has its own first city');
  });

  test(`${name}: applyTheme with an unknown id falls back to the default theme`, () => {
    const g = loadGame(name);
    g.call('applyTheme', 'zzz');
    assert.ok(g.run(`CITIES === THEMES.${firstTheme}.cities`));
  });

  test(`${name}: selecting a theme and starting uses its cities, header and upgrade names`, () => {
    for (const id of loadGame(name).run('Object.keys(THEMES)')) {
      const g = loadGame(name, { seed: 5 });
      g.call('selectTheme', id);
      g.run('startFromSettings()');
      assert.equal(g.run('SETTINGS.theme'), id);
      assert.equal(g.run('G.city'), g.run(`THEMES.${id}.cities[0].name`));
      assert.equal(g.el('cityDisplay').textContent, g.run('G.city'));
      const T = g.run(`THEMES.${id}`);
      assert.ok(g.el('headerSub').textContent.includes(T.location), id);
      assert.ok(g.el('headerSub').textContent.includes(T.year), id);
      g.run('G.hasGun = true; renderAll()');
      assert.ok(g.el('upgradeStatus').textContent.includes(T.upgrades.find(u => u.id === 'gun').short), id);
      assert.equal(g.el('cityGrid').children.length, T.cities.length);
    }
  });

  // ---------- helpers ----------
  test(`${name}: fmt rounds, drops the sign and groups thousands`, () => {
    const g = loadGame(name);
    assert.equal(g.call('fmt', 0), '$0');
    assert.equal(g.call('fmt', 1234.5), '$1,235');
    assert.equal(g.call('fmt', 1234.4), '$1,234');
    assert.equal(g.call('fmt', -5000), '$5,000');
    assert.equal(g.call('fmt', 1234567), '$1,234,567');
    assert.equal(g.call('fmt', 0.4), '$0');
  });

  test(`${name}: rnd returns inclusive integer bounds`, () => {
    const g = loadGame(name);
    g.rig([0, 0.999999, 0.5]);
    assert.equal(g.call('rnd', 3, 7), 3);
    assert.equal(g.call('rnd', 3, 7), 7);
    assert.equal(g.call('rnd', 10, 19), 15);
  });

  test(`${name}: carried sums the stash`, () => {
    const g = newGame(name, noEvents);
    assert.equal(g.run('carried()'), 0);
    g.run('G.stash = { a: 3, b: 4, c: 0 }');
    assert.equal(g.run('carried()'), 7);
  });

  // ---------- modals ----------
  test(`${name}: help modal opens and closes`, () => {
    const g = newGame(name, noEvents);
    assert.ok(g.hidden('helpOverlay'));
    g.run('openHelp()');
    assert.equal(g.hidden('helpOverlay'), false);
    g.run('closeHelp()');
    assert.ok(g.hidden('helpOverlay'));
  });

  test(`${name}: high-score modal opens with the saved scores and closes`, () => {
    const scores = [{ net: 9000, days: 30, cash: 2000, debt: 5000, interest: 1.1, date: 'D1' }];
    const g = loadGame(name, { storage: { [name + '_scores']: JSON.stringify(scores) } });
    assert.ok(g.hidden('highScoresOverlay'));
    g.run('openHighScores()');
    assert.equal(g.hidden('highScoresOverlay'), false);
    assert.match(g.el('highScoreTableModal').innerHTML, /\$9,000/);
    assert.match(g.el('highScoreTableModal').innerHTML, /30d/);
    g.run('closeHighScores()');
    assert.ok(g.hidden('highScoresOverlay'));
  });

  test(`${name}: high-score modal with no scores says so`, () => {
    const g = loadGame(name);
    g.run('openHighScores()');
    assert.match(g.el('highScoreTableModal').innerHTML, /No scores yet/);
  });

  test(`${name}: openBorrow refuses before day 3 and asks with the remaining limit after`, () => {
    const g = newGame(name, noEvents);
    g.run('G.day = 2; openBorrow()');
    assert.ok(g.hidden('inputOverlay'));
    assert.match(g.logLines()[0], /day 3/);
    g.run('G.day = 3; G.borrowedToday = 4000; openBorrow()');
    assert.equal(g.hidden('inputOverlay'), false);
    assert.match(g.el('inputLabel').textContent, /\$6,000/);
    g.run('closeInput(); G.borrowedToday = 15000; openBorrow()');
    assert.match(g.el('inputLabel').textContent, /\$0/);
  });

  // ---------- log ----------
  test(`${name}: addLog puts the newest entry first, keeps the class, and caps the log at 50`, () => {
    const g = newGame(name, noEvents);
    g.run("addLog('hello', 'good')");
    const first = g.el('log').children[0];
    assert.equal(first.textContent, 'hello');
    assert.ok(first.classList.contains('good'));
    assert.ok(first.classList.contains('log-entry'));
    for (let i = 0; i < 60; i++) g.call('addLog', 'm' + i);
    assert.equal(g.el('log').children.length, 50);
    assert.equal(g.logLines()[0], 'm59');
    assert.equal(g.logLines()[49], 'm10');
  });

  test(`${name}: addLog at exactly 50 entries keeps all of them`, () => {
    const g = newGame(name, noEvents);
    g.run("document.getElementById('log').innerHTML = ''");
    for (let i = 0; i < 50; i++) g.call('addLog', 'x' + i);
    assert.equal(g.el('log').children.length, 50);
    assert.equal(g.logLines()[49], 'x0');
  });

  // ---------- renderAll ----------
  test(`${name}: renderAll fills the day, days left, cash, bank, debt and coat displays`, () => {
    const g = newGame(name, noEvents);
    g.run('G.day = 5; G.cash = 1234; G.bank = 56789; G.debt = 4321; G.coat = 77; G.stash = { x: 2, y: 5 }; renderAll()');
    assert.equal(g.el('dayDisplay').textContent, '5');
    assert.equal(g.el('daysLeft').textContent, '25 days left');
    assert.equal(g.el('cashDisplay').textContent, '$1,234');
    assert.equal(g.el('bankDisplay').textContent, '$56,789');
    assert.equal(g.el('debtDisplay').textContent, '$4,321');
    assert.equal(g.el('coatDisplay').textContent, '7 / 77');
  });

  test(`${name}: renderAll saves the game`, () => {
    const g = newGame(name, noEvents);
    g.localStorage.removeItem(name + '_game');
    g.run('G.cash = 4242; renderAll()');
    assert.equal(JSON.parse(g.localStorage.getItem(name + '_game')).cash, 4242);
  });

  test(`${name}: upgrade badges list owned upgrades and are empty with none`, () => {
    const g = newGame(name, noEvents);
    assert.equal(g.el('upgradeStatus').textContent, '');
    const sh = id => g.run(`(() => { const u = UPGRADES.find(x => x.id === '${id}'); return u.icon + ' ' + u.short; })()`);
    g.run('G.hasGun = true; renderAll()');
    assert.equal(g.el('upgradeStatus').textContent, 'Owned: ' + sh('gun'));
    g.run('G.hasBurner = true; G.hasCar = true; renderAll()');
    assert.equal(g.el('upgradeStatus').textContent, `Owned: ${sh('gun')} · ${sh('burner')} · ${sh('car')}`);
    g.run('G.hasGun = false; G.hasBurner = false; G.hasCar = false; G.hasSupplier = true; G.supplierBurnedUntil = 0; G.supplierUsedToday = false; renderAll()');
    assert.equal(g.el('upgradeStatus').textContent, `Owned: ${sh('supplier')} (ready)`);
    g.run('G.supplierUsedToday = true; renderAll()');
    assert.equal(g.el('upgradeStatus').textContent, `Owned: ${sh('supplier')} (used)`);
    g.run('G.day = 4; G.supplierBurnedUntil = 6; renderAll()');
    const word = name === 'dopewars' ? 'burned' : 'declined';
    assert.equal(g.el('upgradeStatus').textContent, `Owned: ${sh('supplier')} (${word} 3d)`);
    g.run('G.supplierBurnedUntil = 4; renderAll()');
    assert.ok(g.el('upgradeStatus').textContent.endsWith(`(${word} 1d)`));
    g.run('G.supplierBurnedUntil = 3; renderAll()');
    assert.ok(g.el('upgradeStatus').textContent.endsWith('(used)'), 'burn over');
  });

  // ---------- renderMarket ----------
  test(`${name}: renderMarket with no supply shows the empty message and no rows`, () => {
    const g = newGame(name, noEvents);
    g.run('G.prices = {}; renderMarket()');
    const msg = name === 'dopewars' ? 'No supply here today. Travel somewhere.' : 'Nothing for sale here today. Try another spot!';
    assert.equal(g.el('marketList').textContent, msg);
    assert.equal(g.el('marketList').querySelectorAll('.drug-row').length, 0);
  });

  test(`${name}: renderMarket lists one row per priced drug with price, availability and quantity cap`, () => {
    const g = newGame(name, noEvents);
    const n = setMarket(g, { price: 120, avail: 7 });
    assert.equal(g.el('marketList').children.length, 1);
    const row = marketRow(g);
    assert.ok(row.classList.contains('drug-row'));
    assert.ok(row.textContent.includes(n));
    assert.match(row.querySelector('.drug-avail').textContent, /^7 available$/);
    assert.match(row.querySelector('.drug-price').textContent, /^\$120/);
    const inp = row.querySelector('.qty-in');
    assert.equal(inp.attrs.max, '7');
    assert.equal(inp.attrs.id, 'qty_' + n);
    assert.equal(inp.value, '1');
    g.run('G.market[DRUGS[0].name] = 0; renderMarket()');
    assert.match(marketRow(g).querySelector('.drug-avail').textContent, /^0 available$/);
    assert.equal(marketRow(g).querySelector('.qty-in').attrs.max, '1');
  });

  test(`${name}: renderMarket shows every drug that has a price`, () => {
    const g = newGame(name, noEvents);
    g.run('G.prices = {}; DRUGS.forEach((d, i) => { if (i % 2 === 0) { G.prices[d.name] = 10; G.market[d.name] = 3; } }); renderMarket();');
    const expected = g.run('DRUGS.filter((d, i) => i % 2 === 0).length');
    assert.equal(g.el('marketList').children.length, expected);
  });

  test(`${name}: renderMarket flags prices above 1.5x base as high`, () => {
    const g = newGame(name, noEvents);
    const base = g.run('DRUGS[0].base');
    setMarket(g, { price: Math.floor(base * 1.5) + 1 });
    assert.ok(marketRow(g).querySelector('.drug-price').classList.contains('high'));
    setMarket(g, { price: base * 1.5 });
    assert.ok(!marketRow(g).querySelector('.drug-price').classList.contains('high'));
  });

  test(`${name}: renderMarket shows an up arrow, down arrow or none against yesterday's price`, () => {
    const g = newGame(name, noEvents);
    const html = () => marketRow(g).querySelector('.drug-price').innerHTML;
    setMarket(g, { price: 120, prev: 100 });
    assert.match(html(), /trend-up/);
    assert.ok(!/trend-down/.test(html()));
    setMarket(g, { price: 80, prev: 100 });
    assert.match(html(), /trend-down/);
    assert.ok(!/trend-up/.test(html()));
    setMarket(g, { price: 100, prev: 100 });
    assert.ok(!/trend/.test(html()));
    setMarket(g, { price: 100, prev: 0 });
    assert.ok(!/trend/.test(html()));
  });

  test(`${name}: BUY and MAX are enabled only with cash, space and supply`, () => {
    const g = newGame(name, noEvents);
    const disabled = () => {
      const row = marketRow(g);
      return [btnByText(row, /^BUY$/).disabled, btnByText(row, /^MAX$/).disabled, row.querySelector('.qty-in').disabled];
    };
    setMarket(g, { price: 100, cash: 100 });
    assert.deepEqual(disabled(), [false, false, false], 'cash == price');
    setMarket(g, { price: 100, cash: 99 });
    assert.deepEqual(disabled(), [true, true, true], 'cash < price');
    setMarket(g, { price: 100, cash: 1000, coat: 0 });
    assert.deepEqual(disabled(), [true, true, true], 'no space');
    setMarket(g, { price: 100, cash: 1000, coat: 1 });
    assert.deepEqual(disabled(), [false, false, false], 'one space');
    setMarket(g, { price: 100, cash: 1000, avail: 0 });
    assert.deepEqual(disabled(), [true, true, true], 'no supply');
    setMarket(g, { price: 100, cash: 1000, avail: 1 });
    assert.deepEqual(disabled(), [false, false, false], 'one supply');
    g.run('G.coat = 3; G.stash = { zz: 3 }; renderMarket()');
    assert.deepEqual(disabled(), [true, true, true], 'coat full');
  });

  test(`${name}: market shows no supplier button without the upgrade`, () => {
    const g = newGame(name, noEvents);
    setMarket(g, {});
    assert.equal(buttons(marketRow(g)).length, 2);
  });

  test(`${name}: supplier button label and enabled state follow the supplier's status`, () => {
    const g = newGame(name, noEvents);
    const ready = name === 'dopewars' ? 'CONNECT' : 'CARD';
    const burned = name === 'dopewars' ? 'BURNED' : 'DECLINED';
    const btn = () => buttons(marketRow(g))[2];
    setMarket(g, { price: 100, cash: 1000 });
    g.run('G.hasSupplier = true; G.supplierUsedToday = false; G.supplierBurnedUntil = 0; renderMarket()');
    assert.equal(buttons(marketRow(g)).length, 3);
    assert.equal(btn().textContent, ready);
    assert.equal(btn().disabled, false);
    g.run('G.supplierUsedToday = true; renderMarket()');
    assert.equal(btn().textContent, 'USED');
    assert.equal(btn().disabled, true);
    g.run('G.supplierUsedToday = false; G.supplierBurnedUntil = G.day; renderMarket()');
    assert.equal(btn().textContent, burned);
    assert.equal(btn().disabled, true);
    g.run('G.supplierBurnedUntil = G.day - 1; renderMarket()');
    assert.equal(btn().textContent, ready);
    assert.equal(btn().disabled, false);
    g.run('G.supplierUsedToday = true; G.supplierBurnedUntil = G.day; renderMarket()');
    assert.equal(btn().textContent, burned);
  });

  test(`${name}: supplier button needs space and cash for the 25%-off price (rounded)`, () => {
    const g = newGame(name, noEvents);
    const btn = () => buttons(marketRow(g))[2];
    setMarket(g, { price: 101, cash: 76 });   // round(75.75) = 76
    g.run('G.hasSupplier = true; renderMarket()');
    assert.equal(btn().disabled, false, 'cash == discount price');
    assert.equal(btnByText(marketRow(g), /^BUY$/).disabled, true, 'but cannot afford full price');
    g.run('G.cash = 75; renderMarket()');
    assert.equal(btn().disabled, true);
    g.run('G.cash = 1000; G.coat = 0; renderMarket()');
    assert.equal(btn().disabled, true, 'no space');
    g.run('G.coat = 1; renderMarket()');
    assert.equal(btn().disabled, false, 'one space');
    assert.match(btn().attrs.onclick, /supplierBuy\(/);
  });

  // ---------- renderStash ----------
  test(`${name}: renderStash says the stash is empty`, () => {
    const g = newGame(name, noEvents);
    g.run('G.stash = {}; renderStash()');
    const msg = name === 'dopewars' ? 'Empty pockets.' : 'Your bag is empty.';
    assert.equal(g.el('stashList').textContent, msg);
    assert.equal(g.el('stashList').children.length, 0);
    assert.equal(g.el('stashList').style.color, 'var(--muted)');
    g.run('G.stash = { a: 0 }; renderStash()');
    assert.equal(g.el('stashList').textContent, msg, 'zero quantities do not count');
  });

  test(`${name}: renderStash rows show quantity, sell price and average cost with profit percentage`, () => {
    const g = newGame(name, noEvents);
    const [a, b, c] = g.run('DRUGS.slice(0, 3).map(d => d.name)');
    g.ctx.__s = { [a]: 3, [b]: 2, [c]: 0 };
    g.ctx.__p = { [a]: 150, [b]: 40 };
    g.ctx.__c = { [a]: 100, [b]: 80 };
    g.run('G.stash = __s; G.prices = __p; G.avgCost = __c; renderStash()');
    const sl = g.el('stashList');
    assert.equal(sl.style.color, 'var(--text)');
    assert.equal(sl.children.length, 2);
    const r1 = sl.children[0];
    assert.ok(r1.classList.contains('owned-row'));
    assert.ok(r1.textContent.includes(a));
    assert.match(r1.textContent, /x3/);
    assert.match(r1.textContent, /sell @ \$150/);
    assert.match(r1.textContent, /avg cost: \$100/);
    assert.match(r1.textContent, /\(\+50%\)/);
    assert.match(r1.innerHTML, /var\(--green\)/);
    assert.equal(r1.querySelector('.qty-in').value, '3');
    assert.equal(r1.querySelector('.qty-in').attrs.max, '3');
    assert.equal(r1.querySelector('.qty-in').attrs.id, 'sqty_' + a);
    assert.equal(btnByText(r1, /SELL/).disabled, false);
    const r2 = sl.children[1];
    assert.match(r2.textContent, /\(-50%\)/);
    assert.match(r2.innerHTML, /var\(--red\)/);
    assert.ok(!sl.textContent.includes(c));
  });

  test(`${name}: renderStash shows no buyers and a disabled SELL when the drug is not on the market`, () => {
    const g = newGame(name, noEvents);
    const a = g.run('DRUGS[0].name');
    g.ctx.__s = { [a]: 2 };
    g.run('G.stash = __s; G.prices = {}; G.avgCost = {}; renderStash()');
    const r = g.el('stashList').children[0];
    assert.match(r.textContent, /no buyers here/);
    assert.ok(!/avg cost/.test(r.textContent));
    assert.equal(btnByText(r, /SELL/).disabled, true);
  });

  test(`${name}: renderStash shows break-even as +0% and rounds the percentage`, () => {
    const g = newGame(name, noEvents);
    const a = g.run('DRUGS[0].name');
    g.ctx.__s = { [a]: 1 };
    g.ctx.__p = { [a]: 100 };
    g.ctx.__c = { [a]: 100 };
    g.run('G.stash = __s; G.prices = __p; G.avgCost = __c; renderStash()');
    assert.match(g.el('stashList').textContent, /\(\+0%\)/);
    g.ctx.__p = { [a]: 133 };
    g.run('G.prices = __p; renderStash()');
    assert.match(g.el('stashList').textContent, /\(\+33%\)/);
    g.ctx.__p = { [a]: 167 };
    g.run('G.prices = __p; renderStash()');
    assert.match(g.el('stashList').textContent, /\(\+67%\)/);
  });

  test(`${name}: renderStash shows the profit figure only with both an average cost and a sell price, and break-even is green`, () => {
    const g = newGame(name, noEvents);
    const a = g.run('DRUGS[0].name');
    g.ctx.__s = { [a]: 1 };
    g.ctx.__p = {}; g.ctx.__c = { [a]: 100 };
    g.run('G.stash = __s; G.prices = __p; G.avgCost = __c; renderStash()');
    assert.match(g.el('stashList').textContent, /avg cost: \$100/);
    assert.ok(!/%|NaN|Infinity/.test(g.el('stashList').textContent), 'no price: no percentage');
    g.ctx.__p = { [a]: 120 }; g.ctx.__c = {};
    g.run('G.prices = __p; G.avgCost = __c; renderStash()');
    assert.match(g.el('stashList').textContent, /sell @ \$120/);
    assert.ok(!/%|NaN|Infinity|avg cost/.test(g.el('stashList').textContent), 'no average: no percentage');
    g.ctx.__p = { [a]: 100 }; g.ctx.__c = { [a]: 100 };
    g.run('G.prices = __p; G.avgCost = __c; renderStash()');
    assert.match(g.el('stashList').innerHTML, /var\(--green\)/);
    assert.ok(!/var\(--red\)/.test(g.el('stashList').innerHTML));
  });

  test(`${name}: syncTopSections equalises the two top panels to the taller one and tolerates a missing panel`, () => {
    const g = newGame(name, noEvents);
    const left = g.el('topLeft'), right = g.el('topRight');
    left.offsetHeight = 30; right.offsetHeight = 50;
    g.run('syncTopSections()');
    assert.equal(left.style.minHeight, '50px');
    assert.equal(right.style.minHeight, '50px');
    left.offsetHeight = 70;
    g.run('syncTopSections()');
    assert.equal(right.style.minHeight, '70px');
    right.remove();
    left.style.minHeight = 'keep';
    g.run('syncTopSections()');
    assert.equal(left.style.minHeight, 'keep');
  });

  // ---------- renderCities ----------
  test(`${name}: renderCities marks the current city and wires the others to travel`, () => {
    const g = newGame(name, noEvents);
    const cities = g.run('CITIES.map(c => ({ name: c.name, desc: c.desc, specialty: c.specialty }))');
    const grid = g.el('cityGrid');
    assert.equal(grid.children.length, cities.length);
    assert.equal(grid.style.opacity, '');
    cities.forEach((c, i) => {
      const btn = grid.children[i];
      const isCur = c.name === g.run('G.city');
      assert.equal(btn.classList.contains('current'), isCur, c.name);
      assert.equal(btn.querySelector('.city-name').textContent, c.name);
      assert.equal(btn.querySelector('.city-desc').textContent, isCur ? 'you are here' : c.desc);
      assert.ok(btn.textContent.includes('★ ' + c.specialty));
      assert.equal(typeof btn.onclick, isCur ? 'object' : 'function', c.name);
    });
  });

  test(`${name}: clicking a city button travels there`, () => {
    const g = newGame(name, noEvents);
    const dest = g.run('CITIES[2].name');
    g.el('cityGrid').children[2].click();
    assert.equal(g.run('G.city'), dest);
    assert.equal(g.run('G.day'), 2);
    assert.ok(g.el('cityGrid').children[2].classList.contains('current'));
    assert.equal(g.el('cityDisplay').textContent, dest);
  });

  test(`${name}: renderCities omits the specialty line for a city without one`, () => {
    const g = newGame(name, noEvents);
    g.run('CITIES = CITIES.map(c => ({ name: c.name, desc: c.desc })); renderCities()');
    assert.ok(!g.el('cityGrid').textContent.includes('★'));
  });

  test(`${name}: renderCities title shows the city, with free car trips left`, () => {
    const g = newGame(name, noEvents);
    const word = name === 'dopewars' ? 'Travel' : 'Go To';
    const t = () => g.el('travelTitle').textContent;
    assert.equal(t(), `${word} — ${g.run('G.city')}`);
    g.run('G.hasCar = true; G.carTripsToday = 0; renderCities()');
    assert.match(t(), /\(1 free trip left\)/);
    g.run('G.carTripsToday = 1; renderCities()');
    assert.match(t(), /\(0 free trips left\)/);
    g.run('G.carTripsToday = 5; renderCities()');
    assert.match(t(), /\(0 free trips left\)/);
  });

  test(`${name}: renderCities on the last day locks travel, offers END GAME and pops up once`, () => {
    const g = newGame(name, noEvents);
    g.run('G.day = G.maxDays; G.hasCar = true; renderAll()');
    const word = name === 'dopewars' ? 'FINAL DAY' : 'LAST DAY';
    assert.match(g.el('travelTitle').textContent, new RegExp(word));
    assert.ok(!/free trip/.test(g.el('travelTitle').textContent));
    const grid = g.el('cityGrid');
    assert.equal(grid.style.opacity, '0.35');
    const n = g.run('CITIES.length');
    assert.equal(grid.children.length, n + 1);
    for (let i = 0; i < n; i++) assert.ok(!grid.children[i].onclick, 'travel disabled');
    assert.match(grid.children[n].innerHTML, /endGame\(\)/);
    assert.match(grid.children[n].textContent, /END GAME/);
    assert.equal(g.run('G.shownEndGamePopup'), true);
    assert.equal(g.pendingTimers(), 1);
    assert.ok(g.hidden('eventOverlay'));
    g.flushTimers();
    assert.equal(g.hidden('eventOverlay'), false);
    assert.match(g.el('eventTitle').textContent, name === 'dopewars' ? /FINAL DAY/ : /LAST DAY/);
    g.run('renderCities()');
    assert.equal(g.pendingTimers(), 0, 'popup is shown only once');
  });

  test(`${name}: the day before the last day still allows travel and has no END GAME`, () => {
    const g = newGame(name, noEvents);
    g.run('G.day = G.maxDays - 1; renderCities()');
    assert.equal(g.el('cityGrid').children.length, g.run('CITIES.length'));
    assert.equal(g.el('cityGrid').style.opacity, '');
    assert.equal(g.pendingTimers(), 0);
    g.run('G.day = G.maxDays + 1; renderCities()');
    assert.equal(g.el('cityGrid').style.opacity, '0.35');
  });

  // ---------- trays ----------
  test(`${name}: toggleTray opens a tray, closes it again, and opening another closes the first`, () => {
    const g = newGame(name, noEvents);
    const vis = id => g.el('tray-' + id).classList.contains('visible');
    assert.ok(!vis('cash') && !vis('debt'));
    g.call('toggleTray', 'cash');
    assert.ok(vis('cash') && !vis('debt'));
    g.call('toggleTray', 'debt');
    assert.ok(!vis('cash') && vis('debt'));
    g.call('toggleTray', 'debt');
    assert.ok(!vis('cash') && !vis('debt'));
  });

  test(`${name}: closeTray closes every open tray`, () => {
    const g = newGame(name, noEvents);
    g.el('tray-cash').classList.add('visible');
    g.el('tray-debt').classList.add('visible');
    g.run('closeTray()');
    assert.ok(!g.el('tray-cash').classList.contains('visible'));
    assert.ok(!g.el('tray-debt').classList.contains('visible'));
  });

  // ---------- keyboard ----------
  test(`${name}: Enter in the input dialog confirms it`, () => {
    const g = newGame(name, noEvents);
    g.run("G.cash = 500; G.bank = 0; openInput('deposit', 'Deposit?')");
    g.el('inputField').value = '120';
    g.key('Enter');
    assert.ok(g.hidden('inputOverlay'));
    assert.equal(g.run('G.cash'), 380);
    assert.equal(g.run('G.bank'), 120);
    assert.equal(g.run('inputAction'), null);
  });

  test(`${name}: Enter with nothing open does nothing`, () => {
    const g = newGame(name, noEvents);
    const before = g.logLines().length;
    g.run('G.cash = 500');
    g.key('Enter');
    assert.equal(g.run('G.cash'), 500);
    assert.equal(g.logLines().length, before);
  });

  test(`${name}: Enter dismisses an open event modal and shows the next queued one`, () => {
    const g = newGame(name, noEvents);
    g.run("showEvent('First', 'one'); showEvent('Second', 'two')");
    assert.equal(g.hidden('eventOverlay'), false);
    g.key('Enter');
    assert.equal(g.hidden('eventOverlay'), false);
    assert.equal(g.el('eventTitle').textContent, 'Second');
    g.key('Enter');
    assert.ok(g.hidden('eventOverlay'));
  });

  test(`${name}: Enter handles an input dialog and an event modal together`, () => {
    const g = newGame(name, noEvents);
    g.run("showEvent('E', 'x'); openInput('deposit', 'D'); G.cash = 50");
    g.el('inputField').value = '10';
    g.key('Enter');
    assert.ok(g.hidden('inputOverlay'));
    assert.ok(g.hidden('eventOverlay'));
    assert.equal(g.run('G.bank'), 10);
  });

  test(`${name}: keys other than Enter and Escape change nothing`, () => {
    const g = newGame(name, noEvents);
    g.run("openInput('deposit', 'D'); openHelp(); openHighScores()");
    g.key('a');
    g.key(' ');
    assert.equal(g.hidden('inputOverlay'), false);
    assert.equal(g.hidden('helpOverlay'), false);
    assert.equal(g.hidden('highScoresOverlay'), false);
  });

  test(`${name}: Escape closes the input dialog, help and high scores, and clears the pending action`, () => {
    const g = newGame(name, noEvents);
    g.run("openInput('deposit', 'D'); openHelp(); openHighScores()");
    g.key('Escape');
    assert.ok(g.hidden('inputOverlay'));
    assert.ok(g.hidden('helpOverlay'));
    assert.ok(g.hidden('highScoresOverlay'));
    assert.equal(g.run('inputAction'), null);
  });

  test(`${name}: Escape closes settings during a game but not after the last day or before day 1`, () => {
    const g = newGame(name, noEvents);
    g.run('openSettings()');
    g.key('Escape');
    assert.ok(g.hidden('settingsOverlay'));
    g.run('G.day = G.maxDays; openSettings()');
    g.key('Escape');
    assert.ok(g.hidden('settingsOverlay'), 'last day still counts as in progress');
    g.run('G.day = G.maxDays + 1; openSettings()');
    g.key('Escape');
    assert.equal(g.hidden('settingsOverlay'), false);
    g.run('G.day = 0; openSettings()');
    g.key('Escape');
    assert.equal(g.hidden('settingsOverlay'), false);
  });

  test(`${name}: Escape does not close an open event modal`, () => {
    const g = newGame(name, noEvents);
    g.run("showEvent('E', 'x')");
    g.key('Escape');
    assert.equal(g.hidden('eventOverlay'), false);
  });
}

const fsx = require('node:fs');
const pathx = require('node:path');
for (const name of GAMES) {
  const css = () => fsx.readFileSync(pathx.join(__dirname, '..', name + '.html'), 'utf8');
  test(`${name}: stash names sit in a .drug-name span`, () => {
    const g = newGame(name, noEvents);
    const a = g.run('DRUGS[0].name');
    g.ctx.__s = { [a]: 3 };
    g.ctx.__p = { [a]: 150 };
    g.run('G.stash = __s; G.prices = __p; renderStash()');
    const span = g.el('stashList').children[0].querySelector('.drug-name');
    assert.ok(span);
    assert.equal(span.textContent, a);
  });
  test(`${name}: tall modals scroll and the layout styles are in place`, () => {
    const html = css();
    assert.match(html, /\.overlay, \.input-overlay, \.gameover \{ overflow-y: auto; padding: 8px; \}/);
    assert.match(html, /\.modal-box, \.input-box, \.go-box \{ margin: auto; \}/);
    assert.match(html, /@media \(max-width: 720px\)/);
    assert.doesNotMatch(html, /calc\(100vh - 52px\)/);
    assert.match(html, /#daysLeft \{ white-space: nowrap; \}/);
  });
}

// ---------- keyboard access, dialog semantics, labels (phase 6) ----------
for (const name of GAMES) {
  test(`${name}: city cells are buttons, the current one is disabled with aria-current`, () => {
    const g = newGame(name, noEvents);
    g.run('renderCities()');
    const cells = g.el('cityGrid').children.filter(c => c.classList.contains('city-btn'));
    assert.ok(cells.length > 1);
    for (const c of cells) assert.equal(c.tagName, 'BUTTON');
    const cur = cells.filter(c => c.classList.contains('current'));
    assert.equal(cur.length, 1);
    assert.equal(cur[0].disabled, true);
    assert.equal(cur[0].getAttribute('aria-current'), 'location');
    for (const c of cells.filter(c => !c.classList.contains('current'))) {
      assert.equal(c.disabled, false);
      assert.equal(c.getAttribute('aria-current'), null);
    }
    g.run('G.day = G.maxDays; renderCities()');
    const locked = g.el('cityGrid').children.filter(c => c.classList.contains('city-btn'));
    assert.ok(locked.every(c => c.disabled));
  });

  test(`${name}: tray toggles are buttons and aria-expanded follows the tray`, () => {
    const g = newGame(name, noEvents);
    const cash = g.el('toggle-cash'), debt = g.el('toggle-debt');
    assert.equal(cash.tagName, 'BUTTON');
    assert.equal(cash.getAttribute('aria-controls'), 'tray-cash');
    assert.equal(cash.getAttribute('aria-expanded'), 'false');
    g.call('toggleTray', 'cash');
    assert.equal(cash.getAttribute('aria-expanded'), 'true');
    g.call('toggleTray', 'debt');
    assert.equal(cash.getAttribute('aria-expanded'), 'false');
    assert.equal(debt.getAttribute('aria-expanded'), 'true');
    g.call('toggleTray', 'debt');
    assert.equal(debt.getAttribute('aria-expanded'), 'false');
  });

  test(`${name}: Enter on a focused button does not fire the dialog shortcuts`, () => {
    const g = newGame(name, noEvents);
    g.run("openInput('deposit', 'x')");
    g.document.dispatchEvent({ type: 'keydown', key: 'Enter', target: { tagName: 'BUTTON' } });
    assert.equal(g.hidden('inputOverlay'), false);
    g.key('Enter');
    assert.equal(g.hidden('inputOverlay'), true);
    g.run("showEvent('A', 'a'); showEvent('B', 'b')");
    g.document.dispatchEvent({ type: 'keydown', key: 'Enter', target: { tagName: 'BUTTON' } });
    assert.equal(g.el('eventTitle').textContent, 'A');
  });

  test(`${name}: every dialog box has role, aria-modal and a label that exists`, () => {
    const g = newGame(name, noEvents);
    const boxes = g.document.querySelectorAll('.modal-box').concat(g.document.querySelectorAll('.input-box'), g.document.querySelectorAll('.go-box'));
    assert.ok(boxes.length >= 8);
    for (const b of boxes) {
      assert.match(b.getAttribute('role'), /^(alert)?dialog$/);
      assert.equal(b.getAttribute('aria-modal'), 'true');
      assert.ok(g.el(b.getAttribute('aria-labelledby')), 'label target exists');
    }
    assert.equal(g.el('eventOverlay').querySelector('.modal-box').getAttribute('role'), 'alertdialog');
  });

  test(`${name}: opening a modal focuses its primary button`, () => {
    const g = newGame(name, noEvents);
    const focused = () => g.document.activeElement && g.document.activeElement.id;
    g.run("showEvent('E', 'x')");
    assert.equal(focused(), 'eventOk');
    g.run('dismissEvent()');
    g.run('openHelp()');
    assert.equal(focused(), 'helpClose');
    g.run('openHighScores()');
    assert.equal(focused(), 'scoresClose');
    g.run('maybeCoatOffer = maybeCoatOffer; Math.random = () => 0; maybeCoatOffer()');
    assert.equal(focused(), 'coatAccept');
    g.run('endGame()');
    assert.equal(focused(), 'playAgain');
  });

  test(`${name}: the fire sale modal focuses its accept button`, () => {
    const g = newGame(name, noEvents);
    g.run('G.day = 20; G.cash = 100000; leFireSale()');
    assert.equal(g.hidden('fireSaleOverlay'), false);
    assert.equal(g.document.activeElement.id, 'fireSaleAccept');
  });

  test(`${name}: market and stash controls have accessible names`, () => {
    const g = newGame(name, noEvents);
    const d = g.run('DRUGS[0].name');
    g.ctx.__s = { [d]: 2 };
    g.run('G.stash = __s; renderAll()');
    assert.equal(g.el('qty_' + d).getAttribute('aria-label'), `Quantity of ${d}`);
    const row = g.el('marketList').children[0];
    const names = row.querySelectorAll('button').map(b => b.getAttribute('aria-label'));
    assert.ok(names.includes(`Buy ${d}`));
    assert.ok(names.includes(`Buy max ${d}`));
    assert.equal(g.el('sqty_' + d).getAttribute('aria-label'), `Quantity of ${d} to sell`);
    assert.ok(g.el('stashList').querySelectorAll('button').some(b => b.getAttribute('aria-label') === `Sell ${d}`));
  });

  test(`${name}: amount field is labelled, numeric and selected on open`, () => {
    const g = newGame(name, noEvents);
    assert.equal(g.el('inputLabel').getAttribute('for'), 'inputField');
    assert.equal(g.el('inputField').getAttribute('inputmode'), 'numeric');
    let selected = 0;
    g.el('inputField').select = () => { selected++; };
    g.run("openInput('deposit', 'x')");
    assert.equal(selected, 1);
    assert.equal(g.document.activeElement.id, 'inputField');
  });

  test(`${name}: settings groups are labelled and options expose aria-pressed`, () => {
    const g = newGame(name, noEvents);
    const groups = g.document.querySelectorAll('.setting-opts');
    assert.ok(groups.length >= 8);
    for (const grp of groups) {
      assert.equal(grp.getAttribute('role'), 'group');
      assert.ok(grp.getAttribute('aria-label'));
    }
    g.run("applyPreset('easy')");
    const pressed = id => g.document.querySelectorAll(`#${id} .sopt`).filter(b => b.getAttribute('aria-pressed') === 'true').length;
    assert.equal(pressed('set-difficulty'), 1);
    assert.equal(pressed('set-days'), 1);
    const th = g.document.querySelectorAll('#set-theme .sopt')[1];
    g.run(`selectTheme('${th.dataset.theme}')`);
    assert.equal(th.getAttribute('aria-pressed'), 'true');
    assert.equal(pressed('set-theme'), 1);
  });
}

test('dopewars: Escape closes the safehouse and focuses its close button on open', () => {
  const g = newGame('dopewars', noEvents);
  g.run('G.hasSafehouse = true; openSafehouse()');
  assert.equal(g.hidden('safehouseOverlay'), false);
  assert.equal(g.document.activeElement.id, 'safehouseClose');
  g.key('Escape');
  assert.equal(g.hidden('safehouseOverlay'), true);
});
