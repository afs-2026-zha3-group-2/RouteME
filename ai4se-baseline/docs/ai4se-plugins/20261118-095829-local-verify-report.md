# Local Verify Report: add-realtime-notifications

**Date:** 2026-11-18 (timezone: +0800)
**Root:** C:\Users\HAUKA2\Documents\ZHA_bootcamp\week3\teamRepo\RouteME-notifications\ai4se-baseline
**Scope:** local+evidence
**Change id:** add-realtime-notifications

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | Pass |

**PR gate:** Pass — `/sdd:pr-submit` may proceed. No Waiver is required and none
is attached.

## Local commands

Whitelist source: `docs/feedback/verification-commands.md` (marker block
`<!-- ai4se-verify-commands -->`, format `marker`, `whitelist_empty:no`).
Runner log: `docs/ai4se-plugins/20261118-095335-local-verify-run.log` (local
only — `*.log` is gitignored, so the table below is the durable record of it).
`ROUTEME_E2E_BASE_URL=http://localhost:5174` was exported for the system layer
(backend on 8081, Vite on 5174, both already running).

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `cd RouteME/frontend && npm run typecheck` | verification-commands.md | 0 | `tsc --noEmit`, no diagnostics (9 s) |
| `cd RouteME/backend && cmd //c mvnw.cmd -q test` | verification-commands.md | 0 | quiet mode, no failures; 69 surefire reports / 472 tests / 0 failures / 0 errors |
| `cd RouteME/frontend && npm test` | verification-commands.md | 0 | 47 files / 369 tests passed (1.9 s) |
| `cd RouteME/e2e && npx playwright test tests/notifications.spec.ts tests/notifications-walkthrough.spec.ts` | verification-commands.md | 0 | 14 passed (1.3 m): V1–V4 + M1–M10 |

`commands_attempted:4`, `commands_failed:0`.

Not in the whitelist, run separately during P4 and re-confirmed by hand:
`npm run build` (1,609.35 kB / gzip 504.67 kB) and
`openspec validate add-realtime-notifications --strict` (valid). The full E2E
suite is deliberately excluded — see residual risk 3.

## Code-review highlights

- `NotificationServiceImpl.notify*` catches and logs inside the service, so no
  producer (`ApplicationServiceImpl`, `ChatServiceImpl`) carries a `try/catch`
  and a notification failure cannot roll back apply / decide / send (D-1, D6).
- The stream push is registered `afterCommit`, so subscribers never see a row
  that the transaction could still roll back.
- `notify` is called with the caller's transaction; `NotificationEntity` writes
  go through the same `NotificationMapper` + MyBatis-Plus conventions as the
  neighbouring entities, and `V24__add_notifications.sql` stays
  `INTEGER` / `VARCHAR` / `CREATE INDEX` only so SQLite and H2 both migrate.
- Frontend state keeps one reducer (`applySnapshot`) plus a `lastReadSeq` guard,
  which is what makes an in-flight snapshot unable to resurrect a count that was
  just marked read (D-2); `EventSource` reconnects re-fetch the snapshot instead
  of replaying events.
- The bell now mirrors the account menu (portal + viewport-fixed coordinates,
  no entrance animation) rather than antd `Popover`, which fixes the
  rAF-throttled `opacity: 0` no-op and removes the `.ant-popover !important`
  override (D-7).
- Naming, file layout (`frontend/src/notifications/`), Chinese copy in
  `i18n/notificationMessages.ts`, `data-testid` naming and the `--danger` /
  `--lagoon` token usage all follow the surrounding code.

## Evidence checklist

