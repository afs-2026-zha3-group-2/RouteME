#!/usr/bin/env node
// Run the Playwright suite split across isolated shards (backend + Vite per shard).
//
// Why shards instead of `workers > 1`: one backend / one SQLite cannot serve
// parallel workers — `credit-learning.spec.ts` writes the DB directly and several
// specs mutate the seeded users 1-4. Sharding by file with one isolated stack per
// shard keeps every test's assumptions intact while cutting wall time ~3x.
//
// Usage (from anywhere):
//   node ai4se-baseline/scripts/e2e-shard.mjs                       # 3 shards, 3 stacks
//   node ai4se-baseline/scripts/e2e-shard.mjs --shards 6 --parallel 3
//   node ai4se-baseline/scripts/e2e-shard.mjs --shards 1 --json-dir .tmp-e2e/report
//   node ai4se-baseline/scripts/e2e-shard.mjs --dry-run
//   node ai4se-baseline/scripts/e2e-shard.mjs -- --grep "@smoke"    # args after -- go to Playwright
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  BACKEND_DIR,
  E2E_DIR,
  FRONTEND_DIR,
  PLAYWRIGHT_CLI,
  SQLITE_DIR,
  TMP_DIR,
  VITE_CLI,
  ensureDir,
  jdbcFor,
  mvnwCommand,
  pruneStaleMigrations,
  quoteArg,
  resetDbFromTemplate,
  startCommand,
  stopTree,
  tailFile,
  waitForHttp,
} from './e2e-stack.mjs';

const argv = process.argv.slice(2);
const separator = argv.indexOf('--');
const ownArgs = separator >= 0 ? argv.slice(0, separator) : argv;
const passthrough = separator >= 0 ? argv.slice(separator + 1) : [];

function argOf(name, fallback = null) {
  const index = ownArgs.indexOf(name);
  return index >= 0 ? ownArgs[index + 1] : fallback;
}

function flag(name) {
  return ownArgs.includes(name);
}

const shardCount = Math.max(1, Number(argOf('--shards', '3')));
const parallel = Math.max(1, Math.min(shardCount, Number(argOf('--parallel', String(Math.min(shardCount, 3))))));
const backendBase = Number(argOf('--backend-base', '8081'));
const frontendBase = Number(argOf('--frontend-base', '5174'));
const bootTimeout = Number(argOf('--boot-timeout', '300')) * 1_000;
const jsonDir = argOf('--json-dir');
const keep = flag('--keep');
const dryRun = flag('--dry-run');
const prewarm = !flag('--no-prewarm');
const runId = argOf('--run-id', `s${Date.now().toString(36)}`);

/** Stacks that are up right now, so Ctrl+C can still stop them. */
const running = new Set();

function planFor(shard) {
  const offset = shard - 1;
  const workDir = path.join(TMP_DIR, runId, `shard${shard}`);
  return {
    shard,
    backendPort: backendBase + offset,
    frontendPort: frontendBase + offset,
    workDir,
    backendLog: path.join(workDir, 'backend.log'),
    frontendLog: path.join(workDir, 'frontend.log'),
    dbPath: path.join(SQLITE_DIR, `e2e-${runId}-s${shard}.db`),
    jsonReport: jsonDir ? path.join(jsonDir, `shard${shard}.json`) : null,
  };
}

