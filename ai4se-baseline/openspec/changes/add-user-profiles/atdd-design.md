# ATDD design — add-user-profiles

- **Change:** `add-user-profiles`（`user-profiles`，REQ-009）｜ **阶段：** P3
- **输入：** [`specs/user-profiles/spec.md`](specs/user-profiles/spec.md)（5 Requirement / 20 Scenario）、[`proposal.md`](proposal.md)、[`g1-decision.md`](g1-decision.md)、[`dov-ac-review.md`](dov-ac-review.md)
- **规则：** `@rule:api-contract`、`@rule:java-testing`、`@rule:web-testing`
- **NFR：** 用户确认本次不做专项 NFR 测试；仅保留 E2E 中的基本可访问性与响应式检查

## 1. ATDD 层次

| 层 | 本次 | 说明 |
|---|---|---|
| **API**（MockMvc + H2/SQLite） | 是 | 单用户公开资料读取、四项统计口径、零统计、用户不存在、隐私字段与账户凭据缺席 |
| **E2E**（Playwright） | 是 | 卡片/详情双入口、弹窗字段与共同兴趣、自我查看、隐私/举报/账户凭据缺席、加载失败、既有举报入口回归 |
| **UT**（推迟到 apply） | 是 | 共同兴趣交集、统计响应组装、身份/专业字段缺省格式化；不在本文件展开 UT 套件 |

## 2. Scenario 分层

| # | Scenario | 层 | 依据 |
|---|---|---|---|
| 1 | 从行程卡片打开资料 | E2E | 点击卡片发布者区域，断言弹窗出现且 URL 不进入详情 |
| 2 | 从行程详情页打开资料 | E2E | 点击详情发布者卡片，断言弹窗出现 |
| 3 | 查看自己的资料 | E2E | 当前用户点击自己的发布者入口，断言「这是你」 |
| 4 | 关闭资料弹窗 | E2E | 关闭后回原页面，列表/详情状态不变 |
| 5 | 展示学生形态的身份与专业 | API + E2E | 响应 `school` 文本 + 弹窗渲染 |
| 6 | 展示非学生形态的身份与专业 | API + E2E | 第 4 个演示用户「上班族 · 互联网行业 · INFP」 |
| 7 | 字段缺省时不显示空占位 | API + E2E | 两段字段响应 + UI 无空 MBTI/多余分隔符 |
| 8 | 存在共同兴趣 | E2E + Defer UT | 前端交集计算；UI 提示 |
| 9 | 没有共同兴趣 | E2E + Defer UT | UI 不展示提示 |
| 10 | 自我查看不展示共同兴趣 | E2E + Defer UT | 原型 `isMe` 分支 |
| 11 | 加入时间与隐私说明 | API + E2E | 响应 `joined_at` + 弹窗文案 |
| 12 | 展示可核对的四项统计 | API + E2E | 响应 `stats` + 弹窗数字 |
| 13 | 不计入不符合口径的数据 | API | 未接受申请、未发布体验不计入；当前无取消状态（P3 澄清） |
| 14 | 新用户统计为零 | API | 新建零数据账户后读取，四项均为 0 |
| 15 | 发布者用户不存在 | API + E2E | 404 `USER_NOT_FOUND` + 前端错误态 |
| 16 | 资料读取失败 | E2E | 路由拦截 500，断言不展示旧资料/不完整资料 |
| 17 | 隐私字段不出现在资料弹窗 | API + E2E | 响应无敏感字段 + DOM 文本断言 |
| 18 | 账户凭据不出现在资料弹窗 | API + E2E | 响应无 `username`/`password_hash`/token + DOM 文本断言 |
| 19 | 资料弹窗不提供举报入口 | E2E | 弹窗底部仅关闭，无举报按钮 |
| 20 | 既有举报能力不受影响 | E2E（回归） | 聊天/行程场景既有举报入口仍可见可用 |

**推荐附加层（advisory，不作为门禁）：** 安全（PII/凭据缺席）、兼容性（1440/1024/768/390、浅色/深色）、a11y（弹窗焦点与 Esc、发布者入口键盘可达）。

## 3. 生产代码之前先写什么

