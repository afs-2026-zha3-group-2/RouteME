# 技术设计 — add-experience-like-credit

- **Change：** `add-experience-like-credit`（REQ-023 / issue #30）｜ **阶段：** P3
- **输入：** [`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md)（ADDED 2 / 12 Scenario）、[`specs/user-credit/spec.md`](specs/user-credit/spec.md)（ADDED 3 / 15 Scenario）、[`atdd-design.md`](atdd-design.md)、[`proposal.md`](proposal.md)、[`g1-decision.md`](g1-decision.md)（Pass）
- **约束：** 契约 `0.18.0`、迁移 `V24__add_experience_likes.sql`（P3 原定 `0.16.0` + `V22`；合并 `origin/main@b50e416` 后 main 已至 `0.17.0` + `V23`，按先合并者优先顺延为 `0.18.0` + `V24`，用户裁决 2026-11-17）；NFR 不纳入（用户裁决 2026-11-17）
- **原型：** `docs/prototype/ui.js` `expCard()` + 详情 `.exp-item`（P4 先改原型再改实现）
- **字段定稿（P3）：** 点赞态字段由 Delta 候选名 `liked_by_me` 定稿为 **`is_liked`**（`@rule:api-contract`「布尔 `is_` / `has_` 前缀」）；Delta 已同步修订并通过 `openspec validate --strict`。

## 决策总览

| # | 决策 | 选择 | 放弃的备选与理由 |
|---|---|---|---|
| D1 | 数据模型 | 新表 `experience_likes`（`experience_id` + `user_id` 唯一，取消即删行，不做软删除） | ① 在 `trip_experiences` 加计数列：与「赞数 = 记录数」冲突，取消后无法自证；② 软删除：每次统计都要过滤，且唯一约束需换成部分索引 |
| D2 | 服务划分 | `ExperienceLikeService`（点赞 / 取消 / 批量统计）+ `ExperienceLikeRewardService`（获赞结算） | 全部塞进 `ExperienceService`：既有类已承担分享 / 图片绑定 / 分页，再混入结算会失去单一职责且难以单测 |
| D3 | 读取派生 | `like_count` / `is_liked` 读时派生，不落库；`describeAll` 一次批量查询，禁止 N+1 | ① 缓存列：需在点赞 / 取消两处同步，漂移风险高；② 逐条查询：一页 20 条就是 20 次 SQL |
| D4 | viewer 传递 | `ExperienceController` 把 `X-User-Id` 解析后的 `userId` 传入 `listPage` / `listAll` / `listByTrip`；`mine` 的 viewer = `authorId` | 在 Service 内读请求上下文：隐藏依赖，破坏「方法契约以接口为准」 |
| D5 | 端点语义 | `POST /experiences/{id}/likes` 首次 201 / 重复 200，返回 `ExperienceLikeResponse`；`DELETE` 恒 204；校验顺序 404 → 403 → 幂等写入 | ① 动词 `/like` + `/unlike`：违反 `@rule:api-contract`「CRUD 能表达就不写动词」；② DELETE 返回 body：违反「删除成功 204」 |
| D6 | 点赞并发 | 唯一约束兜底；捕获 `DuplicateKeyException` 视为幂等成功（复用 `CreditServiceImpl` 的并发写法） | 先查后插：并发下会抛 500，测试 L-8 无法通过 |
| D7 | 结算触发 | 仅「新插入点赞记录」后调用一次 `award(tripId, authorId)`；取消点赞不触发 | 取消时也重算：与「取消不回滚」冲突，且会白写零变化记录 |
| D8 | 档位口径 | 档位 `[5,10,15,20,25]`；用该作者在该行程的**最大赞数** `MAX(每篇赞数)` 判定，不求和；每个新档位 +1 | ① 按篇分别判定：同行程多篇会重复加分，违反「同行程同作者 ≤ +5」；② 求和：多篇低赞会被错误抬档 |
| D9 | 月度额度 | 复用 `TripTimeZoneConstant.ZONE`（Asia/Shanghai）取月首瞬时；`used = SUM(applied_delta)`（当月、`reason_code = EXPERIENCE_LIKE`）；`allowance = 20 - used`；`delta = allowance >= 1 ? 1 : 0` | ① 按 `occurred_at` 字符串前缀切月：UTC 与北京时间差 8 小时，月初 00:00–08:00 会算错月；② 按理论值统计：总分裁断会让额度被虚耗 |
| D10 | 幂等键与关联 | `EXPERIENCE_LIKE:{tripId}:{authorId}:{tier}`；`related_type = TRIP`、`related_id = tripId`；`reason_code = EXPERIENCE_LIKE` | 用体验 id 做幂等键：同行程第二篇跨档会重复加分，违背「同行程同作者 ≤ +5」 |
| D11 | 结算事务 | 点赞记录插入 + 全部档位结算在同一 `@Transactional`；月度「查—算—写」依赖 SQLite 单写者串行化 + 幂等键唯一索引兜底 | 异步结算：点赞成功后结算失败会永久漏发且无补偿；多写者数据库（未来）需行锁，已登记风险 |
| D12 | 契约 | `openapi.yaml` → `0.18.0`：两个新路径、`ExperienceLikeResponse`、`ExperienceResponse` 增 `like_count` / `is_liked`（required，readOnly）、`Error.code` 增 `EXPERIENCE_NOT_FOUND` | 复用 `INVALID_INPUT` 表示不存在：前端无法按码区分，且违反 `TRIP_NOT_FOUND` 等既有先例 |
| D13 | 迁移 | `V24__add_experience_likes.sql`：建表 + 唯一索引 + `(experience_id)` 统计索引 | 复用他表存点赞关系：语义混淆且无法建唯一约束 |
| D14 | 前端 | `types.ts` / `api.ts` / 纯逻辑 `experiences/experienceLikes.ts` / `ExperienceCard` / `TripDetailPage` / `tripMessages` / `styles.css`；乐观更新 + 失败回滚；未登录禁用按钮；自己的体验不渲染按钮 | ① 组件内写 if/else：无法 node 环境单测（同 `creditDisplay` 先例）；② 失败静默：违反规格「不静默吞掉错误」 |
| D15 | 原型先行 | P4 首任务先改 `docs/prototype/ui.js`（体验卡与详情体验区）与 `styles.css`，再改实现 | 直接改实现：违反 `prototype-ui-alignment` 的「先改原型再改实现」 |
| D16 | 「我的体验」 | 三处同源指 `GET /api/experiences`、`GET /api/trips/{tripId}/experiences`、`GET /api/me/experiences` 三个**接口**；`MyTripsPage` 只用 `loadMyExperiences` 判断分享状态、不渲染体验列表，因此不新增点赞按钮 | 在我的旅行页新增体验列表：超出 issue 范围（可见面只有首页与详情） |

## 1. 数据库（V24）

```sql
CREATE TABLE experience_likes (
    id INTEGER NOT NULL PRIMARY KEY,
    experience_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (experience_id) REFERENCES trip_experiences (id),
    FOREIGN KEY (user_id) REFERENCES app_users (id),
    CONSTRAINT uq_experience_like_user UNIQUE (experience_id, user_id)
);

CREATE INDEX ix_experience_likes_experience ON experience_likes (experience_id);
```

- 时间统一 UTC ISO-8601（与 `credit_ledger` / `auth_sessions` 一致）。
- 取消点赞直接 `DELETE` 行；「取消未赞」为 0 行受影响，仍返回 204。
- 不新增余额类列，赞数始终由记录数派生。

## 2. 后端结构

| 层 | 新增 / 改动 | 说明 |
|---|---|---|
| `entity/` | `ExperienceLikeEntity` | `@TableId(type = IdType.INPUT)`（沿用 `CreditLedgerEntity` 的手动 id 模式） |
| `mapper/` | `ExperienceLikeMapper` | `countByExperience`、`exists`、`selectStatsByExperienceIds(ids, viewerId)`、`selectMaxLikesOfTripAuthor(tripId, authorId)` |
| `constant/` | `ExperienceLikeConstant` | 档位数组 `[5,10,15,20,25]`、月度上限 20、`REASON_CODE = EXPERIENCE_LIKE`、`RELATED_TYPE = TRIP`、幂等键模板、时区复用 `TripTimeZoneConstant.ZONE` |
| `exception/` | `ExperienceNotFoundException` | `EXPERIENCE_NOT_FOUND` + 404（对齐 `TripNotFoundException`） |
| `service/` | `ExperienceLikeService`：`like(experienceId, userId)`、`unlike(experienceId, userId)`、`statsOf(experienceIds, viewerId)`；`ExperienceLikeRewardService`：`award(tripId, authorId)` | 方法契约以接口为准 |
| `service/impl/` | 两个实现类 | 点赞实现依赖体验查询 + 点赞 mapper + reward 服务 + `Clock`；结算实现依赖点赞 mapper + 账本 mapper + `CreditService` + `Clock` |
| `response/` | `ExperienceLikeResponse` | `experience_id` / `like_count` / `is_liked` |
| `response/` | `ExperienceResponse` 增两个字段 | `from(...)` 增加赞数入参 |
| `controller/` | `ExperienceController` | 两个新端点；读取方法传 viewerId |
| `service/impl/` | `ExperienceServiceImpl` | `listPage` / `listAll` / `listByTrip` 增加 `viewerId`；`describeAll` 批量取赞数（同 `photosOf` 模式） |

`ExperienceLikeService.like` 流程：

1. 按 id 读取体验；不存在 → `ExperienceNotFoundException`（404）；
2. 体验作者 == 当前用户 → `ForbiddenActionException`（403 `FORBIDDEN`）；
3. 插入 `experience_likes`；唯一冲突 → 视为已赞（200）；
4. 新插入成功时调用 `ExperienceLikeRewardService.award(experience.tripId(), experience.authorId())`（同事务）；
5. 返回 `experience_id` / 最新 `like_count` / `is_liked = true`。

`ExperienceLikeRewardService.award` 流程：

1. `maxLikes = selectMaxLikesOfTripAuthor(tripId, authorId)`（多篇时取最大值，不求和）；
2. 已锁定档位 = `credit_ledger` 中该用户、`reason_code = EXPERIENCE_LIKE`、幂等键前缀匹配的档位集合；
3. 对每个 `maxLikes >= tier` 且未锁定的档位按升序结算：
   - `used = SUM(applied_delta)`（当月、Asia/Shanghai 月首之后）；
   - `delta = (20 - used) >= 1 ? 1 : 0`（`1` 为单档应发值，恒定）；
   - `creditService.book(new CreditBooking(authorId, EXPERIENCE_LIKE, delta, TRIP, String.valueOf(tripId), "EXPERIENCE_LIKE:{tripId}:{authorId}:{tier}"))`；
   - `book` 内部裁断总分、同事务写账本；`applied_delta = 0` 仍留痕并锁定该档位。

> 事务边界：1–4 在同一 `@Transactional`；`CreditService.book` 以 REQUIRED 传播加入同一事务。SQLite 单写者保证「查月度 → 写账本」不被交错；唯一索引是幂等的最终保障。

## 3. 契约（0.18.0）

```yaml
/experiences/{experienceId}/likes:
  post:   # 首次 201 / 重复 200 → ExperienceLikeResponse；401 / 403 / 404
  delete: # 204；401 / 404（未赞幂等 204）

ExperienceLikeResponse:
  required: [experience_id, like_count, is_liked]
  properties:
    experience_id: { type: integer, format: int64 }
    like_count:    { type: integer, minimum: 0, readOnly: true }
    is_liked:      { type: boolean, readOnly: true }

ExperienceResponse:
  required: [... existing ..., like_count, is_liked]
  properties:
    like_count: { type: integer, minimum: 0, readOnly: true,
                  description: 当前体验的点赞记录数；无记录为 0 }
    is_liked:   { type: boolean, readOnly: true,
                  description: 当前请求用户（X-User-Id）是否已点赞；自己的体验恒为 false }

Error.code:
  enum: [... 既有 ... , EXPERIENCE_NOT_FOUND]
```

- `like_count` / `is_liked` 非可空（避开 `NON_NULL` 整键省略）。
- `DELETE` 不返回 body；前端本地 -1，刷新后以服务端为准。
- 新端点示例同时给成功与拒绝两组（`@rule:api-contract`）。

## 4. 前端

| 文件 | 改动 |
|---|---|
| `types.ts` | `Experience` 增 `like_count: number`、`is_liked: boolean`；新增 `ExperienceLikeResult` |
| `api.ts` | `likeExperience(userId, experienceId)`、`unlikeExperience(userId, experienceId)` |
| `experiences/experienceLikes.ts`（新） | `applyLikeState(experience, liked)`（乐观 +1 / -1，下限 0）、`canLike(experience, currentUserId, isAuthenticated)`；纯函数，供两个展示面共用 |
| `experiences/experienceLikes.test.ts`（新） | 上述纯逻辑的边界（0 赞取消、自己 / 未登录不可赞、状态切换） |
| `experiences/ExperienceCard.tsx` | `.exp-foot` 内渲染点赞按钮 + 赞数；`aria-pressed`；自己的体验不渲染、未登录禁用 |
| `trips/TripDetailPage.tsx` | 体验区每条 `li` 渲染同一按钮；点赞 / 取消后同步该条状态，失败回滚并 `message.error` |
| `i18n/tripMessages.ts` | 文案：点赞 / 已点赞 / 点赞失败提示 / 赞数单位 |
| `styles.css` | `.exp-like` 两态样式，只用 `:root` 令牌与 `color-mix`；浅 / 深色都验证 |
| 原型 | `docs/prototype/ui.js` + `docs/prototype/styles.css` 先行（体验卡与详情体验区） |

- 失败回滚：先本地更新，`catch` 后恢复点击前对象并提示；不静默。
- 可访问性：`<button type="button">` + `aria-pressed` + 可见赞数；图标按钮补 `aria-label`。

## 5. 测试与验证

| 层 | 内容 |
|---|---|
| 后端 API（先红） | `ExperienceLikeApiTest`（L-1~L-8）、`ExperienceLikeDisplayApiTest`（D-1）、`ExperienceLikeCreditApiTest`（C-1~C-3 / C-5~C-7 / C-13~C-14）、`ExperienceLikeCreditMonthApiTest`（C-8~C-12，可调 Clock）、`ExperienceLikeMigrationSqliteTest`（V24）、`OpenApiTest`（0.18.0 + 新 schema + 错误码） |
| 后端 UT（apply 时） | 档位推导（4/5/9/10/25/26）、月度窗口 Asia/Shanghai 月首、多篇体验取 max 不求和（C-4，mapper 多行 mock） |
| 前端 UT | `experienceLikes.test.ts`（乐观更新 / 回滚 / 可赞判定） |
| E2E | `e2e/tests/experience-likes.spec.ts`（D-2~D-4）；`credit.spec.ts` 追加 C-15（新作者 5 赞 → 81 且无明细入口） |
| 命令 | 后端 `mvnw.cmd -B -ntp verify`；前端 `npm run typecheck && npm run build && npm test`；E2E `npx playwright test tests/experience-likes.spec.ts tests/credit.spec.ts`；`openspec validate add-experience-like-credit --strict` |

## 6. 残余风险

| 风险 | 缓解 |
|---|---|
| 既有 `ExperienceService` 读取签名变化影响既有测试 | P4 同步更新 `ExperienceServiceTest` / `ExperienceServicePersistenceTest` / `ExperienceControllerTest`；读取方法只增 viewer 参数，不改返回结构 |
| 月度并发严格性依赖 SQLite 单写者 | 本 change 以「同事务 + 幂等键 + C-7 / C-12 并发断言」固定；迁移多写者数据库时需补行锁，已登记 |
| 多篇体验无法在真实数据构造（V8 唯一约束） | C-4 用 mapper 多行 mock 单测；E2E / API 不做假数据绕过约束 |
| 契约 `0.18.0` / `V24` 再被其他 change 越过 | 实现开始前复核 `openapi.yaml` 与迁移目录；被占用则整体顺延并同步 `OpenApiTest` |
| E2E 不在 CI | 沿用既有残余风险；P4 本地跑受影响用例并在验证报告贴输出 |
| 共享 E2E 库累积点赞 | 点赞用例只做相对断言（±1）并在末尾取消；C-15 用一次性新作者，不依赖种子赞数 |
| 归档顺序 | 本 change 必须晚于 `add-credit-account` / `add-experience-photos` / `refine-experience-share` / `refine-inspiration-home`（P5 / G3 前核对） |