/** Run the Playwright CLI, tee'ing the JSON reporter into a file when asked. */
async function runPlaywright(shardPlan) {
  const env = {
    ...process.env,
    ROUTEME_E2E_BASE_URL: `http://127.0.0.1:${shardPlan.frontendPort}`,
    ROUTEME_E2E_API_BASE: `http://127.0.0.1:${shardPlan.backendPort}`,
    ROUTEME_E2E_DB: shardPlan.dbPath,
    E2E_TRACE: process.env.E2E_TRACE ?? 'off',
  };
  const cliArgs = [PLAYWRIGHT_CLI, 'test', `--shard=${shardPlan.shard}/${shardCount}`];
  if (shardPlan.jsonReport) {
    cliArgs.push('--reporter=json');
  }
  cliArgs.push(...passthrough);

  if (!shardPlan.jsonReport) {
    const child = spawn(process.execPath, cliArgs, { cwd: E2E_DIR, env, stdio: 'inherit' });
    return new Promise((resolve) => child.on('close', (code) => resolve(code ?? 1)));
  }

  ensureDir(path.dirname(shardPlan.jsonReport));
  const out = fs.createWriteStream(shardPlan.jsonReport, { flags: 'w' });
  const child = spawn(process.execPath, cliArgs, {
    cwd: E2E_DIR,
    env,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  child.stdout.pipe(out);
  return new Promise((resolve) => {
    child.on('close', (code) => {
      out.end(() => resolve(code ?? 1));
    });
  });
}

/** Read pass/fail counts out of a Playwright JSON report. */
function summarize(reportPath) {
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    let passed = 0;
    let failed = 0;
    const walk = (suite) => {
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          if (test.status === 'expected' || test.status === 'flaky') {
            passed += 1;
          } else {
            failed += 1;
          }
        }
      }
      for (const child of suite.suites ?? []) {
        walk(child);
      }
    };
    for (const suite of report.suites ?? []) {
      walk(suite);
    }
    return { passed, failed };
  } catch {
    return null;
  }
}

function removeDb(dbPath) {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    fs.rmSync(dbPath + suffix, { force: true });
  }
}

/**
 * Compile once before any shard starts.
 *
 * Every backend shares `backend/target-run`; letting N `spring-boot:run` processes
 * compile into it at the same time would race on the same output directory, so the
 * build happens once here and the shards only boot the already-built classes.
 */
async function prewarmBuild() {
  const logFile = path.join(TMP_DIR, runId, 'prewarm.log');
  console.log('[e2e-shard] pre-warming the backend build once ...');
  const handle = startCommand({
    label: 'prewarm',
    commandString: `${mvnwCommand()} -Pdev-run -B -q test-compile`,
    cwd: BACKEND_DIR,
    env: { LOG_PATH: path.join(TMP_DIR, runId, 'logs') },
    logFile,
  });
  running.add(handle);
  const code = await new Promise((resolve) => handle.child.on('exit', (exitCode) => resolve(exitCode ?? 1)));
  running.delete(handle);
  if (code !== 0) {
    console.error('[e2e-shard] prewarm failed:\n' + tailFile(logFile, 40));
    process.exit(1);
  }

  // Maven never deletes resources whose source disappeared, so a migration dropped by a
  // merge survives in the output folder and Flyway aborts with a duplicate version.
  const pruned = pruneStaleMigrations();
  if (pruned.length) {
    console.log(`[e2e-shard] dropped stale migrations: ${pruned.join(', ')}`);
  }
  console.log('[e2e-shard] build is up to date');
}

