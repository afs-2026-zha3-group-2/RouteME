# all-specs-review — refine-my-trips

- **Change:** `refine-my-trips`（`trip-companions` MODIFIED，REQ-015 / S11）
- **评审日期：** 2026-11-16
- **评审范围：** `proposal.md`、`specs/trip-companions/spec.md`、`design.md`、`atdd-design.md`、`tasks.md`、`dov-ac-review.md`、`consistency-lint.md`、`g1-decision.md`
- **评审方式：** 规则驱动的整体一致性评审（`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:api-contract`、`@rule:web-coding-style`、`@rule:web-testing`、`@rule:pii-scrubbing`）
- **共享证据：** `openspec validate refine-my-trips --strict` → valid；`openspec show --deltas-only` → `deltaCount: 1`；仓库基线 `origin/main@588ef9e`

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 6

## 跨工件一致性

| 检查 | 结论 | 证据 |
|---|---|---|
| proposal ↔ Delta | Pass | In scope 9 条全部有 Delta 落点；Out of scope 无对应场景 |
| Delta ↔ design | Pass | 11 条场景在 `design.md` §5 / §9 与 `atdd-design.md` §1 均有落点 |
| design ↔ tasks | Pass | D1–D10 由 T2–T6 实现；无未覆盖设计项 |
| tasks ↔ ATDD | Pass | U1–U5 / B1–B4 / M1–M8 与 T1–T6 对齐 |
| 契约 ↔ 类型 ↔ 测试 | Pass | `pending_applications` 在 `openapi.yaml`、`types.ts`、`OpenApiTest`、`MyTripsControllerTest` 均有对应 |
| 规则引用可达 | Pass | proposal 引用的 8 个 `@rule:` 均可在权威区解析 |
| 隐私 | Pass | 未新增联系方式字段；备注只读 `meeting_area`；无电话 / 证件 / 精确住址 |
| 与 Living Spec | Pass | 4 条基线场景名保留，安全段落逐字保留 |

## 结构化发现

| id | 严重度 | 规则锚点 | 工件 | 问题 | 建议 |
|---|---|---|---|---|---|
| A-01 | SUGGESTION | `@rule:api-contract` | proposal / design | `pending_applications` 的 `count` 最小值为 1 只在 design 写明 | 在 `openapi.yaml` 落实 `minimum: 1` 并在 `OpenApiTest` 断言 |
| A-02 | SUGGESTION | `@rule:web-testing` | atdd-design | E2E 夹具复用未点明 helper | 复用或抽取 `e2e/tests/support.ts` |
| A-03 | SUGGESTION | `@rule:web-coding-style` | design §10 | `coverTone` 抽取与并行 change 冲突 | 合并时保留单一实现 |
| A-04 | SUGGESTION | `@rule:web-coding-style` | design §6 | 部分文案需要 `{n}` 插值，未说明实现方式 | 用函数式消息或 `replace`，与既有代码一致 |
| A-05 | SUGGESTION | `@rule:web-testing` | tasks T6 | 回归命令未含 `auth.spec.ts` | 全量跑 `npx playwright test` 或显式加入 |
| A-06 | SUGGESTION | `@rule:sdd-artifacts` | tasks T7 | 归档收口未提「安全段落 diff」的具体判据 | P5 用 `git diff` 对比 4 条基线场景与安全正文 |

## 覆盖矩阵（AC → 工件）

| 故事 AC | Delta 场景 | design | tasks | ATDD |
|---|---|---|---|---|
| AC1 四组分区 | 分区展示我的旅行 / 分组内容与计数一致 | §5.1 | T3 / T4 | E1 / E2 / M1 |
| AC2 可点击提醒 | 待处理申请提醒 / 无待处理申请 | §5.2 | T2 / T4 | E4 / E5 / B1–B3 / M2 / M7 |
| AC3 刷新即同步 | 重新可见时同步状态 / 页内动作后同步状态 | §3.3 | T4 / T5 | E6 / E7 / M3–M6 |
| 每条可跳转 | 分区展示我的旅行 | §2 | T4 | E1 / E3 |
| 窄屏不重叠 | 窄屏动作不遮挡 | §7 | T5 | E9 / M8 |
| 安全与举报不回退 | 安全提示常驻 / 提交举报并收到回执 | §10 | T6 | E10 / E11 |

## Gaps / follow-ups

| id | 内容 | owner | 时机 |
|---|---|---|---|
| A-01 | `count` `minimum: 1` | Jay | P4 |
| A-02 | E2E helper 复用 | Jay | P4 |
| A-03 | `coverTone` 冲突处理 | Jay | P4 / 归档 |
| A-04 | 文案插值方式 | Jay | P4 |
| A-05 | `auth.spec.ts` 回归 | Jay | P4 |
| A-06 | 归档 diff 判据 | Jay | P5 |

## 结论

本 change 的工件链自洽、可执行，无阻断项。`review.md` 为索引，正文以本报告为准。