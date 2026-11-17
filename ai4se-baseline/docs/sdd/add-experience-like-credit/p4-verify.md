# P4 实现与本地验证 — add-experience-like-credit

- **阶段：** P4（实现 → 本地验证）
- **当前开发者：** Lewis Liu（AO）｜ **独立验证：** Neal（VL，G2 待签）
- **基线：** `origin/main@64b38da`；worktree `feature/add-experience-like-credit`
- **依据：** [`specs/trip-experiences/spec.md`](../../../openspec/changes/add-experience-like-credit/specs/trip-experiences/spec.md)、[`specs/user-credit/spec.md`](../../../openspec/changes/add-experience-like-credit/specs/user-credit/spec.md)、[`atdd-design.md`](../../../openspec/changes/add-experience-like-credit/atdd-design.md)、[`design.md`](../../../openspec/changes/add-experience-like-credit/design.md)、[`tasks.md`](../../../openspec/changes/add-experience-like-credit/tasks.md)
- **契约 / 迁移：** `0.18.0` + `V24__add_experience_likes.sql`

## 1. 任务执行

T0–T11 全部完成，勾选见 [`tasks.md`](../../../openspec/changes/add-experience-like-credit/tasks.md)；执行偏差 6 项同表「执行偏差记录（P4）」（C-4 mapper 形态、月度额度 Java 求和、并发主键重试、C-7 重复投递、C-14 固定时钟、共用点赞按钮）。

| 层 | 产物 |
|---|---|
| 原型 | `docs/prototype/{ui,data,store,main}.js` + `styles.css` 的 `.exp-like` / `.exp-item-foot` |
| 契约 | `RouteME/openapi.yaml` 0.18.0：两个 likes 端点、`ExperienceLike` schema、`ExperienceResponse.like_count` / `is_liked`、`Error.code` 增 `EXPERIENCE_NOT_FOUND` |
| 迁移 | `V24__add_experience_likes.sql` |
| 后端 | `ExperienceLikeEntity` / `ExperienceLikeMapper` / `ExperienceLikeStat` / `ExperienceLikeConstant` / `ExperienceLikeRewardRules`；`ExperienceLikeService(+Impl)` / `ExperienceLikeRewardService(+Impl)`；`ExperienceNotFoundException` / `ExperienceLikeResponse` / `ExperienceLikeSaveResponse`；`ExperienceController` 两端点；`ExperienceResponse` / `ExperienceService(+Impl)` 增赞数、viewer |
| 前端 | `types.ts` / `api.ts` / `experienceLikes.ts` / `ExperienceLikeButton.tsx` / `ExperienceCard.tsx` / `useExperiences.ts` / `HomePage.tsx` / `TripDetailPage.tsx` / `tripMessages.ts` / `styles.css` |
| 测试 | `ExperienceLikeApiTest`(8) / `ExperienceLikeDisplayApiTest`(1) / `ExperienceLikeCreditApiTest`(8) / `ExperienceLikeCreditMonthApiTest`(5) / `ExperienceLikeMigrationSqliteTest`(3) / `OpenApiTest`(10) / `ExperienceLikeRewardRulesTest`(4) / `ExperienceLikeRewardServiceTest`(1) / `experienceLikes.test.ts`(7) / `e2e/tests/experience-likes.spec.ts`(3) / `credit.spec.ts` C-15(1) |

## 2. 红 → 绿摘要

| 切片 | 先红证据 | 转绿修正 |
|---|---|---|
| T1 契约 | `OpenApiTest` 路径缺失 NPE + version 断言失败 | 改 `openapi.yaml` 0.18.0 与两个端点 |
| T2 迁移 | 表不存在（Flyway V24 未落地） | 新增 V24；升级测试断言 V20 → V24 |
| T4 端点 | 8/8 期望 404（端点不存在） | 新增服务 / 端点；`is_liked` JSON 名；并发 `nextId` 主键撞车 → 换 id 重试 |
| T5 展示 | `like_count` JSON 路径缺失 | 响应扩字段 + `statsOf` 一次批量 + viewer 透传 |
| T6 结算 | 无 `ExperienceLikeRewardService` | 新增规则类与结算服务；C-14 改用 `FixedClockTestConfig` |
| T7/T8 前端 | `experienceLikes.ts` 缺失 | 新增纯逻辑、按钮组件、两个展示面与样式 |
| T9 E2E | 未运行 | 隔离库全链路 12/12 |

## 3. 验证输出（真实摘要）

