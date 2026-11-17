# 任务：add-experience-like-credit

- **依据：** [`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md)、[`specs/user-credit/spec.md`](specs/user-credit/spec.md)、[`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)
- **Owner：** Lewis Liu（当前开发者）｜ **协助：** Neal（VL，design / tasks 第二签署；P4 独立验证）
- **顺序：** T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10；T11 在 T10 之后。
- **契约：** `0.16.0`；新增 `POST` / `DELETE /api/experiences/{experienceId}/likes`、`ExperienceLikeResponse`、`ExperienceResponse` 的 `like_count` / `is_liked`、`Error.code` 增 `EXPERIENCE_NOT_FOUND`。
- **迁移：** `V22__add_experience_likes.sql`（当前 main 最大 0.14.0 / V20；`0.15.0` + `V21` 已由 `add-ai-itinerary` 台账声明，本 change 顺延）；开工前复核未被越过。
- **视觉基准：** `docs/prototype/ui.js` `expCard()` + 详情 `.exp-item`、`docs/prototype/styles.css`（T0 先改）；不改原型其他区域。
- **NFR：** 不纳入（用户裁决 2026-11-17）。

## 任务清单

### T0 [prototype] 原型先行：体验点赞交互

- [x] `docs/prototype/ui.js`：`expCard()` 增点赞按钮 + 赞数；详情 `.exp-item` 增同款按钮；自己的体验不显示、未登录禁用。
- [x] `docs/prototype/styles.css`：`.exp-like` 两态（已赞 / 未赞），只用令牌，浅 / 深色一致。
- [x] 走查 1440 / 1024 / 768 / 390 与两套主题，无横向溢出。

**验证：** 浏览器打开 `docs/prototype/prototype.html` 核对两处展示面与响应式
**覆盖：** D15、`prototype-ui-alignment`

### T1 [contract] 契约 0.16.0

- [x] `openapi.yaml`：`info.version` → `0.16.0`；新增 `/experiences/{experienceId}/likes` 的 `post`（201/200 + `ExperienceLikeResponse`，401/403/404）与 `delete`（204，401/404）。
- [x] 新增 `ExperienceLikeResponse`（`experience_id` / `like_count` / `is_liked`，全 required）；`ExperienceResponse` 增 `like_count` / `is_liked` 并加入 `required`。
- [x] `Error.code` enum 增 `EXPERIENCE_NOT_FOUND`；新端点补成功 / 拒绝两组 examples。
- [x] `OpenApiTest`：断言版本、两个路径、新增 schema 与 `ExperienceResponse` 扩展、`required` 集合、错误码 enum。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=OpenApiTest test`
**覆盖：** D12、L-1~L-7、D-1、`@rule:api-contract`

### T2 [backend] 迁移 V22

- [x] 新增 `V22__add_experience_likes.sql`：`experience_likes`（`(experience_id, user_id)` 唯一 + `(experience_id)` 索引 + 双外键）。
- [x] 新增 `ExperienceLikeMigrationSqliteTest`（先 red）：全新库到 V22 建表；旧库（V21）升级后既有数据不变；重复 `(experience_id, user_id)` 插入被拒。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=ExperienceLikeMigrationSqliteTest test`
**覆盖：** D1、D13、`@rule:java-patterns`

### T3 [backend] 点赞数据访问

- [x] 新增 `entity/ExperienceLikeEntity`（`IdType.INPUT`）、`mapper/ExperienceLikeMapper`、`constant/ExperienceLikeConstant`（档位 / 月度上限 / 原因码 / 关联类型 / 幂等键模板）。
- [x] Mapper 方法：`countByExperience`、`exists(experienceId, userId)`、`selectStatsByExperienceIds(ids, viewerId)`（一次 GROUP BY 返回赞数与当前用户点赞态）、`selectMaxLikesOfTripAuthor(tripId, authorId)`（取最大单篇赞数，不求和）。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp test`
**覆盖：** D1、D3、D8、D10

### T4 [backend] 点赞与取消点赞端点

- [x] 新增 `exception/ExperienceNotFoundException`（`EXPERIENCE_NOT_FOUND` + 404）与 `response/ExperienceLikeResponse`。
- [x] 新增 `service/ExperienceLikeService` + `impl`：`like`（404 → 403 → 插入，唯一冲突视为已赞）、`unlike`（0 行也 204）、`statsOf`。
- [x] `ExperienceController` 增两个端点；首次 201 / 重复 200 / DELETE 204。
- [x] 新增 `ExperienceLikeApiTest`（先 red）：L-1~L-8（含自赞 403、未登录 401、不存在 404 且无副作用、并发两线程）。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=ExperienceLikeApiTest test`
**覆盖：** L-1~L-8、D2、D5、D6

