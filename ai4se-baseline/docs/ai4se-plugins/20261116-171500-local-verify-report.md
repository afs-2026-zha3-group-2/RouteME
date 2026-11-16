# 本地验证报告：REQ-013-reference-publish（S17 参考此行程发布）

- **日期：** 2026-11-16 17:20（UTC+8）
- **Root：** `D:\zha_training\RouteME\ai4se-baseline`
- **Change id：** 无新建（复用已归档的 `add-trip-experiences`）
- **Scope：** evidence-only（无代码 diff）
- **范围：** 验证 S17 的四条 AC 在当期 `main` 上仍由既有实现满足：已结束行程详情与体验卡入口、目的地 / 途经点 / 兴趣标签预填、标题 / 日期 / 人数 / 集合区域不沿用、新计划无来源字段。

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass（`npm run build`，当前工作区） |
| Static scan | Pass（`tsc --noEmit` 随 build 通过） |
| Code review | N/A（本需求无代码 diff） |
| Evidence（行为） | Pass |
| Backend regression | Pass（REQ-013 相关 87 项全绿；全量 230 项有 3 项 profile 失败，归因见 §4） |
| **Overall** | **Pass**（evidence scope） |

**说明：** 本报告不是 Gate 决策，也不构成 G2。REQ-013 没有实现提交，因此不主张「实现已验证」，只主张「现存行为在当期 `main` 上可复现且符合 AC」。

## 环境

| 项 | 值 |
|---|---|
| 后端 | `localhost:8080` 已在运行（并行会话启动，非本轮启动）；测试用 Maven 独立跑，不依赖该实例 |
| 前端 | `localhost:5173` 已在运行（vite dev，同上） |
| 工作区 | 仍含并行会话未提交的 `profile` 改动（4 个 `M`）与未跟踪 `V16__normalize_demo_user_profiles.sql` |
| 迁移版本 | V14 / V15 / V16 版本号已无冲突（原 `V14__normalize_demo_user_profiles.sql` 已改为 `V16`）；开发库 `flyway_schema_history` 仅到 V13，无校验和残留 |

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `cd RouteME/frontend; npm run build` | 构建 / 类型检查 | 0 | 1552 modules；JS 1,176.93 kB / CSS 50.86 kB（仅存量 chunk 体积告警） |
| `cd RouteME/frontend; npx vitest run` | 前端全量回归 | 0 | 16 文件 / **137 项通过** |
| `cd RouteME/frontend; npx vitest run src/trips/tripForm.test.ts src/route.test.ts src/experiences/experienceForm.test.ts` | AC ③ / ④ 取证 | 0 | 3 文件 / **30 项通过** |
| `cd RouteME/e2e; npx playwright test experiences.spec.ts` | S17 端到端 | 0 | **6 项通过**（16.1s） |
| `cd RouteME/backend; .\mvnw.cmd -B -ntp test "-Dtest=Trip…,Experience…,MyTrips…"` | 后端 REQ-013 相关回归 | 0 | **87 项通过**，`BUILD SUCCESS` |
| `cd RouteME/backend; .\mvnw.cmd -B -ntp test` | 后端全量回归 | 1 | 230 项，**3 项失败**（均在 profile 域，归因见 §4） |

## 1. 前端构建

```text
✓ 1552 modules transformed.
dist/index.html                     0.85 kB │ gzip:   0.53 kB
dist/assets/index-C1TL24xI.css     50.86 kB │ gzip:  10.72 kB
dist/assets/index-D7JAy-W2.js   1,176.93 kB │ gzip: 376.34 kB
✓ built in 1.32s
```

- `tsc --noEmit` 通过（build 包含），无类型错误。
- 唯一告警是存量 chunk >500 kB（Ant Design 体积），与 S17 无关。
- 注意：构建跑在**当前工作区**，含并行会话未提交的 profile 改动；因此它证明「工作区可构建」，不等同于「干净 `main` 可构建」。

## 2. 前端单元测试与 E2E

```text
 Test Files  16 passed (16)
      Tests  137 passed (137)
```

