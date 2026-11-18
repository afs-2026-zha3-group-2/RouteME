# 设计 — add-route-completion

- **Change：** `add-route-completion`（REQ-031 / S32 路线完成度，issue #45）
- **输入：** [`specs/route-completion/spec.md`](specs/route-completion/spec.md)（ADDED 6 Requirement / 18 Scenario）、[`g1-decision.md`](g1-decision.md)（Pass）、[`atdd-design.md`](atdd-design.md)（A1–A18）
- **基线：** `origin/main@8992853`（openapi `0.26.0`；迁移头 `V31`；本 change **无迁移**）｜ **日期：** 2026-11-18 ｜ **作者：** Neal
- **原型：** [`docs/sdd/add-route-completion/preview/route-completion-row.html`](../../../docs/sdd/add-route-completion/preview/route-completion-row.html)（T0 先行）

## 决策

### D1 — 字段落点与序列化

- 在 `UserProfileResponse` record **末尾**追加 `Integer routeCompletionRate` 与 `String routeCompletionState` 两个组件；构造器参数同步追加，`from(...)` 工厂透传。
- 全局 `spring.jackson.property-naming-strategy: SNAKE_CASE` → 线名为 `route_completion_rate` / `route_completion_state`，无需 `@JsonProperty`。
- 类级 `@JsonInclude(NON_NULL)` 决定：`route_completion_rate` 为 `null` 时**省略**；`route_completion_state` 恒非空 → 恒出现。
- **拒绝**逐字段 `@JsonInclude(ALWAYS)`：与同 schema 20+ 可空字段的既有约定不一致，且需要额外注解。

### D2 — 状态枚举与派生单点

- 新增 `enums/RouteCompletionState.java`：`GOOD / NEUTRAL / WATCH / INSUFFICIENT` + `wireValue()`（与 `CreditLevel` 同目录惯例）。
- 新增 `service/RouteCompletionPolicy.java`（`final` 工具类，无状态）：
  - 常量 `GOOD_MIN = 80`、`NEUTRAL_MIN = 70`；
  - `static RouteCompletion evaluate(Integer rate, int completedTripCount)`；
  - 规则：`completedTripCount < 1` 或 `rate == null` → `(null, INSUFFICIENT)`；`rate < 0 || rate > 100` → `(null, INSUFFICIENT)`（失败安全，不得落入 `GOOD`）；`≥ 80` → `GOOD`；`70–79` → `NEUTRAL`；`0–69` → `WATCH`。
- 新增 `pojo/RouteCompletion.java` record（`Integer rate, RouteCompletionState state`）作为派生输出；未来聚合接入时只替换输入，派生与响应不变。
- **拒绝**把阈值写在前端或 `ProfilePage`：前端只做状态码 → 文案映射（issue AC 12）。

### D3 — 装配路径

- `UserProfileController` 在 `profile` / `save` / `uploadAvatar` 三处调用 `RouteCompletionPolicy.evaluate(null, 0)`（本期唯一数据源为空），把结果传给 `UserProfileResponse.from(...)`。
- 不新增查询、不读 `trip_plans` / `trip_companions` / 信用账户；`UserProfileStatsService` 不变。
- 未来聚合上线时，只需在控制器装配处换成「样本数 + 数值」；本设计不预留表、端点或开关。

### D4 — 契约

- `openapi.yaml` `info.version`：`0.26.0` → **`0.27.0`**（P3 排他确认，按合并顺序顺延）。
- `UserProfile.properties` 追加：
  - `route_completion_state`：`type: string`、`enum: [good, neutral, watch, insufficient]`、`readOnly: true`，**列入 `required`**；
  - `route_completion_rate`：`type: integer`、`minimum: 0`、`maximum: 100`、`nullable: true`、`readOnly: true`，**不入 `required`**（数据不足时省略）。
- 示例覆盖「数据不足省略 rate、state = insufficient」。
- **拒绝**把 state / rate 放进 `UserProfileUpdateRequest`：只读字段，写接口不接收。

### D5 — 前端类型

- `types.ts`：新增 `export type RouteCompletionState = 'good' | 'neutral' | 'watch' | 'insufficient'`；`UserProfile` 追加 `route_completion_state?: RouteCompletionState | null` 与 `route_completion_rate?: number | null`。
- 缺失、`null` 或未知枚举值一律按 `insufficient` 处理（与 `normalizeCreditLevel` 同范式）。

### D6 — 展示纯函数

