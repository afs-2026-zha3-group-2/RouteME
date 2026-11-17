# REQ-023 — 旅行体验获赞增加信用分（Ready 需求草稿）

- **能力：** `trip-experiences`（体验点赞，ADDED）；`user-credit`（体验获赞结算，ADDED）；依赖 REQ-019 已交付的信用账户与记账服务
- **对应 OpenSpec change：** `add-experience-like-credit`
- **草稿日期：** 2026-11-17 ｜ **状态：** P1 drafted（blocking OQ 0，DoR BLOCKER 0）
- **故事来源：** GitHub issue #30 `[P0] 旅行体验获赞增加信用分`（正文：优先级 P1 / 信用系统迭代 2 / 故事点 5 / 落点页面：旅行体验 / 信用记录）
- **证据：** `requirement-workspace/intents/REQ-023-experience-like-credit.md`；`openspec/specs/trip-experiences/spec.md`；`openspec/changes/add-credit-account/specs/user-credit/spec.md`；`RouteME/backend/src/main/java/routeme/service/CreditService.java`；`RouteME/backend/src/main/java/routeme/service/impl/CreditServiceImpl.java`；`RouteME/backend/src/main/java/routeme/response/ExperienceResponse.java`；`RouteME/frontend/src/experiences/ExperienceCard.tsx`；`RouteME/frontend/src/trips/TripDetailPage.tsx`

## Discovery Decision

**Go（light intake，2026-11-17）。** 点赞数据归 `trip-experiences`（体验的从属数据），信用结算归 `user-credit`（复用 REQ-019 记账服务）；跨能力只经由服务端内部结算，不新增面向客户端的写分端点。候选与既有 Living Spec / 未归档 change 的关系已逐项核对（见 §6）。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-023 |
| statement | 系统 SHALL 允许已登录用户对他人发布的旅行体验点赞与取消点赞（同一用户对同一体验至多一次，禁止自赞）；当体验所属行程的「该作者最高赞单篇」跨过 5 / 10 / 15 / 20 / 25 档位时，系统 SHALL 为作者结算 +1 信用分（档位增量，同行程同作者累计 ≤ +5），每档仅触发一次、达成即锁定、取消点赞不回滚；每个 Asia/Shanghai 自然月通过点赞最多实发 +20（按实发消耗、截断不结转、每月 1 日 00:00 重置）；点赞者与完成旅行本身 MUST NOT 得分；所有加分 MUST 经既有记账服务写入账本（原因码 `EXPERIENCE_LIKE`），信用加分明细 MUST NOT 对用户可见。 |
| actors | 已登录用户（点赞者：赞 / 取消赞、看赞数与自己的点赞态）；体验作者（被点赞方：获得信用分，不能自赞）；系统内部结算（档位判定、月度截断、账本写入）；未登录访客（不可点赞，只读浏览沿用既有登录门）。 |
| rationale | 信用底座（REQ-019）已交付但没有任何业务事件调用方；issue #30 是信用系统迭代 2 的 Story 3，要求「优质体验获赞」成为第一个正向计分事件。平台当前完全没有点赞能力，若不补齐点赞链路，「点赞 → 结算 → 记账」无法端到端验收（用户裁决 D1）。 |
| acceptance hints | 见 §4 场景 L-1 ~ L-8（点赞/取消/自赞/未登录/不存在/点赞者不得分）、T-1 ~ T-10（档位、封顶、月度、幂等、裁断、重置、多行程）、D-1 ~ D-3（两个浏览面展示、无明细可见面）、E-1 ~ E-3（并发、三处一致、账户兜底）。 |
| links to evidence | 见 §6 Context 与 `intents/REQ-023-experience-like-credit.md` 的证据锚点表。 |

## 1. Intent

