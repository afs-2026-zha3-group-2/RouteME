# G1 decision — add-user-logout

- **Gate:** G1（Align）
- **Change:** `add-user-logout`（`user-auth` MODIFIED，REQ-006）
- **Timestamp:** 2026-11-16T10:57+0800
- **Recorded by:** opencode（AI agent），按 Jay（AO / current developer）2026-11-16「run the p2」指令记录

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | 问题、In/Out scope、影响面、决策与验收信号齐全；能力记为 `user-auth` MODIFIED |
| Delta Spec — `user-auth` | [`specs/user-auth/spec.md`](specs/user-auth/spec.md) | 1 Requirement / 10 Scenario；MODIFIED；`openspec validate add-user-logout --strict` valid |
| Living Spec baseline | `openspec/specs/user-auth/spec.md`「会话校验与退出」 | 同名 Requirement 存在（3 场景）；delta 保留全部基线场景 |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4/4 Pass；DoV 5/5 Pass；基线保留 3/3；无阻塞 |
| Consistency lint | [`consistency-lint.md`](consistency-lint.md) | Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 3 |
| Requirements | `requirement-workspace/requirements/REQ-006-user-logout.md` | §4 九条场景；§7 `user-auth` MODIFIED；§8 blocking OQ = 0；DoR BLOCKER = 0 |
| Intent | `requirement-workspace/intents/REQ-006-user-logout.md` | 候选能力 MODIFIED；Discovery Decision `Go` |
| Impact brief | `requirement-workspace/impact-brief.md` §10 | as-is 盘点、delta、blast radius、风险与拆分边界；已按 Living Spec 现状更新 |
| Deep-dive | `requirement-workspace/deep-dive.md`「REQ-006 增补」 | ①–④ 四表，A0 ⑨–⑫ 通过 |
| In-flight dependency | `openspec/changes/add-user-auth/` | 提供 `POST /api/auth/logout` 与会话契约；该 change 于 2026-11-16 解档补记 G1 / G2（Pending），其 T6 / design / summary 的历史表述由本 change 收口 |
| Implementation evidence | `frontend/src/shell/AppShell.tsx`、`frontend/src/App.tsx`、`frontend/src/identity/IdentityGate.tsx`、`frontend/src/api.ts` | 注册账号退出已实现；演示身份无出口；`logout()` 已能清本地状态 |
| Contract evidence | `RouteME/openapi.yaml` v0.6.0、`backend/.../controller/AuthController.java` | `POST /api/auth/logout` 返回 204；演示身份无会话 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-006 一致：顶栏菜单入口、注册账号退出、演示身份退出、失败降级、退出后状态；无新端点、无迁移、不改演示身份数量与切换 | `proposal.md` §范围；`dov-ac-review.md` DoV-1；`consistency-lint.md` p2-1 |
| Ambiguity | 无未决歧义：MODIFIED 替换既有「会话校验与退出」并保留 3 个基线场景、演示身份纯本地退出、服务端失败不阻断、退出落点为身份门、菜单文案「退出登录」 | `dov-ac-review.md` §规格解释裁决 1–6 |
| Conflict | 无阻塞冲突。原「两个 change 同时新增退出需求」（旧 L-01）随 `add-user-auth` 归档与 MODIFIED 改造消解；剩余为归档正文历史表述（T6 / design / summary）与本 Delta 相反，属提示项 | `consistency-lint.md` L-01；`openspec/specs/user-auth/spec.md` |
| Traceability | REQ-006 §4 九条场景 9/9 有 Delta 落点；Living Spec 3 个既有场景 3/3 保留；proposal In scope 7/7 有 Scenario 覆盖 | `dov-ac-review.md` §Requirement mapping / §Living Spec 基线保留 / §Proposal → Delta 覆盖 |
| Residual risk | 演示身份退出与失败路径尚无自动化测试；失败提示文案未固定；归档旧表述可能被误读；token 仍在 `localStorage`（继承既有取舍） | `dov-ac-review.md` §残余风险 |

## Decision

**Pass**

## Conditions + owners

| 项 | Owner | 处理时机 |
|---|---|---|
| 前端退出入口对注册账号与演示身份都渲染（不再依赖 `isAuthenticated`），并补键盘 / 无障碍名称 | AO（Jay） | P4 Apply |
| 补测试：演示身份退出不回退到登录表单、退出入口对两类身份可见、刷新不恢复、结束会话失败仍本地退出 | AO（Jay） | P4 Apply |
| P3 设计固定失败提示文案（「已退出本机，会话可能仍有效」）与菜单说明，确保提示不改变「已退出」主状态 | AO + IO | P3 `design.md` |
| P3 声明能力名「会话校验与退出」与 UI 文案「退出登录」的关系（lint L-02） | AO | P3 `design.md` |
| 归档合并前核对：Living Spec 合并后仍为 10 个场景、会话语义完整（lint L-03） | AO + SA | P3 `tasks.md` 收口任务 / G3 |
| `summary.md` / G3 记录归档 T6、`design.md` 第 74 行、`summary.md` 第 12 行的「演示身份不显示退出」已被本 change 取代；不改写归档正文（lint L-01） | BA | P5 / G3 |
| 二次确认、自动过期、多设备会话、账号注销保持 out of scope，不纳入本 change 回归断言 | BA | 已记录，无需动作 |

## Approvers

| 角色 | 姓名 |
|---|---|
| IO | Wanye |
| SA | Jacky、Karena |
| AO（当前开发） | Jay |
| VL | Neal |
| SM | Lewis |

签署来源：沿用 2026-11-15 归档 G1 记录与 2026-11-16 `refine-inspiration-home` G1 记录中用户提供的角色名单；用户于 2026-11-16 指示执行 `/sdd:p2`（含 G1）。若角色名单发生变更，以变更后的具名签署为准并在本文件更新。

## Next

- Decision = Pass → `/sdd:p3`（`/sdd:atdd-design` → `/sdd:task-plan` → `/sdd:quality-checklist`）。
- 3 条 SUGGESTION 分别落入 P3 `design.md` / `tasks.md` 与 P5 `summary.md`；无阻塞项。