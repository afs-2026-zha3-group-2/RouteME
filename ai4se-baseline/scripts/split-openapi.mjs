#!/usr/bin/env node
// Split the monolithic RouteME/openapi.yaml into per-capability modules under
// RouteME/openapi/, then verify redocly bundle reproduces it semantically.
//
// Modes:
//   (default)      dry-run: print the grouping plan, write nothing.
//   --out-dir D    write modules into D (verification on a copy; live file untouched).
//   --execute      write modules next to the live contract (RouteME/openapi/).
//                  Requires the contract file to be byte-stable during the run
//                  (concurrent sessions edit it; aborts if the hash changes).
//
// After modules exist: npm run bundle --prefix ai4se-baseline/scripts regenerates
// RouteME/openapi.yaml; OpenApiTest / redocly lint keep consuming that single file.
//
// Usage: node scripts/split-openapi.mjs --root <repo-root> [--out-dir D | --execute]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse, stringify } from 'yaml';

const args = process.argv.slice(2);
function argOf(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; }
const root = path.resolve(argOf('--root') ?? process.cwd());
const outDirArg = argOf('--out-dir');
const execute = args.includes('--execute');
const base = path.join(root, 'ai4se-baseline');
const specPath = path.join(base, 'RouteME/openapi.yaml');

// Ordered prefix rules: first match wins. Grouping is organizational only —
// bundle equivalence is verified regardless of grouping.
const GROUPS = [
  ['user-auth', p => p.startsWith('/auth/')],
  ['user-credit', p => p === '/users/credits' || p.startsWith('/credit/')],
  ['user-profiles', p => p.startsWith('/users')],
  ['trip-experiences', p => p.includes('experience')],
  ['trip-companions', p => /application|leave|messages|chat-partners|^\/reports/.test(p)],
  ['travel-finance', p => /finance|insurance|loans/.test(p)],
  ['admin-console', p => p.startsWith('/admin/')],
  ['customer-service', p => p.startsWith('/help/') || p.startsWith('/service/')],
  ['trip-weather', p => p.startsWith('/weather/')],
  ['ai-itinerary', p => p.startsWith('/ai/')],
  ['trip-plans', p => p.startsWith('/trips') || p === '/me/trips'],
  ['misc', () => true],
];

const raw = fs.readFileSync(specPath, 'utf8');
const hashBefore = crypto.createHash('sha256').update(raw).digest('hex');
const doc = parse(raw);
const paths = doc.paths ?? {};
const grouped = new Map();
for (const [p, item] of Object.entries(paths)) {
  const group = GROUPS.find(([, test]) => test(p))[0];
  if (!grouped.has(group)) grouped.set(group, {});
  grouped.get(group)[p] = item;
}

console.log('# openapi split plan');
console.log(`contract version: ${doc.info?.version}, paths: ${Object.keys(paths).length}`);
for (const [group, items] of grouped) console.log(`  ${group}: ${Object.keys(items).length} paths`);

if (!outDirArg && !execute) {
  console.log('\nDry-run only. Use --out-dir <dir> to verify on a copy, or --execute to split in place.');
  process.exit(0);
}

const targetBase = outDirArg ? path.resolve(outDirArg) : path.join(base, 'RouteME/openapi');
fs.mkdirSync(path.join(targetBase, 'paths'), { recursive: true });

// Rewrite internal component refs so moved path items point back to root.yaml.
function rewriteRefs(node) {
  if (Array.isArray(node)) return node.map(rewriteRefs);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = k === '$ref' && typeof v === 'string' && v.startsWith('#/components/')
        ? `../root.yaml${v}`
        : rewriteRefs(v);
    }
    return out;
  }
  return node;
}

const rootPaths = {};
for (const [group, items] of grouped) {
  const file = `paths/${group}.yaml`;
  const content = {};
  for (const [p, item] of Object.entries(items)) {
    content[p] = rewriteRefs(item);
    rootPaths[p] = { $ref: `./${file}#/${p.replace(/~/g, '~0').replace(/\//g, '~1')}` };
  }
  fs.writeFileSync(path.join(targetBase, file), stringify(content, { lineWidth: 0 }));
}
const rootDoc = { openapi: doc.openapi, info: doc.info, ...(doc.servers ? { servers: doc.servers } : {}), paths: rootPaths, components: doc.components ?? {} };
if (doc.tags) rootDoc.tags = doc.tags;
fs.writeFileSync(path.join(targetBase, 'root.yaml'), stringify(rootDoc, { lineWidth: 0 }));
console.log(`\nWrote ${grouped.size} path modules + root.yaml under ${targetBase}`);

// Stability gate for in-place execution.
if (execute) {
  const hashAfter = crypto.createHash('sha256').update(fs.readFileSync(specPath, 'utf8')).digest('hex');
  if (hashBefore !== hashAfter) {
    console.error('ABORT: openapi.yaml changed during the split (concurrent session). Modules were written but the live contract was NOT replaced; re-run when stable.');
    process.exit(1);
  }
}

// Semantic equivalence check: bundle the modules, deep-compare with the original.
const redoclyBin = path.join(base, 'scripts/node_modules/.bin/redocly');
if (!fs.existsSync(redoclyBin) && !fs.existsSync(redoclyBin + '.cmd')) {
  console.log('redocly CLI not installed (npm install --prefix ai4se-baseline/scripts); skipping bundle verification.');
  process.exit(0);
}
import('node:child_process').then(({ execFileSync }) => {
  const bundled = path.join(targetBase, 'bundled-check.yaml');
  execFileSync(process.execPath, [
    path.join(base, 'scripts/node_modules/@redocly/cli/bin/cli.js'),
    'bundle', path.join(targetBase, 'root.yaml'), '-o', bundled,
  ], { stdio: 'inherit' });
  const a = parse(fs.readFileSync(specPath, 'utf8'));
  const b = parse(fs.readFileSync(bundled, 'utf8'));
  const norm = v => JSON.stringify(v, Object.keys(flattenKeys(v)).sort());
  function flattenKeys(v, acc = {}) {
    if (Array.isArray(v)) v.forEach(x => flattenKeys(x, acc));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { acc[k] = 1; flattenKeys(x, acc); }
    return acc;
  }
  if (norm(a) === norm(b)) {
    console.log('\nEQUIVALENCE PASS: bundle(modules) is semantically identical to the original contract.');
    fs.rmSync(bundled);
  } else {
    console.error('\nEQUIVALENCE FAIL: bundle differs from the original. Do NOT switch to modules; inspect bundled-check.yaml.');
    process.exit(1);
  }
});