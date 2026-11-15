# Quality Checklist Report: p0

**Date:** 2026-11-15 (timezone: +0800)
**Root:** /c/Users/LIUWA2/Desktop/ITA/11.13/RouteME/ai4se-baseline
**Stages:** p0
**Focus:** full-stage

## Summary

### p0

| Check id | Required? | Status | Evidence |
|----------|-----------|--------|----------|
| P0-1 | yes | Pass | probe-stage：`openspec/`、`docs/knowledge/`、`docs/knowledge/rules/`、`docs/feedback/`、`requirement-workspace/`、`AGENTS.md`、`README.md` 均 FOUND；bootstrap apply 补齐 `requirement-workspace/{intents,requirements,_templates,analysis,ready,archive}/`（`20261115-005521-bootstrap-checkpoints.md`） |
| P0-2 | yes | Partial | 已覆盖：branch → `process/rules.md#git-branching-and-pr`；test → `testing/rules.md#java-testing`、`#web-testing`、`process/rules.md#tdd-cycle`。缺口：pipeline（无 CI 规则，`process/rules.md` 仅提到 CI 配置的提交格式）、env（`security/rules.md#no-hardcoded-secrets` 指向「环境规则」但该规则不存在）、IaC（无）、NFR（无性能 / 可用性规则；可访问性仅在 `web-coding-style`）。rules-govern 未引入 rulepack 文件，原因见 `20261115-012703-rules-govern-checkpoints.md` |
| P0-3 | yes | Pass | `vendor/ai4se-plugins/commands/catalog.md` 中 repo-understand、bootstrap、rules-govern、quality-checklist 均为 `ready`，SKILL.md 均可解析。注：宿主未投影 `.qoder/skills`，`/sdd:*` 斜杠命令在宿主内不可直接调用，本次按 vendor 下的 SKILL.md 手动执行 |
| P0-4 | yes* | Skipped | 本次未编辑 `vendor/ai4se-plugins/**` 中的 pack 文件 |
| P0-5 | no | Skipped | 用户确认跳过 `/sdd:pipeline-iac`；外层仓库 `.github/workflows/ci.yml` 已有 backend（`./mvnw -B -ntp verify`）与 frontend（`npm ci`、build、test）两个 job，Rules 未要求额外骨架 |

| **Stage Overall** | — | Partial | P0-2 Partial，其余必需项 Pass |

### Roll-up

| Scope | Overall | Notes |
|-------|---------|-------|
| selected stages | Partial | 仅 p0；P0-2 Rules 覆盖缺口 |

## Gaps

| Check id | Gap | Owner (if known) | Suggested next |
|----------|-----|------------------|----------------|
| P0-2 | 无 pipeline / CI 规则（必跑 job、失败处理、与 ci.yml 的对应） | 项目负责人 | `/sdd:rules-govern` check-merge，在 `process/rules.md` 新增规则 ID，并在 `_LOG.md` 记录 |
| P0-2 | 无 env 规则（`routeme.db` 路径、端口、TLS 代理证书等本机约束目前只写在 operations 知识库） | 项目负责人 | 同上，补 env 规则，或在 `security/rules.md` 改写该指针 |
| P0-2 | IaC 与 NFR 未声明 | 项目负责人 | 明确记为 N/A（本地演示 MVP），或补最小 NFR（响应时间、可访问性）规则 |
| P0-2 | 15 条 react/typescript/web 栈 rulepack 规则未并入 | 项目负责人 | 审阅后按 `_SCHEMA.md` 单一事实源原则并入对应分类的 `rules.md` |
| P0-3 | 宿主未投影 `.qoder/skills` | 开发者 | `node scripts/refresh-agent-assets.mjs` |
| — | 知识库残留 staffing 内容（`architecture/README.md`、`operations/README.md` 等），README 声称无应用与 CI | 开发者 | 单独做一次文档勘误提交，P1 前完成 |

## Notes

- Optional / not-run / out-of-focus items marked Skipped do not block Overall Pass.
- Overall aggregates in-focus required items only.
- This report is not a Gate decision.
- `rg` 不在 PATH（probe NOTE tool:rg:no），证据用编辑器内置搜索复核。
