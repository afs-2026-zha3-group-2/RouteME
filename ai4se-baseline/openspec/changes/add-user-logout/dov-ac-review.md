# AC / DoV review — add-user-logout

- **Change:** `add-user-logout`（`user-auth` MODIFIED，REQ-006）
- **Reviewed artifact:** [`specs/user-auth/spec.md`](specs/user-auth/spec.md)（1 Requirement / 10 Scenario；MODIFIED）
- **Inputs:** [`proposal.md`](proposal.md)、`requirement-workspace/requirements/REQ-006-user-logout.md`、`requirement-workspace/impact-brief.md` §10、`requirement-workspace/deep-dive.md`「REQ-006 增补」、`openspec/specs/user-auth/spec.md`（Living Spec 基线）
- **Timestamp:** 2026-11-16T10:52+0800
- **Reviewer:** opencode（AI agent）
- **Tooling:** `openspec validate add-user-logout --strict` → valid

## AC review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 Each requirement has at least one testable AC | Pass | `specs/user-auth/spec.md`「会话校验与退出」→ 10 Scenario | 3 个既有会话场景（有效 token / 无效或过期 / 退出登录）+ 7 个退出扩展场景（演示身份退出、入口可见、失败降级、刷新、重新进入、重复触发、身份门无入口） |
| AC-2 ACs are observable | Pass | 场景断言可见结果：回到身份门、入口可见、无网络请求、刷新后状态、页面内容归属、401 | 无「正常工作 / 快速 / 正确」类空泛表述 |
| AC-3 Negative / edge cases called out | Pass | Scenario「结束会话失败仍完成本地退出」「重复触发退出」「身份门不展示退出入口」 | 高风险边界齐全；「无效或过期 token」覆盖会话失效 |
| AC-4 ACs are not disguised implementation detail | Pass | Scenario「演示身份退出当前身份」写「不发起认证请求」、Scenario「退出登录」写「同一 token 再次请求返回 401」 | 表述为可观察行为与契约结果，未指定组件、状态库或请求库 |

## DoV review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 Scope matches proposal | Pass | `proposal.md` §范围 7 条 in-scope ↔ 10 Scenario；§Out of scope 无对应需求 | 无静默扩张：未加入二次确认、自动过期、多设备会话、账号注销；MODIFIED 未丢弃基线场景 |
| DoV-2 Ambiguities listed or resolved | Pass | 下方「规格解释裁决 1–6」 | 无未决 blocking 歧义 |
| DoV-3 Role concerns noted for residual risk | Pass | 下方「残余风险」 | 含 IO（失败提示文案）/ SA（MODIFIED 覆盖范围复核） |
| DoV-4 No business implementation claimed done | Pass | 本 change 仅改 Delta Spec；仓库已有注册账号退出代码仅作为现状证据 | `proposal.md` §交付边界明确 P1/P2 不含实现 |
| DoV-5 Requirements trace to proposal / approved requirements | Pass | 下方「需求映射」9/9 + 「基线保留」3/3 | REQ-006 §4 九条场景全部有 Delta 落点；Living Spec 3 个既有场景保留 |

**Blocking gaps:** 无。G1-ready from the review's perspective.

## Requirement mapping（REQ-006 §4 → Delta Spec）

| REQ-006 场景 | Delta Scenario | 覆盖判定 |
|---|---|---|
| #1 注册账号退出登录 | 「退出登录」 | 完整（含会话删除 204 与 token 失效 401） |
| #2 演示身份退出当前身份 | 「演示身份退出当前身份」 | 完整（本地清态、不发请求、身份门保留 3 身份） |
| #3 退出入口对所有身份可见 | 「退出入口对所有身份可见」 | 完整（含键盘可聚焦并触发） |
| #4 退出后到达身份门 | 「退出登录」/「演示身份退出当前身份」/「身份门不展示退出入口」 | 完整（身份门 3 演示身份 + 登录 / 注册入口） |
| #5 刷新不恢复上一身份 | 「退出后刷新不恢复身份」 | 完整 |
| #6 结束会话失败仍完成本地退出 | 「结束会话失败仍完成本地退出」 | 完整（含可选提示、不阻断） |
| #7 退出后可再次进入 | 「退出后可重新进入」 | 完整（不残留上一身份归属） |
| #8 身份门不展示退出入口 | 「身份门不展示退出入口」 | 完整 |
| #9 重复触发退出 | 「重复触发退出」 | 完整（保持身份门、不报错、不恢复） |

