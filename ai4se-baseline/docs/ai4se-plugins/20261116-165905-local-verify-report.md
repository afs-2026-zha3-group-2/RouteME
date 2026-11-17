# Local verify report — refine-experience-share

- **Change:** `refine-experience-share`（`trip-experiences` MODIFIED，REQ-004 / S16 / issue #18）
- **Date:** 2026-11-16T16:59+08:00
- **Owner:** Jay（AO）
- **Branch:** `feature/refine-experience-share`
- **Baseline:** `main@baefe40`（rebase 后）

## 1. 环境

| 项 | 值 |
|---|---|
| Node | v24.18.0 ｜ npm 11.16.0 |
| Java | OpenJDK 21.0.11 ｜ Maven wrapper 3.9.x |
| 数据库 | SQLite `ai4se-baseline/RouteME/SqlLite/routeme.db`，Flyway 迁移至 v15 |
| 服务 | 后端 `localhost:8080`、前端 dev `localhost:5173`（Vite） |
| 浏览器 | Playwright Chromium（E2E）；VS Code 集成浏览器（人工走查） |

## 2. 命令与结果

| 层 | 命令 | 结果 |
|---|---|---|
| 前端静态 | `cd frontend; npm run typecheck` | 通过（`tsc --noEmit`，0 error） |
| 前端构建 | `cd frontend; npm run build` | 通过（`index-BFLKQdsq.js` 1,175.67 kB / gzip 376.03 kB；仅 chunk size 提示） |
| 前端单测 | `cd frontend; npm test` | **17 files / 141 tests passed**（含新增 `shareEligibility.test.ts` 4 例） |
| 后端单测 | `cd backend; .\mvnw.cmd -B -ntp test` | **230 tests, 0 failures, 0 errors**，BUILD SUCCESS（含 `ExperienceControllerTest` / `ExperienceServiceTest` / `ExperienceServicePersistenceTest`） |
| E2E（本 change） | `cd e2e; npx playwright test tests/experiences.spec.ts` | **8 passed**（clean DB 前一轮 8/8；新增 2 例、改造 3 例） |
| E2E（全量） | `cd e2e; npx playwright test` | **55 passed / 1 failed**；唯一失败为 `companions.spec.ts:200`（见 §5） |

种子数据说明：全量 E2E 在**删除 `routeme.db` 后由 Flyway 重建**的干净库上执行，失败不是由本 change 累积的数据导致。

## 3. E2E 覆盖对照

| 用例 | 覆盖 Delta 场景 |
|---|---|
| `shares an experience and reuses it to publish a new plan` | E1 具备资格发布、E7 三档强度、E10 分享边界、E11 行程概览、E12 体验去向、E8 无上传入口、参考发布 |
| `updates the existing experience instead of adding another one` | E5 再次提交即修改（`.experience-list li` 恒为 1、旧文案消失） |
| `keeps experience entry points honest` | E2 未结束（动态创建明日行程 → 「行程结束后才能发表体验」+「当前状态：招募中」）、E3 未参加（种子行程 1 + 用户 3） |
| `marks completed trips as shared in my trips` | E9 已完成分组「发表游后体验」→「修改我的体验」 |
| `shows seeded experiences in the travel experience view` | E8 `.exp-cover` 可见 |
| 其余 3 例（切换视图、空态、骨架） | 回归：首页体验视图未因封面条退化 |

## 4. 人工走查（集成浏览器）

| 视口 / 主题 | 观察 | 结论 |
|---|---|---|
| 1440 浅色（`#/share/1`） | hero 三段信息一行排布，封面 96×64，状态徽标右对齐；去向三段与边界两段以 ✔ 列表呈现 | Pass |
| 390 浅色（`#/share/1`） | hero 纵向堆叠，标题两行内换行，封面仍可见；`documentElement.scrollWidth = 380 = clientWidth`，无横向滚动 | Pass |
| 768 浅色 | `scrollWidth = 758 = clientWidth`，hero 保持单行 | Pass |
| 1440 深色（`#/share/1`） | 封面 teal 渐变与深色面层对比可辨；`.share-note` 背景 `--surface-2` 与卡片层级清晰 | Pass |
| 1440 深色（首页「旅行体验」） | 5 张体验卡各带 64px 封面条 + 目的地名「珠海市 / 清远市」，与行程卡同一色调哈希 | Pass |
| 390 深色 | 体验卡封面条不挤压标题与作者行；卡片高度一致 | Pass |

无障碍：封面 `aria-hidden="true"`；去向 / 边界为真实 `<ul>/<li>`；不可用提示为 antd `Alert`（role=alert），标题 + 说明两段文本，不依赖颜色。

## 5. 未通过项与归属

| 项 | 现象 | 归属 | 处理 |
|---|---|---|---|
| `e2e/tests/companions.spec.ts:200`「rejects a submission after the trip fills and shows the reason」 | 期望 `.ant-alert` 出现「人数已满」，实际点击后无该 alert | 非本 change：`main@1cd1505`（`fix(ui): soften ended-trip feedback with toast messages`）把申请失败反馈由内联 `Alert` 改为 `message.info`，同批只更新了「行程已结束」用例（`companions.spec.ts:226`），漏改满员用例 | 本 change 不修改该流程；记为移交 `add-trip-completion` / 该提交 owner 的测试债（P5 或独立 fix） |

证据：`git show 1cd1505 -- ai4se-baseline/RouteME/frontend/src/trips/TripDetailPage.tsx`（`message.info(mapped)` 分支）与 `git show 1cd1505 -- ai4se-baseline/RouteME/e2e/tests/companions.spec.ts`（只改了结束用例）。

## 6. 结论

- 本 change 的实现与测试全绿（前端 141、后端 230、相关 E2E 8/8、全量 E2E 除 1 条既有债务外 55/56）。
- 契约、后端与数据库迁移零改动；服务端仍是资格拒绝的唯一判定方。
- 人工走查 6 张通过，无横向溢出。
- **Overall：Pass（with 1 documented pre-existing E2E debt）。**