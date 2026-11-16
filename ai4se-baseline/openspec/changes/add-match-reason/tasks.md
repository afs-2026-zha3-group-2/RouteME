# 任务：add-match-reason

- **依据：** [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md)、[`design.md`](design.md)
- **约束：** 一条任务只落一层；打分只在后端一处实现；不改匹配相关的端点形状。
- **状态：** 已开启，尚未开工（S07 排在 S06 之后）。

## 任务清单

### T1 [contract] 匹配契约核对

- [ ] 核对 `Match` schema：`score` / `percentage` 为 0–100 整数，`reasons` 为非空字符串数组，`basis` 说明参照来源。
- [ ] 确认 `GET /api/matches` 与 `GET /api/matches/{tripId}` 都返回 `MatchCandidate`，无字段变化。

**验证：** `cd RouteME; npx @redocly/cli lint openapi.yaml`

### T2 [backend] 权重与上限断言

- [ ] 目的地相同 +50；出发日期相同 +30；相差一天 +20；共同兴趣每项 +10 且合计 ≤ 20。
- [ ] 多项命中时 `score` 与 `percentage` 都不超过 100。
- [ ] `TripMatchTest` 逐分支覆盖上述权重，避免只测「满分」一条。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -o -Dtest=TripMatchTest test`

### T3 [backend] 降级文案断言

- [ ] 无共同维度时返回「暂无重合」类文案，`reasons` 非空。
- [ ] 用户没有已发布行程时以兴趣与筛选条件为参照，`basis` 说明来源。
- [ ] 有参照行程时 `basis` 写出参照行程标题。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -o -Dtest=MatchControllerTest test`

### T4 [frontend] 列表与详情的原因展示

- [ ] 卡片展示百分比与原因文本，去掉百分比后原因仍可读。
- [ ] 详情页展示原因列表、百分比与参照来源。

**验证：** `cd RouteME/frontend; npm test; npm run build`

### T5 [e2e] 匹配原因端到端用例

- [ ] 以两个不同兴趣的演示身份进入，断言同一行程的原因文本不同。
- [ ] 断言按匹配度排序时列表首条分值不低于次条。

**验证：** `cd RouteME/e2e; npx playwright test tests/trips.spec.ts`

### T6 [docs] 验证报告

- [ ] 记录真实命令与输出摘要，写 `summary.md`。