一句话：让「有人喜欢我写的旅行体验」真正变成可累积的平台信用——每个体验被不同的人点赞，赞数跨过 5/10/15/20/25 时为作者加 1 分（同一行程最多 +5），每月最多 +20；档位只算一次、取消点赞不反悔、赞数掉下去再回来也不重复加；点赞的人自己不加分，加分明细不对外展示。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 已登录用户（点赞者） | 可对他人的旅行体验点赞 / 取消点赞；每人每条体验至多一次；可看到赞数与自己的点赞态；**不得**因点赞获得信用分。 |
| 体验作者 | 被点赞对象；因获赞档位获得信用分；**不可**为自己的体验点赞（服务端拒绝）。 |
| 系统内部结算 | 体验获赞信用的唯一驱动方；档位判定、月度截断、账本写入；不暴露面向客户端的写分端点。 |
| 未登录访客 | 不可点赞（沿用壳层登录门与 `X-User-Id` 校验）；只读浏览沿用既有行为。 |
| 管理员 | 本 change **不存在**管理端页面 / 端点 / 审计能力。 |

## 3. In / Out scope

**In scope**

- 点赞数据底座：`experience_likes`（`experience_id` + `user_id` 唯一；点赞 = 一行，取消 = 删除该行）。
- 点赞 / 取消点赞接口：已登录、非本人体验、体验存在；重复点赞幂等不重复计数；取消未赞幂等成功。
- 体验响应扩展：`ExperienceResponse` 追加赞数（`like_count`）与当前用户点赞态（`liked_by_me`），列表 / 详情 / 我的体验三处同口径。
- 前端两个浏览面：灵感首页体验卡（`ExperienceCard`）与行程详情游后体验区（`TripDetailPage`）展示赞数、点赞/取消点赞交互；**原型先行**（`docs/prototype`）。
- 信用结算：`user-credit` 新增「体验获赞阶梯加分」Requirement——档位 5/10/15/20/25 → +1…+5（增量 +1）；同一行程同一作者累计 ≤ +5；同行程多篇体验取最高赞单篇；每档仅触发一次并锁定；取消点赞不回滚；赞数回落再达不重复。
- 月度上限：Asia/Shanghai 自然月实发 ≤ +20；截断不结转；每月 1 日 00:00 重置；按实发消耗月度额度。
- 账本口径：`reason_code = EXPERIENCE_LIKE`；幂等键覆盖「行程 + 作者 + 档位」；被边界裁断为 0 的跨档事件仍写一条 `applied_delta = 0` 的记录（沿用 REQ-019 D11）。
- 契约与迁移：`openapi.yaml` 次版本 + 新表迁移（版本号与迁移号在 P3 排他确认）。

**Out of scope**

- **信用记录 / 加分明细的可见面（用户裁决 D2）：** 不新增明细页、明细接口、入口或通知；分数变化在既有五个信用展示面（个人主页 / 资料弹窗 / 详情发布者行 / 行程卡发布者行 / 申请者行）体现。
- 点赞者信用分、完成旅行加分（issue 明确不给分）。
- 取消点赞回收已得分、赞数回落回滚、月度额度结转 / 补发 / 人工调账。
- 评论、收藏、关注创作者、点赞通知 / 推送 / 红点、点赞排行榜 / 按赞数排序 / 热度推荐。
- 管理后台、点赞审计、反作弊 / 刷赞识别。
- 体验删除端点（当前不存在；不新增）。
- 点赞数据的跨设备去重之外的任何风控（同一账号多端点赞天然按 `user_id` 去重）。

## 4. Scenarios + AC hints（SHALL 式，可观察）

### A. 点赞与取消点赞

