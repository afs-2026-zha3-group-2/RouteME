# P4 验证记录 — add-destination-area-filters

- **Change：** `add-destination-area-filters`（REQ-007）｜ **阶段：** P4（Implement & verify）
- **日期：** 2026-11-16｜ **执行：** Jay（AO）｜ **Gate：** G2 Conditional
- **环境：** Windows / Java 21 / Node 24 / SQLite（运行）/ H2（测试）/ Chrome + Edge

## 1. 结论

P4 实现完成：V10 加列迁移、区划字典、后端按代码筛选/匹配、体验日期筛选、搜索移除、首页/发布页省市级联、卡片/详情/体验卡展示口径全部落地。**后端 161、前端 78 测试全绿，契约 lint 0 error，E2E 16 项中 11 通过**；5 项失败均为本 change 之前已存在的选择器/文案债务，登记不修（见 §5）。

## 2. 命令与真实输出

| # | 命令 | 结果 |
|---|---|---|
| 1 | `cd RouteME/backend; .\mvnw.cmd -B -o clean test` | **Tests run: 161, Failures: 0, Errors: 0, Skipped: 0；BUILD SUCCESS**（24.5s） |
| 2 | `cd RouteME/frontend; npm test` | **Test Files 10 passed，Tests 78 passed**（601ms） |
| 3 | `cd RouteME/frontend; npm run build` | **tsc --noEmit 通过；vite build 成功**（dist JS 978.10 kB / gzip 313.82 kB） |
| 4 | `cd RouteME; npx @redocly/cli lint openapi.yaml` | **valid；0 error / 13 warning** |
| 5 | `cd RouteME/e2e; npx playwright test tests/trips.spec.ts tests/experiences.spec.ts --reporter=list` | **11 passed / 5 failed**（2.0m；失败明细见 §5） |
| 6 | Edge 实机验证（Playwright `channel: 'msedge'` 临时脚本，已删除） | 面板可见；34 省；广东省→21 市；选珠海市后摘要 `广东省 / 珠海市`；滚动高度 3 次采样一致（`scrollY 211 / scrollHeight 1629`）；console 0 error |

> 注：`mvnw` 首次离线运行需 `-o`；`npx` 首次拉取 redocly 使用 `--yes`。

## 3. 覆盖映射

| 任务 | 落点 | 证据 |
|---|---|---|
| T1 契约 0.7.0 | `openapi.yaml`；`OpenApiTest` | 命令 1、4 |
| T2 区划字典 | `area/AreaDictionary`、`resources/area/area-codes.json`、`AreaDictionaryTest` | 命令 1（34 省 / 375 市，港澳台细分） |
| T3 V10 迁移 | `V10__add_destination_area_code.sql`、`AreaCodeMigrationSqliteTest` | 命令 1（SQLite 全迁移 + H2 上下文） |
| T4 后端按代码 | `TripPlan`/`TripQuery`/`TripMatch`/Mapper/响应 | 命令 1（TripControllerTest、TripMatchTest 等） |
| T5 体验日期 | `Experience*`、`TripExperienceMapper.xml` | 命令 1（ExperienceControllerTest/ServiceTest） |
| T6 前端区划 | `areaOptions.ts`、`AreaCascader.tsx`、`areaOptions.test.ts` | 命令 2、3、6 |
| T7 首页筛选 | `HomePage.tsx`、`tripFilters.ts`、`api.ts` | 命令 2、3、5（省市筛选用例） |
| T8 展示 | `TripCard`/`TripDetailPage`/`ExperienceCard` | 命令 2、3、5 |
| T9 E2E | `trips.spec.ts`/`experiences.spec.ts` | 命令 5、6 |
| T10 文档 | design/tasks/proposal/requirements/impact/知识库 | 本文件 + `_LOG.md` |

## 4. 实现修订（与 P3 设计的偏差）

1. **V10 不重建表**：H2 对 `trip_plans` 有外键引用，`DROP TABLE` 被拒绝；改为 `ALTER TABLE ... ADD COLUMN destination_code VARCHAR(6) NOT NULL DEFAULT ''` + CASE 回填 + 索引。目标（NOT NULL、代码权威、名称标准名）不变；应用层拒绝空串/未知 code。
2. **自绘省市级联**：antd Cascader 在 Edge 下浮层无法定位且页面滚动条持续抖动（Chrome 正常；headless Edge 不复现），改为 `AreaCascader` 两列内联面板（固定字段下方、不挂 body、不做动态测量），并去掉 `showSearch` 输入态。行为不变：必须选到市、摘要/清除/展示口径不变；首页与发布页共用。

## 5. E2E 失败明细（均为既有债务，登记不修）

| 用例 | 现象 | 归属 |
|---|---|---|
| `trips.spec.ts` › shows the identity gate… | 身份门标题文案与 auth 上线后不一致 | `user-auth` 之后的测试债务 |
| `trips.spec.ts` › publisher marks a trip completed… | 测试找 `.ant-popconfirm`，UI 已改 Modal | `apply-prototype-visual-design` / map-picker 债务 |
| `experiences.spec.ts` › shows seeded experiences… | 测试按 `button` 找“参考此行程发布”，UI 是 `<a>` | 体验卡既有债务 |
| `experiences.spec.ts` › shares an experience… | 测试用旧 label“途经点（每行一个）”，UI 已改地图选点 | map-picker 债务 |
| `experiences.spec.ts` › guides an empty search… | 搜索框已移除，空态用例未改写 | G1 C1（`refine-inspiration-home` owner） |

本 change 新增/改写的 E2E（省市筛选、发布目的地、缺必填拦截）全部通过。

## 6. 遗留与风险

- **C1**：`refine-inspiration-home` 的搜索空态 E2E 由 owner 改写并先归档（外部依赖，未闭环）。
- **C2**：`add-trip-publish` 目的地修订 5 条任务已移交他人执行，不在本 change 范围；A 归档前需重评其 G1/G2。
- **C5**：Living Spec 的“关键词”术语在归档合并时收敛。
- 区划包 v5 数据约 2019/2020，MVP 接受；升级不改契约。

## 7. G2 建议

**Conditional**：本 change 的实现与验收已完成；C1/C2 为外部条件、E2E 债务已登记，均不阻塞本 change 归档（归档顺序仍需 `refine-inspiration-home` 在前）。
