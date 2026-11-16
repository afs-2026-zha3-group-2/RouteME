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

## 6. R2 基线：筛选参与了匹配分（2026-11-16 14:10）

看板 project #1 view 1 显示 S07 处于 **P3**；复核后确认筛选条件被当成参照物，同一行程在列表与详情得到不同分值。

| 复现 | 命令 | 结果 |
|---|---|---|
| 用户 2 按目的地筛选广州 | `GET /api/matches?destination_code=440100`（`X-User-Id: 2`） | 行程 4 得 **50**，理由「目的地相同」 |
| 同一行程详情 | `GET /api/matches/4`（同一身份） | 得 **0**，理由「暂无重合，可作为新方向的灵感」 |

| 项 | 证据 |
|---|---|
| 规则冲突 | REQ-007 out of scope：「不改变匹配的业务规则（仅把『目的地相同』的比较口径改为代码）」；实现却用筛选值覆盖参照物 |
| 契约描述过期 | `openapi.yaml` `Match.basis`：「…或我的兴趣与当前筛选」 |
| 测试固化错误行为 | `TripMatchTest#in_filterDestination_out_overridesReference` 断言筛选覆盖参照物 |

### R2 的 P0 复核

| id | 检查 | 结论 |
|---|---|---|
| P0-1 | 基线骨架 | Pass（同 §3） |
| P0-2 | 规则载体 | Pass（`@rule:api-contract`、`@rule:java-testing` 覆盖本轮） |
| P0-3 | 技能可解析 | Pass |
| P0-4 | pack 隔离 | Skipped |
| P0-5 | 管道骨架 | Pass（CI run #105 成功） |

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SM | Lewis | 接受 R2 排期，按看板 P3 → P4 推进 | 2026-11-16 |
| IO | Wanye | REQ-007 已声明匹配规则不变，R2 属纠偏 | 2026-11-16 |
| AO | Jay | 复现证据完整，承担 R2 实现 | 2026-11-16 |

## 6. 准入 P1 的条件

- 提案写清打分口径、降级文案与展示位置的范围边界。
- 明确不重复实现「按匹配度排序」（已由 `add-paged-lists-mybatis-plus` 落地）。