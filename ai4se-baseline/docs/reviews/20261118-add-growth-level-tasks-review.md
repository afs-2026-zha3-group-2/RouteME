# Artifact review — add-growth-level / Tasks

- **Verdict: Pass**
- **Scope:** focus=tasks（`@rule:artifact-review-gate` 的 P3 任务评审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review：** [`tasks.md`](../../openspec/changes/add-growth-level/tasks.md)（1.1–1.12 + 覆盖自检 + Alignment self-check 10/10）
- **Supporting inputs：**
  - [`design.md`](../../openspec/changes/add-growth-level/design.md)（D1–D14）
  - [`atdd-design.md`](../../openspec/changes/add-growth-level/atdd-design.md)（A1–A26 / E1–E8 / R1–R4）
  - Delta 9 Requirement / 41 Scenario；G1 `g1-decision.md`（C1 / C2）

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| S-1 | SUGGESTION（保留） | `rules/documentation/rules.md#sdd-artifacts` | 1.5 | 单任务同时承接发布 / 点赞 / 举报三处挂接与三套 API 用例，体量最大 | P4 按发布 → 点赞 → 举报分三批提交，便于定位与回滚 | [fact] |
| S-2 | SUGGESTION（保留） | `rules/documentation/rules.md#sdd-artifacts` | 1.9 | 6 处展示面与走查同任务；跨页面改动一次完成难以定位视觉回归 | 先做 `ProfilePage` / `ProfileModal`，再做四处列表；每批各自对照原型走查 | [inference] |
| S-3 | SUGGESTION（保留） | `rules/process/rules.md#tdd-cycle` | 1.3 | 迁移回填依赖 `INSERT OR IGNORE` 的方言兼容，H2 可能需要测试库改用 SQLite | 若改测试库，需在 p4-apply 偏差记录登记，并保留 SQLite 迁移测试为权威 | [inference] |
| S-4 | SUGGESTION（保留） | `rules/process/rules.md#tdd-cycle` | 1.10 | 反向 R3「不改动信用账本」在 E2E 无 DB 观测手段 | R3 由 API 层账本对照用例承接（`GrowthLedgerApiTest`），E2E 只断言 UI 与 404 / 405 | [inference] |
| S-5 | SUGGESTION（保留） | `rules/architecture/rules.md#api-contract` | 1.2 | `GET /users/growth` 与既有 `/users/credits` 的入参 / 上限 / 错误码需保持同构 | 1.2 先写 `OpenApiTest` 断言 50 上限与缺参 400 后再实现 | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5 → **Pass**

## 对齐自检复核

| # | 检查 | 复核 | 说明 |
|---|---|---|---|
| 1 | Requirement → 任务 | Pass | 9 / 9 Requirement 均有承接（覆盖自检表） |
| 2 | ATDD 场景 → 任务 | Pass | A1–A26、E1–E8、R1–R4 全覆盖 |
| 3 | 任务不越界 | Pass | 无明细页 / 排行榜 / 通知 / 管理端 / 回填 / NFR |
| 4 | Design 决策落点 | Pass | D1–D14 均有任务 |
| 5 | 契约 / 迁移先行 | Pass | 1.2 / 1.3 先于 1.4–1.10 |
| 6 | 原型先行 | Pass | 1.1 已完成，1.9 对照 1.1 |
| 7 | G1 C1 / C2 | Pass | C1 → 1.5 / 1.10；C2 → 1.6 / 1.9 / 1.10 |
| 8 | 历史数据 / 回归 | Pass | 1.3 不回填 + 1.5 既有三套件回归 |
| 9 | 末项为验证 / 回归 | Pass | 1.11 门禁；1.12 仅记录 |
| 10 | 单任务体量 | Pass（带注记） | 1.5 / 1.9 偏大，按 S-1 / S-2 分批执行 |

**Conclusions:** 对齐自检 10/10 Pass；任务可执行、可验证、无越界。

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 契约 → 迁移 → 后端内核 → 事件挂接 → 读取 → 并发 → 前端，依赖顺序正确 |
| B Quality | N/A | P3 无实现 |
| C Testing | Pass | 每个任务有验证方式；门禁独立成项；反向用例有落点 |
| D Security | Pass | 无写端点、字段级可见性、批量上限均在 1.2 / 1.6 承接 |
| E Process | Pass | 12 任务均在 Spec 范围内；G1 条件有承接 |
| F Documentation | Pass | 1.12 覆盖 P4 记录与台账 |
| G Traceability | Pass | 任务 → Delta Scenario 标题 → Requirement 可追；REQ 编号不入任务正文（L-04） |

## Residual risks

- 1.5 / 1.9 体量偏大，失败时定位成本高；按 S-1 / S-2 分批。
- E2E 依赖隔离库与 8081 / 5174 端口；需按既有脚本启动，避免污染开发库。
- 契约 / 迁移号被占时需顺延，1.2 / 1.3 的验证需重跑。
- R3 的账本对照依赖 API 层观测（S-4）。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| `tasks.md` | 1 / 2（当前开发者） | Jay | 2026-11-18 |
| `tasks.md` | 2 / 2（非当前开发者、非 WAYNE） | Karena | 2026-11-18 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE | 2026-11-18 |
| 本评审报告 | 2 / 2（当前开发者） | Jay | 2026-11-18 |
