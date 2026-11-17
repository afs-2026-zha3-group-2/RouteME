# P1 意图记录 — add-credit-account

- **Change：** `add-credit-account`（REQ-019 / S19 信用分账户与等级展示）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-17 ｜ **记录人：** Lewis Liu（当前开发者）
- **基点：** `main@cf3ed76`（工作区 `main` 与 `origin/main` 同步；本阶段未建分支、未提交）

## 1. 阶段目标

把「信用分账户与等级展示」收敛为可判定的 REQ-019、影响面与 OpenSpec 提案：明确「用户创建 → 初始化信用账户 → 展示信用状态」这一垂直切片，并划清三处边界——管理后台（推迟）、计分事件（后续故事）、个人主页以外的展示触点（不做）。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 意图捕获 | [`intents/REQ-019-credit-account.md`](../../../requirement-workspace/intents/REQ-019-credit-account.md) | 故事原文、信用规则、等级表、AC、证据锚点、现状差距、排除项、Discovery `Go`、裁决 D1–D11 |
| Ready 需求 | [`requirements/REQ-019-credit-account.md`](../../../requirement-workspace/requirements/REQ-019-credit-account.md) | 六字段 + 16 场景（C-1 ~ C-16）+ OQ 12 条（blocking 7 全 resolved / 非阻塞 3 resolved、2 deferred）+ DoR 12 项（BLOCKER 0） |
| 故事 | [`stories.md`](../../../requirement-workspace/stories.md) REQ-019 段 | S19；无独立故事文件，以 proposal + Delta 承接 |
| Deep-dive | [`deep-dive.md`「REQ-019 增补」](../../../requirement-workspace/deep-dive.md) | ① 信用账户 / 账本 / 派生等级；② 边界归属 19 条分支；③ 跨 REQ 一致性（`user-profile` / `user-profiles` / `user-auth` / `design-system` / 管理端 n/a）；④ 展示契约 4 个 surface + 探针记录 |
| 影响面 | [`impact-brief.md` §19](../../../requirement-workspace/impact-brief.md) | as-is→delta、blast radius、工件影响、双轨说明、风险、拆分边界 |
| 提案 | [`proposal.md`](../../../openspec/changes/add-credit-account/proposal.md) | 问题 / 范围 / 影响面 / 决策 / 验收信号 / 残余风险 / 交付边界 |
| Delta 草稿 | [`specs/user-credit/spec.md`](../../../openspec/changes/add-credit-account/specs/user-credit/spec.md) | ADDED：7 Requirement / 22 Scenario（账户与初始分值、区间与裁断、等级派生、个人主页展示、只读、账本与记账（含零变化留痕）、管理端边界） |
| 提案评审 | [`20261117-add-credit-account-proposal-review.md`](../../reviews/20261117-add-credit-account-proposal-review.md) | Pass；0 BLOCKER / 0 WARNING / 3 SUGGESTION |
| Delta 评审 | [`20261117-add-credit-account-spec-review.md`](../../reviews/20261117-add-credit-account-spec-review.md) | Pass；0 BLOCKER / 0 WARNING / 3 SUGGESTION（1 条当场收口） |
| 质量报告 | [`20261117-111629-quality-checklist-report.md`](../../ai4se-plugins/20261117-111629-quality-checklist-report.md) | P1-1 ~ P1-4 Pass；P1-5 / P1-6 Skipped；Overall Pass |

## 3. 关键决策