1. **L-1 点赞他人体验成功** — Given 用户 A 已登录，体验 E 由用户 B 发布且赞数为 4，When A 对 E 点赞，Then 赞数 SHALL 变为 5，A 在 E 上的点赞态 SHALL 为已赞；若该行程跨过 5 档位，B 的信用分按 T 组规则结算。
2. **L-2 重复点赞不重复计数** — Given A 已点赞 E，When A 再次对 E 点赞，Then 赞数 SHALL 保持 5，A 的点赞态仍为已赞，系统 MUST NOT 产生第二条点赞记录或第二次跨档结算。
3. **L-3 取消点赞** — Given A 已点赞 E（赞数 5），When A 取消点赞，Then 赞数 SHALL 变为 4，A 的点赞态为未赞；B 已获得的信用分 MUST NOT 回滚，账本 MUST NOT 新增扣分记录。
4. **L-4 取消后重新点赞不重复加分** — Given E 的 5 档位已触发过且赞数回落到 4，When A 重新点赞使赞数回到 5，Then 赞数 SHALL 恢复为 5，但该档位 MUST NOT 再次结算信用分。
5. **L-5 禁止给自己的体验点赞** — Given B 是 E 的作者且已登录，When B 对 E 点赞，Then 系统 SHALL 拒绝（403 `FORBIDDEN`），赞数不变且 MUST NOT 产生加分。
6. **L-6 未登录不可点赞** — Given 请求未携带有效 `X-User-Id`，When 调用点赞 / 取消点赞接口，Then 系统 SHALL 返回 401 `DEMO_USER_REQUIRED`，赞数不变。
7. **L-7 体验不存在** — Given `experienceId` 不存在，When 调用点赞 / 取消点赞接口，Then 系统 SHALL 返回 404，且不产生点赞记录与任何信用变化。
8. **L-8 点赞者不得分** — Given A 的信用分为 80，When A 点赞他人体验并触发作者加分，Then A 的信用分 SHALL 保持 80，A 的账本 MUST NOT 新增 `EXPERIENCE_LIKE` 记录。

### B. 档位结算、封顶与月度上限

9. **T-1 issue 场景逐字对齐** — Given 作者 B 信用分 80、本月尚未获得点赞信用奖励、B 的某体验已有 4 个赞，When 另一用户点赞使赞数达到 5，Then B 的信用分 SHALL 由 80 变为 81，账本 SHALL 新增一条记录（原因「旅行体验获得 5 个赞 +1」、`reason_code = EXPERIENCE_LIKE`、`applied_delta = +1`、`score_before = 80`、`score_after = 81`、关联行程、发生时间）。
10. **T-2 档位逐级 +1** — Given 同一行程同一作者的体验赞数依次跨过 5 / 10 / 15 / 20 / 25，When 每个档位首次被跨过，Then 每次 SHALL 结算 +1，累计 +5；账本 SHALL 恰好新增 5 条加分记录。
11. **T-3 25 档位后封顶** — Given 累计已 +5，When 赞数继续增长（26、30 …），Then 信用分 MUST NOT 再增加；同一行程同一作者累计加分 MUST NOT 超过 +5。
12. **T-4 同行程多篇体验取最高赞单篇** — Given（在数据层构造的）同一行程同一作者存在多篇体验，When 结算触发，Then 档位 SHALL 以该作者在该行程全部体验的最大赞数计算，MUST NOT 对各篇赞数求和；当前数据模型每（行程, 作者）至多一条体验，本场景以结算服务多行数据单测覆盖。
13. **T-5 回落再达不重复** — Given 赞数 9 → 10 已结算 +1，When 赞数回落到 9、再回到 10，Then 信用分 MUST NOT 再次增加，账本 MUST NOT 新增该档位记录。
14. **T-6 每档仅一次（幂等与并发）** — Given 两个请求并发触发同一行程同一档位（同一赞或并发点赞），When 结算执行，Then 该档位 SHALL 只结算一次；账本幂等键唯一约束 MUST 兜底，重复投递不改变分数。
15. **T-7 月度 +20 截断** — Given 作者本月已获点赞加分 +19，When 跨档应发 +1，Then 实发 +1（月度累计 20）；当累计已达 20 后再次跨档，Then 实发 SHALL 为 0，账本 MUST 仍写入一条 `applied_delta = 0` 的记录且该档位锁定；截断部分 MUST NOT 结转下月。
16. **T-8 月度按 Asia/Shanghai 重置** — Given 上一个月度额度已耗尽，When 北京时间进入次月 1 日 00:00 后首次跨档，Then 月度累计 SHALL 从 0 重新起算并正常结算。
17. **T-9 总分 0–100 裁断与实发消耗** — Given 作者当前 100 分，When 跨档应发 +1，Then 实发 SHALL 为 0，账本写入 `applied_delta = 0`（`score_before = score_after = 100`），该档位锁定；月度累计 MUST 按实发 0 消耗（用户裁决 D4）。
18. **T-10 多行程共享月度额度** — Given 同一作者同月内在多条行程分别跨档，When 结算执行，Then 每条行程各自累计 ≤ +5，且当月点赞加分合计 MUST NOT 超过 +20。

