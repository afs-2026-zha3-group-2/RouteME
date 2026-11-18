# P1 意图记录 — add-growth-level

- **Change：** `add-growth-level`（REQ-030 / S31 用户成长等级 LV1–LV5；编号由 REQ-029 / S30 顺延）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-18 ｜ **记录人：** Jay（AO）
- **基点：** `origin/main@71f3ad4`（独立 worktree `.worktrees/add-growth-level`，分支 `feature/add-growth-level`）；2026-11-18 合并 `origin/main@8992853`（契约 0.25.0 / 迁移头 V30 未变）

## 1. 阶段目标

把 GitHub issue #44 收敛为可判定的 REQ-030、影响面与 OpenSpec 提案：明确「经验事件 → 防刷 / 每日上限 → 经验流水 → 等级派生 → 6 处展示」这一垂直切片，并划清三处边界——信用分（完全分离）、#29（举报扣信用分，独立并行）、#45（路线完成度，独立故事）。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 意图捕获 | [`intents/REQ-030-growth-level.md`](../../../requirement-workspace/intents/REQ-030-growth-level.md) | issue 原文、现状核对、用户裁决 D1–D15、覆盖 / 不覆盖、Discovery `Go` |
| Ready 需求 | [`requirements/REQ-030-growth-level.md`](../../../requirement-workspace/requirements/REQ-030-growth-level.md) | 六字段 + 41 场景（L / P / K / D / R / V / C / S）+ OQ（blocking 13 全 resolved；非阻塞 2 resolved / 8 deferred）+ DoR 12 项（BLOCKER 0） |
| 故事 | [`stories.md`](../../../requirement-workspace/stories.md) REQ-030 段 + [`stories/REQ-030-growth-level.story.md`](../../../requirement-workspace/stories/REQ-030-growth-level.story.md) | S31；AC 摘要、验收场景、追溯、拆分说明 |
| Deep-dive | [`deep-dive.md`「REQ-030 增补」](../../../requirement-workspace/deep-dive.md) | ① 账户 / 流水 / 派生等级 / 配置 / 点赞来源 / 幂等键；② 边界归属 30+ 分支；③ 跨 REQ 一致性；④ 6 处展示契约 + 探针记录 |
| 影响面 | [`impact-brief.md` §30](../../../requirement-workspace/impact-brief.md) | as-is → delta、blast radius、工件影响、双轨说明、风险、拆分边界 |
| 提案 | [`proposal.md`](../../../openspec/changes/add-growth-level/proposal.md) | Why / What Changes / Out of Scope / Impact / 决策 D1–D15 / 13 条验收信号 / 残余风险 / 规模与工作量 |
| Delta 草稿 | [`specs/user-growth/spec.md`](../../../openspec/changes/add-growth-level/specs/user-growth/spec.md) | ADDED：9 Requirement / 41 Scenario（账户与初始、等级派生与回退、发布、获赞、每日上限、举报扣减、流水与只读、展示与可见性、并发幂等） |
| 提案评审 | [`20261118-add-growth-level-proposal-review.md`](../../reviews/20261118-add-growth-level-proposal-review.md) | Pass（建议）；0 BLOCKER / 1 WARNING / 3 SUGGESTION |
| Delta 评审 | [`20261118-add-growth-level-spec-review.md`](../../reviews/20261118-add-growth-level-spec-review.md) | Pass（建议）；0 BLOCKER / 2 WARNING / 3 SUGGESTION |
| 质量报告 | [`20261118-125043-quality-checklist-report.md`](../../ai4se-plugins/20261118-125043-quality-checklist-report.md) | P1-1 ~ P1-4 Pass；P1-5 / P1-6 Skipped；Overall Pass |

## 3. 关键决策

- **能力边界（D1）：** 新增 `user-growth`（ADDED），独立账户 `user_growth_account` + 流水 `growth_exp_ledger`；**不读写** `user_credit_account` / `credit_ledger`；展示并列但文案与语义区分。
- **等级规则（D2 / D3 / D15）：** LV1 0–99、LV2 100–199、LV3 200–299、LV4 300–399、LV5 400+；每 100 EXP 一级；LV5 后继续累计经验、等级封顶；等级由总经验派生、不落库；扣经验后等级随经验回退。
- **初始与回填（D4）：** 所有人初始 LV1 / 0 EXP；**不回填**存量发布 / 点赞 / 已处理举报；迁移只建 0 账户；新用户懒建。
- **发布经验（D5）：** 首次创建「已完成行程」体验 +10 EXP（`routeme.growth.publish-exp` 默认 10，可配置）；按（行程, 作者）幂等；编辑 / 重复提交 / 删除重建不再发。
- **点赞经验（D6）：** 单篇体验每累计 10 个有效赞 +5 EXP（10/20/30… 各一次）；档位锁定；取消点赞不回滚；自赞沿用既有拒绝；多篇独立。
- **每日上限（D8）：** 正向经验每自然日（Asia/Shanghai）最多 +20；跨档按剩余额度截断（18/20 时 +5 → +2）；档位仍锁定、不次日补发；零实发也留流水；负向不受上限。
- **举报扣经验（D7）：** 所有 RESOLVED 举报对被举报用户 −50 EXP；每份一次；不受上限；最低 0（不足按实际扣）；上线前已成立举报不回填。
- **流水（D9）：** append-only；来源 / 实发值 / 前后快照 / 时间 / 关联对象 / 幂等键；`exp_before + applied_delta = exp_after` 且 `exp_after >= 0`。
- **计算与可见性（D10 / D11）：** 后端统一计算，前端不得加减；本人可见等级 + 当前经验 + 距下一级，他人只见等级；6 处展示面（主页 / 弹窗 / 详情发布者 / 行程卡 / 申请者行 / 同行者卡片）；头衔只用 `LVn`。
- **明确不做（D12）：** 经验明细页 / 排行榜 / 通知 / 等级权益 / 管理端 / 中文头衔 / 经验购买 / 等级影响信用分。
- **#29 关系（D13）：** 独立基于 `origin/main`；两边都改 `AdminReportServiceImpl.resolve`，合并时并列保留「扣信用分 + 扣成长经验」。
- **契约 / 迁移（D14）：** 基线 0.25.0 + V30；预计 0.26.0 + V31；P3 排他确认。

