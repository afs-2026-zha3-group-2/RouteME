#!/usr/bin/env node
// Run the curated smoke set from `e2e/smoke.json`.
//
// Why a manifest instead of tagging 190 titles: the smoke set is a review artefact
// the team can diff in one file, and it stays out of the spec files (no churn when
// the list changes). Titles are matched exactly against Playwright's full title.
//
// Usage:
//   node ai4se-baseline/scripts/e2e-smoke.mjs                 # private stack (fresh DB, own ports)
//   node ai4se-baseline/scripts/e2e-smoke.mjs --list          # print the resolved plan
//   node ai4se-baseline/scripts/e2e-smoke.mjs --base-url http://127.0.0.1:5173
//   node ai4se-baseline/scripts/e2e-smoke.mjs -- --headed
//
// Defaults to a private stack on purpose: reusing the dev servers silently tests whatever
// code (and data) those happen to hold, which turns a stale build into a wall of false reds.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { E2E_DIR, PLAYWRIGHT_CLI, REPO_ROOT } from './e2e-stack.mjs';

const argv = process.argv.slice(2);
const separator = argv.indexOf('--');
const ownArgs = separator >= 0 ? argv.slice(0, separator) : argv;
const passthrough = separator >= 0 ? argv.slice(separator + 1) : [];
const listOnly = ownArgs.includes('--list');
const baseUrlIndex = ownArgs.indexOf('--base-url');
const baseUrl = baseUrlIndex >= 0 ? ownArgs[baseUrlIndex + 1] : null;

const manifestPath = path.join(E2E_DIR, 'smoke.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`missing smoke manifest: ${manifestPath}`);
  process.exit(2);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const cases = Array.isArray(manifest.cases) ? manifest.cases : [];
if (cases.length === 0) {
  console.error('smoke.json has no cases');
  process.exit(2);
}

const files = [...new Set(cases.map((entry) => entry.file))].sort();
const missing = files.filter((file) => !fs.existsSync(path.join(E2E_DIR, 'tests', file)));
if (missing.length) {
  console.error(`smoke.json references missing spec files: ${missing.join(', ')}`);
  process.exit(2);
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Playwright matches `--grep` against the full title, which is prefixed with the
// spec path (so `^title` never matches), but the title is still the suffix.
const grep = `(?:${cases.map((entry) => escapeRegExp(entry.title)).join('|')})$`;

console.log(`[e2e-smoke] ${cases.length} cases across ${files.length} specs`);
for (const entry of cases) {
  console.log(`  - tests/${entry.file} :: ${entry.title}`);
}

if (listOnly) {
  process.exit(0);
}

const child = baseUrl
  ? spawn(
      process.execPath,
      [
        PLAYWRIGHT_CLI,
        'test',
        // Playwright treats file args as regexes: forward slashes on every platform.
        ...files.map((file) => `tests/${file}`),
        '--grep',
        grep,
        ...passthrough,
      ],
      { cwd: E2E_DIR, stdio: 'inherit', env: { ...process.env, ROUTEME_E2E_BASE_URL: baseUrl } },
    )
  : spawn(
      process.execPath,
      [
        path.join(REPO_ROOT, 'ai4se-baseline', 'scripts', 'e2e-shard.mjs'),
        '--shards',
        '1',
        '--run-id',
        `smoke${Date.now().toString(36)}`,
        '--',
        '--grep',
        grep,
        ...passthrough,
      ],
      { cwd: REPO_ROOT, stdio: 'inherit', env: process.env },
    );

child.on('close', (code) => {
  process.exit(code ?? 1);
});