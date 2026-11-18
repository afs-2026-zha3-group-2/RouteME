#!/usr/bin/env node
// ID collision lint + next-free allocation for REQ/S numbers, Flyway versions and
// the contract version.
// Collision semantics:
//   REQ: the same number used by DIFFERENT requirement slugs in
//        requirement-workspace/{intents,requirements,stories} filenames, or by an
//        active change's allocation.md. Registry rows are the authority for the
//        occupied set; registry + intents + requirements of ONE req is normal.
//   S:   the same S number appearing in two different registry title cells.
//   Flyway: duplicate V<n>__ filenames (or allocation claims).
// Usage: node scripts/check-id-collisions.mjs --root <repo-root> [--next]
// Known pre-existing collisions may be listed in scripts/id-collision-baseline.json
// ({"allow": ["REQ REQ-018", ...]}); they are reported as BASELINE, not failures.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const rootArg = args.indexOf('--root');
const root = path.resolve(rootArg >= 0 ? args[rootArg + 1] : process.cwd());
const wantNext = args.includes('--next');
const base = path.join(root, 'ai4se-baseline');

const reqSlugs = new Map(); // REQ id -> Map(slug -> [locations])
const reqTitles = new Map(); // REQ id -> [registry titles]
const sTitles = new Map(); // S id -> [registry titles]
const flyOcc = new Map(); // version -> [locations]

function noteReq(id, slug, where) {
  if (!reqSlugs.has(id)) reqSlugs.set(id, new Map());
  const slugs = reqSlugs.get(id);
  if (!slugs.has(slug)) slugs.set(slug, []);
  slugs.get(slug).push(where);
}
function noteFly(version, where) {
  if (!flyOcc.has(version)) flyOcc.set(version, []);
  flyOcc.get(version).push(where);
}
function slugOf(filename) {
  return filename.replace(/^REQ-\d+-?/, '').replace(/\.story\.md$|\.md$/, '');
}

// 1. Registry table rows: column 1 = REQ id, column 2 = title (S numbers live there).
const registry = path.join(base, 'requirement-workspace/registry.md');
if (fs.existsSync(registry)) {
  for (const line of fs.readFileSync(registry, 'utf8').split(/\r?\n/)) {
    const row = line.match(/^\|\s*(REQ-\d+)\s*\|\s*([^|]+)\|/);
    if (!row) continue;
    const [, reqId, title] = row;
    if (!reqTitles.has(reqId)) reqTitles.set(reqId, []);
    reqTitles.get(reqId).push(title.trim());
    for (const s of title.matchAll(/\bS\d+\b/g)) {
      if (!sTitles.has(s[0])) sTitles.set(s[0], []);
      sTitles.get(s[0]).push(`${reqId}: ${title.trim()}`);
    }
  }
}

// 2. Requirement-workspace filenames: same number + different slug = collision.
for (const dir of ['intents', 'requirements', 'stories']) {
  const full = path.join(base, 'requirement-workspace', dir);
  if (!fs.existsSync(full)) continue;
  for (const name of fs.readdirSync(full)) {
    const req = name.match(/^(REQ-\d+)/);
    if (req) noteReq(req[1], slugOf(name), `${dir}/${name}`);
  }
}

// 3. Active changes' allocation.md (in-flight numbers count as occupied).
const changesDir = path.join(base, 'openspec/changes');
if (fs.existsSync(changesDir)) {
  for (const entry of fs.readdirSync(changesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'archive') continue;
    const alloc = path.join(changesDir, entry.name, 'allocation.md');
    if (!fs.existsSync(alloc)) continue;
    const text = fs.readFileSync(alloc, 'utf8');
    for (const m of text.matchAll(/\bREQ-\d+\b/g)) noteReq(m[0], `change:${entry.name}`, `${entry.name}/allocation.md`);
    for (const m of text.matchAll(/\bV(\d+)__/g)) noteFly(m[1], `${entry.name}/allocation.md`);
  }
}

