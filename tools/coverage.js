'use strict';
// Line and function coverage of each game's inline <script>, measured while the node:test suite runs.
// Node's own --experimental-test-coverage maps V8 offsets against the whole HTML file, so its numbers
// for the games are wrong; this maps them against the inline script instead.
//
//   node tools/coverage.js                 summary table
//   node tools/coverage.js --out file.md   also write the untested functions and blocks to file.md
//   node tools/coverage.js --min 80        exit 1 if either game's line coverage is under 80%

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const GAMES = ['dopewars', 'candywars'];
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const outFile = opt('--out');
const min = opt('--min') !== undefined ? Number(opt('--min')) : undefined;

const covDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-cov-'));
const tests = fs.readdirSync(path.join(ROOT, 'tests')).filter(f => f.endsWith('.test.js')).map(f => path.join('tests', f));
const run = spawnSync(process.execPath, ['--test', '--test-reporter=dot', ...tests], {
  cwd: ROOT, env: { ...process.env, NODE_V8_COVERAGE: covDir }, encoding: 'utf8',
});
if (run.status !== 0) {
  process.stdout.write(run.stdout + run.stderr);
  console.error('Tests failed; coverage not computed.');
  fs.rmSync(covDir, { recursive: true, force: true });
  process.exit(1);
}

// Gather every V8 coverage entry for each game's script, across all test processes.
const entries = Object.fromEntries(GAMES.map(g => [g, []]));
for (const f of fs.readdirSync(covDir)) {
  const data = JSON.parse(fs.readFileSync(path.join(covDir, f), 'utf8'));
  for (const r of data.result) {
    for (const g of GAMES) {
      if (r.url === pathToFileURL(path.join(ROOT, g + '.html')).href) entries[g].push(r.functions);
    }
  }
}
fs.rmSync(covDir, { recursive: true, force: true });

const report = [];
const summary = [];
let belowMin = false;

for (const g of GAMES) {
  const html = fs.readFileSync(path.join(ROOT, g + '.html'), 'utf8');
  const m = /<script>([\s\S]*?)<\/script>/.exec(html);
  const src = m[1];
  const lineBase = html.slice(0, m.index + '<script>'.length).split('\n').length; // HTML line of src line 1
  if (!entries[g].length) { summary.push(`${g}: no coverage data (did the harness load it?)`); belowMin = true; continue; }

  // Paint per-character counts: ranges are nested, so larger ranges first, inner ones overwrite.
  // Each process is painted separately, then summed, so a block run in any process counts as covered.
  const total = new Float64Array(src.length);
  for (const fns of entries[g]) {
    const counts = new Float64Array(src.length);
    const ranges = [];
    for (const fn of fns) for (const r of fn.ranges) ranges.push(r);
    ranges.sort((a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset);
    for (const r of ranges) counts.fill(r.count, r.startOffset, Math.min(r.endOffset, src.length));
    for (let i = 0; i < src.length; i++) total[i] += counts[i];
  }

  // Lines: code lines (not blank, not comment-only) covered if any non-space char ran.
  const lines = src.split('\n');
  let off = 0, code = 0, hit = 0;
  const lineHit = [];
  for (const line of lines) {
    const t = line.trim();
    const isCode = t && !t.startsWith('//');
    let covered = false;
    if (isCode) {
      for (let i = 0; i < line.length; i++) if (line[i].trim() && total[off + i] > 0) { covered = true; break; }
      code++; if (covered) hit++;
    }
    lineHit.push(isCode ? covered : null);
    off += line.length + 1;
  }
  const lineOf = o => src.slice(0, o).split('\n').length - 1 + lineBase;

  // Functions never called (merged by start offset across processes).
  const fnCalls = new Map();
  for (const fns of entries[g]) for (const fn of fns) {
    const r = fn.ranges[0];
    if (!fn.functionName && r.startOffset === 0) continue; // the top-level script
    const k = r.startOffset;
    const prev = fnCalls.get(k) || { name: fn.functionName || '(anonymous)', start: r.startOffset, end: r.endOffset, count: 0 };
    prev.count += r.count;
    fnCalls.set(k, prev);
  }
  const allFns = [...fnCalls.values()].sort((a, b) => a.start - b.start);
  const named = allFns.filter(f => f.name !== '(anonymous)');
  const deadFns = named.filter(f => f.count === 0);

  // Uncovered line runs inside called functions: the untested branches.
  const deadFnLines = new Set();
  for (const f of allFns.filter(f => f.count === 0)) for (let l = lineOf(f.start); l <= lineOf(f.end); l++) deadFnLines.add(l);
  const runs = [];
  for (let i = 0; i < lineHit.length; i++) {
    const L = i + lineBase;
    if (lineHit[i] === false && !deadFnLines.has(L)) {
      const last = runs[runs.length - 1];
      if (last && last.end >= L - 1) last.end = L; else runs.push({ start: L, end: L, text: lines[i].trim() });
    } else if (lineHit[i] === null) {
      // blank and comment lines do not break a run
      const last = runs[runs.length - 1];
      if (last && last.end === L - 1 && i + 1 < lineHit.length && lineHit[i + 1] === false) last.end = L;
    }
  }
  const owner = L => {
    let best = null;
    for (const f of named) if (lineOf(f.start) <= L && lineOf(f.end) >= L && (!best || f.start > best.start)) best = f;
    return best ? best.name : '(top level)';
  };

  const pct = (100 * hit / code).toFixed(1);
  const fpct = (100 * (named.length - deadFns.length) / named.length).toFixed(1);
  summary.push(`${g}: lines ${pct}% (${hit}/${code})  functions ${fpct}% (${named.length - deadFns.length}/${named.length})`);
  if (min !== undefined && Number(pct) < min) belowMin = true;

  report.push(`## ${g}.html`, '', `Lines ${pct}% (${hit}/${code}), named functions ${fpct}% (${named.length - deadFns.length}/${named.length}).`, '');
  report.push('### Functions never called', '');
  for (const f of deadFns) report.push(`- \`${f.name}\` (line ${lineOf(f.start)})`);
  if (!deadFns.length) report.push('- none');
  report.push('', '### Untested lines inside called functions', '');
  for (const r of runs) report.push(`- ${r.start === r.end ? r.start : r.start + '-' + r.end} in \`${owner(r.start)}\`: \`${r.text.slice(0, 80).replace(/`/g, "'")}\``);
  if (!runs.length) report.push('- none');
  report.push('');
}

console.log(summary.join('\n'));
if (outFile) {
  fs.writeFileSync(path.resolve(outFile), `# Coverage of the game scripts\n\nGenerated by \`node tools/coverage.js --out ${outFile.replace(/\\/g, '/')}\`.\n\n${report.join('\n')}`);
  console.log(`Report written to ${outFile}`);
}
process.exit(belowMin ? 1 : 0);
