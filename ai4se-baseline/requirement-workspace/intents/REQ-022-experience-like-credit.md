# Intent capture — 旅行体验获赞增加信用分（信用系统迭代 2 / Story 3）

- **捕获日期：** 2026-11-17
- **来源：** GitHub issue #30 `[P0] 旅行体验获赞增加信用分`（正文：优先级 P1 / 信用系统迭代 2 / 故事点 5 / 落点页面：旅行体验 / 信用记录）
- **候选编号：** REQ-022（P1 起草时 `origin/main` 最新为 REQ-021）
- **能力 / change 候选：** `trip-experiences`（体验点赞，ADDED）+ `user-credit`（体验获赞结算，ADDED）/ `add-experience-like-credit`
- **状态：** Discovery — Go（light intake）

## 原始意图（issue #30 原文要点）

> 作为发布旅行体验的用户，我希望优质旅行体验获得点赞后能够增加信用分，以便通过对社区的有效贡献提升平台信用。

### 加分规则（issue 原文）

| 获赞数量 | 累计加分 |
|---|---:|
| 5 个 | +1 |
| 10 个 | +2 |
| 15 个 | +3 |
| 20 个 | +4 |
| 25 个 | +5 |

### 执行规则（issue 原文）

1. 每跨过一个点赞档位结算对应新增信用分
2. 每个档位每条体验仅触发一次
3. 达成档位后锁定，取消点赞不回滚已获得信用分
4. 赞数回落后再次达到相同档位不得重复加分
5. 同一行程同一作者最多通过旅行体验获得 +5 分
6. 同一行程发布多篇体验时，以获赞最高单篇作为信用奖励计算依据
7. 用户不能为自己的旅行体验点赞
8. 同一用户对同一旅行体验只能点赞一次
9. 点赞行为本身不给点赞者增加信用分
10. 完成旅行本身不增加信用分

### 月度上限（issue 原文）

1. 每个自然月通过点赞最多获得 +20 信用分
2. 超出 +20 的部分直接截断，不结转下月
3. 每月 1 日 00:00 重置月度加分额度
4. 如果本月已经 +18，本次应获得 +5，则实际只增加 +2

### 场景（issue 原文）

前置：用户信用分为 80，本月尚未获得点赞信用奖励，某旅行体验已有 4 个赞 → 操作：另一用户点赞，使点赞数达到 5 → 预期：作者信用分 +1，由 80 变为 81，并记录「旅行体验获得 5 个赞 +1」。

### 垂直切片口径（issue 原文）

点赞达到档位 → 结算奖励 → 更新信用账户 → 记录奖励。

## 证据锚点（现状核对，2026-11-17 / origin/main@64b38da）

| 证据 | 路径 | 说明 |
|---|---|---|
| 点赞功能为零 | 全仓 grep `点赞 / like / likes / heart`（backend / frontend / openapi / openspec）；Living Spec `openspec/specs/trip-experiences/spec.md` | **0 命中**：无点赞表、无点赞端点、无点赞按钮、无点赞需求；原型 `docs/prototype/ui.js` `expCard()` 亦无点赞入口 |
| 信用底座已交付 | `RouteME/backend/src/main/java/routeme/service/CreditService.java`、`service/impl/CreditServiceImpl.java`、`entity/CreditLedgerEntity.java`、`V20__add_credit_account.sql` | REQ-019 `add-credit-account` 已交付：0–100 分账户 + append-only 账本 + `book(CreditBooking)` 记账（0–100 裁断、前后快照、`applied_delta`、`idempotency_key` 唯一、零变化留行）；**无业务事件调用方** |
| 账本原因码先例 | `RouteME/backend/src/test/java/routeme/service/CreditServiceImplTest.java:45` | 单测以 `EXPERIENCE_LIKE` 作为原因码示例，但仅是测试字面量，无业务实现 |
| 体验发布/展示 | `openspec/specs/trip-experiences/spec.md`；`RouteME/backend/src/main/java/routeme/controller/ExperienceController.java`；`RouteME/frontend/src/experiences/ExperienceCard.tsx`；`RouteME/frontend/src/trips/TripDetailPage.tsx`（游后真实体验区） | 体验 = 已结束行程的参加者发布；列表 `GET /api/experiences`、详情 `GET /api/trips/{tripId}/experiences`、我的 `GET /api/me/experiences`；首页体验卡与详情体验区两个浏览面 |
| 体验响应形状 | `RouteME/backend/src/main/java/routeme/response/ExperienceResponse.java` | 字段：`id` / `trip` / `author` / `content` / `intensity` / `advice` / `photos` / `createdAt` / `updatedAt`；**无赞数与点赞态** |
| 每作者每行程一条体验 | `V8__create_trip_experiences.sql`（唯一约束 `trip_id` + `author_id`）；Living Spec「再次提交即修改」 | 「同行程多篇体验取最高赞单篇」在当前数据模型下不可经由 API 构造；结算逻辑仍按「该作者在该行程全部体验的最大赞数」实现并以多行数据单测覆盖 |
| 无体验/行程删除端点 | `ExperienceController`、`TripController` | 无删除端点；不存在「删除体验导致赞数/积分回退」的链路 |
| 原型体验卡与详情体验区 | `docs/prototype/ui.js` `expCard()`（`.exp-foot` 三个按钮）；`docs/prototype/ui.js` 详情页 `.exp-item`（`.exp-item-head` / `.exp-item-body`） | 两个浏览面均有可插入点赞按钮的行；按原型先行约定（视觉基准 `docs/prototype/prototype.html` 与 `styles.css`）需先改原型 |
| 契约与迁移头 | `RouteME/openapi.yaml`（`info.version: 0.14.0`）；`db/migration` 最大号 `V20` | 本 change 的次版本与迁移号 MUST 在 P3 排他确认（`add-ai-itinerary` 在途，已声明 0.15.0 + V21） |
| 未归档相关 change | `openspec/changes/add-credit-account/`（`user-credit` ADDED）、`openspec/changes/add-experience-photos/`、`openspec/changes/refine-experience-share/`、`openspec/changes/refine-inspiration-home/`（均改 `trip-experiences`） | `user-credit` 与 `trip-experiences` 的 Living Spec 均未包含上述在途 delta；本 change 归档必须排在其后（P5 约束），P1–P4 不受影响 |
| 信用明细当前不可见 | `openspec/changes/add-credit-account/proposal.md`（Out of scope：明细对用户可见的任何形态）；前端 grep `credit_ledger / 明细` 0 命中 | 用户裁决 D2：本 change 同样不做可见明细 |
| 展示面现状 | `RouteME/frontend/src/profile/creditDisplay.ts`、`profiles/useUserCredits.ts`、`trips/TripCard.tsx`、`trips/TripDetailPage.tsx`、`trips/ApplicationsPage.tsx` | 信用状态已在个人主页 / 资料弹窗 / 详情发布者行 / 行程卡发布者行 / 申请者行五个展示面呈现；本 change 不新增展示面 |

