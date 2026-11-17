# P1 意图记录 — add-trip-weather

- **Change：** `add-trip-weather`（REQ-022 / 目的地天气与出行提醒）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）
- **分支 / 基点：** `feature/add-trip-weather`（独立 worktree `RouteME-weather`，基于 `origin/main@225eb0e`）

## 1. 阶段目标

把「选好目的地与日期后看到当地天气与出行提醒」收敛为可判定的 REQ-022、影响面与 OpenSpec 提案；明确天气能力的归属（本 change 自持后端代理）、坐标口径（区划码解析 + 请求坐标优先）与提醒阈值，避免与在途 `add-ai-itinerary` 重复造天气能力。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 意图捕获 | [`intents/REQ-022-trip-weather.md`](../../../requirement-workspace/intents/REQ-022-trip-weather.md) | 原始故事、现状核对 10 项、用户裁决 D1–D4、意图边界；Discovery Decision `Go` |
| Ready 需求 | [`requirements/REQ-022-trip-weather.md`](../../../requirement-workspace/requirements/REQ-022-trip-weather.md) | 六字段 + 16 场景 + OQ 5 条（全 resolved）+ DoR（BLOCKER 0） |
| 故事 | [`stories.md`](../../../requirement-workspace/stories.md) REQ-022 段 | S22 的 14 条 AC 映射与说明 |
| Deep-dive | [`deep-dive.md`「REQ-022 增补」](../../../requirement-workspace/deep-dive.md) | ① 数据契约 / ② 边界归属 / ③ 跨 REQ 一致 / ④ 展示契约 + 探针 |
| 影响面 | [`impact-brief.md` §22](../../../requirement-workspace/impact-brief.md) | as-is → delta、blast radius、风险、拆分边界 |
| 提案 | [`proposal.md`](../../../openspec/changes/add-trip-weather/proposal.md) | Why / What Changes / 问题 / 范围 / 决策 / 影响面 / 风险 |
| Delta 草稿 | [`specs/trip-weather/spec.md`](../../../openspec/changes/add-trip-weather/specs/trip-weather/spec.md) | ADDED 6 Requirement / 28 Scenario |
| 提案评审 | [`20261117-add-trip-weather-proposal-review.md`](../../reviews/20261117-add-trip-weather-proposal-review.md) | Pass；0 BLOCKER / 1 WARNING / 3 SUGGESTION（S-01~S-03 当场收口） |
| 质量报告 | [`20261117-201500-quality-checklist-report.md`](../../ai4se-plugins/20261117-201500-quality-checklist-report.md) | P1-1 ~ P1-4 Pass；P1-5 Pass；P1-6 Skipped；Overall Pass |

## 3. 关键决策

- **D1 后端能力归属：** 本 change 自持 `GET /api/weather/forecast` 与提醒推导，成为天气能力权威；`add-ai-itinerary` 后续复用（用户裁决）。
- **D2 坐标口径：** 区划码 → 城市中心坐标（进程内缓存）；请求携带 `lng` / `lat` 时优先（高德选点结果）；**不新增坐标列、无迁移**。提问时曾倾向「发布时存坐标」，P0 核对后按「最简实现」原则改为读时解析，并在提案残余风险 §2 显式记录偏离与理由。
- **D3 落地位置：** 路线创建页侧栏 + 行程详情页信息区，共用 `WeatherCard`。
- **D4 日期：** 展示旅行首日并标注日期；多日逐天不做。
- **D5 越界表达：** 200 + `available:false` + `reason:OUT_OF_RANGE`，越界是正常业务状态而非调用错误。
- **D6 提醒：** 后端纯函数，固定阈值（降雨 50% / 1 mm、加强 80% / 10 mm；高温 30°C；UV 6；低温 10°C；温差 10°C；强风 30 km/h；全未命中 → 平稳）。
- **D7 编号：** REQ-022 / `add-trip-weather` / `trip-weather`（ADDED）；契约 0.16.0；无迁移。

**不改：** 目的地选择方式（仍为省市级联）、行程发布与详情既有契约、匹配与排序、AI 推荐链路。

## 4. 校验

- `openspec validate add-trip-weather --strict` → `Change 'add-trip-weather' is valid`。
- `openspec show add-trip-weather --json --deltas-only` → `deltaCount: 6`、`spec: trip-weather`、`operation: ADDED`。
- P1 质量检查 Overall Pass（required 4/4）。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SM | Lewis | P1 范围与排期确认（单 change、3 点、迭代 2） | 2026-11-17 |
| IO | WAYNE | 需求来源与能力归属确认（`trip-weather` ADDED；AI 推荐排除） | 2026-11-17 |
| AO | Jay | 承接 P2–P4 | 2026-11-17 |

**阶段结论：Pass**

## 6. 提交与偏离记录

- **阶段提交：** 用户当次要求「每个阶段提交一次，git push 之前先做 git pull」。P0 `419982a`；P1 同批提交意图 / 需求 / 故事 / deep-dive / 影响面 / 提案 / Delta 草稿 / 评审 / 质量报告 / 本记录与 registry 更新。
- **偏离：** 阶段提交偏离 Critical 规则 `@rule:git-commit-conventions`（一个 spec 只允许 verify / archive 两次提交），以用户当次显式指示为准，已在提案与本节记录。
- **口径偏离：** 坐标「发布时存列」改为「读时解析 + 缓存」，理由与影响见 `proposal.md` §残余风险 2；行为不受影响（两处页面均可用、无需用户输入城市）。