### C. 展示与一致性

19. **D-1 首页体验卡点赞面** — Given 用户浏览灵感首页「旅行体验」视图，When 列表加载完成，Then 每张体验卡 SHALL 展示赞数与（当前用户的）点赞态；点击 SHALL 切换点赞/取消点赞并即时反映赞数；请求失败时 MUST 回滚视觉状态并给出提示。
20. **D-2 详情页体验区点赞面** — Given 用户打开已结束行程详情的「游后真实体验」区，When 列表加载完成，Then 每条体验 SHALL 展示与首页一致的赞数与点赞态；点赞后刷新页面 MUST 保持结果。
21. **D-3 无信用明细可见面** — Given 作者因获赞加分，When 任何人打开其个人主页、资料弹窗或其它既有展示面，Then 只能看到分数与等级的变化，系统 MUST NOT 出现加分明细、原因、时间、历史或入口；本 change MUST NOT 新增明细页面 / 接口。

### D. 边界与异常

22. **E-1 并发点赞同一条体验** — Given 两个不同用户同时点赞同一条体验并跨过档位，When 两个请求并发完成，Then 赞数 SHALL 为 +2，档位结算 MUST NOT 重复；信用分最多按档位应发增加一次。
23. **E-2 三处响应一致** — Given 同一条体验，When 分别调用列表、行程详情与「我的体验」接口，Then 三处的 `like_count` 与当前用户 `liked_by_me` SHALL 同源一致（同一数据源，无缓存分叉）。
24. **E-3 作者信用账户缺失兜底** — Given 作者因历史数据没有信用账户，When 触发档位结算，Then 系统 SHALL 经既有 `ensureAccount`（REQ-019）补齐账户后再结算，MUST NOT 出现空值、异常页或静默丢分。

## 5. Constraints

