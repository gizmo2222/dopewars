'use strict';
// New game state, bank/loan input, persistence, high scores and game over, in both games.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, newGame, GAMES } = require('./harness');

const noEvents = { events: 0 };

// Log text that differs between the two themes.
const TEXT = {
  dopewars: {
    welcome: 'Welcome to Dope Wars. 30 days. Make your fortune.',
    owe: 'You owe $5,000 to the loan shark at 10%/day.',
    sub: '30 DAYS TO MAKE YOUR FORTUNE',
    dep: a => `Deposited ${a}.`,
    wd: a => `Withdrew ${a}.`,
    paid: (a, r) => `Paid ${a} on debt. Remaining: ${r}.`,
    cleared: 'DEBT CLEARED! You are free!',
    borrowed: (a, t, r) => `Borrowed ${a} from the loan shark. Total debt: ${t}. Remaining today: ${r}.`,
    noMore: "Loan shark won't lend any more today.",
    noCash: 'No cash to pay debt with.',
    bankEmpty: 'Nothing in the bank to withdraw.',
    wdAll: a => `Withdrew all ${a} from the bank.`,
    restored: 'Session restored. Welcome back.',
    goCash: 'Cash on hand: ', goBank: 'Bank: ', goDebt: 'Debt owed: ',
    titles: ['BROKE & BURIED', 'SURVIVOR', 'STREET HUSTLER', 'MADE MAN', 'KINGPIN!'],
  },
  candywars: {
    welcome: 'Welcome to Candy Wars! 30 days to build your candy empire.',
    owe: 'You borrowed $5,000 from your parents at 10%/day interest.',
    sub: '30 DAYS TO BUILD YOUR CANDY EMPIRE',
    dep: a => `Saved ${a} to your piggy bank.`,
    wd: a => `Took ${a} from your piggy bank.`,
    paid: (a, r) => `Paid ${a} back to your parents. Still owe: ${r}.`,
    cleared: 'DEBT CLEARED! You paid it all back!',
    borrowed: (a, t, r) => `Got ${a} advance from parents. Total owed: ${t}. Can borrow more today: ${r}.`,
    noMore: "Your parents won't advance any more today.",
    noCash: 'Not enough coins to pay your parents.',
    bankEmpty: 'Your piggy bank is empty.',
    wdAll: a => `Emptied your piggy bank: ${a}.`,
    restored: 'Session restored. Welcome back, candy trader!',
    goCash: 'Coins on hand: ', goBank: 'Piggy Bank: ', goDebt: 'Owe parents: ',
    titles: ['BROKE KID', 'SMALL TIMER', 'SWEET SELLER', 'SUGAR BARON', 'CANDY TYCOON!'],
  },
};

const scoresOf = g => JSON.parse(g.localStorage.getItem(g.name + '_scores') || '[]');
const first = g => g.logLines()[0];

/** Open the amount dialog for `action`, type `value`, press OK. */
function submit(g, action, value) {
  g.call('openInput', action, 'How much?');
  g.el('inputField').value = value;
  g.run('confirmInput()');
}