- 新增 `profile/routeCompletionDisplay.ts`：
  - `routeCompletionLine(state, rate): { text: string; tone: 'is-good' | 'is-fair' | 'is-watch' | 'is-muted' }`；
  - `good` → 「路线完成度 NN% · 信誉良好」（`is-good`）；
  - `neutral` → 「路线完成度 NN%」（`is-fair`）；
  - `watch` → 「路线完成度 NN% · 请留意行程完成情况」（`is-watch`）；
  - `insufficient` → 「暂无足够完成记录」（`is-muted`），忽略 `rate`；
  - `rate` 缺失或非 0–100 整数而 `state` 非 `insufficient` → 降级为 `insufficient`（失败安全）。
- 纯函数不含 80 / 70 阈值；百分比只做整数格式化。

### D7 — 展示位与文案

- `ProfilePage` hero 在 `.profile-credit` 行**之后**追加 `<p className="profile-completion ...">`；本人 / 他人同口径，无编辑 / 隐藏开关。
- 不进入 `ProfileModal` / `TripCard` / `TripDetailPage` / `ApplicationsPage` / 列表页。
- `i18n/tripMessages.ts` 追加：`routeCompletionLabel`「路线完成度」、`routeCompletionGood`「信誉良好」、`routeCompletionWatch`「请留意行程完成情况」、`routeCompletionInsufficient`「暂无足够完成记录」。
- 文案禁用「骗子」「危险用户」「不可信」等定性结论。

### D8 — 样式

- `styles.css` 复用 `.profile-credit` 的行高 / 字号 / 间距；新增 `.profile-completion` 与四档 tone（`is-good` / `is-fair` / `is-watch` / `is-muted`）。
- 色值只引用 `:root` / `[data-theme="dark"]` 既有令牌与 `theme.ts` 同值；不写十六进制与魔法像素；`watch` 用警示色而非危险红。
- 1440 / 1024 / 768 / 390 四宽度无横向溢出；完成度行不换行折断信用行。

### D9 — 原型先行

- T0 先出 `docs/sdd/add-route-completion/preview/route-completion-row.html`：个人主页 hero 局部，四态 × 浅 / 深色，令牌取自 `docs/prototype/styles.css`。
- 实现按预览落地；预览与实现不一致时以预览为准并回改。

### D10 — 测试映射

- 按 [`atdd-design.md`](atdd-design.md) A1–A18：API A1 / A2 / A16 / A17 / A18（A15 兼 E2E），E2E A9–A14，UT A3–A8（apply 阶段 TDD）。
- 契约先红：`OpenApiTest` 断言 `required` 含 `route_completion_state`、不含 `route_completion_rate`；`0.27.0` 版本断言。

### D11 — 数据与迁移

- **零表、零迁移、零写入端点**：迁移头保持 `V31`（`add-report-credit-deduction`），本 change 不新增 `V32`。
- `PUT /api/users/me/profile` 请求体不变，传两字段不生效。
- 已完成行程样本数本期恒为 0；未来聚合口径（发布者 + `ACCEPTED` 同行者、仅 `completed`）已在 Delta 固化，不在本设计展开。

### D12 — 契约版本与排他

- 预计 `0.27.0`；若在途 change 先合并占用，则整体顺延并同步 `OpenApiTest`。
- 与 `add-growth-level`（拟 `V31` 迁移 + 成长等级字段）不共享字段、不共享表；其契约版本需自行按合并顺序排他。

## 影响面

| 位置 | 改动 |
|---|---|
| `backend/.../enums/RouteCompletionState.java` | 新增枚举（4 值 + `wireValue`） |
| `backend/.../pojo/RouteCompletion.java` | 新增派生结果 record |
| `backend/.../service/RouteCompletionPolicy.java` | 新增派生单点（阈值 + 失败安全） |
| `backend/.../response/UserProfileResponse.java` | record 末尾追加两字段并透传 |
| `backend/.../controller/UserProfileController.java` | 三处装配调用派生 |
| `RouteME/openapi.yaml` | 0.27.0 + `UserProfile` 两字段与示例 |
| `frontend/src/types.ts` | `RouteCompletionState` + 两可选字段 |
| `frontend/src/profile/routeCompletionDisplay.ts` | 新增纯函数 |
| `frontend/src/profile/ProfilePage.tsx` | hero 追加完成度行 |
| `frontend/src/i18n/tripMessages.ts` | 4 条文案 |
| `frontend/src/styles.css` | `.profile-completion` 四档 tone |
| 测试 | 后端 UT + API + 迁移反向；前端 UT；E2E `route-completion.spec.ts` |
| 数据 / 迁移 / 路由 / 管理端 | **无改动** |

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| 序列化口径被误改成显式 `null` | `OpenApiTest` + API 断言「键不存在」；D1 写死 |
| 前端复制阈值 | D6 纯函数无阈值；P4 源码检索 80 / 70 常量；E2E A9 |
| 展示行挤压信用行 | D8 复用行高 + 四宽度走查；T0 预览先行 |
| 与其他 change 撞版本 | D12；合并顺序排他，被抢占整体顺延 |