Artifacts: `tasks.md`, `design.md`, `proposal.md`, `specs/notifications/spec.md`,
plus a diff vs `origin/main` → full set, V1–V8 in scope.

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Pass | [fact] | `tasks.md`: 14 `- [x]`, 0 `- [ ]` |
| V2 | Requirement coverage | Pass | [fact] | 6 requirements (申请与裁决 / 聊天消息 / 计数与列表 / 实时投递 / 标读范围 / 壳层指示) each map to `p4-implementation.md` §2.1–2.2 modules and a test layer |
| V3 | Scenario coverage | Pass | [fact] | 26 scenarios; M1–M10 cover behaviour, V1–V4 cover focus / overflow / reconnect / multi-tab, unit tests cover the pure reducers |
| V4 | Requirement↔impl mapping | Pass | [fact] | contract 0.18.0 + `OpenApiTest` 12/12; hooks in `ApplicationServiceImpl` / `ChatServiceImpl`; endpoints in `NotificationController` |
| V5 | Spec drift | Pass | [fact] | `design.md` §6.5 still described the antd `Popover`; the shipped panel is a portal (D-7). The design note was updated in this run, so no drift remains |
| V6 | Design follow-through | Pass | [fact] | D1–D14 checked against code; D-3 (390 px sheet) and D-7 (portal) are recorded in `p4-implementation.md` §5 |
| V7 | Code pattern fit | Pass | [inference] | Compared with `chat/`, `shell/` and the existing `rail-menu`: same folder-per-feature, same CSS token usage, same testid scheme. Suggestion: a lint rule set would make this check mechanical |
| V8 | Upstream basis (necessity) | Pass | [fact] | 85 changed files vs `origin/main`: backend 29, frontend 19, e2e 2, openspec 8, sdd 5, requirement workspace 7, six preview PNGs, plus two process docs touched in this run (`verification-commands.md`, `design.md` note). Nothing outside REQ-023 / S23-1…S23-26 |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | local command table above + `20261118-095335-local-verify-run.log` |
| E2 AI | Pass | this report (V1–V8, Q1–Q5) |
| E3 Human | Pending | G2 was signed at P4 for design/implementation; the verify-level sign-off is not claimed here and no Waiver is self-approved |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | residual risks below | ⚠️ accepted |

## Findings

### CRITICAL

None.

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | `docs/feedback/verification-commands.md` was still the unfilled template, so `probe-verify.sh` reported `whitelist_empty:yes` and the gate could not have passed | [fact] | `docs/feedback/verification-commands.md` | Filled with the three-layer commands actually used by this repo; probe now emits `whitelist_format:marker` and the runner passed 4/4 |
| 2 | `design.md` §6.5 named antd `Popover` while the shipped bell is a portal (D-7) | [fact] | `openspec/changes/add-realtime-notifications/design.md` | Added the D-7 revision note in §6.5 pointing at the P4 deviation table |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | No linter or static analyser is configured (no ESLint, no Checkstyle/SpotBugs), so "static scan" is `tsc` only | [fact] | `frontend/package.json`, `backend/pom.xml` | Add a lint script when the team agrees on a rule set; not a blocker for this change |
| 2 | The e2e whitelist entry needs live servers and honours `ROUTEME_E2E_BASE_URL` | [fact] | `docs/feedback/verification-commands.md` § System | Documented in the file; a future CI job can set the variable |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | SSE emitter registry is in-process | Multi-instance deployment needs a shared channel | accepted — documented in `p4-implementation.md` §6; single-instance is the current deployment shape |
| 2 | `SqlLite/e2e-green.db` accumulates accounts and trips between E2E runs | Pre-existing repo habit; rebuilding the DB per run is out of scope | accepted — data is gitignored |
| 3 | Full E2E suite reports 34 failures (27 hard + 7 order-dependent) | Baseline debt reproduced on a pristine `1189b65` worktree | accepted — the signed gate is "notification 14 green + failure set isomorphic to baseline", see §4 of `p4-implementation.md` |
| 4 | SSE disconnects log `AsyncRequestNotUsableException` at ERROR | Connection is already gone; handling it needs a dedicated exception mapping | tracking — D-4 |

## Waiver

N/A — no waiver. Overall is Pass and every whitelist command exited 0.