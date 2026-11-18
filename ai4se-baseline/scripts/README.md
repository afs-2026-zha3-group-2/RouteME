# Harness scripts

Bootstrap creates **placeholder** shells below. In this teaching baseline,
`kb-lint.sh` is an explicit, non-blocking no-op: it prints `SKIP` and exits 0.
It does **not** validate the knowledge base or regenerate `docs/knowledge/_INDEX.md`.
P5 may record `KB update: Skipped (not configured)` under this documented
baseline policy, but must not report KB lint or index refresh as Passed.
The other placeholders still ask for customization and exit nonzero.

| Script | Role |
|---|---|
| `init.sh` | Environment / “start of day” setup |
| `kb-lint.sh` | KB consistency + compile `docs/knowledge/_INDEX.md` |
| `verify-links.sh` | Bidirectional link checks |
| `archive-change.sh` | Archive helper (e.g. wrap OpenSpec archive + KB checks) |

## SDD governance tooling (added 2026-11-18)

Node scripts; install deps once: `npm install --prefix ai4se-baseline/scripts`.
Rules: `@rule:id-allocation`, `@rule:web-testing` (合并后五项重验).
Skills: `skills/sdd-{merge-main,id-allocate,sign-ledger,worktree-ops,e2e-debt-baseline,archive-queue}`.

| Script | Role |
|---|---|
| `check-id-collisions.mjs` | REQ/S/Flyway/contract-version collision lint; `--next` suggests free numbers (in-flight branches count as occupied); baseline exemptions in `id-collision-baseline.json` |
| `openspec-gate.mjs` | `openspec validate --all --strict --no-interactive` (pinned `@fission-ai/openspec@1.16.1`) with debt baseline `openspec-debt-baseline.json`; new failures fail the gate |
| `sign-ledger.mjs` | Generates `docs/sdd/sign-ledger.md` (signature matrix across changes; generated, never hand-edited) |
| `archive-queue.mjs` | Generates `docs/sdd/archive-queue.md` (topological archive order; never archives by itself) |
| `e2e-debt-diff.mjs` | Playwright JSON report vs `RouteME/e2e/known-failures.json`: NEW / BASELINE / RESOLVED; `--update-new` appends entries needing attribution |
| `split-openapi.mjs` | Split contract into per-capability modules + redocly bundle semantic-equivalence check; dry-run / `--out-dir` copy / `--execute` with hash-stability gate |
| `split-styles.mjs` | Split styles.css at section banners + byte-equivalence check; same modes and stability gate |

Contract lint / bundle: `npm run lint:contract` / `npm run bundle` (see `package.json`).
Frontend API types: `npm run gen:api-types` in `RouteME/frontend` (openapi-typescript).

Do not invent a second Spec authority tree from these scripts. Re-running
`/sdd:bootstrap` will not overwrite non-empty shells (including customized
implementations).
