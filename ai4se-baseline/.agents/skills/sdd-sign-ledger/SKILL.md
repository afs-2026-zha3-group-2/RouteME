---
name: sdd-sign-ledger
description: Generate and query the signature status ledger across all active SDD changes, and prepare one-shot signature questions per the signer matrix. Use when the user asks who still needs to sign, G1/G2/G3 pending status, 签署, 催签, or before collecting approvals.
---

# Signature ledger

The artifact-review-gate requires named signatures per artifact; G2 approvals had
accumulated on a single verifier. This skill makes the backlog visible and reduces
repeated per-turn questioning. It never signs anything itself.

## Generate the ledger

Run `node ai4se-baseline/scripts/sign-ledger.mjs --root .` — it scans active changes'
artifacts, `docs/reviews/*-<change-id>-*-review*.md` signature sections, and
`g1/g2/g3-decision.md`, then writes `docs/sdd/sign-ledger.md` (generated file; do not
hand-edit). The ledger lists, per change: artifacts present, review reports present,
gate decisions and their status, and missing signature slots.

## Collect signatures (human gate stays human)

1. Read the ledger rows for the target change; group all missing slots into ONE ask.
2. Follow the recorder-name rule in `docs/sdd/README.md`: ask who the actual current
   developer is before recording or approving; never default to the roster name.
3. Present an AskUserQuestion containing the approve decision options, the exact
   command text when a command needs approval, and reuse previously given approver
   names instead of asking again.
4. Only after every required slot is explicitly approved, append the signature rows
   to the review report's 签署记录 section (object + slot / approver / time).
   Missing, unanswered, or vague slots mean NOT approved.

## Anti-trigger

This skill does not produce review opinions (that is `all-specs-review`), does not
write G1/G2/G3 decisions (those are `sdd-g*-decision-record`), and never auto-approves.