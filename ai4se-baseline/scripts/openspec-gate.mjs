#!/usr/bin/env node
// Run `openspec validate --all --strict --no-interactive` and diff failures
// against scripts/openspec-debt-baseline.json (same debt model as E2E).
// Pre-existing spec debt is exempted with a recorded reason; NEW failures fail
// the gate. Active-change artifacts are never edited by this tool.
//
// Usage: node scripts/openspec-gate.mjs --root <repo-root> [--update]
// Exit codes: 0 = no NEW failures; 1 = new failures present; 2 = run error.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
function argOf(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; }
const root = path.resolve(argOf('--root') ?? process.cwd());
const update = args.includes('--update');
const base = path.join(root, 'ai4se-baseline');
const baselinePath = path.join(base, 'scripts/openspec-debt-baseline.json');
const today = new Date().toISOString().slice(0, 10);

// Pinned CLI version; package name is @fission-ai/openspec (bin: openspec).
const run = spawnSync('npx', ['-y', '@fission-ai/openspec@1.16.1', 'validate', '--all', '--strict', '--no-interactive'], {
  cwd: base, shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
});
if (run.error || run.status === null) {
  console.error('Failed to run openspec CLI:', run.error?.message ?? 'no exit status');
  process.exit(2);
}
const out = (run.stdout ?? '') + (run.stderr ?? '');
const clean = out.replace(/\x1b\[[0-9;]*m/g, '');

// Result lines look like: "✓ change/foo" / "✗ change/bar" / "✓ spec/baz".
const failed = [];
let passed = 0;
for (const m of clean.matchAll(/([✓✗])\s+(change|spec)\/(\S+)/g)) {
  const item = `${m[2]}/${m[3]}`;
  if (m[1] === '✗') failed.push(item); else passed += 1;
}
if (passed + failed.length === 0) {
  console.error('Could not parse openspec output; raw tail:\n' + clean.split('\n').slice(-15).join('\n'));
  process.exit(2);
}

const baseline = fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  : { recordedAt: today, allow: [] };
const allowMap = new Map(baseline.allow.map(e => [e.item, e]));

const newFailures = failed.filter(i => !allowMap.has(i));
const baselineFailures = failed.filter(i => allowMap.has(i));
const failedSet = new Set(failed);
const resolved = baseline.allow.filter(e => !failedSet.has(e.item));

console.log(`# OpenSpec strict gate (${today})`);
console.log(`passed=${passed} failed=${failed.length} (baseline=${baselineFailures.length} new=${newFailures.length})`);
if (baselineFailures.length) {
  console.log('\n## BASELINE failures (cite recorded reason, do not re-investigate)');
  for (const i of baselineFailures) console.log(`- ${i} — ${allowMap.get(i).reason} [${allowMap.get(i).ownerChange ?? 'unassigned'}]`);
}
if (newFailures.length) {
  console.log('\n## NEW failures (introduced by this change — fix or get explicit user decision)');
  for (const i of newFailures) console.log(`- ${i}`);
  console.log('\nDetails: openspec validate <name> --type change --strict --no-interactive');
}
if (resolved.length) {
  console.log('\n## RESOLVED baseline entries (propose removal / 销账)');
  for (const e of resolved) console.log(`- ${e.item}`);
}

if (update && newFailures.length) {
  for (const i of newFailures) {
    baseline.allow.push({ item: i, reason: 'TODO: attribution required', recordedAt: today, ownerChange: null });
  }
  baseline.recordedAt = today;
  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`\nAdded ${newFailures.length} entr(y/ies) to ${baselinePath} — fill reason/ownerChange before citing as debt.`);
}

process.exit(newFailures.length && !update ? 1 : 0);