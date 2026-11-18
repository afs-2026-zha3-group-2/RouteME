#!/usr/bin/env node
// Compute the archive order of active openspec changes.
// Dependencies: openspec/changes/<id>/archive-after.md (one change-id per line,
// optional " — reason"), falling back to the 变更索引 notes in docs/sdd/README.md
// ("归档需排在 X 之后" / "归档须排在 X 之后" / "依赖 X 先归档").
// Readiness: G2 decision present and Pass*, and all dependencies already archived.
// Usage: node scripts/archive-queue.mjs --root <repo-root>
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const rootArg = args.indexOf('--root');
const root = path.resolve(rootArg >= 0 ? args[rootArg + 1] : process.cwd());
const base = path.join(root, 'ai4se-baseline');
const changesDir = path.join(base, 'openspec/changes');
const today = new Date().toISOString().slice(0, 10);

const active = fs.readdirSync(changesDir, { withFileTypes: true })
  .filter(e => e.isDirectory() && e.name !== 'archive').map(e => e.name).sort();
const archived = new Set(fs.existsSync(path.join(changesDir, 'archive'))
  ? fs.readdirSync(path.join(changesDir, 'archive')).map(n => n.replace(/^\d{4}-\d{2}-\d{2}-/, ''))
  : []);
const known = new Set([...active, ...archived]);

// Fallback source: index table notes in docs/sdd/README.md.
const indexNotes = new Map();
const readme = path.join(base, 'docs/sdd/README.md');
if (fs.existsSync(readme)) {
  for (const line of fs.readFileSync(readme, 'utf8').split(/\r?\n/)) {
    const row = line.match(/^\|\s*`([^`]+)`\s*\|/);
    if (!row || !known.has(row[1])) continue;
    const cells = line.split('|');
    const last = cells[cells.length - 2] ?? '';
    if (!/归档/.test(last) || !/之后|先归档/.test(last)) continue;
    const deps = [...last.matchAll(/`([^`]+)`/g)].map(m => m[1]).filter(id => known.has(id) && id !== row[1]);
    if (deps.length) indexNotes.set(row[1], deps);
  }
}

const deps = new Map();
const depSource = new Map();
for (const id of active) {
  const file = path.join(changesDir, id, 'archive-after.md');
  if (fs.existsSync(file)) {
    const list = fs.readFileSync(file, 'utf8').split(/\r?\n/)
      .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
      .map(l => l.split(/\s+[—–-]\s+|\s*—\s*/)[0].trim())
      .filter(d => known.has(d) && d !== id);
    deps.set(id, list);
    depSource.set(id, 'archive-after.md');
  } else if (indexNotes.has(id)) {
    deps.set(id, indexNotes.get(id));
    depSource.set(id, 'docs/sdd/README.md index note');
  } else {
    deps.set(id, []);
    depSource.set(id, '—');
  }
}

function g2Status(id) {
  const file = path.join(changesDir, id, 'g2-decision.md');
  if (!fs.existsSync(file)) return 'missing';
  const m = fs.readFileSync(file, 'utf8').match(/\b(Pass with documented debt|Pass|Partial|Conditional|Pending|Fail)\b/i);
  return m ? m[1] : 'present';
}

// Topological sort (Kahn); cycles reported, not silently dropped.
const order = [];
const remaining = new Set(active);
let progress = true;
while (remaining.size && progress) {
  progress = false;
  for (const id of [...remaining].sort()) {
    const unarchivedDeps = deps.get(id).filter(d => !archived.has(d) && remaining.has(d));
    if (unarchivedDeps.length === 0) { order.push(id); remaining.delete(id); progress = true; }
  }
}
const cycles = [...remaining];

const ready = [];
const rows = [];
for (const id of active) {
  const g2 = g2Status(id);
  const blockers = [];
  if (!/^Pass/i.test(g2)) blockers.push(`G2=${g2}`);
  for (const d of deps.get(id)) if (!archived.has(d)) blockers.push(`after ${d}`);
  if (blockers.length === 0) ready.push(id);
  rows.push(`| ${id} | ${deps.get(id).join(', ') || '—'} | ${depSource.get(id)} | ${g2} | ${blockers.join('; ') || 'READY'} |`);
}

const out = [
  '# Archive queue (generated)',
  '',
  `Generated: ${today} by \`scripts/archive-queue.mjs\`. Do not hand-edit; re-run to refresh.`,
  'Archiving stays human-approved (default: do NOT auto-archive). Execute ready changes via',
  '`openspec-archive-change` / `openspec-bulk-archive-change` in the topological order below.',
  '',
  `## Can archive now (${ready.length})`,
  '',
  ...(ready.length ? ready.map(id => `- ${id}`) : ['- (none — every active change has a G2 or dependency blocker)']),
  '',
  '## Topological order (dependencies first)',
  '',
  order.map((id, i) => `${i + 1}. ${id}`).join('\n'),
  ...(cycles.length ? ['', '## CYCLE detected (resolve manually)', '', ...cycles.map(id => `- ${id}`)] : []),
  '',
  '## Per-change status',
  '',
  '| change | archive after | source | G2 | blockers |',
  '|---|---|---|---|---|',
  ...rows,
  '',
].join('\n');

const target = path.join(base, 'docs/sdd/archive-queue.md');
fs.writeFileSync(target, out);
console.log(`Wrote ${target} (${active.length} active, ${ready.length} ready, ${cycles.length} in cycles)`);