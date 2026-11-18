---
name: sdd-id-allocate
description: Pre-allocate REQ/S numbers, Flyway migration numbers, and contract minor versions for a new change, and detect collisions before merge. Use at P1 proposal drafting or when the user asks about numbering, 编号, 顺延, or Flyway/contract version conflicts.
---

# ID allocation and collision check

Numbering collisions caused repeated renumbering (up to four times for one change).
Root cause: allocation only looked at main, ignoring teammates' in-flight branches.
This skill makes allocation happen once at P1 and treats in-flight numbers as occupied.

## Authority sources

- REQ / S numbers: `ai4se-baseline/requirement-workspace/registry.md` plus every
  active change's `allocation.md`.
- Flyway numbers: `ai4se-baseline/RouteME/backend/src/main/resources/db/migration/`.
- Contract version: `ai4se-baseline/RouteME/openapi.yaml` `info.version`.

## Allocate (at P1, before writing proposal numbers)

1. Run `node ai4se-baseline/scripts/check-id-collisions.mjs --root . --next` to get
   the next free REQ number, S number, Flyway number, and contract minor version.
   The script scans registry, all active changes (including their allocation files),
   migration filenames, and the contract.
2. Write `openspec/changes/<change-id>/allocation.md` recording: REQ id, S id,
   Flyway number(s), contract minor version, allocation date, allocator.
   Once written, the numbers are occupied even before the branch merges.
3. Retired changes' numbers are never recycled; historical references must stay valid.

## Check (before merge, and in CI)

`node ai4se-baseline/scripts/check-id-collisions.mjs --root .` exits non-zero on any
duplicate REQ/S/Flyway number. Resolve by the later-arrival-yields rule: the change
that merges later takes max occupied + 1, and updates its own artifacts only
(registry row, intents/requirements files, proposal, Delta Spec, stage records).

## Version bump rules

- New paths/fields: minor +1. Text/examples only: patch +1. Breaking change: explicit
  human decision recorded in the change's design notes.
- Merge conflict on `info.version`: keep the higher minor; no case-by-case debate.
- Flyway: when several lanes run in parallel, reserve a number range per lane in the
  iteration plan and allocate within the lane's range.