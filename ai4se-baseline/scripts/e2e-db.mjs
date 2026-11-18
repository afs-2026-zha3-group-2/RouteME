#!/usr/bin/env node
// Manage the E2E database template.
//
// Why: a full E2E run needs a pristine database (seeded trips must stay on page 1).
// Replaying Flyway V1..V32 on every run costs time and drifts, so we build one
// migrated template and copy it per run.
//
// Usage:
//   node ai4se-baseline/scripts/e2e-db.mjs status
//   node ai4se-baseline/scripts/e2e-db.mjs build                 # migrate an empty DB into the template
//   node ai4se-baseline/scripts/e2e-db.mjs template --from <db> [--force]
//   node ai4se-baseline/scripts/e2e-db.mjs reset [--name <id>] [--out <path>]
import fs from 'node:fs';
import path from 'node:path';

import {
  BACKEND_DIR,
  IS_WINDOWS,
  SQLITE_DIR,
  TEMPLATE_DB,
  TMP_DIR,
  ensureDir,
  jdbcFor,
  mvnwCommand,
  resetDbFromTemplate,
  startCommand,
  stopTree,
  tailFile,
  waitForHttp,
} from './e2e-stack.mjs';

const args = process.argv.slice(2);
const command = args[0] ?? 'status';

function argOf(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function sizeOf(filePath) {
  const stat = fs.statSync(filePath);
  return `${(stat.size / 1024).toFixed(0)} KB, mtime ${stat.mtime.toISOString()}`;
}

function describeTemplate() {
  if (!fs.existsSync(TEMPLATE_DB)) {
    return `template: MISSING (${TEMPLATE_DB})`;
  }
  return `template: ${TEMPLATE_DB} (${sizeOf(TEMPLATE_DB)})`;
}

async function buildTemplate() {
  const buildDb = path.join(SQLITE_DIR, 'routeme.bootstrap.db');
  const port = Number(argOf('--port') ?? 8090);
  const logFile = path.join(TMP_DIR, 'bootstrap-backend.log');
  fs.rmSync(buildDb, { force: true });
  fs.rmSync(`${buildDb}-journal`, { force: true });
  ensureDir(TMP_DIR);

  console.log(`[e2e-db] migrating an empty database via the backend on port ${port} ...`);
  const backend = startCommand({
    label: `bootstrap:${port}`,
    commandString: `${mvnwCommand()} -Pdev-run spring-boot:run`,
    cwd: BACKEND_DIR,
    env: {
      PORT: String(port),
      SPRING_DATASOURCE_URL: jdbcFor(buildDb),
      LOG_PATH: path.join(TMP_DIR, 'bootstrap-logs'),
    },
    logFile,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${port}/api/greeting`, {
      label: 'bootstrap backend',
      timeoutMs: 300_000,
    });
  } catch (error) {
    await stopTree(backend);
    console.error(`[e2e-db] bootstrap failed: ${error.message}`);
    console.error(tailFile(logFile, 40));
    process.exit(1);
  }

  await stopTree(backend);
  if (!fs.existsSync(buildDb)) {
    console.error('[e2e-db] backend booted but no database file was produced');
    process.exit(1);
  }
  fs.copyFileSync(buildDb, TEMPLATE_DB);
  fs.rmSync(buildDb, { force: true });
  fs.rmSync(`${buildDb}-journal`, { force: true });
  console.log(`[e2e-db] template ready: ${TEMPLATE_DB} (${sizeOf(TEMPLATE_DB)})`);
}

switch (command) {
  case 'status': {
    console.log(describeTemplate());
    const runs = fs.existsSync(SQLITE_DIR)
      ? fs.readdirSync(SQLITE_DIR).filter((name) => name.startsWith('e2e-') && name.endsWith('.db'))
      : [];
    console.log(`run databases: ${runs.length}${runs.length ? ` (${runs.sort().join(', ')})` : ''}`);
    console.log('node ai4se-baseline/scripts/e2e-db.mjs build   # (re)build the template');
    break;
  }
  case 'build':
  case 'bootstrap': {
    await buildTemplate();
    break;
  }
  case 'template': {
    const from = argOf('--from');
    if (!from) {
      console.error('usage: e2e-db.mjs template --from <migrated.db> [--force]');
      process.exit(2);
    }
    if (fs.existsSync(TEMPLATE_DB) && !args.includes('--force')) {
      console.error(`template already exists (${TEMPLATE_DB}); pass --force to replace it`);
      process.exit(2);
    }
    fs.copyFileSync(path.resolve(from), TEMPLATE_DB);
    console.log(`[e2e-db] template written from ${from}: ${sizeOf(TEMPLATE_DB)}`);
    break;
  }
  case 'reset': {
    const name = argOf('--name') ?? `run-${Date.now()}`;
    const out = argOf('--out') ?? path.join(SQLITE_DIR, `e2e-${name}.db`);
    const target = resetDbFromTemplate(out);
    console.log(`[e2e-db] database: ${target}`);
    console.log(jdbcFor(target));
    break;
  }
  default:
    console.error(`unknown command: ${command}`);
    console.error('commands: status | build | template --from <db> | reset [--name <id>] [--out <path>]');
    process.exit(2);
}