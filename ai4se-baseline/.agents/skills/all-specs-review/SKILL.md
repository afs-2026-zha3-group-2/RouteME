---
name: all-specs-review
description: >-
  Holistic compliance review of one OpenSpec change against every governing
  spec: the project Rules under docs/knowledge/rules/, the OpenSpec artifact
  chain (proposal / design / delta specs / tasks / atdd-design), the API
  contract, and the implementation plus tests. Use when asked to review whether
  a change conforms to all applicable rules and specs, or to audit package
  structure, layering, naming, testing, security, or artifact consistency.
  Produces a Pass/Fail/Partial verdict report with evidence. Do not approve
  gates, auto-merge, or rewrite specs or code to force a pass.
---

# All specs review

## Instructions

Review one change against **all** governing specifications and report a verdict
with evidence. This is a compliance audit, not a stage DoV runner and not a Gate.
**Anti-trigger:** Do not approve G1/G2/G3; do not auto-merge or archive; do not
rewrite authoritative specs or production code just to force a Pass (unless the
user explicitly asks to fix a named gap); do not replace `/sdd:delta-craft`
AC/DoV review or `/sdd:consistency-lint` spec-drift lint.

1. **Resolve scope.** `root` = cwd (or a user-named path). Confirm `change-id`
   (or the change path under `openspec/changes/<id>/`). If several changes are
   open and none is named → ask which one; do not batch-review all changes in one
   run. Resolve `focus`: default `full` (every rule category + artifact chain +
   contract + implementation); a subset (e.g. `architecture,package-structure`)
   narrows the checks. Out-of-focus checks → **Skipped (out-of-focus)**, never
   Fail and never block the verdict.
2. **Discover governing specs (read-only).** Read
   `docs/knowledge/rules/_INDEX.md`, then open each applicable rule section
   `docs/knowledge/rules/<category>/rules.md#<id>`. Read the contract
   `openapi.yaml` and the change artifacts (`proposal.md`, `design.md`,
   `specs/<capability>/spec.md`, `tasks.md`, `atdd-design.md`, and
   `dov-ac-review.md` / `g1-decision.md` when present). Required roots unreadable
   → **stop** and report the error; do not invent a Pass. Missing optional
   artifacts → mark the related checks N/A, not a whole-run failure.
3. **Discover the implementation.** Map `backend/` (or root `src/`) packages,
   `frontend/`, `e2e/`, tests, and `db/migration/`. Decide the layout trigger
   from `package-structure` (a new Spring Boot web project, >15 classes in a
      package, or >2 business domains ⇒ layered `<root-package>/<layer>`).
4. **Run the checklist.** Apply
   [review-checklist.md](references/review-checklist.md) dimension by dimension.
   For each rule, open its `检查项` table and judge against real code. Emit
   structured findings: `id`, `severity` (BLOCKER | WARNING | SUGGESTION),
   `rule` (`rules/<category>/rules.md#<id>`), `location` (file path + symbol, no
   line numbers), `issue`, `suggested_fix`, `evidence`, `authority`
   (`[fact]` | `[inference]`). Prefer structured findings over prose.
5. **Gather verification evidence.** Run the available commands as evidence and
   quote real output summaries — never invent results: backend
   `mvnw.cmd test` (run inside `backend/`), root `npm run lint:api`, frontend
   `npm run typecheck` / `npm test` when present. Running tests/lint is
   evidence-gathering; **do not edit code** in this skill. A command that cannot
   run → record the gap and cap the affected verdict at Partial.
6. **Map the verdict.** ≥1 BLOCKER → **Fail**; else ≥1 WARNING → **Partial**;
   else **Pass**. Manual-only / tooling-absent runs are capped at Partial.
   Aggregate only in-focus required checks; Skipped rows never block.
7. **Persist the report.** Default path is
   `docs/ai4se-plugins/<yyyymmdd-HHMMSS>-all-specs-review-report.md` (and an
   optional `-checkpoints.md`). **Exception — artifact review:** when the review is
   the `@rule:artifact-review-gate` pass triggered right after writing
   `proposal.md` / Delta Spec / `design.md` / `tasks.md`, write
   `docs/reviews/<yyyymmdd>-<change-id>-<artifact>-review.md` instead
   (`<artifact>` = `proposal` | `spec` | `design` | `tasks`), never overwriting an
   earlier report (same-day re-review → `-review-2.md`). After writing that report,
      **stop and ask the signers required by the artifact signer matrix**; do not
      continue to the next artifact or stage until every signature is collected and
      each is recorded as `批准人 / 批准时间` in the report's signing section:
      - `proposal.md` and Delta Spec → **WAYNE** signs the artifact.
      - `design.md` and `tasks.md` → **2 signers**: the current developer plus one
        member who is neither the current developer nor WAYNE (candidates: Jay,
        Lewis, Jacky, Karena, Neal).
      - Every `docs/reviews/` report (artifact review and `all-specs-review`) →
        **WAYNE + current developer**, two records.
      One interception per artifact: ask for the artifact signatures and the report
      signatures together, list the candidates, and treat any missing or ambiguous
      reply as not approved. If the path is unclear or the user declines a file
      write → put the full report in the reply. Include a **Residual risks**
      section (explicit empty OK). Never overwrite proposal / spec / decision
      bodies.
8. **Summarize.** Verdict + finding counts + open gaps with owners if known.
   Suggest next remediations (non-Gate): `/sdd:delta-craft`, `/sdd:task-plan`,
   `/sdd:atdd-apply`, `/sdd:rules-govern`, `/sdd:consistency-lint`. This skill
   **never** writes a Gate Pass/Fail.

- **In:** root (default cwd); change-id (or change path); optional `focus=`
- **Out:** Pass/Fail/Partial report under `docs/ai4se-plugins/` (or reply) with
  structured findings, evidence paths, and residual risks
- **Not:** Gate approval; auto-merge/archive; silent rewrites of specs or code;
  batch review of all changes; replacing delta-craft AC/DoV or consistency-lint
- **Escalate:** human when roots are unreadable, the change is ambiguous, or a
  BLOCKER needs product/SA clarification before a Gate

**Gotchas:** A Fail/Partial here is not a Gate result. Suggested fixes are
guidance until a human asks to edit. Cite rule anchors, not remembered rules;
the rule file is the authority. `docs/ai4se-plugins/` files are process records,
not Living Spec authority.

## Examples

```text
User: /all-specs-review change-id=add-demand-and-roster
Agent: Loads rules + contract + change artifacts + backend packages; runs the
full checklist; runs mvnw test and lint:api as evidence; writes
<ts>-all-specs-review-report.md; reports verdict and gaps; suggests remediations.
```

```text
User: review whether the backend package structure follows our architecture rules
Agent: Resolves the open change; focus=architecture,package-structure; checks the
layering trigger and dao/model/dto/exception placement; other categories Skipped
(out-of-focus); reports findings with rule anchors and evidence.
```

```text
User: /all-specs-review (no change named, several open)
Agent: Asks which change to review; does not batch-review or guess.
```

## Additional resources

- [Review checklist](references/review-checklist.md)
- [Rules index](../../../docs/knowledge/rules/_INDEX.md)
- [SDD artifacts rule](../../../docs/knowledge/rules/documentation/rules.md#sdd-artifacts)