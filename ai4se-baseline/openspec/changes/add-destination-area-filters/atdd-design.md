# ATDD design — add-destination-area-filters

- **Change：** `add-destination-area-filters`（REQ-007；`trip-plans` MODIFIED、`trip-experiences` MODIFIED）
- **Inputs：** [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)（20 场景）、[`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md)（13 场景）、[`design.md`](design.md)
- **基线：** 远程 `main@229411a`；`refine-inspiration-home`、`add-trip-publish` 未归档

## 1. ATDD 分层策略

| 层 | 职责 | 本 change 落点 |
|---|---|---|
| 契约 | 参数/字段形状先行 | `openapi.yaml` 0.7.0：删 `q`、`destination_code`、响应 code/province、体验日期；`OpenApiTest` |
| 接口（API） | 单端点可判定的筛选/校验/响应 | `TripControllerTest`、`MatchControllerTest`、`ExperienceControllerTest`、迁移测试 |
| 前端纯函数（Defer UT） | 级联值、摘要、日期归一 | `tripFilters.test.ts`、`areaOptions.test.ts`、`TripMatchTest`（P4 单元 TDD） |
| 端到端（E2E） | 跨页/跨视图的用户可观察行为 | `e2e/tests/{trips,experiences}.spec.ts` 新增/改写用例 |

规则：能用单端点证明的筛选走 API；「选省不生效」「摘要文案」「级联 label」「体验卡无日期」「无搜索框」等用户可见行为走 E2E；纯函数在 P4 用单元测试覆盖。

## 2. 场景 → 测试层映射

| # | 场景（合并同类） | 层 | 用例/断言 |
|---|---|---|---|
| 1 | 字典覆盖范围、直辖市级联选项、港澳台名称 | E2E | 打开 Cascader，断言省/市选项、北京二级 label=北京市、香港→18 区（如中西區/沙田區） |
| 2 | 二级节点代码唯一、字典/名称派生 | Defer UT | `AreaDictionaryTest`：code 唯一、前缀省 code、直辖市/港澳台展示名（P4） |
| 3 | 响应返回代码与省名 | API | `TripControllerTest` / `ExperienceControllerTest` 断言 `destination_code`/`province_code`/`province_name` |
| 4 | 存量行程迁移 | API + Defer UT | 迁移测试在临时 SQLite 跑 V1–V10；再 `GET /api/trips` 断言 6 条 seed 的 code/标准名；体验仍关联 |
| 5 | 按城市筛选、只选到省不应用 | API + E2E | API：`destination_code=440400` 只返回珠海；E2E：只选"广东省"列表不变、摘要无目的地 |
| 6 | 级联选项可输入过滤 | E2E | 输入"珠"→选"广东省 / 珠海市"→列表变化 |
| 7 | 按日期区间筛选、选择某个周六 | API + E2E | API：`date_from=date_to=2026-11-21` 只返回覆盖该日的行程；E2E 同 |
| 8 | 起止日期倒置 | Defer UT + API | `tripFilters.test` 交换；API 单边过滤（`date_from` only / `date_to` only） |
| 9 | 兴趣多选、组合筛选 | API + E2E | API：`tags=摄影,历史` OR；`destination_code+date+tags` AND；E2E 组合条件 |
| 10 | 排序 | API | `sort=date/new` 顺序断言（既有用例回归） |
| 11 | 摘要地名口径、清除全部、无结果保留条件、筛选变化回第 1 页 | E2E | 摘要文本、清除后恢复、空态"换个条件试试"且条件仍在、翻页回 1 |
| 12 | 首页无搜索框、列表接口无关键词参数 | API + E2E | `OpenApiTest` 断言无 `q`；E2E 断言无搜索框；传入 `q` 不影响结果 |
| 13 | 其它功能不受影响 | E2E | 匹配、我的旅行、聊天、体验发布 smoke |
| 14 | 体验筛选与倒序、按目的地/日期筛选、组合筛选 | API + E2E | `GET /api/experiences?destination_code=...&date_from=...&date_to=...`；体验卡过滤 |
| 15 | 体验分页与筛选并用、筛选变化重置体验分页 | API + E2E | `total` 为筛选后命中数；翻页/改条件回 1 |
| 16 | 体验空态、加载态 | E2E | 筛选无命中→空态保留条件；`aria-busy` 加载态 |
| 17 | 体验卡地名口径、不显示日期 | API + E2E | 响应 code/province；卡片显示标准名、无日期文本 |
| 18 | 体验视图无关键词搜索 | API + E2E | 无搜索框；请求不含 `q` |
| 19 | 发布页必须选到市、非法代码 400（A 承担） | API + E2E（A） | `add-trip-publish` 目的地修订的用例；本 change 只提供字典/实体/响应 |
| 20 | 参考发布预填（A 承担） | E2E（A） | 目的地 Cascader 回显"省 / 市"；本 change 不覆盖 |

## 3. 生产代码前先写的验收（Red）

| 先写 | 预期 Red 观察 |
|---|---|
| `OpenApiTest` 断言 0.7.0、无 `q`、`destination_code`、响应 code/province、体验日期 | 当前契约 0.6.0 仍有 `q`、无 code 字段 → 失败 |
| `TripControllerTest` 目的地按 code、无 q、日期交集 | 当前 `destination` 按名称、q 存在 → 失败 |
| `ExperienceControllerTest` 体验日期/目的地 code、无 q | 当前无日期参数、q 存在 → 失败 |
| 迁移测试 V1–V10（临时 SQLite） | 当前 V10 不存在 → 失败 |
| E2E：目的地 Cascader、只选省不生效、摘要、体验日期、无搜索框 | 当前是原生 select + 搜索框；体验视图日期不生效 → 失败 |
| `tripFilters.test` / `areaOptions.test`（P4 单元） | 当前 `FilterState.destination` 是名称、无级联归一 → 失败 |

## 4. 本地 vs CI 门禁

| 层 | 本地 | CI |
|---|---|---|
| 契约 | `npx @redocly/cli lint openapi.yaml` | 既有 CI 步骤 |
| 后端 | `cd RouteME/backend; .\mvnw.cmd -B test` | `./mvnw -B -ntp verify`（既有） |
| 前端 | `cd RouteME/frontend; npm run build; npm test` | 既有 CI 步骤 |
| E2E | `cd RouteME/e2e; npx playwright test tests/trips.spec.ts tests/experiences.spec.ts`（需后端+前端） | 既有约定：Playwright 本地门禁，不进 CI |

不新增 CI 语义；不在本 change 改 CI 配置。

## 5. 数据 / fixtures 策略

- **种子数据**：V4 6 条行程（4 未结束 + 2 已结束，含 1 已满员）、V8 2 条体验；V10 迁移后 seed 的 5 个目的地映射为 code + 标准名。
- **城市筛选**：用 seed 的珠海 `440400`、广州 `440100` 等断言；需要"零命中"时用字典内但无行程的城市（如台北市 `710100`），不删除 seed。
- **日期筛选**：用 seed 行程日期（2026-11-16 / 2026-11-20 / 2026-11-23–24）断言交集；"周六"用 2026-11-21 或与 seed 覆盖日一致；空态用 2030 年区间。
- **体验日期**：seed 体验关联 trip 1（2026-11-06）与 trip 2（2026-11-01–02）；用这两个区间与空区间断言。
- **新建数据**：沿用时间戳标题；通过 API 建带 `destination_code` 的行程；不依赖搜索框定位，改用默认列表/目的地筛选。
- **清理**：E2E 使用真实 SQLite，不删除 seed；新数据用唯一标题/目的地避免断言冲突。

## 6. Non-goals 与反向验证

| Non-goal | 反向用例 |
|---|---|
| 不提供关键词搜索 | E2E 断言首页/体验视图无搜索框；API 断言契约无 `q`、传 `q` 不改变结果 |
| 不支持只按省筛选 | E2E 只选"广东省"→列表不变、摘要无目的地 |
| 不支持自由输入地名 | E2E Cascader 无可编辑自由文本；只接受字典选项 |
| 不做三级（区/县） | E2E 级联只有两级；无区县选项 |
| 不改发布 requirement/发布 UI（B） | 本 change 的 delta 不含发布 requirement；发布页改动见 A 的 5 条任务 |
| 不改 refine 的文件 | 本 change 不修改 `refine-inspiration-home/**`；其搜索测试由 owner 改 |
| 不做 NFR 专项 | 用户确认不做；P4 只做错误码/日志回归 |

## 7. NFR

用户 2026-11-16 确认：**不做**性能/可观测性/韧性专项；P4 只做常规错误码、日志与回归。已记录为 out of scope，不新增 NFR 测试章节。

## 8. Red → Green 计划

| 步骤 | 预期观察 |
|---|---|
| Red | `OpenApiTest` 因 0.6.0/存在 `q` 失败；`TripControllerTest` 因目的地名称/`q` 失败；体验日期用例失败；E2E 找不到 Cascader/搜索框仍在 |
| Green | 按 tasks T1→T2→…→T10 实现契约、字典、迁移、后端、前端、E2E；逐层转绿 |
| 回归 | 后端 `mvnw test`、前端 `npm test/build`、E2E trips/experiences、契约 lint |

## 9. 覆盖缺口说明

- 发布页目的地 Cascader/校验/E2E 属 `add-trip-publish` 目的地修订，不在本 ATDD 范围；本 change 只提供字典/实体/响应。
- `refine-inspiration-home` 的搜索空态 E2E 由 owner 改写；本 change 不改其文件。
- 视觉快照、颜色/间距属 `design-system` 既有要求，不在本 change 断言。
- 纯函数单元测试（`tripFilters`、`areaOptions`、`TripMatch`）在 P4 的 unit-level TDD 覆盖，本文件只登记 Defer UT。