## 现状差距（P1 已收敛）

1. **没有点赞能力**：无点赞表、无点赞/取消点赞端点、无赞数与点赞态字段、无点赞 UI；issue 的执行规则与场景全部无法触发。
2. **记账服务无调用方**：`CreditService.book` 已具备裁断、快照、幂等能力，但没有任何业务事件接入；体验获赞正是其首个业务调用方。
3. **档位/月度规则无承载**：账本没有「档位锁定」与「月度累计」的查询口径；`occurred_at` 为 UTC instant，自然月边界需换算 Asia/Shanghai。
4. **原型无点赞交互**：首页体验卡 `.exp-foot` 与详情页 `.exp-item` 均无点赞按钮/赞数，按原型先行规则需补。

## 本次明确排除

- 信用记录 / 加分明细的可见面（页面、接口、入口）——用户裁决 D2。
- 点赞者信用分、完成旅行加分（issue 明确不给）。
- 取消点赞回收已得分、赞数回落回滚、月度额度结转 / 补发。
- 评论、收藏、关注创作者（原型 Release 2 规划，非本故事）。
- 点赞通知 / 推送 / 红点。
- 点赞排行榜、按赞数排序、热度推荐。
- 管理后台与点赞审计。
- 体验删除 / 编辑回滚对积分的影响（无删除端点）。

## Discovery Decision

**Go（light intake，2026-11-17）。** 一句话可表述：「为旅行体验增加点赞/取消点赞（每人每条一次、禁止自赞），并在获赞跨过 5/10/15/20/25 档位时为体验作者按档 +1 结算信用分（同行程同作者封顶 +5、每自然月封顶 +20、每档仅一次、不回滚）」。候选与既有能力关系清晰：点赞数据归 `trip-experiences`，结算复用 `user-credit` 记账服务；不新增面向客户端的写分端点。

## 用户裁决（2026-11-17）

| 编号 | 议题 | 裁决 |
|---|---|---|
| D1 | 点赞功能是否属于本 Story | **包含点赞全链路**：点赞表 + 点赞/取消点赞接口 + 前端点赞按钮与赞数 + 原型先行；打通「点赞 → 结算 → 记账」垂直切片，故事可端到端验收。 |
| D2 | 「信用记录」可见面 | **不做可见明细**：账本仅落库留痕；分数变化在既有五个信用展示面体现；不新增页面 / 接口 / 入口。 |
| D3 | 月度自然月时区 | **Asia/Shanghai**：按北京时间每月 1 日 00:00 重置；结算时把账本 `occurred_at`（UTC）换算到该时区统计。 |
| D4 | 月度额度与 0–100 封顶的组合口径 | **按实发消耗**：月度累计只记实际到账的 `applied_delta`；被总分封顶吃掉的部分不占月度额度。 |

## 由 issue 直接固化、无需再裁决的事实

- 档位表与「每档 +1、同行程同作者累计 ≤ +5」。
- 每档每条体验仅触发一次；达成后锁定；取消点赞不回滚；回落再达不重复。
- 同行程多篇体验以获赞最高单篇为计算依据（当前数据模型每作者每行程一条体验，规则按最大赞数查询实现）。
- 禁止自赞、每人每体验一次、点赞者不得分、完成旅行不得分。
- 月度 +20、截断不结转、每月 1 日 00:00 重置。
