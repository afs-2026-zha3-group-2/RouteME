# ATDD 设计 — add-experience-like-credit

- **Change：** `add-experience-like-credit`（REQ-023 / issue #30 旅行体验获赞增加信用分）
- **输入：** [`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md)（ADDED 2 Requirement / 12 Scenario）、[`specs/user-credit/spec.md`](specs/user-credit/spec.md)（ADDED 3 Requirement / 15 Scenario）、[`g1-decision.md`](g1-decision.md)（Pass）
- **日期：** 2026-11-17 ｜ **作者：** Lewis Liu（当前开发者）
- **原型：** `docs/prototype/ui.js` `expCard()` + 详情 `.exp-item`（P4 先改原型再加实现）
- **P3 契约裁决（2026-11-17 用户确认）：** 端点用 REST 资源风格 `POST` / `DELETE /api/experiences/{experienceId}/likes`；「体验不存在」新增 `EXPERIENCE_NOT_FOUND`（404）；契约 `0.18.0` + 迁移 `V24`（P3 原定 `0.16.0` + `V22`；合并 `origin/main@b50e416` 后顺延；`0.15.0` + `V21` 已由 `add-ai-itinerary` 台账声明）；NFR 测试不纳入。

## 1. ATDD 层次划分（API / E2E；UT 仅登记）

场景编号对应两个 Delta 的场景顺序：`L-1~L-8`（体验点赞与取消点赞）、`D-1~D-4`（赞数与点赞态展示）、`C-1~C-15`（阶梯加分 `C-1~C-7` / 月度上限 `C-8~C-12` / 计分边界 `C-13~C-15`）。

| # | Scenario | Layer | 推荐附加层 | 依据 |
|---|---|---|---|---|
| L-1 | 点赞他人体验（记录 + 赞数 + 点赞态） | **API** | 数据完整性 | 单端点契约 + 响应派生字段 + DB 记录断言 |
| L-2 | 重复点赞幂等（200，不新增记录） | **API** | 幂等 | 同一端点二次调用 |
| L-3 | 取消点赞（204，赞数回落） | **API** | — | 单端点 + 记录删除 |
| L-4 | 取消未赞体验幂等（204，无记录） | **API** | 幂等 | 同一端点二次调用 |
| L-5 | 禁止自赞（403 `FORBIDDEN`，无记录 / 无信用变化） | **API** | 安全 | 服务端授权，不能只靠前端隐藏 |
| L-6 | 未登录不可点赞（401 `DEMO_USER_REQUIRED`） | **API** | 安全 | 身份缺失分支 |
| L-7 | 体验不存在（404 `EXPERIENCE_NOT_FOUND`，无记录 / 无信用变化） | **API** | — | 首次引入专属错误码 + 反向断言无副作用 |
| L-8 | 并发点赞不重复计数 | **API** | 一致性 | 两线程并发 + 唯一约束兜底 |
| D-1 | 列表 / 行程详情 / 我的体验三处同源一致 | **API** | — | 三个读取端点响应对照；`is_liked` 随视角变化 |
| D-2 | 首页体验卡展示与切换点赞 | **E2E** | — | 用户可见行为：按钮两态 + 赞数即时变化 |
| D-3 | 详情页体验区展示与切换点赞（刷新保持） | **E2E** | — | 页面行为 + 刷新后服务端持久化 |
| D-4 | 点赞请求失败回滚 | **E2E** | — | `page.route` 拦截 500（先例 `experience-photos.spec.ts:117`） |
| C-1 | 首次跨越 5 档位加分并留痕 | **API** | 数据完整性 | 5 次点赞 → 账户 +1 + 账本全字段（原因 / 实际变化 / 前后分 / 关联行程 / 发生时间） |
| C-2 | 档位逐级各结算一次（5→25 累计 +5） | **API** | — | 25 次点赞真实路径；账本恰好 5 条 |
| C-3 | 25 档位后封顶 | **API** | — | 夹具预置已结算 5 档 + 赞数 26，再点赞不新增 |
| C-4 | 同行程多篇体验取最高赞单篇 | Defer UT | — | V8 `(trip_id, author_id)` 唯一约束使真实数据无法构造多篇；mapper 多行 mock 单测 |
| C-5 | 赞数回落再达不重复加分 | **API** | 幂等 | 10 赞 → 取消 → 再点赞；分数与账本均不变 |
| C-6 | 取消点赞不回滚 | **API** | — | 已结算后取消：分数保持、无负向记录 |
| C-7 | 同一档位并发或重复投递只结算一次 | **API** | 一致性 | 两线程并发跨同一档位 + 幂等键唯一约束 |
| C-8 | 月度剩余额度内正常加分（+19 → +1 → 0） | **API** | 数据完整性 | 夹具本月累计 19 → 跨档实发 +1 → 再跨档实发 0 |
| C-9 | 月度额度耗尽后跨档仍锁定（实发 0 留痕） | **API** | — | 夹具月度 20 / 账户 95（区分总分裁断）→ 跨档 `applied_delta = 0` |
| C-10 | 月度按 Asia/Shanghai 边界重置 | **API** | 时区 | 可调测试 Clock 跨北京时间月首；同时登记纯函数边界单测 |
| C-11 | 总分上限裁断不占月度额度 | **API** | 数据完整性 | 账户 100 + 跨档 → 实发 0 且月度累计不增加 |
| C-12 | 多条行程共享月度额度 | **API** | — | 两行程各跨档；单行程 ≤ +5、月度合计 ≤ +20 |
| C-13 | 点赞者不得分 | **API** | — | 点赞者账户不变、无 `EXPERIENCE_LIKE` 账本 |
| C-14 | 完成旅行不得分 | **API** | — | 结束行程后无 `EXPERIENCE_LIKE` 账本 |
| C-15 | 不展示加分历史 | **E2E** | 隐私 | 真正产生加分后，主页仍只有分数与等级、无明细 / 时间 / 历史入口 |

**汇总：** API 22 条 ｜ E2E 4 条 ｜ Defer UT 1 条；合计 **27 条**（27 Scenario 全覆盖）。

**Deferred to `/sdd:atdd-apply`（unit-level TDD）：**

- C-4 多篇体验取「最高赞单篇」（mapper 返回多行时取 max，不求和）；
- 月度窗口纯函数：Asia/Shanghai 月首边界（`23:59:59` / `00:00:00`）与「按 `applied_delta` 求和」；
- 档位推导纯函数：赞数 → 已跨档位集合（4/5/9/10/25/26 边界）；
- 前端点赞状态纯逻辑：乐观 +1 / -1（下限 0）、失败回滚、`is_liked` 切换。

## 2. 在生产代码前先写的验收检查

1. **API（先红，`@SpringBootTest` + MockMvc）**
   - `ExperienceLikeApiTest`：L-1~L-8。断言首次 201 / 重复 200 / 取消 204 / 取消未赞 204；自赞 403 `FORBIDDEN`；无 `X-User-Id` 401 `DEMO_USER_REQUIRED`；不存在 404 `EXPERIENCE_NOT_FOUND` 且 `experience_likes` 与 `credit_ledger` 均无新增；并发两线程后赞数等于记录数。
   - `ExperienceLikeDisplayApiTest`：D-1。同一体验在 `GET /api/experiences`、`GET /api/trips/{tripId}/experiences`、`GET /api/me/experiences` 返回相同 `like_count`；`is_liked` 对已赞 / 未赞视角分别为 true / false。
   - `ExperienceLikeCreditApiTest`：C-1~C-3、C-5~C-7、C-13、C-14。账本断言 `reason_code = EXPERIENCE_LIKE`、`related_type = TRIP`、`related_id = 行程 id`、`applied_delta` / `score_before` / `score_after` / `occurred_at`；封顶与回落不新增档位记录；点赞者与结束行程均无账本行。
   - `ExperienceLikeCreditMonthApiTest`：C-8~C-12。夹具写本月 `EXPERIENCE_LIKE` 账本（含一条 `-5` 其他原因账本构造账户 95 / 月度 20 的组合）；可调 Clock 跨北京时间月首；断言月内实发合计 ≤ 20、截断不结转。
   - `ExperienceLikeMigrationSqliteTest`：`V24` 建 `experience_likes`（`(experience_id, user_id)` 唯一）与账本幂等键唯一；旧库（V21）升级后既有数据不变。
   - `OpenApiTest` 同步：`info.version = 0.18.0`、两个新路径、`ExperienceResponse.like_count` / `is_liked`、`Error.code` 枚举含 `EXPERIENCE_NOT_FOUND`。
2. **E2E（先红）**
   - `e2e/tests/experience-likes.spec.ts`：D-2 首页旅行体验视图点赞再取消（相对断言 ±1，收尾恢复未赞）；D-3 种子行程详情体验区点赞 → 刷新保持 → 取消；D-4 `page.route` 拦截点赞端点返回 500，断言赞数回滚与失败提示可见。
   - `e2e/tests/credit.spec.ts` 追加：C-15。新建作者 → 建行程 → 结束 → 发布体验 → 5 个用户点赞 → 作者主页显示 81 且页面无「明细 / 历史」入口。
3. **选择器与可访问性约定（原型先行后落到实现）**
   - 点赞按钮 MUST 是 `<button type="button">`，带 `aria-pressed` 与可见赞数文本；图标按钮补 `aria-label`（`@rule:web-coding-style`）。
   - E2E 用 `getByRole('button', { name: /点赞/ })` 与 `toHaveAttribute('aria-pressed', ...)`，不依赖具体 class。

## 3. 本地与 CI 门禁

| 层 | 命令 | 备注 |
|---|---|---|
| 后端 | `./mvnw -B -ntp verify`（`RouteME/backend`；Windows `mvnw.cmd verify`） | 与 CI 一致 |
| 前端 | `npm run typecheck && npm run build && npm test`（`RouteME/frontend`） | 与 CI 的 `build && test` 对齐 |
| E2E | `npx playwright test e2e/tests/experience-likes.spec.ts` + `credit.spec.ts`（`RouteME/e2e`） | **不在 CI**（既有残余风险）；P4 本地跑受影响用例 |
| 规格 | `openspec validate add-experience-like-credit --strict`（`ai4se-baseline` 目录下） | 每次改 Delta 后 |
| 契约 | Redocly lint（`RouteME/redocly.yaml`） | 本地可选；CI 未纳入 |

## 4. 数据 / 夹具策略

- **后端 API 测试：** `@SpringBootTest + @AutoConfigureMockMvc + @Transactional`（与 `CreditBoundaryApiTest` 同型），用例结束回滚。
- **用户与体验夹具：** 点赞者用 Mapper 直插 `app_users`（不逐个走注册，控制 25 赞场景成本）；体验用种子 `trip_experiences`（id 1 → trip 1 / 作者 2）或 Mapper 直插；多篇体验场景只走 C-4 单测。
- **信用夹具：** 账户与账本用既有 Mapper 直插（`user_credit_account` / `credit_ledger`）；月度累计只按 `applied_delta` 求和，预置「+20 后 -5」组合区分「月度耗尽」与「总分裁断」。
- **时钟夹具：** 新增可调测试 Clock（`@TestConfiguration` + `@Primary`，沿用 `FixedClockTestConfig` 的「只被需要的测试类 @Import」约定），仅 `ExperienceLikeCreditMonthApiTest` 使用。
- **E2E：** 沿用「全新 SQLite + 独立后端端口」模式；时间戳唯一用户名；种子体验点赞只做相对断言并在用例末取消；C-15 用一次性新作者全链路，不依赖种子赞数。
- **清理：** 后端事务回滚；E2E 取消点赞、删除临时库。
- **不做：** 不写 Excel / POM 生成器，不新建第二套 CI。

## 5. Non-goals 反向验证

| Non-goal（来自提案 Out of scope） | 反向用例 | Layer |
|---|---|---|
| 信用明细分页 / 接口 / 历史入口 | E2E：点赞加分后主页仍无「明细 / 历史」入口；API：`GET /api/users/{id}/credit/ledger` → 404 | E2E + API |
| 点赞通知 / 管理端审计 / 手工调账 | API：对应路径均 404；页面无入口 | API |
| 取消点赞回滚信用、月度结转 / 补发 | API：C-6 断言无负向记录；C-9 / C-10 断言次月不补发 | API |
| 完成旅行得分 | API：C-14 结束行程后无 `EXPERIENCE_LIKE` 账本 | API |
| 点赞者得分 | API：C-13 点赞者账户与账本不变 | API |
| 自赞（仅前端隐藏） | API：L-5 服务端 403 且无记录 | API |
| 多篇赞数求和 / 超过 25 继续加分 | API：C-3 封顶；Defer UT：C-4 取 max 不求和 | API + UT |
| 客户端写分端点 | API：沿用 `CreditReadOnlyApiTest` 口径，`PUT/POST /api/users/me/credit` → 404 | API |

## 6. NFR 测试

**不在本 change 范围（用户裁决 2026-11-17）。** 性能 / 可观测性 / 压测均 deferred；并发正确性（单月实发 ≤ +20、同档位只结算一次）仍作为功能 API 测试覆盖（C-7 / C-12），不写进 NFR 段。P4 验证报告只记录「列表读取的赞数为批量查询、请求数不随条数增长」这一结构事实。

## 7. 显式 Non-goals（本技能边界）

- 不写生产代码、不写完整 UT 套件、不做任务分解（交 `/sdd:task-plan`）。
- 不引入 Playwright / POM / Excel 生成器，不新建 CI 语义。
- 不设计 NFR 用例（已裁决不纳入），不把 Defer UT 展开成套件计划。
