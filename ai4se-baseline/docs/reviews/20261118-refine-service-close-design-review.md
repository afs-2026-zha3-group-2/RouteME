# Artifact review — refine-service-close / Design

- **Verdict: Pass**
- **Scope:** focus=`design.md`（`@rule:artifact-review-gate` 的设计评审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review:** [`design.md`](../../openspec/changes/refine-service-close/design.md)（状态机 / V30 / 契约 0.25.0 / 前后端设计 / T1–T12）
- **Supporting inputs:**
  - [`specs/customer-service/spec.md`](../../openspec/changes/refine-service-close/specs/customer-service/spec.md)（ADDED 3 Requirement / 31 Scenario）
  - [`proposal.md`](../../openspec/changes/refine-service-close/proposal.md)
  - [`atdd-design.md`](../../openspec/changes/refine-service-close/atdd-design.md)
  - [`g1-decision.md`](../../openspec/changes/refine-service-close/g1-decision.md)（Pass，IO=WAYNE / SA=Jacky）
- **Evidence:**
  - `openspec validate refine-service-close --strict` → `Change 'refine-service-close' is valid`
  - 状态机：`design.md` §3 的 6 条迁移与 Delta「会话状态机与留痕」逐条对应（M1–M6）
  - 契约排他：`origin/main@9a13fe4` 的 `openapi.yaml` = 0.24.0、迁移头 = `V29__credit_exit_application.sql`；本设计取 0.25.0 / V30
  - 数据：`V30` 仅 `ALTER TABLE ... ADD COLUMN`（`resolved_at` / `resolved_by`），SQLite / H2 无方言差异
  - 权限：用户 close 走 `authService.requireUser`，管理端 resolve 走 `adminPrincipalService.requireAdmin`；非本人 404、缺 Bearer 401
  - 并发：close / resolve 均为条件更新（CAS）；消息回迁与插入同事务（T1 / T2 / T4）
  - 影响面：`detail` / `summary` 字段、`openSession` 三态、概览零填充常量、前端 7 个文件均有落点

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（保留） | `rules/quality/rules.md#prototype-ui-alignment` | `design.md` §11 | 无客服会话原型，本 change 不新增原型；视觉沿用既有 `help-chat` / `admin-service` | P4 走查三档视口 × 两主题，确认「结束会话」与「标记处理完成」不引入新视觉模式 | [inference] |
| F-2 | SUGGESTION（保留） | `rules/process/rules.md#spec-first` | `design.md` §5.4 | 消息回迁的 CAS 失败分支需要「重读后判 `CLOSED`」，实现时若省掉重读会把消息写进已关闭会话 | T4 的测试必须包含「关闭瞬间发言」的并发/顺序用例（先 close 再发言即可覆盖 409） | [fact] |
| F-3 | SUGGESTION（保留） | `rules/process/rules.md#artifact-review-gate` | `design.md` §5.7 / §6.3 | `resolved_by` 不下发导致管理端也看不到「谁标记的」；Delta 只要求 `resolved_at`，可接受 | 若 IO 后续需要展示操作人，另开 change 改 Delta 与契约 | [fact] |
| F-4 | SUGGESTION（保留） | `rules/process/rules.md#spec-first` | `design.md` §6.2 | `SupportPage` / `ServiceChat` 的 `statusHint` 抽到 `helpStatus.serviceChatHint` 属小幅重构 | 保持纯函数、无副作用；单测覆盖四态 | [inference] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 4（全部保留）→ **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 单一状态机真源（§3）；所有写路径用条件更新；不新增服务 / 表 |
| B Quality | Pass | 迁移仅加列；无新依赖；无新色值 / 魔法像素 |
| C Testing | Pass | 设计逐项可映射到 ATDD 的 API / E2E 层；并发与闭集外迁移有明确断言 |
| D Security | Pass | 用户只能结束本人会话（404）；客服无结束接口；`resolved_by` 不下发；封禁用户复用 `ACCOUNT_BANNED` |
| E Process | Pass | G1 后唯一增补（概览四桶）已在 `g1-decision.md` 留痕；契约 / 迁移排他已复核 |
| F Documentation | Pass | 状态机表、端点表、字段表、文案表、决策 T1–T12 齐备；无绝对机器路径 |
| G Traceability | Pass | Delta 31 场景 → 设计 §3–§6 均有对应；概览分桶对应 S9 |

## Residual risks

- `customer-service` 未进 Living Spec；P5 归档顺序 MUST 为 `add-admin-console` → 本 change。
- 契约 / 迁移号仍可能被并行 change 抢占；P4 前置任务已要求开工前复核。
- 旧前端 bundle 对 `RESOLVED` 无文案映射；本 change 前后端同批发布，不做版本协商。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `design.md` | 1 / 2（当前开发者） | Lewis Liu | 2026-11-18 | 发起人当次会话确认「四份全部批准」 | 状态机 / V30 / 契约 0.25.0 / T1–T12 |
| `design.md` | 2 / 2（非当前开发者且非 WAYNE） | Jacky（SA） | 2026-11-18 | 发起人当次会话确认（第二签署人 = Jacky） | 同上 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话确认「四份全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-18 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
