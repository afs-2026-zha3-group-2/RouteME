# Repo understand brief

- skill: skill.common.repo-understand
- command: /sdd:repo-understand
- root: /c/Users/LIUWA2/Desktop/ITA/11.13/RouteME/ai4se-baseline
- focus: full-repo
- depth: standard
- greenfield: no
- generated_at: 2026-11-15
- checkpoint_log: docs/ai4se-plugins/20261115-003518-repo-understand-checkpoints.md

## 1. Repo shape

| Item | Finding | Evidence |
|------|---------|----------|
| Languages | Java 21（Spring Boot 4.1.2）；TypeScript / React 19 | `RouteME/backend/pom.xml`、`RouteME/frontend/package.json` |
| Package managers | Maven Wrapper；npm | `RouteME/backend/mvnw(.cmd)`、`RouteME/frontend/package-lock.json` |
| Top layout | `RouteME/`（backend、frontend、openapi.yaml）为应用；`openspec/`、`docs/`、`requirement-workspace/`、`scripts/`、`vendor/` 为 harness | probe-layout |
| Monorepo? | 轻量 monorepo：单仓前后端两个子工程，根目录无清单文件 | probe：根清单全部 MISSING |

## 2. Spec backend

| Item | Finding | Evidence |
|------|---------|----------|
| Backend | openspec | `openspec/config.yaml`、`openspec/templates/` |
| Living specs | 无（仅 `.gitkeep`） | `openspec/specs/` |
| Active changes | `bootstrap-hello-world`（已实现未归档）；`add-trip-plans`（新起草） | `openspec/changes/` |
| Notes | `add-trip-plans` 未经过 pre-spec 需求工作目录 | `requirement-workspace/` |

## 3. Harness / Rules / KB

| Item | Status | Evidence |
|------|--------|----------|
| AGENTS.md | FOUND | 根目录 |
| docs/knowledge/ | FOUND | 含 staffing 遗留内容 |
| docs/knowledge/rules/ | FOUND | 6 类 23 条规则，_SCHEMA/_INDEX/_LOG 齐全 |
| docs/ai4se-plugins/ | FOUND | 检查点日志所在 |
| requirement-workspace/ | FOUND | README、handoff、registry |

## 4. Entry points & risks

**Entry points (sample, not exhaustive):**

- `RouteME/backend/src/main/java/routeme/Application.java`、`controller/GreetingController.java`
- `RouteME/frontend/src/main.tsx`、`App.tsx`
- `RouteME/openapi.yaml`（契约唯一事实源）
- 外层 `.github/workflows/ci.yml`（backend verify + frontend build/test）

**Risks / uncertainties:**

| Risk | Severity | Evidence / why uncertain |
|------|----------|--------------------------|
| 知识库残留上一作业 staffing 内容（`backend/`、`frontend/`、`e2e/`、H2 staffing、`X-User-Id`） | high | `docs/knowledge/architecture/README.md`、`operations/README.md`；仅 RouteME 小节有效 |
| README 声称无应用实现与 CI/CD，已过时 | med | `README.md` |
| `bootstrap-hello-world` 未归档，living specs 为空 | med | `openspec/changes/`、`openspec/specs/` |
| `add-trip-plans` 未走 pre-spec | med | `requirement-workspace/` |
| 宿主投影 `.qoder/skills` 缺失 | med | 需运行 `scripts/refresh-agent-assets.mjs` |
| `scripts/*.sh` 为占位脚本，输出乱码；`kb-lint` 为 no-op | low | 脚本运行输出 |
| 未提交改动：TODO.md、registry.md、add-trip-plans、检查点日志 | low | `git status` |

## 5. Suggested next /sdd

- Primary: `/sdd:bootstrap`（skip-if-exists）→ `/sdd:rules-govern`（check-merge）→ pipeline-iac（已有 CI，跳过）→ `/sdd:quality-checklist stage=p0`
- Alternatives: 先清理知识库 staffing 遗留，再进入 P1

## Open questions

- 知识库 staffing 遗留内容在 P0 内清理还是作为独立任务？
