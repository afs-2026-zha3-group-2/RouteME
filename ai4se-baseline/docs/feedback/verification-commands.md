# Verification commands

Document the three-layer stop checks used by this repo (static → runtime →
system). The commands mirror `.github/workflows/ci.yml` and each change's
`tasks.md` (P4 T8); paths are relative to `ai4se-baseline/` (the verify root).
Replace only when CI changes.

## Static

```bash
cd RouteME/frontend && npm run typecheck && npm run build
```

## Runtime

```bash
cd RouteME/backend && ./mvnw -B -ntp verify
cd RouteME/frontend && npm test
```

## System

```bash
cd RouteME/e2e && npx playwright test tests/route-completion.spec.ts
```

## Spec / contract

```bash
openspec validate add-route-completion --strict
cd RouteME && npx --yes @redocly/cli lint openapi.yaml
```
