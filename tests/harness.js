'use strict';
// Loads a game HTML file's inline <script> into a node:vm context with the mini DOM from dom.js.
// Top-level let/const of the game (G, SETTINGS, DRUGS, ...) are reachable through game.run('expr').
//
//   const { loadGame } = require('./harness');
//   const game = loadGame('dopewars', { seed: 1 });
//   game.run('G.cash')                       // evaluate any expression in the game's scope
//   game.rig([0.99, 0.01])                   // next Math.random() calls return these, then seeded
//   game.el('cashDisplay').textContent       // read the DOM
//   game.flushTimers()                       // run queued setTimeout callbacks

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { Document, Storage } = require('./dom');

const ROOT = path.join(__dirname, '..');
const cache = {};

function source(name) {
  if (!cache[name]) {
    const html = fs.readFileSync(path.join(ROOT, name + '.html'), 'utf8');
    const m = /<script>([\s\S]*?)<\/script>/.exec(html);
    if (!m) throw new Error(`${name}.html has no inline <script>`);
    cache[name] = { html, script: new vm.Script(m[1], { filename: name + '.html' }) };
  }
  return cache[name];
}

// mulberry32: small deterministic PRNG
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {'dopewars'|'candywars'} name
 * @param {{seed?:number, storage?:Object<string,string>, beforeStart?:(game)=>void}} [opts]
 *   storage: initial localStorage contents (e.g. a saved game) before the script starts.
 */
function loadGame(name, opts = {}) {
  const { html, script } = source(name);
  const document = new Document(html);
  const localStorage = new Storage(opts.storage);
  const timers = [];
  const logs = [];
  let rand = prng(opts.seed ?? 12345);
  const rigged = [];

  const ctx = {
    document,
    localStorage,
    console: { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) },
    setTimeout: (fn, ms) => { timers.push(fn); return timers.length; },
    clearTimeout: () => {},
    alert: () => {},
    confirm: () => true,
    __rand: () => (rigged.length ? rigged.shift() : rand()),
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext('Math.random = () => __rand();', ctx);
  script.runInContext(ctx);

  const game = {
    name,
    ctx,
    document,
    localStorage,
    logs,
    /** Evaluate code in the game's global scope; returns the last expression's value. */
    run(code) { return vm.runInContext(code, ctx); },
    /** Call a game function by name with JSON-able or plain args. */
    call(fn, ...args) { ctx.__args = args; return vm.runInContext(`${fn}(...__args)`, ctx); },
    get G() { return vm.runInContext('G', ctx); },
    el(id) { return document.getElementById(id); },
    hidden(id) { return document.getElementById(id).classList.contains('hidden'); },
    rig(values) { rigged.push(...values); },
    reseed(seed) { rand = prng(seed); rigged.length = 0; },
    flushTimers() { while (timers.length) timers.shift()(); },
    pendingTimers() { return timers.length; },
    key(k) { document.dispatchEvent({ type: 'keydown', key: k }); },
    /** Log lines currently shown in the Street News log, newest first. */
    logLines() { return document.getElementById('log').children.map(c => c.textContent); },
  };
  return game;
}

/** Start a fresh game with SETTINGS overrides (bypasses the settings modal). */
function newGame(name, settings = {}, opts = {}) {
  const game = loadGame(name, opts);
  game.ctx.__s = settings;
  game.run('Object.assign(SETTINGS, __s); newGame(); closeSettings();');
  return game;
}

const GAMES = ['dopewars', 'candywars'];

module.exports = { loadGame, newGame, GAMES, prng };
