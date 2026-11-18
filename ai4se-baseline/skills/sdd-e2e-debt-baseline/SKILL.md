---
name: sdd-e2e-debt-baseline
description: Maintain the known-failure baseline for Playwright E2E and attribute each run's failures against it. Use after any E2E run, when the user asks about 已知债务/已知红/失败归因, or before reporting E2E results in a verify report.
---

# E2E known-debt baseline

Full-suite E2E runs carry documented baseline failures. Re-attributing them every run
wastes time; this skill turns attribution into a mechanical diff.

## Files

- Baseline: `ai4se-baseline/RouteME/e2e/known-failures.json` — one entry per known
  failing test: `file`, `title`, `reason`, `recordedAt`, `ownerChange`.
- Diff tool: `ai4se-baseline/scripts/e2e-debt-diff.mjs`.

## After each E2E run

1. Run Playwright with a JSON reporter, e.g. from `ai4se-baseline/RouteME/e2e`:
   `npx playwright test --reporter=json > e2e-report.json` (fresh DB first: start the
   backend with `SPRING_DATASOURCE_URL=jdbc:sqlite:<fresh>.db`; a polluted dev DB
   invalidates the whole run).
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