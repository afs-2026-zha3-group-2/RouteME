# P0 基线记录 — add-trip-publish

- **Change：** `add-trip-publish`（能力 `trip-plans` MODIFIED）｜ **故事：** S06 发布旅行计划（issue #8）｜ **需求：** REQ-002
- **阶段：** P0（Project baseline）｜ **日期：** 2026-11-16
- **记录人：** Jay（AO）

## 1. 阶段目标

确认 change 可以开工：规格树、规则载体、知识库槽位与 CI 管道都在仓库里可查，不依赖口头约定。

## 2. 基线核对

| 项 | 证据 | 结论 |
|---|---|---|
| 规格树 | `openspec/specs/`（含 `trip-plans`、`trip-companions`、`trip-experiences`）、`openspec/changes/`、`openspec/templates/`、`openspec/config.yaml` | 存在且自洽 |
| 长期规格权威 | `openspec/specs/trip-plans/spec.md` 已含「发布可被他人理解的旅行计划」Requirement | 本 change 以此为 MODIFIED 基线 |
| 规则载体 | `docs/knowledge/rules/_INDEX.md`（6 分类 / 23 条规则）、`docs/knowledge/rules/{architecture,process,quality,security,testing,documentation}/rules.md` | 覆盖分支、测试、管道、安全、SDD 工件 |
| 知识库 | `docs/knowledge/_INDEX.md`、`_LOG.md`、`architecture/README.md`、`interfaces/README.md` | 槽位可写 |
| 协作约定 | `ai4se-baseline/AGENTS.md`（仓库根、提交边界、知识库入口） | 存在 |
| CI | `.github/workflows/ci.yml`（backend verify + frontend build/test） | 存在 |
| CD | `.github/workflows/cd.yml`（构建镜像并发布 release） | 存在 |
| 验证命令 | `docs/feedback/verification-commands.md` | 存在 |

## 3. P0 DoV 检查（`checklists/p0.md`）

| id | 检查 | 结论 | 说明 |
|---|---|---|---|
| P0-1 | 基线骨架存在或显式延后 | Pass | `openspec/`、`docs/knowledge/`、`AGENTS.md` 均存在 |
| P0-2 | 规则覆盖分支 / 测试 / 管道 / 环境 / IaC / NFR | Pass | 23 条规则，IaC 以 CI/CD 工作流与 Dockerfile 体现 |
| P0-3 | `/sdd:p0` 序列技能可解析 | Pass | `commands/catalog.md` 中 repo-understand / bootstrap / rules-govern / quality-checklist 均为 ready |
| P0-4 | pack 隔离违规 | Skipped | 本 change 不修改 `ai4se-plugins` 包文件 |
| P0-5 | 管道骨架 | Pass | CI/CD 工作流已在主干运行（历史 run #81 成功） |

## 4. 阶段产出

- 本记录：`docs/sdd/add-trip-publish/p0-baseline.md`
- 阶段索引：`docs/sdd/README.md`
- 未新增代码或规格文件；P1 起才进入提案与规格。

## 5. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| SM | Lewis | 准入 P1；S06 进入本迭代排期 | 2026-11-16 |
| IO | Wanye | REQ-002 为需求来源，无跨能力前置依赖 | 2026-11-16 |
| AO | Jay | 基线证据可复现；同意进入 P1 | 2026-11-16 |

**阶段结论：Pass**

## 6. 准入 P1 的条件

- `proposal.md` 写清 in-scope / out-of-scope（已在 P1 提交）。
- 需求与故事可追溯到 REQ-002 与 issue #8。