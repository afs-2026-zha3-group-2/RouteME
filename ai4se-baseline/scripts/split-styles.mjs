#!/usr/bin/env node
// Split the monolithic frontend/src/styles.css at its `/* ====...` section banners
// into frontend/src/styles/part-NN.css modules, leaving styles.css as an ordered
// @import entry. Cascade order is preserved, so the built CSS must stay identical
// (verify: compare dist/assets/*.css SHA256 before/after `npm run build`).
//
// Modes:
//   (default)    dry-run: print sections, write nothing.
//   --out-dir D  write the split into D and verify byte-equivalence of the
//                concatenation (live files untouched).
//   --execute    split in place under frontend/src; aborts if styles.css changes
//                during the run (concurrent sessions edit it).
//
// Usage: node scripts/split-styles.mjs --root <repo-root> [--out-dir D | --execute]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
function argOf(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; }
const root = path.resolve(argOf('--root') ?? process.cwd());
const outDirArg = argOf('--out-dir');
const execute = args.includes('--execute');
const base = path.join(root, 'ai4se-baseline');
const stylesPath = path.join(base, 'RouteME/frontend/src/styles.css');

const raw = fs.readFileSync(stylesPath, 'utf8');
const hashBefore = crypto.createHash('sha256').update(raw).digest('hex');
const lines = raw.split('\n');
const boundaries = [];
lines.forEach((line, i) => { if (/^\/\* ={10,}/.test(line)) boundaries.push(i); });
if (boundaries.length === 0 || boundaries[0] !== 0) {
  console.error('ABORT: expected the file to start with a /* ==== section banner; structure changed, review manually.');
  process.exit(1);
}
const sections = boundaries.map((start, i) => {
  const end = i + 1 < boundaries.length ? boundaries[i + 1] : lines.length;
  const title = (lines[start + 1] ?? '').trim();
  return { start, end, title, text: lines.slice(start, end).join('\n') };
});

console.log('# styles split plan');
console.log(`total lines: ${lines.length}, sections: ${sections.length}`);
sections.forEach((s, i) => console.log(`  part-${String(i + 1).padStart(2, '0')}: lines ${s.start + 1}-${s.end} — ${s.title}`));

if (!outDirArg && !execute) {
  console.log('\nDry-run only. Use --out-dir <dir> to verify on a copy, or --execute to split in place.');
  process.exit(0);
}

const targetSrc = outDirArg ? path.resolve(outDirArg) : path.join(base, 'RouteME/frontend/src');
const stylesDir = path.join(targetSrc, 'styles');
fs.mkdirSync(stylesDir, { recursive: true });
const names = [];
sections.forEach((s, i) => {
  const name = `part-${String(i + 1).padStart(2, '0')}.css`;
  names.push(name);
  fs.writeFileSync(path.join(stylesDir, name), s.text);
});
const entry = names.map(n => `@import './styles/${n}';`).join('\n') + '\n';

// Byte-equivalence gate: concatenation of parts must equal the original exactly.
const joined = sections.map(s => s.text).join('\n');
if (joined !== raw.replace(/\n$/, '') && joined + '\n' !== raw && joined !== raw) {
  console.error('EQUIVALENCE FAIL: concatenation of parts differs from the original; nothing was applied.');
  process.exit(1);
}
console.log('\nEQUIVALENCE PASS: parts concatenate byte-identically to the original.');

if (outDirArg) {
  fs.writeFileSync(path.join(targetSrc, 'styles.css'), entry);
  console.log(`Wrote verification copy under ${targetSrc} (live files untouched).`);
  process.exit(0);
}

// In-place: stability gate, then replace the entry file.
const hashAfter = crypto.createHash('sha256').update(fs.readFileSync(stylesPath, 'utf8')).digest('hex');
if (hashBefore !== hashAfter) {
  console.error('ABORT: styles.css changed during the split (concurrent session). Parts were written but the entry was NOT replaced; re-run when stable.');
  process.exit(1);
}
fs.writeFileSync(stylesPath, entry);
console.log(`Split in place: ${names.length} modules under src/styles/, styles.css is now the @import entry.`);
console.log('Next: npm run build, then compare dist/assets/*.css SHA256 with the pre-split baseline; run npm test.');