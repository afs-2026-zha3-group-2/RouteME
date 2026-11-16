# tasks 评审报告 — refine-experience-share

- **工件：** `openspec/changes/refine-experience-share/tasks.md`
- **change-id：** `refine-experience-share`
- **评审日期：** 2026-11-16
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:web-testing`、`@rule:git-commit-conventions`）
- **评审输入：** `tasks.md`；`design.md`（D1–D9）；`atdd-design.md`（E1–E12 / U1–U4）；`specs/trip-experiences/spec.md`；`docs/sdd/README.md`（阶段提交约定）；现有 `frontend/src/**/*.test.ts` 与 `e2e/tests/experiences.spec.ts`

## 评审结论

**Pass**

7 条任务按层拆分（frontend ×4、e2e ×1、回归 ×1、docs ×1），每条都有验证命令与依赖；无契约任务（本次不改契约），因此「契约先于两端」不适用且已显式说明。无 BLOCKER；3 条 SUGGESTION 在 P4 收口。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| T-01 | SUGGESTION | `@rule:web-testing` | T2 验证 | `npm test -- shareEligibility` 依赖 vitest 的过滤参数；仓库现有脚本是 `vitest run`，过滤应写成 `npx vitest run src/experiences/shareEligibility.test.ts` | P4 执行时用显式文件路径，避免参数被忽略跑全量 | `frontend/package.json` `"test": "vitest run"` |
| T-02 | SUGGESTION | `@rule:spec-first` | T5 | 「新增两个用例」与「改造既有用例」混在一行，P4 提交时不易核对 | P4 在验证报告里按用例名列改动清单 | `atdd-design.md` §4 |
| T-03 | SUGGESTION | `@rule:git-commit-conventions` | 全表 | 未写阶段提交信息 | P4 提交用 `feat(p4): refine-experience-share add share page guidance and built-in cover`（本仓库阶段提交扩展） | `docs/sdd/README.md` 提交约定 |

## 一致性检查

| 检查 | 结论 |
|---|---|
| 每条 Delta Requirement 至少 1 任务 | R1 → T2 / T3 / T5；R2 → T1 / T3；R3 → T1 / T3 / T5 |
| 一任务一层 | 通过 |
| 任务与设计决策可追溯 | T1→D3/D4、T2→D5、T3→D1/D2/D6/D8、T4→D5、T5→D8/D9、T6→D7、T7→D9 |
| 任务与 ATDD 场景可追溯 | T2→U1–U4、T3→E10/E11/E12、T5→E1–E9 |
| 是否含 out-of-scope | 否 |
| 是否有验证命令 | 全部有 |

## 残余风险

- T5 的 E2E 依赖种子行程日期（行程 3 = 2026-11-16 当天）；若在其它日期执行，「未结束」用例需改用动态创建的行程。
- T6 的全量 E2E 未纳入 CI，回归依赖本地执行。
- T7 的人工走查依赖本地前后端同时运行。

## 批准记录

- **批准人：** Neal（VL，审批）＋ Jay（AO，作者确认）
- **批准时间：** 2026-11-16T16:40+08:00
- **批准来源：** 用户在 2026-11-16 会话中确认「批准 design.md 与 tasks.md」
- **批准范围：** 批准 `tasks.md` 进入 P4 实现；T-01 ~ T-03 留待 P4 收口。

## 变更摘要（2026-11-16）

- **修订类型：** 格式（不改变语义）——`tasks.md` 由表格改为仓库既有的 `### T<n> [layer]` + `- [x]` 复选框结构，使 `openspec validate --strict` 能统计任务（此前报 `This change counts as 0 tasks`）。
- **内容不变：** T1–T7 的范围、落点、依赖、验证命令与自检结论完全一致；每条任务的 `**验证：**` / `**覆盖：**` 行补自原表「验证」「ATDD」两列。
- **复验：** `openspec validate refine-experience-share --strict` → `Change 'refine-experience-share' is valid`；`openspec list` → `refine-experience-share ✓ Complete`。
- **批准仍有效：** Neal + Jay，2026-11-16T16:40+08:00。