---
name: sdd-merge-main
description: Merge an in-flight feature branch into main with a conflict playbook, ID-collision precheck, and full re-verification. Use when the user asks to merge a branch into main, resolve merge conflicts, or re-verify after a merge in this repository.
---

# Merge feature branch into main

Standard operating procedure for this multi-worktree, concurrent-session repository.
Never archive openspec changes as part of a merge unless the user explicitly approves.

## 1. Snapshot first (mandatory)

Concurrent sessions create/move worktrees and push between commands. Always re-run:

```
git fetch origin
git worktree list
git status --short
git log --oneline -3 origin/main
```

If a sibling worktree occupies local `main` and `origin/main` is an ancestor of the
feature branch, fast-forward with `git push origin <feature>:main` after verifying
`git merge-base --is-ancestor origin/main <feature>`. Otherwise checkout main and
`git merge --no-edit origin/<feature>`.

Before pushing, pull or re-fetch and confirm origin/main has not advanced. A concurrent
session may already have committed and pushed your staged merge result — inspect the
actual content of origin/main (contract version, REQ numbers, key files) before doing
any extra commit/push.

## 2. Precheck collisions

Run `node ai4se-baseline/scripts/check-id-collisions.mjs --root .` and resolve reported
REQ/S/Flyway collisions before merging. Renumbering rule: the later arrival yields
(`后到者顺延`); take max occupied + 1 across registry AND in-flight changes.

## 3. Conflict playbook (per hotspot)

- `openapi.yaml` (or `openapi/` modules): keep the higher minor version; take the union
  of paths/schemas. After editing modules run `npm run bundle --prefix ai4se-baseline/scripts`.
- `OpenApiTest.java`: version assertions reference one constant; align it with the
  contract version once. Keep both sides' test methods.
- `types.ts` / `App.tsx` / `styles.css` (or `styles/` modules): take the union — keep
  both routes, types, and style blocks; never drop the other side's feature.
- `registry.md` / `docs/sdd/README.md` index: keep both rows; renumber per §2.
- Short conflict blocks that break text-replace tooling: rebuild structurally with a
  node script by line index, then scan the whole tree for `<<<<<<<`, `=======`, `>>>>>>>`
  markers and confirm zero remain.

## 4. Full re-verification (mandatory after any conflict resolution)

1. Backend: `./mvnw -B -ntp verify` from `ai4se-baseline/RouteME/backend`.
2. Frontend: `npm run build` and `npm test` from `ai4se-baseline/RouteME/frontend`.
3. `npx -y openspec validate --strict` from `ai4se-baseline` (or the project CLI).
4. `npx -y @redocly/cli lint openapi.yaml` from `ai4se-baseline/RouteME` (0 errors;
   existing warnings are baseline debt).
5. Fresh-DB E2E: start backend with `SPRING_DATASOURCE_URL=jdbc:sqlite:<fresh>.db`,
   run Playwright, then `node ai4se-baseline/scripts/e2e-debt-diff.mjs` to attribute
   failures against `e2e/known-failures.json`. New reds must be fixed; baseline reds
   cite their recorded attribution instead of re-investigating.

Use `sdd-local-verify-report` to persist the evidence when a formal report is required.

## 5. Close out

Push (pull-first rule), then optionally clean merged branches:
`git merge-base --is-ancestor origin/<feature> main` → `git push origin --delete <feature>`
→ `git fetch --prune origin`. Never delete teammates' in-flight branches. Worktree
removal and process shutdown follow `sdd-worktree-ops`. Do not run P5 archive.