### T5 [backend] 读取侧赞数与点赞态

- [x] `ExperienceResponse` 增 `like_count` / `is_liked`；`from(...)` 收入赞数参数。
- [x] `ExperienceServiceImpl.describeAll` 一次批量取赞数（同 `photosOf` 模式）；无记录返回 0 / false。
- [x] `ExperienceService` 的 `listPage` / `listAll` / `listByTrip` 增加 `viewerId`；`mine` 的 viewer = `authorId`；Controller 传入解析后的用户 id。
- [x] 同步更新既有 `ExperienceServiceTest` / `ExperienceServicePersistenceTest` / `ExperienceControllerTest` 的调用签名。
- [x] 新增 `ExperienceLikeDisplayApiTest`（先 red）：D-1 三接口同源、`is_liked` 随视角变化。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp test`
**覆盖：** D-1、D3、D4、D16

### T6 [backend] 获赞信用结算

- [x] 新增 `service/ExperienceLikeRewardService` + `impl`：档位判定（同行程同作者最大赞数）、已锁定档位读取、月度额度（Asia/Shanghai 月首、`SUM(applied_delta)`）、逐档 `CreditService.book` 调用、幂等键 `EXPERIENCE_LIKE:{tripId}:{authorId}:{tier}`、`related_type = TRIP`。
- [x] `ExperienceLikeServiceImpl.like` 在**新插入成功**后同事务调用 `award`；`unlike` 不触发。
- [x] 新增 `ExperienceLikeCreditApiTest`（先 red）：C-1~C-3、C-5~C-7、C-13、C-14。
- [x] 新增 `ExperienceLikeCreditMonthApiTest`（先 red）：C-8~C-12，含可调测试 Clock（`@TestConfiguration` + `@Primary`，只被本类 `@Import`）。
- [x] apply 层单测：档位推导边界（4/5/9/10/25/26）、月度窗口纯函数、C-4 多篇取 max 不求和（mapper 多行 mock）。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=ExperienceLikeCreditApiTest,ExperienceLikeCreditMonthApiTest test`
**覆盖：** C-1~C-14、D7~D11

### T7 [frontend] 类型、请求与纯逻辑

- [x] `types.ts`：`Experience` 增 `like_count` / `is_liked`；新增 `ExperienceLikeResult`。
- [x] `api.ts`：`likeExperience` / `unlikeExperience`（带 `X-User-Id`）。
- [x] 新增 `experiences/experienceLikes.ts`：`applyLikeState`（乐观 +1 / -1，下限 0）、`canLike`（未登录 / 自己的体验不可赞）。
- [x] 新增 `experienceLikes.test.ts`：状态切换、0 赞取消、不可赞判定。
- [x] `tripMessages.ts`：点赞 / 已点赞 / 失败提示文案。

**验证：** `cd RouteME/frontend; npm run typecheck && npm test`
**覆盖：** D14、Defer UT（前端纯逻辑）

### T8 [frontend] 两个展示面接入

- [x] `ExperienceCard.tsx`：`.exp-foot` 渲染点赞按钮 + 赞数；`aria-pressed`；自己的体验不渲染、未登录禁用；失败回滚并提示。
- [x] `TripDetailPage.tsx` 体验区：每条体验同一按钮；状态同步与失败回滚。
- [x] `styles.css`：`.exp-like` 两态，只用 `:root` / `[data-theme="dark"]` 令牌。
- [x] 走查 1440 / 1024 / 768 / 390 × 浅 / 深色，对照 T0 原型。

**验证：** `cd RouteME/frontend; npm run typecheck && npm run build`
**覆盖：** D-2~D-4、D14、`@rule:web-coding-style`

### T9 [tests] E2E 验收与反向用例

- [x] 新增 `e2e/tests/experience-likes.spec.ts`：D-2 首页点赞 / 取消（相对 ±1，末尾恢复）；D-3 详情点赞 → 刷新保持 → 取消；D-4 `page.route` 拦截 500 → 回滚 + 提示。
- [x] `credit.spec.ts` 追加 C-15：新作者 → 建行程 → 结束 → 发体验 → 5 个用户点赞 → 主页 81 且无「明细 / 历史」入口。
- [x] 反向用例：`GET /api/users/{id}/credit/ledger` → 404；`PUT/POST /api/users/me/credit` → 404（沿用既有口径）。

**验证：** `cd RouteME/e2e; npx playwright test tests/experience-likes.spec.ts tests/credit.spec.ts`
**覆盖：** D-2~D-4、C-15、ATDD §5

### T10 [verify] 回归验证

