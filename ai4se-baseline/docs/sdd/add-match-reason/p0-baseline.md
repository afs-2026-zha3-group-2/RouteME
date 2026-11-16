# P0 基线记录 — add-match-reason

- **Change：** `add-match-reason`（能力 `trip-companions` MODIFIED）｜ **故事：** S07 匹配原因提示（issue #9）｜ **需求：** REQ-003
- **阶段：** P0（Project baseline）｜ **日期：** 2026-11-16
- **记录人：** Jay（AO）

## 1. 阶段目标

确认「匹配原因」可以在现有基线上开工：能力、规则、知识库与管道均可查，且上游 S01/S03/S05 已就绪。

## 2. 基线核对

| 项 | 证据 | 结论 |
|---|---|---|
| 能力基线 | `openspec/specs/trip-companions/spec.md` 已含「展示可解释的匹配原因」 | 本 change 以此为 MODIFIED 基线 |
| 上游故事 | S01 身份门、S03 首页列表、S05 行程详情均已落地 | 无阻塞前置 |
| 匹配实现 | `MatchService` / `TripMatch` / `GET /api/matches` / `GET /api/matches/{tripId}` | 已有打分，缺可判定口径与卡片标签 |
| 规则载体 | `docs/knowledge/rules/_INDEX.md`（6 分类 / 23 条规则） | 覆盖质量、测试与 SDD 工件 |
| 知识库 | `docs/knowledge/_INDEX.md`、`_LOG.md`、`architecture/README.md` | 槽位可写 |
| CI | `.github/workflows/ci.yml` | 存在并在主干运行 |
| CD | `.github/workflows/cd.yml` | 存在 |
| 阶段记录约定 | `docs/sdd/README.md` | 本仓库 P0–P5 约定（S06 建立） |

## 3. P0 DoV 检查（`checklists/p0.md`）

| id | 检查 | 结论 | 说明 |
|---|---|---|---|
| P0-1 | 基线骨架存在 | Pass | `openspec/`、`docs/knowledge/`、`AGENTS.md` |
| P0-2 | 规则覆盖六类关注点 | Pass | 23 条规则 |
| P0-3 | `/sdd:p0` 序列技能可解析 | Pass | `commands/catalog.md` ready |
| P0-4 | pack 隔离违规 | Skipped | 不修改 `ai4se-plugins` 包文件 |
| P0-5 | 管道骨架 | Pass | CI/CD 工作流已运行 |

## 4. 阶段产出

- 本记录：`docs/sdd/add-match-reason/p0-baseline.md`
- 未新增代码或规格；P1 起进入提案。

## 5. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| SM | Lewis | 准入 P1；S07 与 S06 串行排期 | 2026-11-16 |
| IO | Wanye | REQ-003 为需求来源，依赖 S01/S03/S05 已满足 | 2026-11-16 |
| AO | Jay | 基线证据可复现；同意进入 P1 | 2026-11-16 |

**阶段结论：Pass**

## 6. 准入 P1 的条件

- 提案写清打分口径、降级文案与展示位置的范围边界。
- 明确不重复实现「按匹配度排序」（已由 `add-paged-lists-mybatis-plus` 落地）。