- **分数口径（D1）：** 0–100 闭区间；90 / 80 / 60 / 30 四道阈值 → 信用优秀 / 信用良好 / 信用一般 / 信用较低 / 信用风险。历史会话中的「信誉分 0–120、六档、低于 60 自动封禁」方案**作废**，本需求不引入封禁。
- **管理端（D2）：** 本轮只做用户端；故事 AC3 / AC4 与 AC6 的管理端一半推迟到独立故事，Delta 以「管理后台信用分视图与计分明细的边界」显式约束。
- **数据模型（D3）：** `user_credit_account`（每用户 1 条、分数唯一真相）+ `credit_ledger`（append-only、含 `score_before` / `applied_delta` / `score_after` / `reason_code` / `related_type` + `related_id` / 幂等键）；**不改** `app_users`。
- **可见性（D4）：** 本人与他人主页同口径展示分数与等级；加 / 扣分明细、原因、时间与历史**不对外**。
- **回填（D5）：** 现有 4 个演示用户与已注册账号统一回填 80（等级均为「信用良好」）。
- **记账能力（D6）：** 本变更就交付记账服务（0–100 裁断、实际生效量、前后快照、账本与账户同事务、幂等键唯一约束 + 单测），但**不接入任何业务事件**。
- **接口归属（D7）：** 扩展现有 `GET /api/users/{userId}/profile` 响应（只读字段），页面零额外往返。
- **命名（D8）：** change = `add-credit-account`；capability = `user-credit`；表 = `user_credit_account` / `credit_ledger`。
- **`user-auth` 归属（D9，P2 入口补裁）：** 不改 `user-auth`「注册账号」；注册后建账户写在 `user-credit`，保持单 capability。
- **等级契约取值（D10，P2 入口补裁）：** 接口返回英文码 `excellent` / `good` / `fair` / `low` / `risk`，展示文案由前端 i18n 映射；阈值只在服务端一处实现。
- **零变化留痕（D11，P2 入口补裁）：** 理论变化被边界完全裁断（实际生效 0）时仍写一条 `applied_delta = 0` 的记录，分数不变，幂等键照占。
- **能力归属（派生决策）：** 信用字段语义写在 `user-credit`（ADDED），**不**新建 `user-profile` delta；`user-profile` / `user-profiles` 仍未归档，避免抢同一 Requirement 块。
- **等级存储（派生决策）：** 读取时派生，不落库；五档阈值只存在一处。
- **序列化（派生决策）：** 信用字段必须非空——`UserProfileResponse` 使用 `@JsonInclude(NON_NULL)`，可空字段会被整键省略，会破坏「任意用户不出现缺失值」。
- **明确不做：** 任何计分事件（获赞 / 退出 / 举报 / 月度上限 / 封禁）、规则说明页、明细页、申诉、通知、`ProfileModal` / 行程卡 / 申请列表 / 顶栏等他人主页以外的触点。

## 4. 校验

- `openspec validate add-credit-account --strict` → `Change 'add-credit-account' is valid`（Delta 纯 ADDED，0 MODIFIED / 0 REMOVED）。
- 空白基线：全仓 grep `信用分 / 信誉分 / credit_score / creditScore / reputation` → 0 命中；grep `admin / 管理后台` → 0 命中。
- 契约与迁移排他：`openapi.yaml` 为 `0.11.0`；Flyway 头为 `V17__meeting_areas.sql`；在途 `refine-trip-map`（V17）/ `add-ai-itinerary`（0.12.0 + V18）。
- 已知工具偏差：`openspec show --json` 对全部 change（含既有 `add-user-profile`）返回 `Change must have a Why section`，属项目中文标题「## 问题」的既有约定差异；`validate --strict` 不受影响。
- 打包脚本局限：`quality-checklist` 的 `init-checkpoint-log.sh` / `probe-stage.sh` / `write-report.sh` 需要 bash，本机无 bash；按模板手工产出等价 checkpoint 与报告，探针改为直接文件核对。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | `proposal.md` 与 Delta Spec 签署；两份评审报告的 WAYNE 位（批准意见：全部批准） | 2026-11-17 |
| 当前开发者 | Lewis Liu | 承接 P2–P4；两份评审报告的第二签署位；本记录人 | 2026-11-17 |
| SM | — | 本回合未单独索取阶段准入确认（沿用用户当次「进入 P1」指示） | — |

**阶段结论：Pass**

## 6. 待决与风险（带入 P2 / P3）

| 项 | 说明 | 落点 |
|---|---|---|
| 契约版本号 | 现 `0.11.0`；REQ-017 已声明 `0.12.0` | P3 排他确认 |
| 迁移号 | main 头 `V17`；REQ-016 声明 V17、REQ-017 声明 V18 | P3 排他确认；建表 + 回填同一迁移 |
| 全裁断留痕 | ~~理论变化量被完全裁断（实际生效 0）时是否写一条记录~~ → D11 已裁定：写一条 `applied_delta = 0` 记录 | 已收官（Delta 新增场景） |
| 等级契约形态 | ~~中文枚举 vs 英文码~~ → D10 已裁定：英文码 + 前端映射 | 已收官（P2 契约定稿落实码值） |
| 是否 MODIFY `user-auth` | ~~待 P2 判定~~ → D9 已裁定：不改 | 已收官 |
| 原型缺口 | `docs/prototype` 无信用分骨架 | P3 先补截点（`@rule:prototype-ui-alignment`） |
| 管理端三条 AC | 按 D2 推迟 | 另开管理后台需求（IO / SM） |

## 7. 提交记录

本阶段**未提交**：用户当次只要求进入 P1，未要求分阶段提交或推送。工作区新增/修改文件均为 P1 工件（`requirement-workspace/`、`openspec/changes/add-credit-account/`、`docs/reviews/`、`docs/ai4se-plugins/`、`docs/sdd/`）。