- [x] 后端全量 `mvnw.cmd -B -ntp verify`。
- [x] 前端 `npm run typecheck && npm run build && npm test`。
- [x] E2E 受影响用例 + `openspec validate add-experience-like-credit --strict` + Redocly lint（本地）。
- [x] 在 P4 验证报告贴真实输出摘要；记录列表读取为批量查询的结构事实。

**验证：** 上述命令逐条执行
**覆盖：** 全部 Scenario 的回归门禁

### T11 [docs] 文档收口

- [x] `docs/knowledge/interfaces/README.md`（若存在）：登记点赞端点与两个字段。
- [x] `docs/sdd/add-experience-like-credit/p3-design.md`（本轮）与 `p4-verify.md`（P4）。
- [x] `registry.md` 状态更新与 `docs/sdd/README.md` P3 列（P3 完成后）。

**验证：** 人工核对字段名与链接
**覆盖：** `@rule:document-conventions`

## 执行偏差记录（P4）

| 项 | 计划 | 实际 | 原因 |
|---|---|---|---|
| C-4 取最大赞数 | Mapper `selectMaxLikesOfTripAuthor`（SQL MAX） | Mapper `selectLikeCountsOfTripAuthor` 返回每篇赞数，服务层取 max | 按 ATDD Defer UT 用 mapper 多行 mock 验证「取最大不求和」 |
| 月度额度 | 账本 `SUM(applied_delta)` | 读取该用户 `EXPERIENCE_LIKE` 账本行，Java 按 Asia/Shanghai 窗口求和 | 规避 SQLite / H2 时间函数差异；行为与设计一致，纯函数另有单测 |
| 并发插入 | 唯一冲突一律视为已赞 | 区分「同（体验, 用户）已存在 → 幂等」与「`nextId` 主键撞车 → 换 id 重试 ≤3 次」 | `max(id)+1` 在两线程下会撞主键；L-8 双用户并发需要两条记录 |
| C-7 并发结算 | 两线程并发跨档 | 连续调用两次 `award` 验证幂等键唯一 | 避免 H2 多线程结算用例不稳定；并发由 L-8 + 唯一索引兜底 |
| C-14 完成行程 | 直接结束行程 | `@Import(FixedClockTestConfig)` 后在当天结束 | 行程只有在「进行中」才可结束，与 `TripCompletionApiTest` 同口径 |
| 前端按钮 | 两个展示面各自接入 | 新增共用 `ExperienceLikeButton` | 两处状态机 / 回滚 / 可访问性只写一份 |

## 层与顺序约束

- **原型先行：** T0 必须在 T8 之前完成，T8 的样式对照 T0。
- **契约 / 迁移先于两端：** T1、T2 先于 T3–T9。
- **数据访问先于服务：** T3 先于 T4 / T5 / T6。
- **结算最后接入后端：** T6 依赖 T3 与既有 `CreditService`，在 T4 之后。
- **E2E 最后接入：** T9 依赖 T4 / T5 / T6 / T8。
- **不做空壳：** 不为未来事件预留端点 / 表列；不新增信用明页面或通知任务。

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| 检查项 | 结果 | 证据 |
|---|---|---|
| Spec 27 Scenario 均有落点 | Pass | ATDD §1 覆盖 27/27（API 22 / E2E 4 / Defer UT 1） |
| 每个 Scenario 至少一个任务承接 | Pass | L-1~L-8→T4；D-1→T5；D-2~D-4→T8+T9；C-1~C-3 / C-5~C-7 / C-8~C-12 / C-13~C-14→T6；C-4→T6（UT）；C-15→T9 |
| Design 决策均有任务落点 | Pass | D1/D13→T2；D2/D5/D6→T4；D3/D4/D16→T5；D7~D11→T6；D12→T1；D14→T7+T8；D15→T0 |
| Tasks 不越过 Spec | Pass | 无明细分页 / 通知 / 管理端 / 月度结转 / 点赞者得分任务 |
| ATDD 层次与任务一致 | Pass | API 用例落 T4/T5/T6；E2E 落 T9；UT 落 T6 / T7 |
| 最后一项为回归验证 | Pass | T10 = verify；T11 仅文档 |
| 契约 / 迁移先于两端 | Pass | T1、T2 位于 T3–T9 之前 |
| 原型先行 | Pass | T0 位于 T8 之前，T8 校准 T0 |
| 契约字段名符合规则 | Pass | `is_liked` 满足布尔 `is_` 前缀；`like_count` 沿用 `_count` 先例 |

**自检结论：Pass。** 可进入 P4（`/sdd:atdd-apply`，从 T0 原型与 T1 契约用例、T2 迁移用例开始）。
