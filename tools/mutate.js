'use strict';
// Mutation testing for the game scripts: makes small code changes (mutants) one at a time in a temp
// copy of the repo, runs the node:test suite against each, and lists the mutants no test caught.
// Only the code from `const SETTINGS = {` to the end of the inline script is mutated (the data
// tables above it are not). Strings, template literals and comments are never mutated.
//
//   node tools/mutate.js --game dopewars --sample 150 --seed 1 --out mutants.md
//   node tools/mutate.js --game candywars --lines 1148-1226      only mutants on those lines
//   node tools/mutate.js --game dopewars --list                  print the mutants, run nothing
//
// Options: --game (required), --sample N (default all), --seed (default 1), --lines A-B,
// --jobs N (default half the CPUs), --timeout ms per mutant (default 60000), --out file, --list.
// Exits 1 on bad arguments or if the unmutated suite fails; a surviving mutant is not an error.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { prng } = require('../tests/harness');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const game = opt('--game');
if (!['dopewars', 'candywars'].includes(game)) { console.error('--game dopewars|candywars is required'); process.exit(1); }
const sample = opt('--sample') ? Number(opt('--sample')) : Infinity;
const seed = Number(opt('--seed', 1));
const jobs = Number(opt('--jobs', Math.max(1, Math.floor(os.cpus().length / 2))));
const timeout = Number(opt('--timeout', 60000));
const outFile = opt('--out');
const lineRange = opt('--lines') ? opt('--lines').split('-').map(Number) : null;
const listOnly = args.includes('--list');

const html = fs.readFileSync(path.join(ROOT, game + '.html'), 'utf8');
const m = /<script>([\s\S]*?)<\/script>/.exec(html);
const scriptStart = m.index + '<script>'.length;
const src = m[1];
const regionStart = src.indexOf('const SETTINGS = {');
if (regionStart < 0) { console.error('could not find `const SETTINGS = {`'); process.exit(1); }
const lineAt = o => html.slice(0, scriptStart + o).split('\n').length;

// Mark which characters are code (not string, template, or comment).
const isCode = new Uint8Array(src.length);
for (let i = 0, state = 'code'; i < src.length; i++) {
  const c = src[i], n = src[i + 1];
  if (state === 'code') {
    if (c === '/' && n === '/') { state = 'line'; continue; }
    if (c === '/' && n === '*') { state = 'block'; continue; }
    if (c === "'" || c === '"' || c === '`') { state = c; continue; }
    isCode[i] = 1;
  } else if (state === 'line') { if (c === '\n') state = 'code'; }
  else if (state === 'block') { if (c === '*' && n === '/') { state = 'code'; i++; } }
  else { if (c === '\\') i++; else if (c === state) state = 'code'; }
}
const codeRun = (i, len) => { for (let k = i; k < i + len; k++) if (!isCode[k]) return false; return true; };

// Mutation operators: [regex, replacement(match) -> string]. Applied at every code position.
const OPS = [
  [/===/y, () => '!=='], [/!==/y, () => '==='],
  [/<=/y, () => '<'], [/>=/y, () => '>'],
  [/<(?![=<])/y, () => '<='], [/(?<![=>-])>(?![=>])/y, () => '>='],
  [/&&/y, () => '||'], [/\|\|/y, () => '&&'],
  [/(?<=[\w)\]] ?)\+(?![+=])(?= ?[\w(])/y, () => '-'],
  [/(?<=[\w)\]] )-(?![-=])(?= [\w(])/y, () => '+'],
  [/(?<=[\w)\]] ?)\*(?!=)(?= ?[\w(])/y, () => '/'],
  [/Math\.min\b/y, () => 'Math.max'], [/Math\.max\b/y, () => 'Math.min'],
  [/\btrue\b/y, () => 'false'], [/\bfalse\b/y, () => 'true'],
  [/(?<![\w.])\d+(\.\d+)?(?![\w.])/y, s => String(Number(s) === 0 ? 1 : Number((Number(s) + (s.includes('.') ? 0.1 : 1)).toFixed(6)))],
  [/!(?!=)(?=[\w(])/y, () => ''],
];

