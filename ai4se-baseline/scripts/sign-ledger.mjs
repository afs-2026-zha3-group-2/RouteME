#!/usr/bin/env node
// Generate docs/sdd/sign-ledger.md: per-active-change artifact/review/gate status.
// Signature detail stays in the review reports; this ledger makes the backlog
// visible (which changes still lack reviews or gate decisions).
// Usage: node scripts/sign-ledger.mjs --root <repo-root>
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const rootArg = args.indexOf('--root');
const root = path.resolve(rootArg >= 0 ? args[rootArg + 1] : process.cwd());
const base = path.join(root, 'ai4se-baseline');
const changesDir = path.join(base, 'openspec/changes');
const reviewsDir = path.join(base, 'docs/reviews');
const today = new Date().toISOString().slice(0, 10);

const reviews = fs.existsSync(reviewsDir) ? fs.readdirSync(reviewsDir) : [];
const rows = [];
const pendingG2 = [];

for (const entry of fs.readdirSync(changesDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isDirectory() || entry.name === 'archive') continue;
  const id = entry.name;
  const dir = path.join(changesDir, id);
  const has = f => fs.existsSync(path.join(dir, f));
  const artifacts = ['proposal.md', 'design.md', 'tasks.md'].filter(has);
  const delta = has('specs') ? 'yes' : '—';
  const changeReviews = reviews.filter(r => r.includes(`-${id}-`) && r.endsWith('.md'));
  const gates = {};
  for (const g of ['g1', 'g2', 'g3']) {
    const file = path.join(dir, `${g}-decision.md`);
    if (!fs.existsSync(file)) { gates[g] = '—'; continue; }
    const text = fs.readFileSync(file, 'utf8');
    const m = text.match(/\b(Pass with documented debt|Pass|Partial|Conditional|Pending|Fail)\b/i);
    gates[g] = m ? m[1] : 'present';
    if (g === 'g2' && !/^Pass/i.test(gates[g])) pendingG2.push(`${id} (${gates[g]})`);
  }
  if (!has('g2-decision.md')) pendingG2.push(`${id} (no g2 file)`);
  rows.push(`| ${id} | ${artifacts.length ? artifacts.map(a => a.replace('.md', '')).join('/') : '—'} | ${delta} | ${changeReviews.length} | ${gates.g1} | ${gates.g2} | ${gates.g3} |`);
}

const out = [
  '# Signature ledger (generated)',
  '',
  `Generated: ${today} by \`scripts/sign-ledger.mjs\`. Do not hand-edit; re-run the script to refresh.`,
  'Signature names/times live in each review report\'s 签署记录 section and the gate decision files;',
  'this ledger only shows presence and headline status. Collect missing signatures via `sdd-sign-ledger`.',
  '',
  '| change | artifacts | delta | review reports | G1 | G2 | G3 |',
  '|---|---|---|---|---|---|---|',
  ...rows,
  '',
  `## G2 backlog (${pendingG2.length})`,
  '',
  ...pendingG2.map(p => `- ${p}`),
  '',
].join('\n');

const target = path.join(base, 'docs/sdd/sign-ledger.md');
fs.writeFileSync(target, out);
console.log(`Wrote ${target} (${rows.length} changes, ${pendingG2.length} G2 pending)`);