1. **契约先行（红）**：`openapi.yaml` 升至 0.8.0，复用 main 已有 `GET /users/{userId}/profile`（带 `X-User-Id`），`UserProfile` 增加 `joined_at`/`stats`，新增 `ProfileStats`；`OpenApiTest` 扩展断言字段与必填性。共同兴趣仍由前端用当前用户兴趣计算。
2. **API 验收测试（红）**：
   - `UserProfileControllerTest`（MockMvc + H2）：公开字段、`joined_at`、四项统计、零统计、404、响应无账户凭据。
   - `ProfileDataMigrationSqliteTest`（SQLite）：V12 写入第 4 个演示用户与其行程，且 `username`/`password_hash` 为 NULL。
   - 更新 `ProfileMigrationSqliteTest`（V1–V12、4 个演示账号）。
3. **E2E（红）**：新增 `RouteME/e2e/tests/profiles.spec.ts`；`profile.spec.ts` 的发布者入口改弹窗断言；`trips.spec.ts` 身份门为 4 个演示账户。
4. 再按 `/sdd:atdd-apply` 做 Red → Green → Refactor；UT 在 apply 阶段补：共同兴趣交集、统计组装、字段缺省格式化。

## 4. 门禁

| 门禁 | 命令 | 说明 |
|---|---|---|
| 契约 | `cd RouteME; npx @redocly/cli lint openapi.yaml`；`cd RouteME/backend; .\mvnw.cmd -Dtest=OpenApiTest test` | 0 error |
| 后端 | `cd RouteME/backend; .\mvnw.cmd -B verify` | H2 + SQLite 迁移测试 |
| 前端 | `cd RouteME/frontend; npm run build; npm test` | 类型 + 单测 |
| E2E | 后端/前端启动后 `cd RouteME/e2e; npx playwright test` | 本地门禁；按仓库约定不进 CI |
| 一致性 | `\sdd:consistency-lint phase=p2`（可选） | 已 Pass；P3 澄清已记录 |

## 5. 数据 / 测试夹具策略

| 层 | 夹具 | 清理 / 所有权 |
|---|---|---|
| API | Flyway V1–V12 迁移后的 H2/SQLite；第 4 个演示用户 + 行程；零统计账户由 `AuthService.register` 或测试内创建 | 每个测试类使用独立临时库/回滚；不依赖生产 SQLite 文件 |
| E2E | 种子 SQLite：用户 1–4、行程 1–7；用户 1 作为浏览者，用户 4 的行程用于非学生资料 | 新发布的行程使用唯一标题；不复用/清理演示种子；不引入破坏性 reset |
| 契约 | `openapi.yaml` 为唯一契约源 | 版本 0.8.0；`OpenApiTest` 与 Redocly 同源校验 |

- V12 只增不改：新增用户 4（`上班族 · 互联网行业 · INFP`，`username`/`password_hash` NULL，`created_at` 固定）与行程 7（招募中，发布者 4）。V10 归 main 的 `add-user-profile`（资料列），V11 归 `add-destination-area-filters`（目的地代码）。
- 统计夹具：未接受申请、未发布体验用于排除口径；零统计数据用新建账户；当前无「已取消」行程，不构造该状态。

## 6. Non-goals（含反向验证）

**本技能不做：** 生产代码、UT 套件设计、Playwright/POM/Excel 生成器、第二套 CI。

| Non-goal / Out of scope | 反向验证 |
|---|---|
| 资料弹窗不提供举报用户 | E2E 断言弹窗底部无举报按钮 |
| 不展示电话/证件/精确住址/学校门牌/实时位置 | API schema + E2E DOM 文本断言 |
| 不展示用户名/密码散列/会话令牌 | API 响应字段断言 + E2E DOM 文本断言 |
| 不新增聊天页「资料」入口 | E2E 断言聊天页无资料弹窗触发入口 |
| 不提供资料编辑/填写入口 | E2E 断言弹窗无编辑/保存操作 |
| 不改变既有举报能力 | E2E 回归：聊天/行程场景举报入口仍可见 |
| 不做 NFR 专项 | 用户 2026-11-16 确认；仅保留基本可访问性/响应式检查 |

## 7. 与 Spec 的对齐

- 20 个 Scenario 全部落层：E2E 16 条、API 10 条（有重叠）、Defer UT 3 条；无未覆盖 Scenario。
- 统计口径已按 P3 澄清：当前 `trip-plans` 无「已取消」状态，发布行程统计全部已发布行程；未来引入取消时再排除。
- 身份模式：复用 main 的 `X-User-Id` 读取约定；共同兴趣前端计算，避免服务端为不同浏览者缓存差异结果。