- **信用口径（继承 REQ-019）：** 分数 0–100 闭区间；等级五档由分数派生；分数只由记账服务写入；账本 append-only，等式 `score_before + applied_delta = score_after` 恒成立。
- **档位口径（issue 固化）：** 5/10/15/20/25 → 累计 +1/+2/+3/+4/+5；每次跨档的应发增量恒为 +1；同一行程同一作者累计 ≤ +5；档位以「该作者在该行程全部体验的最大赞数」判定，不对多篇求和。
- **锁定与回滚：** 档位一旦结算（含被裁断为 0 的结算）即锁定；取消点赞、赞数回落 MUST NOT 回滚已得分，也 MUST NOT 重复结算。
- **月度口径（用户裁决 D3 / D4）：** 自然月按 Asia/Shanghai；每月 1 日 00:00 重置；单月点赞加分实发合计 ≤ +20；超出截断不结转；月度消耗按 `applied_delta`（实发）累计。
- **幂等口径：** 「行程 + 作者 + 档位」构成幂等键，落到 `credit_ledger.idempotency_key` 唯一约束；并发与重复投递由唯一约束兜底（沿用 REQ-019 记账服务实现）。
- **账本口径：** `reason_code = EXPERIENCE_LIKE`；`related_type` / `related_id` 指向体验所属行程（行程维度的档位归属）；零变化跨档仍写 `applied_delta = 0`。
- **点赞唯一性：** `(experience_id, user_id)` 唯一约束；幂等点赞 / 取消由服务端保证，MUST NOT 仅靠前端禁用按钮。
- **自赞拒绝：** MUST 由服务端执行（403 `FORBIDDEN`），不只是前端隐藏入口。
- **既有依赖：** 体验发布 / 修改 / 图片 / 筛选分页等既有 `trip-experiences` Requirement 语义不变；信用账户 / 记账服务 / 五展示面口径不变（只读复用）。
- **未归档 change 交叉：** `add-credit-account`（`user-credit`）、`add-experience-photos` / `refine-experience-share` / `refine-inspiration-home`（`trip-experiences`）均未归档；本 change 只以 ADDED 方式追加新 Requirement 块，不重写既有 Requirement；**P5 归档必须排在这些 change 之后**。
- **契约与迁移排他：** `openapi.yaml` 当前 0.14.0、Flyway 头 V20；`add-ai-itinerary` 在途，已声明 0.15.0 + V21。本 change 的次版本与迁移号 MUST 在 P3 按合并顺序排他确认。
- **原型先行：** `docs/prototype` 的体验卡（`expCard`）与详情体验区（`.exp-item`）先补点赞按钮 / 赞数 / 点赞态，再同步实现；组件复用既有令牌，不写十六进制色值与魔法像素。
- **错误码闭集：** `openapi.yaml` `Error.code` 为闭集枚举；本 change 需要的新码（如「体验不存在」）只能在契约升级时扩充，MUST NOT 自造未登记错误码（P2/P3 定稿）。

## 6. Context（证据）

| 事实 | 证据 |
|---|---|
| 点赞能力为零 | 全仓 grep `点赞 / like / likes / heart` → 0 命中（backend / frontend / openapi / openspec / prototype 交互） |
| 信用底座已交付、无调用方 | `CreditService` / `CreditServiceImpl`（`book` 裁断 / 零变化留行 / 幂等键 / 同事务）；`add-credit-account` proposal 明确「本变更无业务事件调用方」 |
| 记账原因码示例 | `CreditServiceImplTest` 使用 `EXPERIENCE_LIKE` 字面量（测试数据，无业务实现） |
| 体验端点 | `GET /api/experiences`、`GET /api/trips/{tripId}/experiences`、`GET /api/me/experiences`、`POST /api/trips/{tripId}/experiences`（`ExperienceController`） |
| 体验响应 | `ExperienceResponse`（无赞数 / 点赞态字段） |
| 每作者每行程一条体验 | `V8__create_trip_experiences.sql` 唯一约束；Living Spec「再次提交即修改」 |
| 两个浏览面 | `ExperienceCard.tsx`（首页）；`TripDetailPage.tsx` 游后体验区；原型 `ui.js` `expCard()` 与详情 `.exp-item` |
| 信用展示面 | `profile/creditDisplay.ts`、`profiles/useUserCredits.ts`、`TripCard.tsx`、`TripDetailPage.tsx`、`ApplicationsPage.tsx`（五面） |
| 契约 / 迁移头 | `openapi.yaml` 0.14.0；`db/migration` 最大 V20 |
| 在途 change | `openspec/changes/`：`add-credit-account`、`add-experience-photos`、`refine-experience-share`、`refine-inspiration-home`、`add-ai-itinerary` 等 |
| 无删除端点 | `ExperienceController` / `TripController` 无 DELETE |

## 7. Affected capabilities

| 能力 | 变更类型 | 说明 |
|---|---|---|
| `trip-experiences` | **ADDED** | 体验点赞：点赞 / 取消点赞、唯一性、自赞拒绝、赞数与点赞态展示、三处响应一致 |
| `user-credit` | **ADDED** | 体验获赞阶梯加分：档位、行程封顶、月度上限（Asia/Shanghai）、实发消耗、幂等与零变化留痕 |
| `user-credit`（既有） | 只读复用 | 账户初始化、五档等级、记账服务、五展示面口径不变 |
| `trip-experiences`（既有） | 不变 | 发布 / 修改 / 资格 / 图片 / 筛选分页语义不变 |
| `design-system` | 只读复用 | 点赞按钮复用既有 `btn` / `badge` / 图标与令牌，不新增色板语义 |

