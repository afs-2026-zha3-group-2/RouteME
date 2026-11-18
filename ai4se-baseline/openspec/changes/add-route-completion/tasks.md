# 任务 — add-route-completion

- **Change：** `add-route-completion`（REQ-031 / S32 路线完成度，issue #45）
- **输入：** [`spec.md`](specs/route-completion/spec.md)、[`design.md`](design.md)（D1–D12）、[`atdd-design.md`](atdd-design.md)（A1–A18）、[`g1-decision.md`](g1-decision.md)（Pass）
- **Owner：** Neal ｜ **日期：** 2026-11-18
- **执行方式：** 按 T0 → T9 顺序；T2 / T5 先红后绿（TDD）；每项完成后跑对应门禁。

## P4 执行顺序

> 契约先行 → 派生单点 → 装配 → 写法反向 → 前端 → E2E → 门禁 → 记录。每个任务先写失败用例（ATDD / TDD），再实现。
> 任务编号 T0–T9 与设计 / ATDD 一一对应；完成后勾选，供 `openspec archive` 跟踪。

- [x] T0 原型先行：个人主页 hero 信用行 + 完成度行，四态 × 浅 / 深色；产物 `docs/sdd/add-route-completion/preview/route-completion-row.html`；验收：四态文案、色阶、行距与 `.profile-credit` 对齐，无十六进制色值。
- [x] T1 契约先行（先红）：`UserProfile` 追加两字段，`route_completion_state` 入 `required`、`rate` 可空不入；`info.version` 0.27.0；示例「数据不足省略 rate」；产物 `RouteME/openapi.yaml`、`OpenApiTest`；验收：`OpenApiTest` 红 → 绿，Redocly 0 error。
- [x] T2 后端派生单点（先红后绿）：`enums/RouteCompletionState` / `pojo/RouteCompletion` / `service/RouteCompletionPolicy`；单测 A3–A8；产物 `RouteCompletionPolicyTest`；验收：80 / 100 → good；70 / 79 → neutral；69 / 0 → watch；null / -1 / 101 / 非整数 → insufficient；样本 0 → insufficient。
- [x] T3 后端装配 + API（先红）：`UserProfileResponse` 末尾两字段；控制器三处装配 `evaluate(null, 0)`；API 测试 A1 / A2 / A15 / A16 / A17 / A18；产物 `response/UserProfileResponse.java`、`controller/UserProfileController.java`、`UserProfileRouteCompletionApiTest`；验收：响应含 `route_completion_state = insufficient`、**不含** `route_completion_rate` 键；信用字段与 `stats` 不变；账本行数不变；401 / 404 不变。
- [x] T4 迁移反向测试：头仍为 `V31`；无 `route_completion*` 表 / 列；`PUT /me/profile` 不接受两字段；产物 `RouteCompletionMigrationSqliteTest`；验收：断言通过；无新增迁移文件。
- [x] T5 前端类型 + 展示纯函数（先红后绿）：`RouteCompletionState`、`routeCompletionLine` 四态与降级；单测；产物 `types.ts`、`profile/routeCompletionDisplay.ts`、`routeCompletionDisplay.test.ts`；验收：四态文案与 tone 正确；缺失 / null / 未知状态 → `insufficient`；无 80 / 70 常量。
- [x] T6 个人主页展示：hero 追加完成度行；i18n 4 条；`.profile-completion` 四档样式；产物 `profile/ProfilePage.tsx`、`i18n/tripMessages.ts`、`styles.css`；验收：与 T0 预览一致；四宽度 × 深浅色无溢出；弹窗 / 卡片 / 详情 / 列表无该行。
- [x] T7 E2E（先红）：`route-completion.spec.ts` A9–A14；验收：真态「暂无足够完成记录」；`page.route` 注入 good / neutral / watch 文案正确；禁用措辞不存在；无列表 / 详情出现。
- [x] T8 全量回归 + 本地验证报告：产物 `docs/ai4se-plugins/<ts>-local-verify-report.md`；验收：后端 `mvnw verify`、前端 `typecheck / build / test`、E2E 本 spec + 受影响回归、`openspec validate --strict`、Redocly 全绿或有归因。
- [ ] T9 阶段收尾：P4 阶段记录 + G2 决策（VL 签署）+ 质量检查；产物 `docs/sdd/add-route-completion/p4-implement.md`、`g2-decision.md`、P4 质量报告；验收：记录提交、G2 签署位齐、P4 质量 Overall Pass。

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| # | 检查 | 结果 |
|---|---|---|
| 1 | 6 条 Requirement 均有任务承接 | Pass：R1 → T1 / T3；R2 / R3 → T2；R4 → T5 / T6 / T7；R5 → T3 / T4；R6 → T1 / T3 |
| 2 | 18 个 Scenario 均映射到 A1–A18 与任务 | Pass：A1 / A2 / A16–A18 → T3；A3–A8 → T2；A9–A14 → T7；A15 → T3 + T7 |
| 3 | Design 决策均有任务落地 | Pass：D1 / D3 → T3；D2 → T2；D4 → T1；D5 / D6 → T5；D7 / D8 → T6；D9 → T0；D10 → T1 / T2 / T3 / T7；D11 → T4；D12 → T1 / T9 |
| 4 | ATDD 分层与任务一致 | Pass：API 在 T1 / T3 / T4；E2E 在 T7；Defer UT 在 T2 / T5 |
| 5 | Non-goals 反向验证有任务 | Pass：T4（表 / 迁移 / 写入口）、T3（信用 / 统计 / 成长等级字段）、T7（其他展示面） |
| 6 | 任务不越出 Spec 范围 | Pass：无打卡 / 聚合 / 列表 / 管理端任务 |
| 7 | 任务粒度 ≤2h 且有验收 | Pass：T0 0.5h ~ T3 / T6 / T7 / T8 1.5h |
| 8 | 最后一项为验证 / 收尾 | Pass：T8 回归 + 本地验证，T9 阶段收尾与 G2 |
| 9 | 契约 / 迁移号排他 | Pass：0.27.0；无迁移（头保持 `V31`） |

**自检结论：9/9 Pass。**