// 4. Flyway migration filenames.
const migDir = path.join(base, 'RouteME/backend/src/main/resources/db/migration');
if (fs.existsSync(migDir)) {
  for (const name of fs.readdirSync(migDir)) {
    const m = name.match(/^V(\d+)__/);
    if (m) noteFly(m[1], `db/migration/${name}`);
  }
}

// 5. Contract version.
let contractVersion = null;
const spec = path.join(base, 'RouteME/openapi.yaml');
if (fs.existsSync(spec)) {
  const m = fs.readFileSync(spec, 'utf8').match(/^\s*version:\s*([0-9]+\.[0-9]+\.[0-9]+)/m);
  if (m) contractVersion = m[1];
}

let collisions = 0;
let baseline = 0;
const baselineFile = path.join(base, 'scripts/id-collision-baseline.json');
const allow = new Set(fs.existsSync(baselineFile)
  ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')).allow ?? []
  : []);
function countCollision(key, message) {
  if (allow.has(key)) {
    baseline += 1;
    console.log(`BASELINE ${message}`);
  } else {
    collisions += 1;
    console.log(`COLLISION ${message}`);
  }
}
const occupiedReq = new Set([...reqTitles.keys(), ...reqSlugs.keys()]);

for (const [id, slugs] of reqSlugs) {
  if (slugs.size > 1) {
    const detail = [...slugs.entries()].map(([slug, where]) => `${slug} @ ${where.join(', ')}`);
    countCollision(`REQ ${id}`, `REQ ${id}: ${detail.join(' | ')}`);
  }
}
for (const [id, titles] of reqTitles) {
  if (titles.length > 1) {
    countCollision(`REQ ${id}`, `REQ ${id}: ${titles.length} registry rows -> ${titles.join(' | ')}`);
  }
}
for (const [id, titles] of sTitles) {
  if (titles.length > 1) {
    countCollision(`S ${id}`, `S ${id}: ${titles.join(' | ')}`);
  }
}
for (const [version, where] of flyOcc) {
  if (where.length > 1) {
    countCollision(`Flyway V${version}`, `Flyway V${version}: ${where.join(' | ')}`);
  }
}

const maxReq = occupiedReq.size ? Math.max(...[...occupiedReq].map(id => Number(id.slice(4)))) : 0;
const maxS = sTitles.size ? Math.max(...[...sTitles.keys()].map(id => Number(id.slice(1)))) : 0;
const maxFly = flyOcc.size ? Math.max(...[...flyOcc.keys()].map(Number)) : 0;
console.log(`REQ: ${occupiedReq.size} occupied, max=REQ-${String(maxReq).padStart(3, '0')}, next=REQ-${String(maxReq + 1).padStart(3, '0')}`);
console.log(`S: ${sTitles.size} occupied, max=S${maxS}, next=S${maxS + 1}`);
console.log(`Flyway: ${flyOcc.size} occupied, max=V${maxFly}, next=V${maxFly + 1}`);
if (contractVersion) {
  const [maj, min] = contractVersion.split('.').map(Number);
  console.log(`Contract: current=${contractVersion}, next-minor=${maj}.${min + 1}.0`);
}

if (wantNext) {
  console.log('\n# Suggested allocation (write into openspec/changes/<id>/allocation.md)');
  console.log(`REQ-${String(maxReq + 1).padStart(3, '0')} / S${maxS + 1} / V${maxFly + 1}` +
    (contractVersion ? ` / contract ${contractVersion.split('.')[0]}.${Number(contractVersion.split('.')[1]) + 1}.0` : ''));
}

if (collisions > 0) {
  console.log(`\nFAIL: ${collisions} new collision(s) (${baseline} baseline). Later arrival yields: renumber to max occupied + 1.`);
  process.exit(1);
}
console.log(`\nPASS: no new REQ/S/Flyway collisions (${baseline} baseline allowance(s) reported).`);