const mutants = [];
for (let i = regionStart; i < src.length; i++) {
  if (!isCode[i]) continue;
  for (const [re, rep] of OPS) {
    re.lastIndex = i;
    const hit = re.exec(src);
    if (!hit || !codeRun(i, hit[0].length)) continue;
    const line = lineAt(i);
    if (lineRange && (line < lineRange[0] || line > lineRange[1])) continue;
    mutants.push({ at: i, from: hit[0], to: rep(hit[0]), line });
  }
}

// Owner: the nearest top-level (indent of two spaces or less) function or const/let at or above the line.
const htmlLines = html.split('\n');
const owner = line => {
  for (let l = line; l > 0; l--) {
    const f = /^ {0,2}(?:function\s+([\w$]+)|(?:const|let|var)\s+([\w$]+))/.exec(htmlLines[l - 1]);
    if (f) return f[1] || f[2];
  }
  return '(top level)';
};

// Seeded sample, then back in source order.
let chosen = mutants;
if (sample < mutants.length) {
  const r = prng(seed);
  const idx = mutants.map((_, k) => k);
  for (let k = idx.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [idx[k], idx[j]] = [idx[j], idx[k]]; }
  chosen = idx.slice(0, sample).sort((a, b) => a - b).map(k => mutants[k]);
}
const describe = mu => `${game}.html:${mu.line} in ${owner(mu.line)}: \`${mu.from}\` -> \`${mu.to}\`  | ${htmlLines[mu.line - 1].trim().slice(0, 90)}`;
if (listOnly) { chosen.forEach(mu => console.log(describe(mu))); console.log(`${chosen.length} of ${mutants.length} mutants`); process.exit(0); }

// One temp copy per job: tests/ and both HTML files.
function makeCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-mut-'));
  fs.cpSync(path.join(ROOT, 'tests'), path.join(dir, 'tests'), { recursive: true });
  for (const g of ['dopewars', 'candywars']) fs.copyFileSync(path.join(ROOT, g + '.html'), path.join(dir, g + '.html'));
  return dir;
}
function runSuite(dir) {
  return new Promise(resolve => {
    const files = fs.readdirSync(path.join(dir, 'tests')).filter(f => f.endsWith('.test.js')).map(f => path.join('tests', f));
    const p = spawn(process.execPath, ['--test', '--test-reporter=dot', `--test-name-pattern=^${game}:`, ...files], { cwd: dir, stdio: 'ignore' });
    const t = setTimeout(() => { p.kill(); resolve('timeout'); }, timeout);
    p.on('exit', code => { clearTimeout(t); resolve(code === 0 ? 'survived' : 'killed'); });
  });
}

(async () => {
  const dirs = Array.from({ length: Math.min(jobs, chosen.length || 1) }, makeCopy);
  try {
    if (await runSuite(dirs[0]) !== 'survived') { console.error('The unmutated suite fails; fix that first.'); process.exit(1); }
    const results = new Array(chosen.length);
    let next = 0, done = 0;
    await Promise.all(dirs.map(async dir => {
      const target = path.join(dir, game + '.html');
      while (next < chosen.length) {
        const k = next++, mu = chosen[k];
        const a = scriptStart + mu.at;
        fs.writeFileSync(target, html.slice(0, a) + mu.to + html.slice(a + mu.from.length));
        results[k] = await runSuite(dir);
        if (++done % 25 === 0) console.log(`${done}/${chosen.length}`);
      }
      fs.writeFileSync(target, html);
    }));
    const survivors = chosen.filter((_, k) => results[k] === 'survived');
    const killed = chosen.length - survivors.length;
    const score = chosen.length ? (100 * killed / chosen.length).toFixed(1) : '100.0';
    const summary = `${game}: ${killed}/${chosen.length} mutants killed (${score}%), ${survivors.length} survived` +
      (sample < mutants.length ? ` [sample of ${mutants.length}, seed ${seed}]` : '');
    console.log(summary);
    const body = survivors.map(mu => '- ' + describe(mu)).join('\n') || '- none';
    if (outFile) fs.writeFileSync(path.resolve(outFile), `# Surviving mutants\n\n${summary}\n\n${body}\n`);
    else console.log(body);
  } finally {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  }
})();
