# Artifact review — add-growth-level / proposal

- **Verdict: Pass（建议）**
- **Scope:** focus=proposal（`@rule:artifact-review-gate` 的 P1 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review:** [proposal.md](../../openspec/changes/add-growth-level/proposal.md)
- **Supporting inputs:**
  - [requirements/REQ-033-growth-level.md](../../requirement-workspace/requirements/REQ-033-growth-level.md)（41 场景 L / P / K / D / R / V / C / S，blocking OQ 0，DoR BLOCKER 0）
  - [intents/REQ-033-growth-level.md](../../requirement-workspace/intents/REQ-033-growth-level.md)（现状证据 + D1–D15）
  - [deep-dive.md](../../requirement-workspace/deep-dive.md)「REQ-033 增补」（①–④ 四表 + 探针记录）
  - [impact-brief.md](../../requirement-workspace/impact-brief.md) §30
  - [stories.md](../../requirement-workspace/stories.md)（S34）与 [stories/REQ-033-growth-level.story.md](../../requirement-workspace/stories/REQ-033-growth-level.story.md)
- **Evidence:**
  - `openspec validate add-growth-level --strict` → `Change 'add-growth-level' is valid`
  - Delta 统计：`user-growth` **ADDED**，9 Requirement / 41 Scenario
  - 空白基线：backend / frontend grep `user_growth|growth_level|exp_total|成长等级` → 0 命中
  - 事件挂接点核实：`ExperienceServiceImpl.upsert`（`created` 分支）、`ExperienceLikeServiceImpl.like`（`created` 分支 + 自赞拒绝）、`AdminReportServiceImpl.resolve`（`RESOLVED` 分支）、`ReportTargetService.reportedUserId`
  - 契约 / 迁移基线：`openapi.yaml` 0.25.0；迁移头 `V30__add_travel_finance.sql`
  - 规则核对：`rules/process/rules.md#spec-first`、`#artifact-review-gate`；`rules/architecture/rules.md#api-contract`；`rules/documentation/rules.md#sdd-artifacts`；`rules/security/rules.md#security-baseline`；`rules/testing/rules.md#java-testing`、`#web-testing`；原型基准 `docs/prototype/prototype.html` + `styles.css`

## Review checks

| # | 检查 | 结论 |
|---|---|---|
| 1 | 问题 / 价值是否说清「为什么不是信用分」 | Pass：明确信用分表达风险、成长表达参与；四块缺口与价值假设可对外复述 |
| 2 | 范围是否可判定 | Pass：In / Out 均具体；明细页、排行榜、通知、权益、管理端、回填、#45 显式排除 |
| 3 | 决策是否覆盖 issue 的每条 AC | Pass：D1–D15 覆盖等级、发布、点赞、上限、举报、展示、存量、编号与 #29 |
| 4 | 是否引用需求与影响面 | Pass：引用 REQ-033 / S34 与 impact §30；验收信号 13 条 |
| 5 | 事件挂接点是否真实存在 | Pass：发布 / 点赞 / 举报三处均有代码证据；无新建点赞或举报能力 |
| 6 | 与信用分是否完全分离 | Pass：独立能力与表；不读写 `user_credit_account` / `credit_ledger` |
| 7 | 防刷与上限是否可验证 | Pass：档位锁定、取消不回滚、每日截断、零实发留痕、并发幂等 |
| 8 | 展示与可见性是否可验证 | Pass：6 处展示面；本人可见经验、他人只见等级；与信用分文案区分 |
| 9 | 变更规模与工作量是否可信 | Pass：2 表 + 1 迁移 + 3 处挂接 + 2 处读取扩字段 + 6 处展示；约 2.5–3 人日 |
| 10 | 规则 / 原型是否遵守 | Pass：原型先行写进交付边界；未引用不存在的规则锚点，改用文件路径表述 |

## Findings

| severity | status | location | issue | fix hint |
|---|---|---|---|---|
| WARNING | carried to P3 | proposal §What Changes / 决策 D5–D7 | 发布 / 点赞 / 举报结算与业务事件的**事务边界**未在提案中写死（同事务 vs 失败不阻断） | P3 `design.md` 明确：优先同事务；若选择失败不阻断，必须写补偿与验收 |
| SUGGESTION | carried to P3 | proposal §What Changes 展示 | 同行者卡片新增 `LVn` 是第 6 个视觉元素，可能影响卡片高度与 390px 布局 | P3 原型先行；1440 / 1024 / 768 / 390 × 浅 / 深色走查 |
| SUGGESTION | carried to P4 | proposal §残余风险 | #29 合并冲突只有风险描述，没有合并顺序建议 | P4 合并前先看 `origin/main` 是否已含 #29；冲突处并列保留「扣信用分 + 扣成长经验」 |
| SUGGESTION | carried to P3 | proposal §决策 D11 | 「只用 `LVn`」未说明等级配色与信用分色阶的关系 | P3 原型确定；建议沿用相邻色阶骨架但文案与语义区分 |

## Conclusion

**Pass（建议）**：0 BLOCKER / 1 WARNING / 3 SUGGESTION。WARNING 为 P3 事务边界设计项，不阻塞进入 P2；SUGGESTION 分别带入 P3 / P4 跟踪。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| proposal | 工件（WAYNE） | WAYNE | 2026-11-18 |
| proposal-review | 报告（WAYNE） | WAYNE | 2026-11-18 |
| proposal-review | 报告（当前开发者 Jay） | Jay | 2026-11-18 |

## 编号顺延说明

- **变更：** REQ-029 / S30 → REQ-030 / S31（合并 `8992853`）→ **REQ-033 / S34**（合并 `f2bad40`；REQ-030 / S31 已由 `add-report-credit-deduction`（#29）占用）。
- **处理：** 本报告内的需求编号、路径与 `impact-brief` §30 引用已同步改号；评审结论与发现项不变。
- **签署：** WAYNE + Jay（2026-11-18）按内容不变沿用。