for (const name of GAMES) {
  const T = TEXT[name];

  // ---- newGame ----
  test(`${name}: newGame builds the starting state from settings`, () => {
    const g = newGame(name, { ...noEvents, cash: 2500, debt: 5000, days: 30, coat: 40, interest: 1.1 });
    const s = g.run('G');
    assert.equal(s.day, 1);
    assert.equal(s.maxDays, 30);
    assert.equal(s.cash, 2500);
    assert.equal(s.bank, 0);
    assert.equal(s.debt, 5000);
    assert.equal(s.coat, 40);
    assert.equal(s.borrowedToday, 0);
    assert.equal(s.carTripsToday, 0);
    assert.equal(s.ended, false);
    assert.equal(s.heatDay, false);
    assert.equal(s.coatsBought, 0);
    assert.equal(s.shown3DayWarning, false);
    assert.equal(s.shownEndGamePopup, false);
    assert.equal(s.supplierUsedToday, false);
    assert.equal(s.supplierBoughtDrug, null);
    assert.equal(s.supplierBurnedUntil, 0);
    assert.equal(s.corneredDrug, null);
    assert.equal(s.corneredUntil, 0);
    assert.equal(s.tippedCity, null);
    assert.equal(s.tippedExpiry, 0);
    assert.equal(s.pendingFireSale, null);
    assert.equal(s.hasGun, false);
    assert.equal(s.hasBurner, false);
    assert.equal(s.hasCar, false);
    assert.equal(s.hasSupplier, false);
    assert.deepEqual(JSON.parse(JSON.stringify(s.stash)), {});
    assert.deepEqual(JSON.parse(JSON.stringify(s.safehouse)), {});
    assert.deepEqual(JSON.parse(JSON.stringify(s.avgCost)), {});
    assert.equal(s.city, g.run('CITIES[0].name'));
  });

  test(`${name}: newGame logs the welcome and the debt line, and sets the header`, () => {
    const g = newGame(name, { ...noEvents, cash: 2000, debt: 5000, days: 30, interest: 1.1 });
    const lines = g.logLines();
    assert.equal(lines[1], T.welcome);
    assert.equal(lines[0], T.owe);
    assert.match(g.el('headerSub').textContent, new RegExp('^' + T.sub));
    assert.match(g.el('headerSub').textContent, /10%\/DAY INTEREST$/);
  });

  test(`${name}: newGame with no debt logs no debt line; interest 1.15 shows 15%`, () => {
    const g = newGame(name, { ...noEvents, debt: 0, interest: 1.15 });
    assert.equal(first(g), T.welcome);
    assert.match(g.el('headerSub').textContent, /15%\/DAY INTEREST/);
  });

  test(`${name}: newGame hides game over and event overlays and clears the event queue`, () => {
    const g = newGame(name, noEvents);
    g.run('endGame()');
    assert.equal(g.hidden('gameOver'), false);
    g.el('eventOverlay').classList.remove('hidden');
    g.run('eventQueue = [1, 2]');
    g.run('newGame()');
    assert.equal(g.hidden('gameOver'), true);
    assert.equal(g.hidden('eventOverlay'), true);
    assert.equal(g.run('eventQueue.length'), 0);
    assert.equal(g.run('G.ended'), false);
  });

  test(`${name}: newGame generates a market`, () => {
    const g = newGame(name, noEvents);
    assert.ok(g.run('Object.keys(G.prices).length') > 0);
    assert.ok(g.run('Object.values(G.prices).every(p => p > 0)'));
  });

  // ---- openInput / closeInput ----
  test(`${name}: openInput shows the dialog with label and zeroed field; closeInput hides it`, () => {
    const g = newGame(name, noEvents);
    g.el('inputField').value = 77;
    g.call('openInput', 'deposit', 'Deposit how much?');
    assert.equal(g.hidden('inputOverlay'), false);
    assert.equal(g.el('inputLabel').textContent, 'Deposit how much?');
    assert.equal(String(g.el('inputField').value), '0');
    assert.equal(g.run('inputAction'), 'deposit');
    g.run('closeInput()');
    assert.equal(g.hidden('inputOverlay'), true);
    assert.equal(g.run('inputAction'), null);
  });

  // ---- deposit ----
  test(`${name}: deposit moves cash to the bank and closes the dialog`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 1000; G.bank = 50');
    submit(g, 'deposit', '300');
    assert.equal(g.run('G.cash'), 700);
    assert.equal(g.run('G.bank'), 350);
    assert.equal(first(g), T.dep('$300'));
    assert.equal(g.hidden('inputOverlay'), true);
  });

  test(`${name}: deposit over the cash on hand deposits only what you have`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 400; G.bank = 0');
    submit(g, 'deposit', '9999');
    assert.equal(g.run('G.cash'), 0);
    assert.equal(g.run('G.bank'), 400);
    assert.equal(first(g), T.dep('$400'));
  });

  test(`${name}: deposit of exactly all cash works`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 400; G.bank = 0');
    submit(g, 'deposit', '400');
    assert.equal(g.run('G.cash'), 0);
    assert.equal(g.run('G.bank'), 400);
  });

  // ---- withdraw ----
  test(`${name}: withdraw moves bank to cash`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 10; G.bank = 900');
    submit(g, 'withdraw', '250');
    assert.equal(g.run('G.cash'), 260);
    assert.equal(g.run('G.bank'), 650);
    assert.equal(first(g), T.wd('$250'));
  });

  test(`${name}: withdraw over the balance takes only the balance`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 10; G.bank = 300');
    submit(g, 'withdraw', '5000');
    assert.equal(g.run('G.cash'), 310);
    assert.equal(g.run('G.bank'), 0);
    assert.equal(first(g), T.wd('$300'));
  });

  // ---- repay ----
  test(`${name}: repay reduces cash and debt and logs the remainder`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 1000; G.debt = 800');
    submit(g, 'loan', '300');
    assert.equal(g.run('G.cash'), 700);
    assert.equal(g.run('G.debt'), 500);
    assert.equal(first(g), T.paid('$300', '$500'));
  });

  test(`${name}: repay is capped by cash`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 200; G.debt = 800');
    submit(g, 'loan', '500');
    assert.equal(g.run('G.cash'), 0);
    assert.equal(g.run('G.debt'), 600);
    assert.equal(first(g), T.paid('$200', '$600'));
  });

  test(`${name}: repay is capped by debt and clearing it logs the celebration`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 1000; G.debt = 150');
    submit(g, 'loan', '999');
    assert.equal(g.run('G.cash'), 850);
    assert.equal(g.run('G.debt'), 0);
    const lines = g.logLines();
    assert.equal(lines[0], T.cleared);
    assert.equal(lines[1], T.paid('$150', '$0'));
  });

  test(`${name}: repay with a partial payment does not log debt cleared`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 1000; G.debt = 150');
    submit(g, 'loan', '100');
    assert.ok(!g.logLines().includes(T.cleared));
  });

  test(`${name}: repay with no debt says so and changes nothing`, () => {
    const g = newGame(name, { ...noEvents, debt: 0 });
    g.run('G.cash = 500; G.debt = 0');
    submit(g, 'loan', '100');
    assert.equal(g.run('G.cash'), 500);
    assert.equal(first(g), 'No debt to pay.');
    assert.equal(g.hidden('inputOverlay'), true);
  });

  // ---- borrow ----
  test(`${name}: borrow adds cash and debt and tracks the daily total`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 100; G.debt = 1000; G.borrowedToday = 0');
    submit(g, 'borrow', '2000');
    assert.equal(g.run('G.cash'), 2100);
    assert.equal(g.run('G.debt'), 3000);
    assert.equal(g.run('G.borrowedToday'), 2000);
    assert.equal(first(g), T.borrowed('$2,000', '$3,000', '$8,000'));
  });

  test(`${name}: borrow is capped at 10,000 a day across several loans`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 0; G.debt = 0; G.borrowedToday = 7000');
    submit(g, 'borrow', '5000');
    assert.equal(g.run('G.cash'), 3000);
    assert.equal(g.run('G.debt'), 3000);
    assert.equal(g.run('G.borrowedToday'), 10000);
    assert.equal(first(g), T.borrowed('$3,000', '$3,000', '$0'));
  });

  test(`${name}: borrow after the daily limit is refused`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 5; G.debt = 0; G.borrowedToday = 10000');
    submit(g, 'borrow', '100');
    assert.equal(g.run('G.cash'), 5);
    assert.equal(g.run('G.debt'), 0);
    assert.equal(first(g), T.noMore);
  });

  test(`${name}: borrow with an undefined borrowedToday counts as zero`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 0; G.debt = 0; G.borrowedToday = undefined');
    submit(g, 'borrow', '100');
    assert.equal(g.run('G.cash'), 100);
    assert.equal(g.run('G.debt'), 100);
  });

  test(`${name}: openBorrow refuses before day 3 and opens the dialog from day 3`, () => {
    const g = newGame(name, noEvents);
    g.run('G.day = 2; openBorrow()');
    assert.equal(g.hidden('inputOverlay'), true);
    assert.match(first(g), /day 3/);
    g.run('G.day = 3; G.borrowedToday = 4000; openBorrow()');
    assert.equal(g.hidden('inputOverlay'), false);
    assert.match(g.el('inputLabel').textContent, /\$6,000/);
    assert.equal(g.run('inputAction'), 'borrow');
  });

  // ---- invalid amounts ----
  for (const action of ['deposit', 'withdraw', 'loan', 'borrow']) {
    for (const bad of ['0', '-50', 'abc', '', '   ']) {
      test(`${name}: ${action} with amount ${JSON.stringify(bad)} is rejected and changes nothing`, () => {
        const g = newGame(name, noEvents);
        g.run('G.cash = 500; G.bank = 500; G.debt = 500; G.borrowedToday = 0');
        submit(g, action, bad);
        assert.equal(g.run('G.cash'), 500);
        assert.equal(g.run('G.bank'), 500);
        assert.equal(g.run('G.debt'), 500);
        assert.equal(g.run('G.borrowedToday'), 0);
        assert.equal(first(g), 'Enter an amount above $0.');
        assert.equal(g.hidden('inputOverlay'), true);
      });
    }
  }

  test(`${name}: a decimal amount is truncated to a whole number`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 500; G.bank = 0');
    submit(g, 'deposit', '12.9');
    assert.equal(g.run('G.bank'), 12);
  });

  test(`${name}: confirmInput with no pending action changes nothing`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 500; G.bank = 0; G.debt = 500');
    g.el('inputField').value = 100;
    g.run('inputAction = null; confirmInput()');
    assert.equal(g.run('G.cash'), 500);
    assert.equal(g.run('G.bank'), 0);
    assert.equal(g.run('G.debt'), 500);
  });

  // ---- payAllLoan ----
  test(`${name}: payAllLoan pays the lesser of cash and debt`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 300; G.debt = 1000');
    g.run('payAllLoan()');
    assert.equal(g.run('G.cash'), 0);
    assert.equal(g.run('G.debt'), 700);
    assert.equal(first(g), T.paid('$300', '$700'));
  });

  test(`${name}: payAllLoan clears the debt when cash covers it`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 1500; G.debt = 1000');
    g.run('payAllLoan()');
    assert.equal(g.run('G.cash'), 500);
    assert.equal(g.run('G.debt'), 0);
    assert.equal(g.logLines()[0], T.cleared);
  });

  test(`${name}: payAllLoan with exactly enough cash clears the debt`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 1000; G.debt = 1000');
    g.run('payAllLoan()');
    assert.equal(g.run('G.cash'), 0);
    assert.equal(g.run('G.debt'), 0);
    assert.equal(g.logLines()[0], T.cleared);
  });

  test(`${name}: payAllLoan with no debt or no cash says so`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 100; G.debt = 0');
    g.run('payAllLoan()');
    assert.equal(first(g), 'No debt to pay.');
    assert.equal(g.run('G.cash'), 100);
    g.run('G.cash = 0; G.debt = 400');
    g.run('payAllLoan()');
    assert.equal(first(g), T.noCash);
    assert.equal(g.run('G.debt'), 400);
  });

  // ---- withdrawAll ----
  test(`${name}: withdrawAll moves the whole balance to cash`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 20; G.bank = 880');
    g.run('withdrawAll()');
    assert.equal(g.run('G.cash'), 900);
    assert.equal(g.run('G.bank'), 0);
    assert.equal(first(g), T.wdAll('$880'));
  });

  test(`${name}: withdrawAll with an empty bank says so`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 20; G.bank = 0');
    g.run('withdrawAll()');
    assert.equal(g.run('G.cash'), 20);
    assert.equal(first(g), T.bankEmpty);
  });

  test(`${name}: money actions re-render the cash display`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 1000; G.bank = 0');
    submit(g, 'deposit', '400');
    assert.match(g.el('cashDisplay').textContent, /600/);
    g.run('withdrawAll()');
    assert.match(g.el('cashDisplay').textContent, /1,000/);
  });

  // ---- persistence ----
  test(`${name}: saveGame writes the game and settings under the ${name}_ keys`, () => {
    const g = newGame(name, { ...noEvents, cash: 3333 });
    g.run('G.cash = 4242; saveGame()');
    assert.equal(JSON.parse(g.localStorage.getItem(name + '_game')).cash, 4242);
    assert.equal(JSON.parse(g.localStorage.getItem(name + '_settings')).cash, 3333);
    const other = name === 'dopewars' ? 'candywars' : 'dopewars';
    assert.equal(g.localStorage.getItem(other + '_game'), null);
  });

  test(`${name}: saved game and settings round trip through a reload`, () => {
    const g = newGame(name, { ...noEvents, days: 45, debt: 7000, interest: 1.15 });
    g.run('G.day = 9; G.cash = 1234; G.bank = 55; G.debt = 6000; G.hasGun = true; G.borrowedToday = 2500');
    g.run('saveGame()');
    const storage = {
      [name + '_game']: g.localStorage.getItem(name + '_game'),
      [name + '_settings']: g.localStorage.getItem(name + '_settings'),
    };
    const g2 = loadGame(name, { storage });
    assert.equal(g2.run('G.day'), 9);
    assert.equal(g2.run('G.cash'), 1234);
    assert.equal(g2.run('G.bank'), 55);
    assert.equal(g2.run('G.debt'), 6000);
    assert.equal(g2.run('G.hasGun'), true);
    assert.equal(g2.run('G.borrowedToday'), 2500);
    assert.equal(g2.run('SETTINGS.days'), 45);
    assert.equal(g2.run('SETTINGS.debt'), 7000);
    assert.equal(g2.run('SETTINGS.interest'), 1.15);
    assert.equal(g2.logLines()[0], T.restored);
    assert.match(g2.el('headerSub').textContent, /• 15%\/DAY INTEREST/);
    assert.match(g2.el('headerSub').textContent, /^45 DAYS/);
    assert.equal(g2.hidden('gameOver'), true);
  });

  test(`${name}: loadSavedGame returns true on a good save and false with none`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 4321; saveGame()');
    const g2 = loadGame(name, { storage: { [name + '_game']: g.localStorage.getItem(name + '_game') } });
    assert.equal(g2.run('G.cash'), 4321);
    g2.run('G.cash = 1');
    assert.equal(g2.run('loadSavedGame()'), true);
    const g3 = loadGame(name);
    g3.localStorage.removeItem(name + '_game');
    assert.equal(g3.run('loadSavedGame()'), false);
  });

  test(`${name}: loadSavedGame works without saved settings`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 777; saveGame()');
    const g2 = loadGame(name, { storage: { [name + '_game']: g.localStorage.getItem(name + '_game') } });
    assert.equal(g2.run('G.cash'), 777);
  });

  test(`${name}: a save past its last day is not resumed`, () => {
    const g = newGame(name, noEvents);
    g.run('G.day = G.maxDays + 1; saveGame()');
    const g2 = loadGame(name, { storage: { [name + '_game']: g.localStorage.getItem(name + '_game') } });
    assert.ok(!g2.logLines().includes(T.restored));
    assert.equal(g2.run('G.day'), 1);
  });

  test(`${name}: a save on exactly its last day is resumed`, () => {
    const g = newGame(name, noEvents);
    g.run('G.day = G.maxDays; saveGame()');
    const g2 = loadGame(name, { storage: { [name + '_game']: g.localStorage.getItem(name + '_game') } });
    assert.ok(g2.logLines().includes(T.restored));
  });

  test(`${name}: a save flagged ended is not resumed`, () => {
    const g = newGame(name, noEvents);
    g.run('G.ended = true; saveGame()');
    const g2 = loadGame(name, { storage: { [name + '_game']: g.localStorage.getItem(name + '_game') } });
    assert.ok(!g2.logLines().includes(T.restored));
    assert.equal(g2.run('G.ended'), false);
  });

  test(`${name}: corrupt JSON in the game key starts a new game with the settings modal`, () => {
    const g = loadGame(name, { storage: { [name + '_game']: '{not json' } });
    assert.equal(g.run('G.day'), 1);
    assert.equal(g.hidden('settingsOverlay'), false);
    assert.ok(!g.logLines().includes(T.restored));
  });

  test(`${name}: corrupt JSON in the settings key makes the save unloadable, not a crash`, () => {
    const g = newGame(name, noEvents);
    g.run('saveGame()');
    const g2 = loadGame(name, { storage: { [name + '_game']: g.localStorage.getItem(name + '_game'), [name + '_settings']: '}{' } });
    assert.ok(!g2.logLines().includes(T.restored));
    assert.equal(g2.run('G.day'), 1);
  });

  test(`${name}: saveGame swallows storage errors`, () => {
    const g = newGame(name, noEvents);
    g.localStorage.setItem = () => { throw new Error('quota'); };
    assert.doesNotThrow(() => g.run('saveGame()'));
  });

  // ---- high scores ----
  test(`${name}: loadScores returns [] when there are none or the JSON is corrupt`, () => {
    const g = loadGame(name);
    assert.equal(g.run('loadScores().length'), 0);
    const g2 = loadGame(name, { storage: { [name + '_scores']: 'oops[' } });
    assert.equal(g2.run('Array.isArray(loadScores()) && loadScores().length'), 0);
  });

  test(`${name}: saveScore records the run's settings and keeps scores best first`, () => {
    const g = newGame(name, { ...noEvents, days: 30, cash: 2000, debt: 5000, interest: 1.1 });
    g.run('saveScore(100)');
    g.run('saveScore(900)');
    const out = g.run('saveScore(-50).map(s => s.net)');
    assert.deepEqual(Array.from(out), [900, 100, -50]);
    assert.deepEqual(scoresOf(g).map(s => s.net), [900, 100, -50]);
    const s = scoresOf(g)[0];
    assert.equal(s.days, 30);
    assert.equal(s.cash, 2000);
    assert.equal(s.debt, 5000);
    assert.equal(s.interest, 1.1);
    assert.equal(typeof s.date, 'string');
    assert.ok(s.date.length > 0);
  });

  test(`${name}: only the top 10 scores are kept`, () => {
    const g = newGame(name, noEvents);
    for (let i = 1; i <= 12; i++) g.run(`saveScore(${i * 100})`);
    const nets = scoresOf(g).map(s => s.net);
    assert.equal(nets.length, 10);
    assert.deepEqual(nets, [1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300]);
    g.run('saveScore(50)');
    assert.equal(scoresOf(g).length, 10);
    assert.equal(scoresOf(g)[9].net, 300);
    g.run('saveScore(350)');
    assert.equal(scoresOf(g)[9].net, 350);
  });

  test(`${name}: saveScore survives corrupt stored scores and a failing write`, () => {
    const g = newGame(name, noEvents);
    g.localStorage.setItem(name + '_scores', 'garbage');
    assert.equal(g.run('saveScore(10).length'), 1);
    assert.equal(scoresOf(g).length, 1);
    g.localStorage.setItem = () => { throw new Error('quota'); };
    assert.doesNotThrow(() => g.run('saveScore(20)'));
  });

  test(`${name}: renderHighScores shows an empty message, a crown, ranks, signs and colours`, () => {
    const g = newGame(name, noEvents);
    g.run('renderHighScores([])');
    assert.match(g.el('highScoreTable').innerHTML, /No scores yet\./);
    g.ctx.__sc = [
      { net: 5000, days: 30, cash: 2000, debt: 5000, interest: 1.1, date: 'D1' },
      { net: 0, days: 20, cash: 1000, debt: 0, interest: 1.05, date: 'D2' },
      { net: -300, days: 10, cash: 3000, debt: 0, interest: 1.2, date: 'D3' },
    ];
    g.run('renderHighScores(__sc)');
    const html = g.el('highScoreTable').innerHTML;
    assert.match(html, /👑/);
    assert.match(html, /#2/);
    assert.match(html, /#3/);
    assert.ok(!/#1\b/.test(html));
    assert.match(html, /30d · \$2,000 start · 10% int · D1/);
    assert.match(html, /20d · \$1,000 start · 5% int · D2/);
    assert.match(html, /10d · \$3,000 start · 20% int · D3/);
    assert.match(html, /color:var\(--green\)[^>]*>\$5,000/);
    assert.match(html, /color:var\(--red\)[^>]*>\$0</);
    assert.match(html, /color:var\(--red\)[^>]*>-\$300</);
    assert.ok(!/>-\$5,000/.test(html));
  });

  test(`${name}: renderHighScores can target another element`, () => {
    const g = newGame(name, noEvents);
    g.ctx.__sc = [{ net: 10, days: 30, cash: 1, debt: 0, interest: 1.1, date: 'x' }];
    g.run("renderHighScores(__sc, 'highScoreTableModal')");
    assert.match(g.el('highScoreTableModal').innerHTML, /\$10/);
    g.run("renderHighScores([], 'highScoreTableModal')");
    assert.match(g.el('highScoreTableModal').innerHTML, /No scores yet/);
  });

  // ---- boundary values (one-unit edges) ----
  test(`${name}: one-dollar amounts are not treated as zero`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 10; G.bank = 1; G.debt = 1; G.borrowedToday = 9999');
    submit(g, 'loan', '1');
    assert.equal(g.run('G.debt'), 0);
    assert.equal(g.run('G.cash'), 9);
    submit(g, 'deposit', '1');
    assert.equal(g.run('G.bank'), 2);
    submit(g, 'borrow', '500');
    assert.equal(g.run('G.cash'), 9 - 1 + 1);
    assert.equal(g.run('G.debt'), 1);
    assert.equal(g.run('G.borrowedToday'), 10000);
  });

  test(`${name}: payAllLoan and withdrawAll work with a single dollar`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 1; G.debt = 5; G.bank = 1');
    g.run('payAllLoan()');
    assert.equal(g.run('G.debt'), 4);
    assert.equal(g.run('G.cash'), 0);
    g.run('G.debt = 1; G.cash = 1; payAllLoan()');
    assert.equal(g.run('G.debt'), 0);
    g.run('withdrawAll()');
    assert.equal(g.run('G.bank'), 0);
    assert.equal(g.run('G.cash'), 1);
  });

  test(`${name}: a $1 starting debt still logs the debt line`, () => {
    const g = newGame(name, { ...noEvents, debt: 1 });
    assert.match(first(g), /\$1 /);
  });

  test(`${name}: header interest percent is rounded from the multiplier`, () => {
    const g = newGame(name, { ...noEvents, interest: 1.5 });
    assert.match(g.el('headerSub').textContent, /• 50%\/DAY INTEREST$/);
    g.run('saveGame()');
    const g2 = loadGame(name, { storage: {
      [name + '_game']: g.localStorage.getItem(name + '_game'),
      [name + '_settings']: g.localStorage.getItem(name + '_settings'),
    } });
    assert.match(g2.el('headerSub').textContent, /• 50%\/DAY INTEREST$/);
  });

  test(`${name}: an unknown saved theme falls back to the default theme header`, () => {
    const g = newGame(name, noEvents);
    const def = g.el('headerSub').textContent;
    g.run("SETTINGS.theme = 'bogus'; newGame()");
    assert.equal(g.el('headerSub').textContent, def);
    g.run("SETTINGS.theme = 'bogus'; saveGame()");
    g.el('headerSub').textContent = '';
    assert.equal(g.run('loadSavedGame()'), true);
    assert.equal(g.el('headerSub').textContent, def);
  });

  test(`${name}: a score of $1 is shown green`, () => {
    const g = newGame(name, noEvents);
    g.ctx.__sc = [{ net: 1, days: 30, cash: 1, debt: 0, interest: 1.5, date: 'x' }];
    g.run('renderHighScores(__sc)');
    const html = g.el('highScoreTable').innerHTML;
    assert.match(html, /color:var\(--green\)/);
    assert.match(html, /50% int/);
  });

  // ---- endGame ----
  test(`${name}: endGame computes net worth as cash plus bank minus debt and shows the breakdown`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 12000; G.bank = 3000; G.debt = 4000; endGame()');
    const html = g.el('goScore').innerHTML;
    assert.ok(html.includes(T.goCash + '$12,000<br>'));
    assert.ok(html.includes(T.goBank + '$3,000<br>'));
    assert.ok(html.includes(T.goDebt + (name === 'candywars' ? '' : '−') + '$4,000<br>'));
    assert.ok(html.includes('<strong>Net Worth: $11,000</strong>'));
    assert.equal(g.hidden('gameOver'), false);
    assert.equal(scoresOf(g)[0].net, 11000);
    assert.match(g.el('highScoreTable').innerHTML, /\$11,000/);
  });

  test(`${name}: endGame picks the title by net worth bands`, () => {
    const cases = [
      [-1, 0], [0, 0], [1, 1], [10000, 1], [10001, 2], [50000, 2], [50001, 3], [100000, 3], [100001, 4],
    ];
    for (const [net, idx] of cases) {
      const g = newGame(name, noEvents);
      g.run(`G.cash = ${net}; G.bank = 0; G.debt = 0; endGame()`);
      assert.equal(g.el('goTitle').textContent, T.titles[idx], `net ${net}`);
    }
  });

  test(`${name}: endGame flavour text differs per band`, () => {
    const seen = new Set();
    for (const net of [-5, 5, 20000, 60000, 200000]) {
      const g = newGame(name, noEvents);
      g.run(`G.cash = ${net}; G.bank = 0; G.debt = 0; endGame()`);
      const html = g.el('goScore').innerHTML;
      seen.add(html.slice(html.lastIndexOf('<br><br>') + 8));
    }
    assert.equal(seen.size, 5);
  });

  test(`${name}: endGame saves the game as ended and a second call does nothing`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 100; G.bank = 0; G.debt = 0; endGame()');
    assert.equal(JSON.parse(g.localStorage.getItem(name + '_game')).ended, true);
    assert.equal(g.run('G.ended'), true);
    g.run('G.cash = 99999; endGame()');
    assert.equal(scoresOf(g).length, 1);
    assert.equal(scoresOf(g)[0].net, 100);
  });

  test(`${name}: endGame with negative net worth uses the lowest title and a minus sign`, () => {
    const g = newGame(name, noEvents);
    g.run('G.cash = 100; G.bank = 0; G.debt = 600; endGame()');
    assert.equal(g.el('goTitle').textContent, T.titles[0]);
    assert.ok(g.el('goScore').innerHTML.includes('Net Worth: -$500'));
  });
}
