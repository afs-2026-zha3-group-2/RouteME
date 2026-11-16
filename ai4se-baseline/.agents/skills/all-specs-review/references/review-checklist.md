# All specs review — checklist

Reusable check items for `all-specs-review`. The **rule file is the authority**:
for every rule below, open `docs/knowledge/rules/<category>/rules.md#<id>` and
apply its `检查项` table against real code. The items here are the recurring
high-signal checks, not a replacement for the rule text. Cite the rule anchor in
each finding; mark `[fact]` when verified against code/output, `[inference]` when
judged from reading.

## Severity rubric

| Severity | Meaning | Effect on verdict |
|---|---|---|
| BLOCKER | Violates a High/always rule, breaks the contract, leaks a row object across layers, missing required artifact, failing test, or a security baseline breach | Fail |
| WARNING | Medium-rule drift, naming/structure inconsistency, untested boundary, partial evidence | Partial |
| SUGGESTION | Style/readability improvement with no rule breach | none |

Out-of-focus checks → Skipped (out-of-focus); never block. Optional items with no
evidence / not run → Skipped; do not block an overall Pass.

## A. Architecture (`rules/architecture/rules.md`)

- **api-contract** — `openapi.yaml` is the contract SoT at repo root; fields
  `snake_case`, timestamps `_at` in UTC; error body carries only `code`;
  400 = malformed input, 422 = business rejection; every endpoint has success +
  4xx examples; implementation DTOs match contract schemas.
- **package-structure** — dependency direction `controller → service →
  manager(optional) → dao`; no controller→dao shortcut; no service→controller;
  cross-layer shortcuts need an ADR/exception record; layering trigger met (new
  Spring Boot web project / >15 classes / >2 domains) ⇒ `<root-package>/<layer>`;
  repository interfaces, implementations and `XxxRow` live in `dao`; domain
  records in `model` (no framework annotations); boundary records in `dto`;
  exceptions + error handler in `exception`; `DatabaseXxxRepository` naming; no
  empty `manager`/`ui`/`mapper`; `dao` and `mapper` not both present; row objects
  do not leak past dao; dto does not enter dao/model; one domain is not half-flat
  half-layered.
- **no-circular-dependency** — package/module dependency graph is acyclic; shared
  types sit in a leaf imported by both sides; no reflection/import cycles hidden.
- **orchestration-execution-separation** — orchestration is separated from
  execution per the rule section.
- **java-patterns** — repository interface in the business/dao package, service
  depends on the interface not the impl (dependency inversion); constructor
  injection; records for immutable data; injectable `Clock`; row object vs domain
  object separated.

## B. Quality (`rules/quality/rules.md`)

- **coding-style / java-coding-style** — open the rule section; check focus
  changes, obsolete imports/variables removed, comment density matches surrounding
  code, no dead branches.
- **naming-conventions** — class suffix matches package class (`XxxController`,
  `XxxService`, `XxxRepository`, `XxxRow`, `XxxRequest`/`XxxResponse`); identifiers
  English; no synonym rotation for one concept.
- **web-coding-style** — frontend layout per `frontend/src` (`api.ts`, `types.ts`,
  `components/`, `<feature>/`); business logic not in components; types ↔ contract
  schemas aligned.

## C. Testing (`rules/testing/rules.md`)

- **java-testing** — test names `in_<input>_out_<expected>`; Given/When/Then;
  `@SpringBootTest + @AutoConfigureMockMvc + @ActiveProfiles("test")` for API
  tests; tests not deleted/weakened to go green; each slice has a red→green trace.
- **web-testing** — open the rule section; component/E2E intent matches the ATDD
  design; no invented Playwright/POM pipelines beyond the design.

## D. Security (`rules/security/rules.md`)

- **security-baseline / java-security** — open the rule section; authorization
  enforced at the service boundary (frontend hiding is not a security boundary);
  auth stub (e.g. `X-User-Id`) flagged as a residual risk before production.
- **no-hardcoded-secrets** — no credentials/tokens in code or config.
- **pii-scrubbing** — personal data not logged/exposed beyond need.
- **prompt-injection-defense** — open the rule section for agent-facing surfaces.

## E. Process (`rules/process/rules.md`)

- **spec-first** — required artifacts exist before implementation; one change =
  one capability.
- **tdd-cycle** — red→green→refactor evidence per slice; no whole-repo codegen
  bypassing TDD.
- **git-commit-conventions** — commit messages English, traceable to change-id;
  pre-verify commits are local checkpoints to be squashed.
- **git-branching-and-pr / code-review-checklist** — open the rule sections;
  branch/PR naming and review-entry expectations met.

## F. Documentation (`rules/documentation/rules.md`)

- **document-conventions** — body Chinese, identifiers/commands/commit messages
  English; relative links (no absolute machine paths); references cite file path +
  symbol, not line numbers; rule references use `rules/<category>/rules.md#<id>`.
- **sdd-artifacts** — change self-contained under `openspec/changes/<id>/`;
  `<capability>` noun-phrase kebab-case, `<change-id>` verb-first kebab-case;
  decision records fixed names `g1/g2/g3-decision.md`; verify reports at
  `docs/ai4se-plugins/<ts>-<skill>-report.md` with real output.

## G. Artifact chain & contract traceability

- proposal in-scope ↔ delta spec requirements ↔ tasks slices ↔ atdd-design layers
  ↔ implementation ↔ tests are mutually traceable; no orphan task or untested AC.
- design decisions (e.g. zero-value `RosterSummaryProvider`) recorded as residual
  risks with a named replacement change.
- contract `info.version` change reflected in `summary.md` when archived.
- tasks layer tags (`backend`/`frontend`/`contract`/`docs`) one layer per task;
  verification commands match the ATDD design and actually run.

## Verdict mapping

≥1 BLOCKER → **Fail**; else ≥1 WARNING → **Partial**; else **Pass**. Manual-only
or tooling-absent runs capped at **Partial**. Aggregate in-focus required checks
only.

## Report skeleton

```markdown
# All specs review — <change-id>

- Verdict: Pass | Fail | Partial
- Scope: focus=<full|subset>; root=<path>; timestamp=<yyyymmdd-HHMMSS>
- Evidence: <commands run + output summaries>

## Findings
| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|

## Per-dimension summary
A Architecture / B Quality / C Testing / D Security / E Process / F Documentation / G Traceability

## Residual risks
- <explicit empty OK>

## Next remediations (non-Gate)
- <skill suggestions + owners>
```