async function runShard(shard) {
  const shardPlan = planFor(shard);
  ensureDir(shardPlan.workDir);
  resetDbFromTemplate(shardPlan.dbPath);

  const backend = startCommand({
    label: `backend:${shardPlan.backendPort}`,
    commandString: `${mvnwCommand()} -Pdev-run spring-boot:run`,
    cwd: BACKEND_DIR,
    env: {
      PORT: String(shardPlan.backendPort),
      SPRING_DATASOURCE_URL: jdbcFor(shardPlan.dbPath),
      LOG_PATH: path.join(shardPlan.workDir, 'logs'),
      ROUTEME_AVATAR_DIR: path.join(shardPlan.workDir, 'uploads', 'avatars'),
      ROUTEME_EXPERIENCE_PHOTO_DIR: path.join(shardPlan.workDir, 'uploads', 'photos'),
      ROUTEME_EXIT_EVIDENCE_DIR: path.join(shardPlan.workDir, 'uploads', 'evidence'),
    },
    logFile: shardPlan.backendLog,
  });
  running.add(backend);

  const frontend = startCommand({
    label: `frontend:${shardPlan.frontendPort}`,
    // Vite is launched through its JS entry: the `npm` shim is unreliable here.
    // Vite is launched through its JS entry: the `npm` shim is unreliable here.
    // `--host 127.0.0.1` keeps the bind on IPv4 so the readiness probe and Playwright
    // never disagree with Vite's default `localhost` (which can resolve to ::1 only).
    commandString: `${quoteArg(process.execPath)} ${quoteArg(VITE_CLI)} --host 127.0.0.1 --port ${shardPlan.frontendPort} --strictPort`,
    cwd: FRONTEND_DIR,
    env: { ROUTEME_API_TARGET: `http://127.0.0.1:${shardPlan.backendPort}` },
    logFile: shardPlan.frontendLog,
  });
  running.add(frontend);

  try {
    await waitForHttp(`http://127.0.0.1:${shardPlan.backendPort}/api/greeting`, {
      label: `shard ${shard} backend`,
      timeoutMs: bootTimeout,
    });
    await waitForHttp(`http://127.0.0.1:${shardPlan.frontendPort}/`, {
      label: `shard ${shard} frontend`,
      timeoutMs: bootTimeout,
    });
  } catch (error) {
    console.error(`[e2e-shard ${shard}] ${error.message}`);
    console.error(tailFile(shardPlan.backendLog, 30));
    console.error(tailFile(shardPlan.frontendLog, 20));
    await stopTree(frontend);
    await stopTree(backend);
    return { shard, code: 1, stats: null };
  }

  console.log(`[e2e-shard ${shard}] running (backend :${shardPlan.backendPort}, ui :${shardPlan.frontendPort})`);
  const code = await runPlaywright(shardPlan);
  const stats = shardPlan.jsonReport ? summarize(shardPlan.jsonReport) : null;

  await stopTree(frontend);
  await stopTree(backend);

  if (!keep) {
    removeDb(shardPlan.dbPath);
  }

  const label = stats ? `passed=${stats.passed} failed=${stats.failed}` : `exit=${code}`;
  console.log(`[e2e-shard ${shard}] done ${label}`);
  if (code !== 0) {
    console.error(tailFile(shardPlan.backendLog, 15));
  }
  return { shard, code, stats };
}

async function main() {
  if (dryRun) {
    for (let shard = 1; shard <= shardCount; shard += 1) {
      const shardPlan = planFor(shard);
      console.log(
        `shard ${shard}/${shardCount}: backend :${shardPlan.backendPort}, ui :${shardPlan.frontendPort}, db ${path.basename(shardPlan.dbPath)}`,
      );
    }
    console.log(`parallel=${parallel} runId=${runId}`);
    return;
  }

  if (prewarm) {
    await prewarmBuild();
  }

  const results = [];
  let nextShard = 1;
  const workers = Array.from({ length: parallel }, async () => {
    while (nextShard <= shardCount) {
      const shard = nextShard;
      nextShard += 1;
      results.push(await runShard(shard));
    }
  });
  await Promise.all(workers);

  results.sort((left, right) => left.shard - right.shard);
  const totals = results.reduce(
    (acc, result) => ({
      passed: acc.passed + (result.stats?.passed ?? 0),
      failed: acc.failed + (result.stats?.failed ?? 0),
    }),
    { passed: 0, failed: 0 },
  );

  console.log('\n# e2e shards');
  for (const result of results) {
    const stats = result.stats ? `passed=${result.stats.passed} failed=${result.stats.failed}` : '';
    console.log(`- shard ${result.shard}: exit=${result.code} ${stats}`);
  }
  if (jsonDir) {
    console.log(`- total: passed=${totals.passed} failed=${totals.failed}`);
    console.log(`- reports: ${jsonDir}`);
  }
  if (results.some((result) => result.code !== 0)) {
    process.exitCode = 1;
  }
}

process.on('SIGINT', async () => {
  console.error('\n[e2e-shard] interrupted, stopping stacks ...');
  await Promise.all([...running].map((handle) => stopTree(handle, { waitMs: 300 })));
  process.exit(130);
});

await main();