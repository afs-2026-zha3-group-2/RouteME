#!/usr/bin/env node
// Diff a Playwright JSON report against e2e/known-failures.json.
// Usage: node scripts/e2e-debt-diff.mjs --root <repo-root> --report <playwright-json> [--update-new]
// Exit codes: 0 = no NEW failures; 1 = new failures present; 2 = bad input.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
function argOf(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}
const root = path.resolve(argOf('--root') ?? process.cwd());
const reportPath = argOf('--report');
const updateNew = args.includes('--update-new');
const base = path.join(root, 'ai4se-baseline');
const baselinePath = path.join(base, 'RouteME/e2e/known-failures.json');
const today = new Date().toISOString().slice(0, 10);

if (!reportPath || !fs.existsSync(reportPath)) {
  console.error('Missing --report <playwright-json>. Run: npx playwright test --reporter=json > e2e-report.json');
  process.exit(2);
}
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const baseline = fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  : { recordedAt: today, entries: [] };
const keyOf = (file, title) => `${file} :: ${title}`;
const baselineKeys = new Map(baseline.entries.map(e => [keyOf(e.file, e.title), e]));

// Walk Playwright JSON suites recursively; collect failed tests.
const failed = [];
let passed = 0;
let skipped = 0;
function walk(suite, fileHint) {
  const file = suite.file ?? fileHint;
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      // `skipped` covers `test.fixme` / `test.skip`: deliberately disabled, never a failure.
      if (test.status === 'skipped') {
        skipped += 1;
        continue;
      }
      const ok = test.status === 'expected';
      if (ok) { passed += 1; continue; }
      // flaky tests that eventually passed are not failures
      if (test.status === 'flaky') { passed += 1; continue; }
      failed.push({ file: file ?? '(unknown)', title: spec.title });
    }
  }
  for (const child of suite.suites ?? []) walk(child, file);
}
for (const suite of report.suites ?? []) walk(suite, null);

const newFailures = [];
const baselineFailures = [];
for (const f of failed) {
  const entry = baselineKeys.get(keyOf(f.file, f.title));
  if (entry) baselineFailures.push({ ...f, reason: entry.reason, ownerChange: entry.ownerChange });
  else newFailures.push(f);
}
const failedKeys = new Set(failed.map(f => keyOf(f.file, f.title)));
const resolved = baseline.entries.filter(e => !failedKeys.has(keyOf(e.file, e.title)));

console.log(`# E2E debt diff (${today})`);
console.log(`passed=${passed} failed=${failed.length} skipped=${skipped} (baseline=${baselineFailures.length} new=${newFailures.length})`);
if (baselineFailures.length) {
  console.log('\n## BASELINE failures (cite recorded reason, do not re-investigate)');
  for (const f of baselineFailures) console.log(`- ${f.file} :: ${f.title} — ${f.reason} [${f.ownerChange ?? 'unassigned'}]`);
}
if (newFailures.length) {
  console.log('\n## NEW failures (introduced by this change — fix or get explicit user decision)');
  for (const f of newFailures) console.log(`- ${f.file} :: ${f.title}`);
}
if (resolved.length) {
  console.log('\n## RESOLVED baseline entries (propose removal / 销账)');
  for (const e of resolved) console.log(`- ${e.file} :: ${e.title}`);
}

if (updateNew && newFailures.length) {
  for (const f of newFailures) {
    baseline.entries.push({ file: f.file, title: f.title, reason: 'TODO: attribution required', recordedAt: today, ownerChange: null });
  }
  baseline.recordedAt = today;
  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`\nAdded ${newFailures.length} entr(y/ies) to ${baselinePath} — fill reason/ownerChange before citing as debt.`);
}

process.exit(newFailures.length ? 1 : 0);