// Screenshot every screen of both games at phone, tablet and desktop widths, using headless
// Chromium over the DevTools protocol (Node 24 built-in WebSocket, no npm packages).
// Also writes report.json with automated layout checks per shot.
// Usage: node tools/screens.js --out <dir> [--chrome <chrome.exe>] [--games dopewars,candywars]
//        [--widths phone,tablet,desktop] [--screens main,help] [--dry-run]
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const OUT = path.resolve(opt('out', path.join(require('os').tmpdir(), 'dopewars-screens')));
const GAMES = opt('games', 'dopewars,candywars').split(',');
const WIDTHS = { phone: [375, 812, true], tablet: [768, 1024, true], desktop: [1280, 800, false] };
const PICK_W = opt('widths', Object.keys(WIDTHS).join(',')).split(',');
const DRY = args.includes('--dry-run');

function findChrome() {
  const given = opt('chrome');
  if (given) return given;
  // Installed Chrome/Edge first: Playwright's Chromium builds can be half-installed.
  for (const p of ['C:/Program Files/Google/Chrome/Application/chrome.exe',
                   'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']) {
    if (fs.existsSync(p)) return p;
  }
  const base = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  if (fs.existsSync(base)) {
    const dirs = fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort().reverse();
    for (const d of dirs) {
      const exe = path.join(base, d, 'chrome-win64', 'chrome.exe');
      if (fs.existsSync(exe)) return exe;
    }
  }
  throw new Error('No Chromium found; pass --chrome <path>');
}

// Each screen: setup code run in the page after a fresh load (empty localStorage), and whether
// to capture the full scrollable page (true) or just the viewport (modals).
const START = 'startFromSettings();';
const HIDE = "document.querySelectorAll('.overlay,.input-overlay').forEach(o=>o.classList.add('hidden'));";
const PLAY = START + `
  Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  SETTINGS.events = 0;
  buyMax(DRUGS[DRUGS.length - 1].name);
  travel(CITIES[1].name); ${HIDE}
  travel(CITIES[2].name); ${HIDE}
  buyMax(DRUGS[0].name); ${HIDE}
  travel(CITIES[3].name); ${HIDE}
  renderAll();`;
const SCREENS = {
  settings:     ['', false],
  main:         [START, true],
  'main-play':  [PLAY, true],
  tray:         [PLAY + "toggleTray('debt');", false],
  event:        [START + "showEvent(EVENTS[0].title || 'EVENT', 'Somebody tipped off the cops. You ditched 12 units running down an alley, and lost $340 in the scramble.');", false],
  coat:         [START + 'const r = Math.random; Math.random = () => 0.01; maybeCoatOffer(); Math.random = r;', false],
  firesale:     [START + 'leFireSale();', false],
  safehouse:    [START + "if (typeof openSafehouse === 'function') { G.hasSafehouse = true; G.stash[DRUGS[0].name] = 20; openSafehouse(); } else { throw new Error('skip'); }", false],
  input:        [START + "openInput('deposit', 'Deposit how much?');", false],
  borrow:       [START + 'G.day = 5; openBorrow();', false],
  help:         [START + 'openHelp();', false],
  'scores-empty': [START + 'openHighScores();', false],
  scores:       [START + "G.cash = 48200; endGame(); " + HIDE + " document.getElementById('gameOver').classList.add('hidden'); openHighScores();", false],
  gameover:     [START + 'G.cash = 48200; G.bank = 3000; endGame();', false],
  'gameover-loss': [START + 'G.cash = 0; G.debt = 90000; endGame();', false],
};
const PICK_S = opt('screens', Object.keys(SCREENS).join(',')).split(',');

