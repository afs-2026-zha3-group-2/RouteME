---
name: sdd-worktree-ops
description: Snapshot, clean up, and safely remove git worktrees and stray directory copies in this concurrent-session repository, including precise process shutdown. Use when the user asks to clean worktrees, remove leftover directories, or a worktree removal fails because files are in use.
---

# Worktree operations

Multiple worktrees and concurrent active sessions coexist here; state changes between
commands. Destructive steps require a fresh snapshot and explicit user approval.

## Snapshot (before every operation)

```
git fetch origin
git worktree list
git status --short   # inside each target worktree
```

An active worktree (uncommitted WIP or a running dev server) is NOT stale residue.
Never force-remove it without the user's explicit decision via AskUserQuestion.

## Remove a registered worktree

1. Preserve WIP first: `git add -A` + commit onto its branch.
2. `git worktree remove <path>`. If it fails because files are in use:
   - Read that worktree's `backend/logs/routeme-trace.log` for
     `Starting Application ... with PID <pid>` and the Tomcat port.
   - Confirm with `Get-NetTCPConnection -State Listen` filtered by the port, matching
     `OwningProcess` to the PID. Stop ONLY that process (`Stop-Process -Id <pid>`).
   - For vite, find the node process listening on its port the same way.
   - Never kill by image name; that hits the IDE, other sessions, and E2E backends.
3. Retry removal; if the directory still remains, `Remove-Item -Recurse -Force` only
   after the owning processes are confirmed stopped.

## Judge a stray directory copy (no .git)

A non-registered directory with frozen timestamps is usually an OLD baseline snapshot,
not pending work. Before merging or deleting:

1. `git diff --no-index <copy>/<file> <main>/<file>` on key files; compare contract
   version and feature presence (e.g. path count in openapi.yaml).
2. If the copy is a subset/older version of main, merging it would REGRESS features —
   delete it instead, never copy it back over main.
3. If it genuinely leads main, it needs a real branch/merge, not a file copy.

## Branch cleanup after merge

`git merge-base --is-ancestor origin/<feature> main` → `git push origin --delete <feature>`
→ `git fetch --prune origin`. Teammates' in-flight branches are never cleaned.