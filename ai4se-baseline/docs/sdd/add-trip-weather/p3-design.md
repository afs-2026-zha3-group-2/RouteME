# P3 设计记录 — add-trip-weather

- **Change：** `add-trip-weather`（REQ-022）｜ **阶段：** P3（Design & task plan）
- **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）
- **分支 / 基点：** `feature/add-trip-weather`（P2 提交 `f571894`）

## 1. 阶段目标

把 28 条 Delta 场景落成可实现、可验证的设计与任务：契约形状、坐标解析与缓存、阈值单点、前端状态机与防竞态、两页挂载点、测试分层，同时保证不改发布 / 详情既有契约与表单行为、不新增迁移、不把天气接进 AI。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 设计 | [`design.md`](../../../openspec/changes/add-trip-weather/design.md) | §1–§10：组件、契约、后端行为、前端状态机、契约文件、测试策略、AI 合并顺序、边界、风险 |
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/add-trip-weather/atdd-design.md) | E1–E28 场景分层；U1–U7 / B1–B8 / F1–F4 / M1–M7 / V1–V4 |
| 任务 | [`tasks.md`](../../../openspec/changes/add-trip-weather/tasks.md) | T1–T12，含落点、依赖、验收、验证命令与 28/28 对齐自检 |
| 设计与任务评审 | [`design-tasks-review`](../../reviews/20261117-add-trip-weather-design-tasks-review.md) | Pass；0 BLOCKER / 1 WARNING / 3 SUGGESTION |
| 全量评审 | [`all-specs-review`](../../reviews/20261117-add-trip-weather-all-specs-review.md) | Pass；0 BLOCKER / 1 WARNING / 4 SUGGESTION |
| P3 质量报告 | [`20261117-211500-quality-checklist-report.md`](../../ai4se-plugins/20261117-211500-quality-checklist-report.md) | P3-1 ~ P3-4 Pass；P3-5 / P3-6 N/A；Overall Pass |

## 3. 关键设计决策

- **一个端点、一个组件（§2）。** `GET /api/weather/forecast` + `WeatherCard`；两页共用，避免口径分叉。
- **阈值单点（§4.4，G1 C4）。** 全部阈值与文案在后端 `WeatherReminderRules`；前端只渲染返回文本。
- **状态机外置（§5.1，L-01）。** `idle / loading / ready / unavailable / error` 五态由 `useWeather` 输出，组件只渲染；加载中不展示旧数据。
- **坐标缓存（§4.2，G1 C2）。** 键 = 区划码，只缓存成功；geocoding 失败 502 可重试，不猜坐标；不使用途经点坐标。
- **窗口先行（§4.1，G1 C5）。** 越界在坐标解析与上游调用之前返回 `available:false`，零上游调用。
- **契约 0.16.0（§3，G1 C3）。** 新路径 + 3 schema；越界与可用共用 200，错误复用 `ErrorResponse`。
- **AI 合并顺序（§8，C1）。** 本 change 为权威；AI 侧删代理改为注入本服务；两边 `source` 一致。
- **不做：** 多日逐天、逐小时、落库、通知、目的地选择改造、AI 提示词（§9）。

## 4. 对齐自检（vs Delta Spec）

| Delta Requirement | 设计 | 任务 | ATDD |
|---|---|---|---|
| 按目的地与日期获取真实天气 | §3、§4.3 | T1 / T5 / T6 | E1–E4 |
| 目的地坐标解析与复用 | §4.1、§4.2 | T3 / T4 / T5 / T6 | E5–E8 |
| 基于真实天气的出行提醒 | §4.4 | T2 | E9–E16 |
| 路线创建页的天气展示 | §5.1–§5.3 | T7–T9 | E17–E22 |
| 行程详情页的天气展示 | §5.3 | T9 | E23–E25 |
| 预报窗口与不可用状态 | §4.1、§4.5 | T5 / T6 | E26–E28 |

- **无静默扩张：** 任务无多日预报、无 AI、无落库、无通知、无目的地选择改造。
- **无遗漏场景：** 28/28 场景在设计、任务与 ATDD 中均有落点。

## 5. 测试与验证计划

| 层 | 命令 | 判据 |
|---|---|---|
| 契约 | `.\mvnw.cmd -B -ntp test -Dtest=OpenApiTest` + Redocly lint | 通过 / 0 error |
| 后端 | `.\mvnw.cmd -B -ntp test` | 全绿（含 U1–U7、B1–B8） |
| 前端 | `npm run build` + `npm test` | 构建通过；F1–F4 全绿 |
| E2E | `npx playwright test tests/weather.spec.ts` | M1–M7 7/7 |
| 回归 | 全量 E2E | 与基线对比无新增失败 |
| 走查 | 1440 / 768 / 390 × 浅 / 深 | V1–V4 |

## 6. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO（作者） | Jay | 设计与任务可执行；承接 T1–T12 | 2026-11-17 |
| VL（审批） | Neal | 设计取舍、测试分层与验收判据 | 2026-11-17 |
| SM | Lewis | 排期确认 | 2026-11-17 |

**阶段结论：Pass（P3-1 ~ P3-4 全 Pass）。** 下一步 P4：实现 T1–T12 → 本地验证 → G2。

## 7. 阶段提交

- 提交信息：`docs(p3): add-trip-weather design atdd and task plan`
- push 前 `git pull --rebase origin main`；本阶段只提交本 change 路径与 `docs/sdd/README.md` 索引行。