// Automated checks run after setup: overflow, small tap targets, tiny text, unnamed buttons.
const CHECKS = `(() => {
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const topOverlay = [...document.querySelectorAll('.overlay,.input-overlay,#gameOver')].filter(o => !o.classList.contains('hidden') && vis(o)).pop();
  const scope = topOverlay || document.body;
  const btns = [...scope.querySelectorAll('button, [onclick], input, select, a')].filter(vis);
  const small = btns.filter(b => { const r = b.getBoundingClientRect(); return r.height < 32 || r.width < 32; })
    .map(b => (b.id || b.className || b.tagName) + ' ' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height) + ' "' + (b.textContent || '').trim().slice(0, 20) + '"');
  const unnamed = btns.filter(b => b.tagName === 'BUTTON' && !(b.textContent.trim() || b.getAttribute('aria-label') || b.title)).length;
  const texts = [...scope.querySelectorAll('*')].filter(e => vis(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
  const tiny = texts.filter(e => parseFloat(getComputedStyle(e).fontSize) < 11).map(e => (e.id || e.className || e.tagName) + ' ' + getComputedStyle(e).fontSize).slice(0, 15);
  const wide = [...document.querySelectorAll('body *')].filter(e => vis(e) && e.getBoundingClientRect().right > innerWidth + 1).map(e => e.id || e.className || e.tagName).slice(0, 10);
  return { overlay: topOverlay ? topOverlay.id : null, scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
    small: [...new Set(small)].slice(0, 25), unnamed, tiny: [...new Set(tiny)], wide: [...new Set(wide)] };
})()`;

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.wait = new Map();
    ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.wait.has(d.id)) { const [ok, bad] = this.wait.get(d.id); this.wait.delete(d.id); d.error ? bad(new Error(d.error.message)) : ok(d.result); } }; }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((ok, bad) => this.wait.set(id, [ok, bad])); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const plan = [];
  for (const g of GAMES) for (const w of PICK_W) for (const s of PICK_S) plan.push([g, w, s]);
  if (DRY) { console.log(`Would write ${plan.length} screenshots to ${OUT}`); return; }
  fs.mkdirSync(OUT, { recursive: true });
  const profile = fs.mkdtempSync(path.join(require('os').tmpdir(), 'screens-profile-'));
  const port = 9300 + Math.floor(Math.random() * 500);
  const chrome = spawn(findChrome(), ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--allow-file-access-from-files', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 50 && !targets; i++) {
    await sleep(200);
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { /* not up yet */ }
  }
  if (!targets) throw new Error('Chromium did not start');
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
  const cdp = new CDP(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  const report = {};
  let failed = 0;
  try {
    for (const [g, w, s] of plan) {
      const [width, height, mobile] = WIDTHS[w];
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
      const url = pathToFileURL(path.join(ROOT, g + '.html')).href;
      await cdp.send('Page.navigate', { url: 'about:blank' });
      await sleep(50);
      await cdp.send('Page.navigate', { url });
      await sleep(400);
      await cdp.send('Runtime.evaluate', { expression: 'localStorage.clear(); location.reload();' });
      await sleep(700);
      const [setup, full] = SCREENS[s];
      const r = await cdp.send('Runtime.evaluate', { expression: `(() => { ${setup} })()` });
      if (r.exceptionDetails) {
        const msg = (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text;
        if (/skip/.test(msg)) continue;
        console.error(`FAIL ${g} ${w} ${s}: ${msg}`); failed++; continue;
      }
      await sleep(350);
      const chk = await cdp.send('Runtime.evaluate', { expression: CHECKS, returnByValue: true });
      const name = `${g}-${w}-${s}`;
      report[name] = chk.result.value;
      if (full) {
        // The layout is 100vh with scrolling panels, so grow the viewport until nothing scrolls.
        for (let i = 0, h = height; i < 4; i++) {
          const need = (await cdp.send('Runtime.evaluate', { returnByValue: true, expression:
            `Math.max(document.documentElement.scrollHeight, ...[...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY)).map(e => e.scrollHeight - e.clientHeight + innerHeight))` })).result.value;
          if (need <= h) break;
          h = Math.min(Math.ceil(need), 6000);
          await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: h, deviceScaleFactor: 1, mobile });
          await sleep(150);
        }
      }
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(shot.data, 'base64'));
    }
  } finally {
    ws.close(); chrome.kill();
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* chrome still holds it */ }
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  console.log(`${Object.keys(report).length} screenshots in ${OUT}${failed ? `, ${failed} failed` : ''}`);
  if (failed) process.exitCode = 1;
}
main().catch(e => { console.error(e.message); process.exit(1); });
