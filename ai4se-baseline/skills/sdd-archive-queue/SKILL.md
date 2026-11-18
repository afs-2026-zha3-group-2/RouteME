---
name: sdd-archive-queue
description: Compute the archive order of active openspec changes from their declared archive-after dependencies and gate readiness. Use when the user asks what can be archived now, 归档顺序/归档依赖, or before running openspec-archive-change / bulk archive.
---

# Archive dependency queue

Archive ordering constraints ("归档需排在 X 之后") were scattered in index-table notes.
This skill makes them declarative and computable. It never archives by itself —
archiving stays a human-approved action (default: do NOT auto-archive).

## Declare dependencies

Each change may carry `openspec/changes/<change-id>/archive-after.md` listing the
change ids it must be archived after, one per line with a short reason. When absent,
the queue tool falls back to parsing the 变更索引 notes in `docs/sdd/README.md`.

## Compute the queue

Run `node ai4se-baseline/scripts/archive-queue.mjs --root .` — it writes
`docs/sdd/archive-queue.md` (generated; do not hand-edit) containing:

1. Dependency edges per change and a topological order (cycles are reported as errors).
2. Readiness per change: G2 decision present and Pass, dependencies already archived
   (present under `openspec/changes/archive/`), and remaining blockers.
3. A "can archive now" list — changes whose dependencies are all archived and whose
   G2 is signed. Everything else stays active.

## Execute (only with explicit approval)

For each ready change the user approves, hand over to `openspec-archive-change`
(single) or `openspec-bulk-archive-change` (batch) in the computed order. Present the
exact archive commands and approver info via AskUserQuestion first; reuse previously
given approver names. After archiving, re-run the queue tool to refresh readiness.