## Living Spec 基线保留（MODIFIED 覆盖检查）

| `openspec/specs/user-auth/spec.md` 既有场景 | Delta Scenario | 判定 |
|---|---|---|
| 用有效 token 读取当前用户 | 同名场景 | 原样保留 |
| 无效或过期 token | 同名场景 | 原样保留 |
| 退出登录（删除会话 204、token 失效 401） | 「退出登录」 | 保留并补充「清除本地会话与当前身份并返回身份门」，未削弱原断言 |

除上述 3 个场景外，基线 Requirement 正文的会话语义（不透明随机 token、校验有效性与过期时间、退出后 token 不再被接受）在 Delta 正文中全部保留。

## Proposal → Delta 覆盖

| Proposal In scope | Delta 落点 |
|---|---|
| 菜单对两类身份展示退出入口 | Scenario「退出入口对所有身份可见」 |
| 注册账号退出（结束会话、清本地、回门） | Scenario「退出登录」 |
| 演示身份退出（纯本地） | Scenario「演示身份退出当前身份」 |
| 结束会话失败仍本地退出 | Scenario「结束会话失败仍完成本地退出」 |
| 退出后刷新不恢复、身份门可用 | Scenario「退出后刷新不恢复身份」「退出后可重新进入」「身份门不展示退出入口」 |
| 身份门 / 未进入不展示退出入口 | Scenario「身份门不展示退出入口」 |
| `user-auth` MODIFIED delta | `specs/user-auth/spec.md`（`## MODIFIED Requirements`） |

## 规格解释裁决

1. **MODIFIED 而非 ADDED。** `add-user-auth` 已于 2026-11-16 归档，`openspec/specs/user-auth/spec.md`「会话校验与退出」是唯一权威基线。本 change 用 MODIFIED 整体替换该 Requirement 块，并原样保留其 3 个既有场景；这样退出只有一处权威描述，不需要再依赖两个 change 的归档顺序。
2. **「退出登录」是 UI 文案，「会话校验与退出」是需求名。** 需求名描述能力（会话校验 + 退出），菜单沿用既有文案 `authLogout`；两者并存不视为不一致。
3. **演示身份退出不调用认证接口。** 演示身份没有服务端会话；发出请求只会得到 `SESSION_INVALID`，并把「本地退出」错误地表现为网络失败。
4. **结束会话失败不阻断退出。** 用户意图是结束本机身份；服务端不可用时必须仍清本地状态，提示只能是附加信息。
5. **退出后落到身份门，而不是登录表单。** 身份门同时提供 3 个演示身份与登录 / 注册，避免强制单一进入方式。
6. **入口可见性以「已进入系统」为前提。** 身份门属于未进入状态，不渲染顶栏，也不存在退出入口；重复触发只要求幂等保持身份门。

## 残余风险

| 风险 | Owner | 说明 |
|---|---|---|
| `add-user-auth` 归档 `tasks.md` T6 仍写「演示身份不显示退出」 | AO | 归档正文是历史快照，不改写；由本 change 的 `summary.md` / G3 记录已被「退出入口对全身份可见」取代 |
| 演示身份退出与失败降级尚无自动化测试 | AO | 现有前端测试只覆盖注册 / 登录表单；Apply 阶段补组件或 E2E 断言 |
| 失败提示文案未固定 | IO | 需求只要求「可提示」；P3 设计阶段确定文案，不得让提示改变「已退出」主状态 |
| token 存在 `localStorage` | SA | 继承 `add-user-auth` 的既有取舍；本 change 不改变存储形态 |

## Next

- 进入 `/sdd:g1-decision-record`（Delta Spec + 本评审 + `consistency-lint.md` 作为输入）。
- 本评审不是 Gate 决策，也不代表实现已完成。