# design 评审报告 — refine-my-trips

- **工件：** `openspec/changes/refine-my-trips/design.md`
- **change-id：** `refine-my-trips`
- **评审日期：** 2026-11-16
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:web-coding-style`、`@rule:api-contract`）
- **评审输入：** `design.md`、`atdd-design.md`、Delta Spec、`proposal.md`、`dov-ac-review.md`、`consistency-lint.md`、原型 `mine()`

## 评审结论

**Pass**（0 BLOCKER / 0 WARNING / 3 SUGGESTION）

设计与 Delta 的 11 条场景逐条对齐；组件选型符合「Ant Design 优先」；数据契约只增可选字段并对旧后端做了 `?? []` 兼容；样式只用既有令牌；测试分层覆盖纯逻辑、契约、后端与 E2E。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| D-01 | SUGGESTION | `@rule:web-coding-style` | §3.1 纯逻辑接口 | `actionsFor` 的 `RowContext` 未定义字段，实现时容易把整个 `MyTrips` 传进去 | 实现时定义最小上下文字段（`trip`、`application?`、`shared?`），并在 `mineTrips.test.ts` 用最小对象构造 | `design.md` §3.1 |
| D-02 | SUGGESTION | `@rule:web-testing` | §9 测试设计 | E2E 需要新增夹具（他人已接受行程、已结束行程），未说明复用哪个 helper | T1 复用 `companions.spec.ts` 的 `createTripViaApi` / `acceptViaApi` / `completeTripViaApi`，必要时抽到 `e2e/tests/support.ts` | `companions.spec.ts` |
| D-03 | SUGGESTION | `@rule:web-coding-style` | §10 R3 | `coverTone` 抽取与 `refine-experience-share` 的同名抽取可能冲突 | 合并时保留 `trips/coverTone.ts` 的函数名与行为；两者一致即可取任一实现 | `refine-experience-share` P4 |

## 与规则 / 既有规格的一致性

| 检查 | 结论 |
|---|---|
| 组件选型 | `Segmented` / `Modal` / `Alert` / `EmptyState` 均为 antd 或既有封装；无自绘控件 |
| 样式令牌 | `.mine-row` 等只引用 `--surface` / `--ink-3` / `--r-lg` / `--sh-1`；无硬编码色值 |
| 契约 | 只增可选字段；`required` 不变；旧后端兼容已写入 §4.1 |
| 与 Living Spec | Delta 的 11 场景全部有设计落点（见 §5 与 `atdd-design.md` §1） |
| 与 `design-system` 列表对齐 | §7 明确三列网格与 ≤640px 换行 |
| 安全 | 未新增联系方式字段；备注只读已有 `meeting_area` |

## 残余风险

- `Segmented` 角色变化影响两处既有 E2E（D-02 / R1）。
- 与 `refine-experience-share` 并行改同一页面（R2 / D-03）。
- 可见性事件在无头环境的触发方式依赖 `dispatchEvent`（R4）。

## 批准记录

| 签署位 | 批准人 | 时间 |
|---|---|---|
| 工件 1/2（作者） | Jay（AO） | 2026-11-16T17:45+08:00 |
| 工件 2/2（第二签署人） | Neal（VL） | 2026-11-16T17:45+08:00 |
| 报告 1/2 | WAYNE（IO） | 2026-11-16T17:45+08:00 |
| 报告 2/2 | Jay（AO） | 2026-11-16T17:45+08:00 |

- 批准来源：发起人当次会话确认开发者 Jay 与第二签署人 Neal；评审报告按矩阵由 WAYNE + 当前开发者签署。