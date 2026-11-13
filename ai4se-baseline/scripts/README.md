# Harness scripts

Bootstrap creates **placeholder** shells below. In this teaching baseline,
`kb-lint.sh` is an explicit, non-blocking no-op: it prints `SKIP` and exits 0.
It does **not** validate the knowledge base or regenerate `docs/knowledge/_INDEX.md`.
P5 may record `KB update: Skipped (not configured)` under this documented
baseline policy, but must not report KB lint or index refresh as Passed.
The other placeholders still ask for customization and exit nonzero.

| Script | Role |
|---|---|
| `init.sh` | Environment / “start of day” setup |
| `kb-lint.sh` | KB consistency + compile `docs/knowledge/_INDEX.md` |
| `verify-links.sh` | Bidirectional link checks |
| `archive-change.sh` | Archive helper (e.g. wrap OpenSpec archive + KB checks) |

Do not invent a second Spec authority tree from these scripts. Re-running
`/sdd:bootstrap` will not overwrite non-empty shells (including customized
implementations).