```text
Running 6 tests using 1 worker
  ok 1 …shows seeded experiences in the travel experience view
  ok 2 …shares an experience and reuses it to publish a new plan
  ok 3 …keeps experience entry points honest
  ok 4 …switches to the experience view and marks ended origin trips
  ok 5 …guides an empty filter state to publish from both views
  ok 6 …shows skeletons instead of the previous view while lists load

  6 passed (16.1s)
```

第 2 条即 S17 全链路，逐项对应 AC：

| AC | 断言 | 行号 |
|---|---|---|
| ① 入口 | 体验卡上有「参考此行程发布」链接；详情页按钮可点 | `:63`、`:88` |
| ② 预填 | 提示条「已预填目的地、途经点与兴趣」；途经点 chip「香洲港集合」可见；兴趣「摄影」`aria-checked=true` | `:90`、`:93`、`:94-97` |
| ③ 重填 | 计划人数值为空串、标题值为空串；直接点「发布」出现必填报错 | `:91-92`、`:99-100` |
| ④ 新计划 | 发布后跳到新行程详情 `#/trips/<新 id>`，与原行程互不影响 | `:78-79` |

## 3. 后端回归（REQ-013 相关）

```text
[INFO] Tests run: 87, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
[INFO] Total time:  26.939 s
```

覆盖 `TripControllerTest`、`TripCompletionApiTest`、`TripExperienceTest`、`TripMatchTest`、`TripPlanStatusTest`、`TripPlanServiceTest`、`TripPlanServicePersistenceTest`、`ExperienceControllerTest`、`ExperienceServiceTest`、`ExperienceServicePersistenceTest`、`MyTripsControllerTest`。行程创建契约（`TripCreateRequest` 无来源字段）与体验读写都在其中。

## 4. 后端全量回归的 3 项失败（与 REQ-013 无关）

```text
[ERROR] Tests run: 230, Failures: 3, Errors: 0, Skipped: 0
[ERROR]   UserProfileControllerTest.in_seededDemoProfile_out_completeWithJobAndMbti:397
[ERROR]   ProfileDataMigrationSqliteTest.in_emptySqliteFile_out_profileViewerSeeded:69
[ERROR]   ProfileMigrationSqliteTest.in_emptySqliteFile_out_profileColumnsAdded:60
[ERROR] BUILD FAILURE
```

- 三条都在 **profile 数据域**，断言都是「`school` 保留旧文本」，实际值被改写成只含校名。
- 归因：并行会话未跟踪的 `V16__normalize_demo_user_profiles.sql` 把 id 1–4 的 `school` 重写为纯校名，并把 `major` / `job` / `mbti` 拆到独立列；这三个测试仍按旧口径断言，属于该会话在途工作的预期落差，不是 REQ-013 的回归。
- 行程 / 体验相关 87 项在同一次构建里全绿（§3）。

## 5. 与 AC 的逐条结论

| AC | 结论 | 证据 |
|---|---|---|
| 已结束行程 / 体验入口 | Pass | E2E `:63`、`:88`；`TripDetailPage.tsx:416-420`、`ExperienceCard.tsx:53-55` |
| 预填目的地 / 路线 / 兴趣 | Pass | E2E `:90-97`；`TripCreatePage.tsx:56-62` |
| 日期 / 人数 / 集合区域重填 | Pass | E2E `:91-92`、`:99-100`；`tripForm.ts:23-35,70-72` |
| 新计划与来源无关联 | Pass | `tripForm.test.ts:106-128`；`route.test.ts:25-28`；后端 87 项含行程创建契约 |

## 6. 限制

- E2E 只跑 `experiences.spec.ts`（S17 唯一相关 spec），未跑全套；其余 spec 由各自 change 负责。
- 前端构建与后端全量都跑在**含他人未提交改动**的工作区上；后端 3 项 profile 失败应随该会话的提交一并消失。
- 本轮 E2E 会在本地开发库创建行程与体验数据（测试自带清理策略以 spec 为准）。