# 本地验证报告：REQ-013-reference-publish（S17 参考此行程发布）

- **日期：** 2026-11-16 17:15（UTC+8）
- **Root：** `D:\zha_training\RouteME\ai4se-baseline`
- **Change id：** 无新建（复用已归档的 `add-trip-experiences`）
- **Scope：** evidence-only（无代码 diff）
- **范围：** 验证 S17 的四条 AC 在当期 `main` 上仍由既有实现满足：已结束行程详情与体验卡入口、目的地 / 途经点 / 兴趣标签预填、标题 / 日期 / 人数 / 集合区域不沿用、新计划无来源字段。

## Summary

| Dimension | Status |
|-----------|--------|
| Build | N/A（无代码 diff，构建归属 `add-trip-experiences`） |
| Static scan | N/A（同上） |
| Code review | N/A（同上） |
| Evidence（行为） | Pass |
| **Overall** | **Pass**（evidence scope） |

**说明：** 本报告不是 Gate 决策，也不构成 G2。REQ-013 没有实现提交，因此不主张「实现已验证」，只主张「现存行为在当期 `main` 上可复现且符合 AC」。

## 环境

| 项 | 值 |
|---|---|
| 后端 | 已在 `localhost:8080` 运行（由并行会话启动，非本轮启动） |
| 前端 | 已在 `localhost:5173` 运行（vite dev，同上） |
| 工作区 | **不干净**：并行会话的 `profile` 改动（4 个 `M`）与 `V14__normalize_demo_user_profiles.sql`（未跟踪）仍在工作区 |
| 迁移冲突风险 | 该未跟踪 `V14__normalize_demo_user_profiles.sql` 与上游 `V14__seed_demo_account_credentials.sql` **同版本号**，后端全量测试 / 重启会受它影响，因此本轮未跑 `mvnw test` |

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `cd RouteME/frontend; npx vitest run src/trips/tripForm.test.ts src/route.test.ts src/experiences/experienceForm.test.ts` | AC ③ / ④ 取证 | 0 | 3 文件 / **30 项通过** |
| `cd RouteME/frontend; npx vitest run` | 前端全量回归 | 0 | 16 文件 / **137 项通过** |
| `cd RouteME/e2e; npx playwright test experiences.spec.ts` | S17 端到端 | 0 | **6 项通过**（16.1s） |
| `cd RouteME/backend; .\mvnw.cmd test` | 后端回归 | — | **未运行**（见上「迁移冲突风险」，与本需求无关） |

## 1. 前端单元测试

```text
 RUN  v5.1.0 D:/zha_training/RouteME/ai4se-baseline/RouteME/frontend

 Test Files  16 passed (16)
      Tests  137 passed (137)
   Start at  17:12:20
   Duration  832ms
```

与 S17 直接相关的断言：

- `tripForm.test.ts:106-128` — `toCreateRequest` 的请求体只有 `title` / `destination_code` / `start_date` / `end_date` / `stops` / `meeting_area` / `budget_min_cents` / `budget_max_cents` / `tags` / `capacity`，**没有来源字段**；空白集合区域映射为 `null`。
- `tripForm.test.ts:41-46` — 人数为空时 `capacity` 报错，错误集合与 `validateTripForm` 一致。
- `route.test.ts:25-28` — `#/trips/new?from=7` 解析为 `{ name: 'create', fromTripId: 7 }`，`#/trips/new` 不带 `fromTripId`。

## 2. 端到端验收

```text
Running 6 tests using 1 worker

  ok 1 tests\experiences.spec.ts:52:1 › shows seeded experiences in the travel experience view (2.9s)
  ok 2 tests\experiences.spec.ts:66:1 › shares an experience and reuses it to publish a new plan (3.0s)
  ok 3 tests\experiences.spec.ts:103:1 › keeps experience entry points honest (2.1s)
  ok 4 tests\experiences.spec.ts:118:1 › switches to the experience view and marks ended origin trips (1.8s)
  ok 5 tests\experiences.spec.ts:135:1 › guides an empty filter state to publish from both views (2.9s)
  ok 6 tests\experiences.spec.ts:156:1 › shows skeletons instead of the previous view while lists load (1.7s)

  6 passed (16.1s)
```

其中第 2 条就是 S17 的完整路径，逐项对应 AC：

| AC | 断言 | 行号 |
|---|---|---|
| ① 入口 | 体验卡上有「参考此行程发布」链接；详情页按钮可点 | `:63`、`:88` |
| ② 预填 | 提示条「已预填目的地、途经点与兴趣」；途经点 chip「香洲港集合」可见；兴趣「摄影」`aria-checked=true` | `:90`、`:93`、`:94-97` |
| ③ 重填 | 计划人数值为空串、标题值为空串；直接点「发布」出现必填报错 | `:91-92`、`:99-100` |
| ④ 新计划 | 发布后跳到新行程详情 `#/trips/<新 id>`，与原行程互不影响 | `:78-79` |

## 3. 与 AC 的逐条结论

| AC | 结论 | 证据 |
|---|---|---|
| 已结束行程 / 体验入口 | Pass | E2E `:63`、`:88`；`TripDetailPage.tsx:416-420`、`ExperienceCard.tsx:53-55` |
| 预填目的地 / 路线 / 兴趣 | Pass | E2E `:90-97`；`TripCreatePage.tsx:56-62` |
| 日期 / 人数 / 集合区域重填 | Pass | E2E `:91-92`、`:99-100`；`tripForm.ts:23-35,70-72` |
| 新计划与来源无关联 | Pass | `tripForm.test.ts:106-128`；`route.test.ts:25-28`；契约无来源字段 |

## 4. 未覆盖与限制

- 后端全量测试未跑：并行会话的未跟踪 `V14__normalize_demo_user_profiles.sql` 与上游 `V14__seed_demo_account_credentials.sql` 版本号冲突，`mvnw test` / 重启会受它影响。清掉或改名后再跑即可，与本需求无关。
- 前端 `npm run build`（含 `tsc --noEmit`）未跑：工作区含他人未提交的 `profile` 改动，构建结果不能代表 `main`。
- E2E 只跑 `experiences.spec.ts`（S17 唯一相关 spec），未跑全套。
- 本轮 E2E 会在本地开发库创建行程与体验数据（测试自带清理策略以 spec 为准）。