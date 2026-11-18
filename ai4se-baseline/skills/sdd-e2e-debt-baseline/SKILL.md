---
name: sdd-e2e-debt-baseline
description: Maintain the known-failure baseline for Playwright E2E and attribute each run's failures against it. Use after any E2E run, when the user asks about 已知债务/已知红/失败归因, or before reporting E2E results in a verify report.
---

# E2E known-debt baseline

Full-suite E2E runs carry documented baseline failures. Re-attributing them every run
wastes time; this skill turns attribution into a mechanical diff.

## Files

- Baseline: `ai4se-baseline/RouteME/e2e/known-failures.json` — three tiers:
  `entries` (attributed debt; drives the diff), `skipped` (already `test.fixme`'d,
  never counted as failures) and `pending` (observed reds still needing root cause —
  recording them is fine, but `pending` never exempts a failure from the NEW list).
- Diff tool: `ai4se-baseline/scripts/e2e-debt-diff.mjs`.
- Fast lanes: `e2e-shard.mjs` (isolated shards), `e2e-smoke.mjs` (curated set,
  `e2e/smoke.json`), `e2e-db.mjs` (template database). Manual: `RouteME/e2e/README.md`.

## After each E2E run

1. Prefer a sharded run with a JSON report so the database is guaranteed pristine:
   `node ai4se-baseline/scripts/e2e-shard.mjs --shards 1 --json-dir .tmp-e2e/report`.
   A polluted dev DB invalidates the whole run, and so does a stale dev server (it may
   serve an older build than the working tree). Manual: `npx playwright test
   --reporter=json` from `ai4se-baseline/RouteME/e2e` against a DB copied via
   `e2e-db.mjs reset`.
2. `node ai4se-baseline/scripts/e2e-debt-diff.mjs --report <path> --root .` prints:
   - NEW failures (not in baseline): introduced by this change — must fix or get an
     explicit user decision before reporting Pass.
   - BASELINE failures: cite the recorded reason; do not re-investigate.
   - RESOLVED baseline entries: propose removing them from the baseline (销账).
3. To seed or extend the baseline after a user-approved attribution, run with
   `--update-new` and fill `reason`/`ownerChange` for each added entry. Never add an
   entry without a real attribution — an unexplained red is not debt, it is a bug.

## Reporting

Verify reports state totals as `passed / failed (N baseline / M new)` with the diff
output as evidence. A run with M > 0 cannot be reported as clean.