| 门禁 | 命令 | 结果 |
|---|---|---|
| 后端全量 | `./mvnw.cmd -B -ntp verify` | **342 tests, 0 failures / 0 errors**，BUILD SUCCESS（P4 当次含 21 个迁移脚本 V1–V22；合并 main 后复验见 §7） |
| 前端 | `npm run typecheck && npm test && npm run build` | typecheck 无错误；**40 test files / 306 tests passed**；built in 1.35s |
| E2E | `npx playwright test tests/experience-likes.spec.ts tests/credit.spec.ts`（独立 SQLite + 前后端隔离端口） | **12 passed（29.3s）**：credit 9（含 C-15）+ experience-likes 3 |
| 规格 | `openspec validate add-experience-like-credit --strict` | `Change 'add-experience-like-credit' is valid` |
| 契约 | `npx @redocly/cli lint openapi.yaml` | **valid，0 error**；17 条既有 warning，均不在 likes 端点 / 新 schema |
| 响应式走查 | 浏览器 1440 / 1024 / 768 / 390，浅 / 深色 | 全部无横向溢出；点赞按钮单行（高 31.2px / 详情 30.8px）；自己的体验无按钮 |
| 反向用例 | `CreditReadOnlyApiTest` + C-15 页面断言 | `GET /users/{id}/credit/ledger` 404；`PUT/POST /users/me/credit` 404；主页无「明细 / 历史 / 管理后台」 |

**结构事实（性能口径）：** 列表与详情读取的赞数走 `ExperienceLikeMapper.selectStatsByExperienceIds` 一次 `GROUP BY`，
请求数不随体验条数增长；逐条 `describe` 内不再查库（与 `photosOf` 同模式）。

## 4. 残余风险与债务

1. **E2E 不在 CI**（既有约定）；本 change 只本地跑受影响 12 条。
2. 截图证据受浏览器隐藏态限制未产出；布局与配色已用计算样式 + iframe 宽度实测（见 T8 走查记录），视觉走查建议在 VL 复核时补一次。
3. C-7 以「重复投递」覆盖幂等，跨档并发依赖 `L-8` 与账本唯一索引；SQLite 单写者假设不变。
4. 月度额度按账本行在 Java 侧求和：当前账本量级（每用户每档一条）可忽略；若未来引入大批量加分需改回 SQL 聚合。
5. `0.15.0 + V21` 仍归 `add-ai-itinerary` 台账；本 change 原用 `0.16.0 + V22`，合并 `origin/main@b50e416` 后顺延为 `0.18.0 + V24`（见 §7）。

## 5. 签署与下一步

- **G2：** 待 VL（Neal）按本地验证报告与 CI evidence 签署；本地验证报告 `docs/ai4se-plugins/20261117-171312-local-verify-report.md`（Overall Partial：main 继承 6 个 Redocly error）。按用户 2026-11-17 当次指示，完成同步与复验后直接合并 main，未开 PR；G2 仍需 Neal 补签。
- **P5：** 暂不执行（归档需排在 `add-credit-account` / `add-experience-photos` / `refine-experience-share` / `refine-inspiration-home` 之后）。

## 6. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P1 | `2c891d8` |
| P2 | `e18d345` |
| P3 | `daf52a9` |
| P4 | `0a6b9e5` |
| P4 合并 main | `origin/main@b50e416` → 顺延 `0.18.0` + `V24` + `REQ-023`（提交见 `git log`） |

## 7. 合并 main 后复验（2026-11-17）

| 门禁 | 命令 | 结果 |
|---|---|---|
| 后端全量 | `mvnw.cmd -B -ntp clean verify` | **465 tests, 0 failures / 0 errors**，BUILD SUCCESS（V1–V24 共 24 个迁移） |
| 前端 | `npm run build && npm test` | build 1622 modules（3.13s）；**47 files / 351 tests passed** |
| 规格 | `openspec validate add-experience-like-credit --strict` | valid |
| 契约 | `npx @redocly/cli lint openapi.yaml` | 可解析；6 errors + 21 warnings，均为 main 继承（管理后台 nullable / `/users` 缺 4XX），likes 端点无 error |
| E2E | `npx playwright test tests/experience-likes.spec.ts tests/credit.spec.ts` | **12 passed（30.7s）**；隔离 SQLite + 后端 8083 + Vite 5175 |

合并时处理：`ExperienceServiceImpl` 保留双方构造参数（`ExperienceLikeService` + `AccountStatusService`）；`TripDetailPage` 取 main 新版后重新接入点赞按钮；`openapi.yaml` 取 main 后重新追加 likes 契约并修正 main 的重复 key；`OpenApiTest` 新增 likes 测试并将版本断言升至 0.18.0，管理后台「全局无 DELETE」收窄为「管理后台无 DELETE」；`credit.spec.ts` 的 `/admin/users` 断言从 404 改为 401/403。
