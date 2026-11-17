# 任务计划评审报告 — add-admin-console

- **工件：** `openspec/changes/add-admin-console/tasks.md`（19 条任务，按迭代 1 / 2 / 3 分组，估算合计 37.5h）
- **change-id：** `add-admin-console` ｜ **需求条目：** REQ-018 / S19–S24
- **评审日期：** 2026-11-17
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:api-contract`、`@rule:web-testing`、`@rule:sdd-artifacts`；lint 规则 T1–T3 / D1–D3）
- **评审输入：** `tasks.md` 全文；`design.md`（含再评审修订）；`atdd-design.md`；三份 Delta（14 Requirement / 61 Scenario）；`proposal.md`；`g1-decision.md`；`docs/reviews/20261117-add-admin-console-design-review-2.md`
- **工具校验：** `npx --no-install openspec validate add-admin-console --strict` → `Change 'add-admin-console' is valid`

## 评审结论

**Pass**（BLOCKER 0 / WARNING 0 / SUGGESTION 4（3 已修、1 待 P4））

19 条任务全部落在三份 Delta 的 Requirement 内，每条都有可执行动作、验证命令与覆盖场景；61 条场景按 A / C / U 分组 100% 命中，无孤儿任务、无孤儿场景。契约先行（T1）与迁移先行（T2）的顺序正确；每条任务估算 ≤2h，收口任务（T19）承担全量回归与视觉走查，符合 lint 的 verify-tail 要求。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 | 状态 |
|---|---|---|---|---|---|---|---|
| TT-01 | SUGGESTION | lint T1 | `tasks.md` 任务清单 | 任务只有「估算合计 37.5h」，单条无工时；无法判断是否有超 2h 的大块 | 增加估算表，逐条标注；全部 ≤2h | 19 条任务与 22 点故事口径 | **已修**（新增 §估算） |
| TT-02 | SUGGESTION | `@rule:web-testing` | `tasks.md` T18 | 验证命令 `-g "I3|C"` 会跨两个 spec 文件误匹配，可能跳过或误选用例 | 拆成两条命令：`customer-service.spec.ts` 全跑 + `admin.spec.ts -g "I3"` | `atdd-design.md` §4 的 E2E 命令 | **已修** |
| TT-03 | SUGGESTION | `@rule:sdd-artifacts` | `tasks.md` T8 / T9 / T16 | 引用了设计未列的三个纯逻辑文件（`userQuery.test.ts` / `profileBanNotice.test.ts` / `servicePolling.test.ts`），与 ATDD 的 6 组 defer UT 不一致 | 改为复用既有 `startChatPolling` 与 E2E 覆盖；纯逻辑单测严格对齐 6 组 | `atdd-design.md` §2 与 §3 的 defer UT 清单；`design.md` §6.2 文件清单 | **已修** |
| TT-04 | SUGGESTION | `@rule:api-contract` | `tasks.md` T1 | 契约一次覆盖 16 个端点，迭代 1 只实现 3 个用户端点；评审者可能把「未实现端点」误判为缺陷 | T1 勾选项补一句 PR 说明：契约面大于当前迭代实现面，其余端点按迭代交付 | `tasks.md` T1 与 §迭代 2 / 3 | **已修** |

**Counts：** BLOCKER 0 / WARNING 0 / SUGGESTION 4（3 已修、1 待 P4）→ **Pass**

## 与 Spec / Design / ATDD 的一致性

| 检查 | 结论 |
|---|---|
| Requirement → 任务覆盖 | Pass：14/14 Requirement 有任务落点（§1 表）；无孤儿任务（19/19 指向 Delta） |
| 场景 → 任务覆盖 | Pass：A1–A38 / C1–C13 / U1–U10 共 61/61 命中（§2 表）；U1–U7 以既有回归验收，U8–U10 在 T4 新增 |
| ATDD 分层约束 | Pass：每片先写失败 API / E2E（T1、T10、T13、T18），纯逻辑单测与 ATDD 的 6 组 defer UT 一一对应（§3 表） |
| 契约先行 | Pass：T1 是 T6 / T11 / T14 / T15 的前置；`OpenApiTest` 作为首个门禁 |
| 状态机与事务 | Pass：T3 覆盖五条合法迁移与到期落库；T11 覆盖条件更新 + 单事务回滚；T15 覆盖并发 `join` / `close` |
| 账号守卫 | Pass：T5 明确六个写入口与两档 scope（`BUSINESS` / `SUPPORT`），并保留既有读路径 |
| 隐私与数据保留 | Pass：T9 资料页只展示理由与解封时间；T14 `listMine` 排除备注 / 处理人 / 处罚；T19 断言处罚前后计数不变 |
| 迭代切分 | Pass：迭代 1（S19 / S20，T3–T10）、迭代 2（S21 / S22，T11–T13）、迭代 3（S23 / S24，T14–T18）与故事点数 6 / 8 / 8 对齐 |
| 任务可执行性 | Pass：每条含动作、验证命令、覆盖场景；估算 1.5–2h，无超 2h 任务 |
| 收口与回归 | Pass：T19 覆盖后端全量、前端 test / typecheck / build、E2E 全量、三档视口 × 2 主题、契约 diff |
| 并行 WIP 隔离 | Pass：任务清单不含 `profile.spec.ts` 底部 hunk、`tripMessages.ts`、`ProfileSetupPage.tsx`、`AppShell.tsx` 未提交改动与未跟踪 V16；T9 只改 `ProfilePage.tsx` |
| 交付凭据边界 | Pass：`admin / admin12345` 只在 T19 的 `p4-verify.md` 登记，不进规格 / 前端 / i18n / 迁移注释 |

## 残余风险

- **T1 契约面大于迭代 1 实现面。** 迭代 1 合并时 `OpenApiTest` 会通过而部分端点尚未实现；PR 必须按 TT-04 标注，G2 复核时以「端点 × 任务」表核对，不能只看契约测试。
- **T2 与 T19 依赖干净的迁移链。** 本地未跟踪的 `V16__normalize_demo_user_profiles.sql` 不清理，迁移测试与全量回归都会失败；这是环境前置，已在 `tasks.md`「前置」登记。
- **总工时高于故事点数。** 37.5h 对 22 点（含测试与联调）；若排期按点换算，需在迭代计划里显式说明差额来源，避免被误读为范围膨胀。
- **T9 触及 `ProfilePage.tsx`。** 该文件不在并行 WIP 列表内，但同目录的 `ProfileSetupPage.tsx` 有未提交改动；P4 合并前需再次确认不产生交叉 diff。

## 下一步（非 Gate）

- P4：按 T1 → T2 → 迭代 1 → 迭代 2 → 迭代 3 → T19 执行；每片先 red 再 green，验证命令与 `atdd-design.md` §4 一致。
- P5：按提案归档顺序执行，先 `add-user-profile` 再本 change；归档后复核 `openspec/specs/user-auth/spec.md` 与 `refine-safety-report` 的交叉引用。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 状态 |
|---|---|---|---|---|
| `tasks.md` | 工件 1 | Jacky（AO，当前开发） | 2026-11-17 | 已批准 |
| `tasks.md` | 工件 2 | Karena（SA） | 2026-11-17 | 已批准 |
| 本报告 | 报告 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| 本报告 | 报告 2 | Jacky（AO，当前开发） | 2026-11-17 | 已批准 |

> 按 `@rule:artifact-review-gate`，`tasks.md` 已由「当前开发者 + 一位既非当前开发者亦非 WAYNE 的成员」联签，本报告已由 WAYNE + 当前开发者联签（均 2026-11-17，发起人确认）。P3 工件全部签齐，P4 解锁。