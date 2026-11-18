#!/usr/bin/env node
// Shared helpers for the local E2E tooling (template DB, sharded runner, smoke runner).
// Everything resolves paths from this file so the scripts work from any working directory.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Repository root (the folder that contains `ai4se-baseline/`). */
export const REPO_ROOT = path.resolve(HERE, '..', '..');
/** `ai4se-baseline/` */
export const BASE = path.join(REPO_ROOT, 'ai4se-baseline');
export const ROUTEME = path.join(BASE, 'RouteME');
export const BACKEND_DIR = path.join(ROUTEME, 'backend');
export const FRONTEND_DIR = path.join(ROUTEME, 'frontend');
export const E2E_DIR = path.join(ROUTEME, 'e2e');
export const SQLITE_DIR = path.join(ROUTEME, 'SqlLite');
/** Pristine database built once by `e2e-db.mjs bootstrap`; every run copies it. */
export const TEMPLATE_DB = path.join(SQLITE_DIR, 'routeme.template.db');
/** Per-run logs, per-shard upload dirs, Playwright JSON reports. Never committed. */
export const TMP_DIR = path.join(E2E_DIR, '.tmp-e2e');
export const PLAYWRIGHT_CLI = path.join(E2E_DIR, 'node_modules', '@playwright', 'test', 'cli.js');
export const IS_WINDOWS = process.platform === 'win32';

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Quote a single argument for `cmd.exe` / POSIX shells. */
export function quoteArg(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function jdbcFor(dbPath) {
  return `jdbc:sqlite:${path.resolve(dbPath)}`;
}

/** Sidecar files SQLite keeps next to a database (WAL mode). */
export const DB_SIDECARS = ['-wal', '-shm'];

/**
 * Copy a database together with its WAL sidecars.
 *
 * The backend runs SQLite in WAL mode, and the compose/stop path kills the process, so
 * committed pages can still live in `<db>-wal`. Copying only the main file produces an
 * empty database that looks fine until the first query.
 */
export function copyDbSet(fromPath, toPath) {
  ensureDir(path.dirname(toPath));
  for (const suffix of DB_SIDECARS) {
    fs.rmSync(toPath + suffix, { force: true });
  }
  fs.copyFileSync(fromPath, toPath);
  for (const suffix of DB_SIDECARS) {
    if (fs.existsSync(fromPath + suffix)) {
      fs.copyFileSync(fromPath + suffix, toPath + suffix);
    }
  }
  return toPath;
}

/** Copy the pristine template to a fresh per-run database file. */
export function resetDbFromTemplate(targetPath, templatePath = TEMPLATE_DB) {
  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `template DB missing: ${templatePath}\n` +
        'build it once with: node ai4se-baseline/scripts/e2e-db.mjs build',
    );
  }
  return copyDbSet(templatePath, targetPath);
}

export function mvnwCommand() {
  return quoteArg(path.join(BACKEND_DIR, IS_WINDOWS ? 'mvnw.cmd' : 'mvnw'));
}

/**
 * Vite entry point.
 *
 * The `npm` shim on some Windows machines resolves `npm-cli.js` against the local
 * `node_modules`, which fails; calling Vite's own entry through `node` is portable.
 */
export const VITE_CLI = path.join(FRONTEND_DIR, 'node_modules', 'vite', 'bin', 'vite.js');

/**
 * Remove resources whose source disappeared from the `dev-run` output directory.
 *
 * Maven's resource copying never deletes files, so a migration dropped by a merge stays
 * in `target-run/classes/db/migration` and Flyway then aborts with "More than one
 * migration with version N". Pruning only that folder keeps the fix targeted (a full
 * `clean` would wipe classes the running dev backend may still load).
 */
export function pruneStaleMigrations() {
  const sourceDir = path.join(BACKEND_DIR, 'src', 'main', 'resources', 'db', 'migration');
  const outputDir = path.join(BACKEND_DIR, 'target-run', 'classes', 'db', 'migration');
  if (!fs.existsSync(sourceDir) || !fs.existsSync(outputDir)) {
    return [];
  }
  const expected = new Set(fs.readdirSync(sourceDir));
  const removed = [];
  for (const name of fs.readdirSync(outputDir)) {
    if (!expected.has(name)) {
      fs.rmSync(path.join(outputDir, name), { force: true });
      removed.push(name);
    }
  }
  return removed;
}

/**
 * Start a long-running command and stream its output into a log file.
 *
 * Windows `.cmd` shims (mvnw / npm) can only be spawned through a shell, so the
 * command string is passed verbatim to `cmd.exe`; POSIX goes through `sh -c`.
 */
export function startCommand({ label, commandString, cwd, env, logFile }) {
  ensureDir(path.dirname(logFile));
  const stream = fs.createWriteStream(logFile, { flags: 'w' });
  const options = {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  };
  const child = IS_WINDOWS
    ? spawn('cmd.exe', ['/d', '/s', '/c', `"${commandString}"`], {
        ...options,
        windowsVerbatimArguments: true,
      })
    : spawn('sh', ['-c', commandString], options);
  child.stdout.pipe(stream, { end: false });
  child.stderr.pipe(stream, { end: false });
  child.on('exit', (code, signal) => {
    stream.end(`\n[${label}] exited code=${code} signal=${signal}\n`);
  });
  return { label, child, logFile, stream };
}

/** Poll an HTTP endpoint until it answers, so the next step never races the boot. */
export async function waitForHttp(url, { timeoutMs = 180_000, intervalMs = 500, label = url } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = 'no attempt';
  while (Date.now() < deadline) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2_000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (response.status < 400) {
        return true;
      }
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error?.message ?? String(error);
    }
    await delay(intervalMs);
  }
  throw new Error(`${label} did not become ready at ${url} (${last})`);
}

/** Kill a process together with its children (`taskkill /T` on Windows). */
export async function stopTree(handle, { waitMs = 1_200 } = {}) {
  if (!handle?.child || handle.child.exitCode !== null) {
    return;
  }
  if (IS_WINDOWS) {
    spawnSync('taskkill', ['/pid', String(handle.child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try {
      process.kill(-handle.child.pid, 'SIGTERM');
    } catch {
      handle.child.kill('SIGTERM');
    }
  }
  await delay(waitMs);
}

/** Last N lines of a log file, for failure diagnostics. */
export function tailFile(filePath, lines = 40) {
  try {
    const content = fs.readFileSync(filePath, 'utf8').trimEnd().split(/\r?\n/);
    return content.slice(-lines).join('\n');
  } catch {
    return '(no log)';
  }
}