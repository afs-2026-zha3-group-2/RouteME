# 变更提案：add-experience-like-credit

- **触发：** GitHub issue #30「[P0] 旅行体验获赞增加信用分」（正文：优先级 P1 ｜ 信用系统迭代 2 ｜ Story 3 ｜ 故事点 5 ｜ 落点：旅行体验 / 信用记录）＋ 用户 2026-11-17 裁决 D1–D4
- **需求条目：** `requirement-workspace/requirements/REQ-023-experience-like-credit.md`
- **意图捕获：** `requirement-workspace/intents/REQ-023-experience-like-credit.md`
- **能力：** `trip-experiences`（体验点赞，ADDED）+ `user-credit`（体验获赞阶梯加分，ADDED）
- **规模：** M（1 张点赞表与 1 次迁移 + 点赞/取消端点 + 体验响应与两处展示面 + 获赞结算服务；复用既有记账服务，无新页面、无新路由）
- **规则：** `@rule:api-contract`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:security-baseline`、`@rule:tdd-cycle`、`@rule:sdd-artifacts`（原型先行按 `docs/prototype/prototype.html` 与 `styles.css` 为视觉基准执行）
- **基线：** `origin/main@64b38da`（worktree `.worktrees/add-experience-like-credit`，分支 `feature/add-experience-like-credit`）。已归档：`add-trip-plans`、`add-trip-companions`、`add-trip-experiences`、`bootstrap-hello-world`、`add-user-auth` 等；进行中：`add-credit-account`（`user-credit` 底座，P4 已落地未归档）、`add-experience-photos` / `refine-experience-share` / `refine-inspiration-home`（均改 `trip-experiences`，未归档）、`add-ai-itinerary`、`refine-trip-map`、`add-trip-cancel`、`refine-detail-companions` 等。
- **归档顺序：** 只新增 ADDED Requirement 块，不改写任何既有 Requirement；但 `user-credit` 与 `trip-experiences` 的 Living Spec 尚未包含在途 delta，**本 change 归档 MUST 排在 `add-credit-account` / `add-experience-photos` / `refine-experience-share` / `refine-inspiration-home` 之后**。契约 / 迁移号与 `add-ai-itinerary`（已声明 0.15.0 + V21）串行，P3 排他确认。

## Why

信用底座（REQ-019 `add-credit-account`）已交付账户、五档等级、append-only 账本与记账服务（0–100 裁断、前后快照、幂等键、零变化留痕），但**没有任何业务事件调用方**；平台也就没有任何正向计分事件。

issue #30 是信用系统迭代 2 的 Story 3：让「发布优质旅行体验并获得点赞」成为第一个正向计分事件。但平台当前**完全没有点赞能力**——没有点赞表、没有点赞端点、`ExperienceResponse` 没有赞数 / 点赞态、首页体验卡与详情体验区没有点赞入口、Living Spec 与原型也没有点赞需求。若只做结算，issue 的场景（「已有 4 个赞 → 再点一赞 → 作者 +1」）没有任何触发源，故事无法端到端验收。

**范围裁决（用户 2026-11-17）：**

- **D1：** 本 Story 包含点赞全链路（点赞表 + 点赞/取消接口 + 赞数/点赞态 + 原型先行），打通「点赞达到档位 → 结算奖励 → 更新信用账户 → 记录奖励」。
- **D2：** issue 落点中的「信用记录」不做可见明细——账本仅落库，分数变化在既有五个信用展示面体现，不新增页面 / 接口 / 入口。
- **D3：** 月度自然月按 Asia/Shanghai（每月 1 日 00:00 北京时间重置）。
- **D4：** 月度额度按**实发**消耗（`applied_delta`）；被 0–100 总分封顶吃掉的部分不占月度额度。

## What Changes

- **`trip-experiences`（ADDED，2 Requirement）：**
  1. **体验点赞与取消点赞**：已登录用户可对他人体验点赞 / 取消；同一用户对同一体验至多一次（唯一约束）；重复点赞与重复取消幂等；禁止自赞（服务端 403 `FORBIDDEN`）；体验不存在 404；未登录 401；并发点赞不重复计数。
  2. **体验赞数与点赞态展示**：`ExperienceResponse` 追加 `like_count` 与当前用户 `liked_by_me`，列表 / 行程详情 / 我的体验三处同源一致；首页体验卡与详情游后体验区展示赞数与点赞态（已赞 / 未赞），点赞失败回滚；批量查询，禁止 N+1。
- **`user-credit`（ADDED，3 Requirement）：**
  3. **体验获赞阶梯加分**：档位 5 / 10 / 15 / 20 / 25 → 每次跨档 +1（累计 +5）；同一行程同一作者累计 ≤ +5；同行程多篇体验以最高赞单篇为准；每档仅结算一次并锁定；取消点赞不回滚、赞数回落再达不重复；幂等键 = 行程 + 作者 + 档位。
  4. **体验获赞加分的月度上限**：Asia/Shanghai 自然月实发合计 ≤ +20；截断不结转；每月 1 日 00:00 重置；月度消耗按实发；跨档被裁断为 0 时仍写 `applied_delta = 0` 记录并锁定档位。
  5. **体验获赞的计分边界**：点赞者不得分、完成旅行不得分；信用加分明细 MUST NOT 对用户可见；不提供点赞通知 / 管理端 / 手工调账；所有加分 MUST 经既有记账服务写入账本（`reason_code = EXPERIENCE_LIKE`）。
- **数据：** 新增 `experience_likes`（`(experience_id, user_id)` 唯一）；不新增赞数冗余列、不新增档位表、不改 `credit_ledger` 结构。
- **契约：** `openapi.yaml` 升次版本；`Experience` 追加 `like_count` / `liked_by_me`；新增点赞 / 取消点赞端点；「体验不存在」错误码在 P2 与契约一并定稿（`Error.code` 为闭集，不自造码）。
- **前端：** `ExperienceCard`（首页）与 `TripDetailPage` 游后体验区新增点赞按钮 + 赞数；`types.ts` / `api.ts` / `tripMessages.ts` 同步；无新页面、无新路由。**原型先行**：`docs/prototype` 的 `expCard()` 与详情 `.exp-item` 先补点赞按钮 / 赞数 / 两点赞态，再对齐实现。
- **不做（Out of scope）：** 信用加分明细页 / 接口 / 入口（D2）；点赞者与完成旅行加分；取消点赞回收分数；月度额度结转；评论 / 收藏 / 关注；点赞通知 / 排行榜 / 按赞数排序；管理端与反作弊；体验删除端点。

## 问题（现状差距）

1. **点赞能力为零。** 全仓 grep `点赞 / like / likes / heart` 0 命中；无表、无端点、无字段、无 UI、无需求。
2. **记账服务无调用方。** `CreditService.book` 已具备全部裁断 / 快照 / 幂等 / 零变化能力，但没有任何业务事件接入。
3. **体验响应无点赞字段。** `ExperienceResponse` 只有内容、强度、建议、照片与时间；列表 / 详情 / 我的三处均无法展示赞数或点赞态。
4. **档位与月度无承载。** 账本没有业务原因码与档位幂等键；`occurred_at` 为 UTC，自然月边界需换算 Asia/Shanghai。
5. **原型无点赞交互。** 首页体验卡 `.exp-foot` 与详情 `.exp-item` 均无点赞按钮 / 赞数。

## 范围

**In scope**

- `trip-experiences`（ADDED）：点赞 / 取消点赞、唯一性与幂等、自赞拒绝、赞数与点赞态、三处响应一致、两个展示面。
- `user-credit`（ADDED）：获赞档位结算、行程封顶、最高赞单篇、档位锁定与不回滚、月度上限与重置、实发消耗、零变化留痕、计分边界。
- 数据：`experience_likes` + 一次迁移；契约：`Experience` 两字段 + 两个端点；前端：两个展示面 + 类型 / 文案；原型：两处交互先行。

**Out of scope**

- 信用记录 / 加分明细的可见面（D2）；点赞通知 / 红点 / 推送；排行榜与按赞数排序。
- 点赞者信用分、完成旅行加分、取消点赞回收、赞数回落回滚、月度结转 / 补发 / 人工调账。
- 评论、收藏、关注创作者；管理后台、点赞审计、反作弊；体验删除端点。
- 管理端「信用分视图」（REQ-019 D2 已推迟）与「点赞审计」另开需求。

## 关键决策（摘要）

| 编号 | 决策 | 来源 |
|---|---|---|
| D1 | 点赞全链路纳入本 Story（表 + 接口 + UI + 原型先行） | 用户 2026-11-17 |
| D2 | 「信用记录」不做可见明细；账本仅落库 | 用户 2026-11-17 |
| D3 | 月度自然月按 Asia/Shanghai | 用户 2026-11-17 |
| D4 | 月度额度按实发消耗（`applied_delta`） | 用户 2026-11-17 |
| D5 | 点赞数据归 `trip-experiences`，结算归 `user-credit`；不新增面向客户端的写分端点 | 架构归属（本提案） |
| D6 | 档位幂等键 = `EXPERIENCE_LIKE:{tripId}:{authorId}:{tier}`，以 `credit_ledger.idempotency_key` 唯一约束兜底；不新增档位表 | 数据契约（deep-dive ①） |
| D7 | 零变化跨档仍写 `applied_delta = 0` 记录并锁定档位（沿用 REQ-019 D11） | 继承 |
| D8 | 自赞 403 `FORBIDDEN`；未登录 401 `DEMO_USER_REQUIRED`；体验不存在 404（错误码 P2 定稿） | 需求条目 §4 |
| D9 | 当前数据模型每（行程, 作者）一条体验；「多篇取最高赞单篇」以结算 max 查询 + 多行数据单测覆盖 | 现状约束 |
| D10 | 契约次版本与迁移号 P3 排他确认（当前头 0.14.0 / V20；`add-ai-itinerary` 声明 0.15.0 + V21） | 编号排他 |

## 影响面

- **后端（2 能力 + 1 集成）：** `experience_likes` 实体 / mapper / service / 端点；`ExperienceServiceImpl` 读取路径批量聚合赞数与点赞态；`user-credit` 获赞结算服务（档位判定 + 月度裁断 + 调 `CreditService.book`）；点赞事务内触发结算。
- **数据（1 表 + 1 迁移）：** `experience_likes`；不新增赞数冗余列、不新增档位表。
- **契约（1 扩展 + 2 端点）：** `Experience` 两字段；点赞 / 取消点赞；错误码闭集处理。
- **前端（2 面 + 类型 / 文案）：** `ExperienceCard`、`TripDetailPage` 体验区、`types.ts` / `api.ts` / `tripMessages.ts`。
- **原型（2 面 + 演示数据）：** `docs/prototype` 的 `expCard()`、详情 `.exp-item`、`styles.css`、`store.js`。
- **不影响：** 行程发布 / 匹配 / 申请 / 聊天 / 举报 / 取消；体验发布 / 图片 / 分页筛选；注册与资料；信用五展示面口径。
- **运行时风险面：** 点赞事务多一次信用写入（同库同事务）；列表多两次批量查询；无新外部依赖。

## 需求与证据

- 需求：`requirement-workspace/requirements/REQ-023-experience-like-credit.md`（24 场景，blocking OQ 0，DoR BLOCKER 0）
- 意图：`requirement-workspace/intents/REQ-023-experience-like-credit.md`（证据锚点 + D1–D4）
- 共享分析：`deep-dive.md`「REQ-023 增补」①–④；`impact-brief.md` §22（as-is → delta、blast radius、风险、拆分边界）
- 现状证据：`CreditService` / `CreditServiceImpl`（记账服务无调用方）；`ExperienceResponse`（无赞数字段）；`ExperienceController`（无点赞端点、无 DELETE）；`V8__create_trip_experiences.sql`（每作者每行程唯一）；`docs/prototype/ui.js` `expCard()` / `.exp-item`（无点赞交互）；`openapi.yaml` 0.14.0（`Error.code` 闭集）；`db/migration` V20。

## Effort / size

- **规模：** M（1 表 1 迁移 + 2 端点 + 1 响应字段扩展 + 1 结算服务 + 2 前端展示面 + 2 原型展示面）。
- **风险等级：** 中（月度并发截断、时区边界、幂等键设计需要精确测试；无外部依赖）。
- **估点：** issue 标注 5 点；本提案按业务口径保留 5 点。

## Spec ID

- `trip-experiences`（Living Spec 已存在；本 change 只追加 ADDED 块）
- `user-credit`（Living Spec 尚未生成；本 change 追加 ADDED 块，归档需在 `add-credit-account` 之后）

## 残余风险与偏离记录

| 项 | 记录 |
|---|---|
| 优先级不一致 | issue 标题为 `[P0]`，正文写「优先级 P1」；本提案并列记录两者，不单方面改写 issue。 |
| 多篇体验规则不可演示 | 当前模型每（行程, 作者）一条体验；规则以结算 max 查询 + 多行数据单测覆盖，story 层不主张该场景 E2E。 |
| 归档顺序 | `user-credit` / `trip-experiences` 的 Living Spec 均未包含在途 change 的 delta；本 change 归档必须排在其后。 |
| 契约 / 迁移号 | `add-ai-itinerary` 已声明 0.15.0 + V21；本 change 的次版本与迁移号 P3 排他确认，不得撞号。 |
| 月度并发严格性 | 先读月度累计再写账本存在竞态；SQLite 单写者 + `book` 同事务可缓解，P3 设计需给出保障方案并写测试。 |
| 原型先行 | 视觉基准为 `docs/prototype/prototype.html` 与 `styles.css`；两个展示面先改原型再实现，原型变更纳入 P3 / P4 证据。（`@rule:prototype-ui-alignment` 在权威规则区无同名锚点，属治理漂移，本工件改用普通路径表述。） |
| 多 capability 偏离 | 本 change 同时改 `trip-experiences` 与 `user-credit` 两个 capability，与 `@rule:sdd-artifacts`「一个 change 只改一个 capability」存在偏离。理由：点赞（触发源）与结算（结果）拆开后，任一 change 都无法独立验收 issue #30 的 T 组场景；仓库已有先例（`refine-inspiration-home` 改 `trip-plans` + `trip-experiences`、`add-trip-completion` 改 `trip-plans` + `trip-companions`）。该偏离需 G1 的 SA 明确确认；若 SA 要求拆分，则按「点赞」「结算」两个 change 重排。 |
| 信用明细不可见 | 用户裁决 D2；proposal / 需求 / registry 均显式记录，「信用记录」不作为可见面验收。 |
