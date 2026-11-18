# Verification commands

Document the three-layer stop checks used by this repo (static → runtime →
system). The commands mirror `.github/workflows/ci.yml` and each change's
`tasks.md` (P4 T8); paths are relative to `ai4se-baseline/` (the verify root).
Replace only when CI changes.

## Static

Type and build checks — fast, no services required.

```bash
cd RouteME/frontend && npm run typecheck && npm run build
```

## Runtime

Automated tests — still no external services. On Windows the Maven wrapper must
be started through `cmd` (`cmd //c mvnw.cmd …` when invoked from Git Bash):
`./mvnw` looks for its distribution with POSIX paths and cannot fetch it.

```bash
cd RouteME/backend && ./mvnw -B -ntp verify
cd RouteME/frontend && npm test
```

## System

Browser E2E. Needs a backend and a Vite dev server; `RouteME/e2e/playwright.config.ts`
defaults to `http://localhost:5173` and honours `ROUTEME_E2E_BASE_URL`. The
notification specs are the stop check for this repository (see
`docs/sdd/add-realtime-notifications/p4-implementation.md` §3 for the baseline
comparison of the remaining suite). `add-growth-level` adds
`tests/growth-level.spec.ts` as its acceptance slice (see
`docs/sdd/add-growth-level/p4-apply.md` §5).

```bash
cd RouteME/e2e && npx playwright test tests/growth-level.spec.ts tests/route-completion.spec.ts tests/notifications.spec.ts tests/notifications-walkthrough.spec.ts
```

## Spec / contract

```bash
openspec validate add-route-completion --strict
openspec validate add-realtime-notifications --strict
openspec validate add-growth-level --strict
cd RouteME && npx --yes @redocly/cli lint openapi.yaml
```

## Machine-readable whitelist

Consumed by `/sdd:local-verify-report` (`probe-verify.sh` → `run-verify.sh`).
Keep one command per line; blank lines and headings end the block.

<!-- ai4se-verify-commands -->
cd RouteME/frontend && npm run typecheck
cd RouteME/backend && cmd //c mvnw.cmd -q test
cd RouteME/frontend && npm test
cd RouteME/e2e && npx playwright test tests/growth-level.spec.ts tests/route-completion.spec.ts tests/notifications.spec.ts tests/notifications-walkthrough.spec.ts