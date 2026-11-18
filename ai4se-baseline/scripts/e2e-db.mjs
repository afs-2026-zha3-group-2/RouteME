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
  DB_SIDECARS,
  SQLITE_DIR,
  TEMPLATE_DB,
  TMP_DIR,
  copyDbSet,
  ensureDir,
  jdbcFor,
  mvnwCommand,
  pruneStaleMigrations,
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
  const walBytes = DB_SIDECARS.reduce(
    (total, suffix) =>
      total + (fs.existsSync(filePath + suffix) ? fs.statSync(filePath + suffix).size : 0),
    0,
  );
  const total = stat.size + walBytes;
  return `${(total / 1024).toFixed(0)} KB${walBytes ? ' (incl. WAL)' : ''}, mtime ${stat.mtime.toISOString()}`;
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
  for (const suffix of ['-journal', ...DB_SIDECARS]) {
    fs.rmSync(buildDb + suffix, { force: true });
  }
  ensureDir(TMP_DIR);

  // Compile first so stale output can be pruned before Flyway reads it: Maven's resource
  // copy never deletes files whose source disappeared, and a leftover migration makes
  // Flyway fail with "More than one migration with version N".
  const buildLog = path.join(TMP_DIR, 'bootstrap-build.log');
  const build = startCommand({
    label: 'bootstrap-build',
    commandString: `${mvnwCommand()} -Pdev-run -B -q compile`,
    cwd: BACKEND_DIR,
    env: { LOG_PATH: path.join(TMP_DIR, 'bootstrap-logs') },
    logFile: buildLog,
  });
  const buildCode = await new Promise((resolve) => build.child.on('exit', (code) => resolve(code ?? 1)));
  if (buildCode !== 0) {
    console.error(`[e2e-db] backend build failed:\n${tailFile(buildLog, 30)}`);
    process.exit(1);
  }
  const pruned = pruneStaleMigrations();
  if (pruned.length) {
    console.log(`[e2e-db] dropped stale migrations: ${pruned.join(', ')}`);
  }

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
  // WAL mode: the migrations may still live in `<db>-wal` (the kill skips the checkpoint),
  // so the template has to carry the sidecars or it would be an empty database.
  copyDbSet(buildDb, TEMPLATE_DB);
  const baked = fs.statSync(TEMPLATE_DB).size +
    DB_SIDECARS.reduce(
      (total, suffix) =>
        total + (fs.existsSync(TEMPLATE_DB + suffix) ? fs.statSync(TEMPLATE_DB + suffix).size : 0),
      0,
    );
  if (baked < 64 * 1024) {
    console.warn(`[e2e-db] WARNING: template is only ${(baked / 1024).toFixed(0)} KB — migrations may not be baked in`);
  }
  for (const suffix of ['', '-journal', ...DB_SIDECARS]) {
    fs.rmSync(buildDb + suffix, { force: true });
  }
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