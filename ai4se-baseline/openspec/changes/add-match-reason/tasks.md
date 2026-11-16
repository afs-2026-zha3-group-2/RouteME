# 任务：add-match-reason

- **依据：** [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md)、[`design.md`](design.md)
- **约束：** 一条任务只落一层；打分只在后端一处实现；不改匹配相关的端点形状。
- **状态：** 已验证（2026-11-16），待归档。

## 任务清单

### T1 [contract] 匹配契约核对

- [x] 核对 `Match` schema：`score` / `percentage` 为 0–100 整数，`reasons` 为非空字符串数组，`basis` 说明参照来源。
- [x] 确认 `GET /api/matches` 与 `GET /api/matches/{tripId}` 都返回 `MatchCandidate`，无字段变化。

**验证：** `cd RouteME; npx @redocly/cli lint openapi.yaml` → valid，0 error / 7 既有 warning

### T2 [backend] 权重与上限断言

- [x] 目的地相同 +50；出发日期相同 +30；相差一天 +20；共同兴趣每项 +10 且合计 ≤ 20。
- [x] 多项命中时 `score` 与 `percentage` 都不超过 100。
- [x] `TripMatchTest` 逐分支覆盖上述权重，避免只测「满分」一条。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -o clean test` → 154 项通过，`TripMatchTest` 7 项

### T3 [backend] 降级文案断言

- [x] 无共同维度时返回「暂无重合」类文案，`reasons` 非空。
- [x] 用户没有已发布行程时以兴趣与筛选条件为参照，`basis` 说明来源。
- [x] 有参照行程时 `basis` 写出参照行程标题。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -o -Dtest=TripMatchTest,MatchControllerTest test`

### T4 [frontend] 列表与详情的原因展示

- [x] 卡片展示「匹配度 N%」与「匹配理由 …」，环形图降为装饰；去掉百分比后原因文本仍可读。
- [x] 详情页展示原因列表、百分比与参照来源。

**验证：** `cd RouteME/frontend; npm test`（67 项）、`npm run build`

### T5 [e2e] 匹配原因端到端用例

- [x] 首页断言改为当前首屏，卡片断言 `.match-score` / `.match-reason-label` / `.match-reason`。
- [x] 断言按匹配度排序时卡片百分比序列非递增。
- [x] 以两个不同兴趣的演示身份进入，断言同一列表的原因文本不同。
- [x] 进入详情页，断言原因列表与「匹配度 N%」同时可见。

**验证：** `cd RouteME/e2e; npx playwright test tests/companions.spec.ts -g "shows match reasons"` → 1 项通过

### T6 [docs] 验证报告

- [x] `docs/ai4se-plugins/20261116-101500-local-verify-report.md` 记录真实命令、Red 证据与 Green 结果。
- [ ] 归档时写 `summary.md`：change-id、契约版本、遗留项。

## R2 任务（筛选不参与匹配分，2026-11-16）

### T7 [backend] 匹配计算去掉筛选输入

- [x] `TripMatch.of` 删除 `filterDestinationCode` / `filterDate` 参数与「筛选覆盖参照物」分支。
- [x] `MatchServiceImpl#search` 与 `#matchFor` 改用同一签名。

### T8 [contract] 描述与版本

- [x] `Match.basis` 描述改为「最近一条未结束的已发布行程，或你的旅行兴趣；筛选与排序不影响匹配分」。
- [x] `info.version` 0.8.0 → 0.8.1；`OpenApiTest` 同步。

### T9 [tests] 分值与一致性断言

- [x] `TripMatchTest`：删除筛选覆盖参照物的用例，新增「参照目的地不同不计分」。
- [x] `MatchControllerTest`：同一行程在带筛选列表 / 无筛选列表 / 详情三处得分与理由一致。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -o "-Dtest=TripMatchTest,MatchControllerTest,OpenApiTest" test`

## R3 任务（Ant Design 组件收敛，2026-11-16）

### T10 [frontend] 匹配原因改用 antd 组件

- [x] 卡片：自绘 `svg` 匹配环 → `Progress type="circle"`（`strokeColor` 取 `--warn`，无信息文本）；满员进度条 → `Progress size="small"`；兴趣标签 → `Tag`。
- [x] 详情：原因 `<ul>` → `Tag` 列表；百分比 → `Progress type="circle"` 的 `format`；`basis` 单独一行。
- [x] 样式只保留布局类，颜色走 token；删除 `.match-reason-list`、`.meter`、`.ring-*`。

### T11 [e2e] 选择器与回归

- [x] 详情断言改 `.match-reasons .ant-tag` 与 `.match-progress-text`；满员进度改 `.tc-meter.is-full`。
- [x] 回归：`npm test` 137 通过；`build` 通过；`companions.spec.ts` 8/8 通过。

**验证：** `cd RouteME/frontend; npm test; npm run build`、`cd RouteME/e2e; npx playwright test tests/companions.spec.ts`

## R4 任务（匹配块按原型重排，2026-11-16）

### T12 [frontend] 卡片与详情匹配块

- [x] 卡片 `Progress` 圆环内显示分值，理由改纯文本；移除「匹配度 / 匹配理由」两层标签。
- [x] 卡片元信息用「周X出发」替换途经点数量。
- [x] 详情标题改「为什么推荐给你」，圆环 + 理由 + `basis` + 可解释规则说明；保持单列。

### T13 [e2e] 断言与回归

- [x] `companions.spec` 改 `.match-ring .ant-progress-indicator`、`.match-summary .match-reason`、`.match-rule`。
- [x] 回归：`npm test` 137 通过；`build` 通过；`companions.spec.ts` 8/8 通过；全量 53/54。

**验证：** `cd RouteME/frontend; npm test; npm run build`、`cd RouteME/e2e; npx playwright test tests/companions.spec.ts`