# Agent engineering guide

This guide applies to coding agents working in this repository. Read the relevant spec, implementation, and tests before editing. Write repository documentation in English.

## Four development principles

1. **Think before coding.** State assumptions that affect the implementation. If two interpretations would produce different behavior, illustrate the difference and clarify the intended outcome. If a simpler approach would work, explain its tradeoffs.
2. **Choose the simplest implementation.** Build what the current acceptance criteria require. Introduce a shared interface, configuration option, or dependency when a concrete use case justifies it. Before submitting, simplify branches that existing logic already covers.
3. **Make focused changes.** Each edit should serve the task and follow local naming, structure, and formatting. Remove imports, variables, and functions your change makes obsolete. Record unrelated issues for a separate change.
4. **Work toward verifiable outcomes.** Express the goal as observable behavior, such as “a quote request with zero weight returns a validation error.” Reproduce a bug before fixing it. For a refactor, run the same tests before and after. Pair each step of a multi-step task with a check, act on the results, and report what you verified and what remains open.

## Repository
This workspace is exactly one Git repository, rooted at the folder that contains `ai4se-baseline/`. Keep it that way: never run `git init` (or `git clone`) inside `ai4se-baseline/` or any other subdirectory, because a nested repository makes the same history appear twice in Source Control and history views. Commit from the workspace root only.

Commit messages MUST be written in English: no Chinese characters in the subject or the body, including when the change itself is described in Chinese in the task or the spec. The required format is `<type>(<stage>): <change-id> <description>` ([git-commit-conventions](docs/knowledge/rules/process/rules.md#git-commit-conventions)).

If an IDE reports `ai4se-baseline` as a separate or invalid VCS root, delete that mapping in the IDE settings; the only Git root is the workspace root. `.idea/vcs.xml` and `.vscode/settings.json` are tracked so all clones agree on this.

## Knowledge
Please refer to the [knowledge base](docs/knowledge/_INDEX.md) for additional information.

## SDD artifact gate
After writing any `proposal.md`, Delta Spec, `design.md`, or `tasks.md`, run `all-specs-review` and then stop to collect every signature required by the signer matrix in [artifact-review-gate](docs/knowledge/rules/process/rules.md#artifact-review-gate): `proposal` / Delta Spec are signed by WAYNE; `design` / `tasks` need the current developer plus one member who is neither the current developer nor WAYNE; every `docs/reviews/` report needs WAYNE and the current developer. Do not start the next artifact until all signature slots are approved.

## Reference
UI design please refer to [shadcn/ui](https://ui.shadcn.com/docs)