## 8. Open questions

| 类型 | 状态 | 问题 | owner | 说明 |
|---|---|---|---|---|
| blocking | resolved | 点赞功能是否属于本 Story 范围？ | IO | D1：包含点赞全链路（表 + 接口 + UI + 原型先行） |
| blocking | resolved | 「信用记录」落点是否需要可见明细？ | IO | D2：不做可见明细；账本仅落库 |
| blocking | resolved | 月度自然月按哪个时区？ | SA | D3：Asia/Shanghai |
| blocking | resolved | 月度额度与 0–100 封顶如何组合？ | SA | D4：按实发消耗 |
| non-blocking | resolved | 「同行程多篇体验取最高赞单篇」在当前每作者每行程一条体验的模型下如何验收？ | SA | 结算服务按「该作者在该行程全部体验的最大赞数」实现，以多行数据单测覆盖；不新增多体验发布能力 |
| non-blocking | deferred | 点赞 / 取消点赞的端点形态与响应形状（路径、幂等返回码、`liked_by_me` 字段命名） | Dev | P2 契约定稿；沿用既有 `X-User-Id` 与错误码闭集 |
| non-blocking | deferred | 「体验不存在」错误码（新增 `EXPERIENCE_NOT_FOUND` 还是复用既有码） | Dev | P2 / P3 与契约版本一并定稿 |
| non-blocking | deferred | 契约次版本号与迁移号（0.14.0 → ? / V20 之后） | Dev | 受在本途 `add-ai-itinerary`（0.15.0 + V21）约束，P3 排他确认 |
| non-blocking | deferred | 月度累计的读取方式（账本聚合查询 vs 独立累计表） | Dev | 数据契约按账本派生；是否物化在 P3 设计确认（默认不新增表） |
| non-blocking | deferred | 并发下月度上限的严格性保障（事务隔离 / 条件更新） | Dev | SQLite 单写者；P3 设计给出保障方案并写测试 |

## 9. DoR 自检（12 项）

| # | 结果 | 说明 |
|---|---|---|
| 1 Intent clear | Pass | §1 一句话可对外表述 |
| 2 Actors defined | Pass | §2 五个角色 + 权限边界 |
| 3 Scope bounded | Pass | §3 in / out 均非空；信用明细可见面显式排除（D2） |
| 4 Scenarios concrete | Pass | §4 共 24 条，均含可观察结果 |
| 5 Exception / boundary | Pass | L-2 / L-5 ~ L-7、T-5 ~ T-9、E-1 ~ E-3（重复、自赞、未登录、不存在、回落、月度、裁断、并发、缺失账户） |
| 6 Results verifiable | Pass | 赞数、点赞态、分数、账本条数与等式、月度累计均可断言 |
| 7 Dependencies / app-arch touchpoints | Pass | §5 依赖与排他约束；§7 能力表；跨 change 交叉已列 |
| 8 Open-questions gate | Pass | blocking OQ 4 条全部 resolved；非阻塞 1 条 resolved、5 条 deferred 且有 owner |
| 9 Data contract decided | Pass | `deep-dive.md`「REQ-023 增补」① 点赞表 / 赞数派生 / 档位派生 / 月度派生 |
| 10 Boundary enumerated | Pass | 同节 ② 覆盖点赞、档位、月度、总分、并发、回落等全部分支 |
| 11 Cross-REQ aligned | Pass | 同节 ③ 与 `trip-experiences` / `user-credit` / `user-profiles` / `design-system` 全部 aligned |
| 12 Notification / display contract decided | Pass | 同节 ④ 两个点赞展示面均有 display-fields；无通知、无明细面 |

**DoR 结论：** BLOCKER 0 / WARNING 0 / SUGGESTION 0（自检通过，可进入 impact / split）。