## 4. 校验

- `openspec validate add-growth-level --strict` → `Change 'add-growth-level' is valid`（Delta 纯 ADDED，9 Requirement / 41 Scenario）。
- 空白基线：backend / frontend grep `user_growth` / `growth_level` / `exp_total` / `成长等级` → 0 命中（合并 `origin/main@8992853` 后复核仍为 0）。
- 事件挂接点：`ExperienceServiceImpl.upsert`（`created`）、`ExperienceLikeServiceImpl.like`（`created` + 自赞拒绝）、`AdminReportServiceImpl.resolve`（`RESOLVED`）、`ReportTargetService.reportedUserId`。
- 契约与迁移排他：`openapi.yaml` 0.25.0；Flyway 头 `V30__add_travel_finance.sql`（合并 8992853 后未变）；在途 #29 亦需顺延，P3 / P4 按合并顺序确认。
- 已知工具偏差：`openspec show --json` 对中文 `## 问题` 标题报 `Why section`，属项目既有约定差异；`validate --strict` 不受影响。
- 质量检查：`docs/ai4se-plugins/20261118-125043-quality-checklist-report.md` Overall Pass（P1-1 ~ P1-4 Pass；P1-5 / P1-6 Skipped）。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | `proposal.md` 与 Delta Spec 工件；两份评审报告的 WAYNE 位 | 2026-11-18 |
| 当前开发者 | Jay | 两份评审报告的第二签署位；本记录人 | 2026-11-18 |
| SM | Lewis | 本回合未单独索取阶段准入确认（沿用用户当次「用 SDD 流程做 #44」指示） | — |

**阶段结论：Pass**

## 6. 待决与风险（带入 P2 / P3）

| 项 | 说明 | 落点 |
|---|---|---|
| 契约版本号 | `openapi.yaml` 现 0.25.0；本 change 预计 0.26.0 | P3 排他确认 |
| 迁移号 | main 头 V30；本 change 预计 V31；#29 亦需顺延 | P3 排他确认 |
| 批量读取形状 | 扩展现有 `/users/credits` vs 新端点；只返回等级 | P3 设计 |
| 字段命名与端点路径 | `growth_level` / `growth_exp` / `growth_exp_to_next` 等待定 | P3 设计 |
| 事务边界 | 发布 / 点赞 / 举报事件与成长结算是否同事务 | P3 `design.md` 明确；优先同事务 |
| 原型截点 | `docs/prototype` 无成长等级截点 | P3 原型先行；1440 / 1024 / 768 / 390 × 浅 / 深色走查 |
| #29 合并冲突 | 两边都改 `AdminReportServiceImpl.resolve` | P4 合并时并列保留两个副作用 |
| 有效赞口径 | 受限 / 封禁用户点赞是否计入，沿用现状 | OQ-7 deferred；如需变更另开需求 |

## 7. 提交记录

- `62095f2`：`docs(p1): add-growth-level add REQ-029 proposal and delta`（P1 产物首提，当时编号 REQ-029 / S30）。
- 2026-11-18 合并 `origin/main@8992853`：解决 `docs/sdd/README.md` / `requirement-workspace/stories.md` 两处冲突；因 origin/main 已由 `refine-publish-route-map` 占用 REQ-029 / S30，本 change 按「后到者顺延」改为 **REQ-030 / S31**（并行 #45 `add-route-completion` 顺延为 REQ-031 / S32）；本文件、两份评审、登记台账与登记路径同步改号；签署按内容不变沿用。

## 8. 编号顺延说明

- **变更：** REQ-029 / S30 → **REQ-030 / S31**（2026-11-18）。
- **原因：** origin/main@8992853 已由 `refine-publish-route-map` 登记 REQ-029 / S30（`registry.md` / `stories.md` 同日占用）。
- **影响：** 意图 / Ready / 故事文件改名；`deep-dive.md`「REQ-030 增补」、`impact-brief.md` §30、`registry.md` / `handoff.md` / `stories.md` / `docs/sdd/README.md` 登记行同步改号。
- **签署：** WAYNE + Jay（2026-11-18）按内容不变沿用，不重新索取签署。
