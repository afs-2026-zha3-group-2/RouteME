# AC / DoV review — refine-service-close

- **Change:** `refine-service-close`（`customer-service` ADDED）
- **Phase:** p2
- **Delta:** `openspec/changes/refine-service-close/specs/customer-service/spec.md`（3 Requirement / 31 Scenario；P3 开工前增补 1 条概览分桶场景）
- **Requirements:** `requirement-workspace/requirements/REQ-028-service-close.md`（36 场景）
- **Timestamp:** 2026-11-18T10:30+08:00
- **Tooling:** `openspec validate refine-service-close --strict` → `Change 'refine-service-close' is valid`

## Verdict

**AC 4/4 Pass；DoV 5/5 Pass；映射 36/36 有落点；Delta 31 条无孤儿（含 P3 开工前增补的概览分桶场景）。**

## AC

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条 Requirement 至少一个可测 AC | Pass | Delta 3 条 Requirement 分别有 9 / 11 / 11 条 Scenario | 最小 9 条，无空 Requirement |
| AC-2 AC 可观察 | Pass | 状态值、`resolved_at` / `resolved_by`、`closed_at` / `closed_by`、HTTP 404 / 409 / 401、徽标计数、按钮可见性 | 无「工作良好」「适当」类措辞 |
| AC-3 高风险负向 / 边界已列出 | Pass | 非本人结束、未登录、重复结束、非处理中标记、重复标记、已结束发言、非法迁移、旧路径 404 | 覆盖权限、幂等与状态闭集 |
| AC-4 不伪装实现细节 | Pass | 场景只写行为与字段，未指定类名 / SQL / 组件内部结构 | `resolved_at` / `resolved_by` 为数据契约，已在 deep-dive 定 |

## DoV

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与提案一致 | Pass | proposal §What Changes 7 条 ↔ Delta 3 Requirement；Out of Scope 6 条无对应 Requirement | 无静默扩范围 |
| DoV-2 歧义已列出或解决 | Pass | Ready §8：blocking 0；non-blocking OQ-1（客服发言回迁）已在 M-2 按对称口径落成场景；OQ-2 / OQ-4 / OQ-5 / OQ-6 为 P3 文案与展示细节 | 无 blocking |
| DoV-3 IO / SA 残余关注已记录 | Pass | 见本文 §Residual risks；G1 需 IO + SA 具名签署 | — |
| DoV-4 未声称业务实现已完成 | Pass | 本阶段只评审 Delta，无代码改动 | — |
| DoV-5 Requirement 可追溯到提案 / 批准需求 | Pass | 3/3 Requirement 对应 proposal §What Changes；36/36 Ready 场景有落点（见下表） | — |

## Ready 36 场景 → Delta 31 场景映射

| Ready 场景 | Delta 场景 | 说明 |
|---|---|---|
| U-1 等待中可结束 | 等待接入时结束（取消排队） | 1:1 |
| U-2 处理中可结束 | 处理中结束 | 1:1 |
| U-3 待用户确认可结束 | 待用户确认时结束 | 1:1 |
| U-4 二次确认可取消 | 确认弹窗可取消 | 1:1 |
| U-5 只能结束本人会话 | 只能结束本人会话 | 1:1 |
| U-6 未登录拒绝 | 未登录不能结束 | 1:1 |
| U-7 重复结束被拒 | 重复结束被拒绝 | 1:1 |
| U-8 结束后可重新发起 | 结束后可重新发起 | 1:1 |
| A-1 处理中可标记完成 | 处理中标记完成 | 1:1 |
| A-2 等待中不可标记 | 非处理中不可标记 | A-2 与 A-4 合并 |
| A-3 待确认不可重复标记 | 重复标记被拒绝 | 1:1 |
| A-4 已结束不可标记 | 非处理中不可标记 | 与 A-2 合并 |
| A-5 留痕可追溯 / 用户端不展示操作人 | 用户看到待确认提示与结束入口 | MUST NOT 展示客服身份断言 |
| M-1 用户发言恢复处理中 | 用户发言恢复处理中 | 1:1 |
| M-2 客服发言恢复处理中 | 客服发言恢复处理中 | 1:1（OQ-1 默认对称） |
| M-3 待确认下消息可见 | 待确认下双方 3 秒可见 | 1:1 |
| D-1 三态都有结束入口 | 三个未结束状态都有结束入口 | P2 新增场景 |
| D-2 待确认提示 | 用户看到待确认提示与结束入口 | 1:1 |
| D-3 等待 / 处理中提示沿用 | 等待接入时结束 + 处理中结束 | 状态提示由既有 UI 承接 |
| D-4 结束后只读与重新发起 | 已结束不可发言 + 结束后可重新发起 | 拆到两条场景 |
| D-5 无结束入口泄漏 | 只能结束本人会话 + 未登录不能结束 | 管理端权限由既有路由承接 |
| G-1 移除结束按钮 | 管理端没有结束入口 | 1:1 |
| G-2 标记按钮仅处理中可见 | 标记完成按钮仅处理中可见 | P2 新增场景 |
| G-3 队列筛选四态 | 管理端筛选与待确认可见 | 1:1 |
| G-4 待接入徽标口径不变 | 待接入徽标不计入待确认 | 1:1 |
| G-5 待确认会话可见 | 管理端筛选与待确认可见 | 与 G-3 合并为一条场景 |
| S-1 合法迁移闭集 | 合法迁移闭集 | 1:1 |
| S-2 每用户最多一条未结束会话 | 每用户最多一条未结束会话 | 1:1 |
| S-3 current 覆盖待确认 | current 覆盖待确认 | 1:1 |
| S-4 恢复处理中清空留痕 | 恢复处理中清空留痕 | 1:1 |
| S-5 结束操作人只记用户 | 结束操作人只记用户 | 1:1 |
| S-6 已结束不可发言 | 已结束不可发言 | 1:1 |
| R-1 契约状态与字段 | 契约状态与字段一致 | 1:1 |
| R-2 管理端 close 下线 | 管理端 close 路径下线 | 1:1 |
| R-3 会话隔离不变量 | 客服会话与行程聊天隔离 | 1:1 |
| R-4 历史保留 | 历史会话保留 | 1:1 |
| （P3 增补）概览分桶 | 概览统计包含待用户确认分桶 | `add-admin-dashboard` 要求「不省略任何状态键 / 总数 = 分桶之和」；新增 RESOLVED 后必然要扩桶。用户 2026-11-18 确认 |

- **Delta 孤儿场景：** 无（31 条均可在 Ready、P2 UI 缺口修复或 `add-admin-dashboard` 口径延伸中找到来源）。
- **未映射 Ready 场景：** 无（36/36 有落点；5 组按上表合并）。

## Residual risks

| 风险 | 说明 | Owner |
|---|---|---|
| `customer-service` 未进入 Living Spec | 本 Delta 为 ADDED；归档 MUST 排在 `add-admin-console` 之后，并与其后 `refine-service-*` 增量协调 | Dev / SA |
| 契约 / 迁移号 | 暂定 0.25.0 + V30；P3 先查 `origin/main` 最大号再定稿 | Dev |
| 文案与排序 | 结束确认文案、`RESOLVED` 在队列中的排序位置待 P3（OQ-4 / OQ-6） | IO / SA |
| 客服发言回迁 | M-2 按对称口径落成；若 IO 改口径，需同步 Delta 与 E2E | IO |
| 原 issue 缺陷 | 管理端「点击没反应」不单独修复；按钮与接口删除后路径不存在 | Dev |

## 结论

Delta 与提案 / Ready 需求一致，无 blocking 缺口；满足 G1 输入条件。G1 结论由 IO + SA 具名签署，本文不做 Gate 决定。

**Post-G1 addendum（2026-11-18）：** P3 开工前复核既有概览契约时发现 `add-admin-dashboard` Delta 要求「不省略任何状态键 / 总数 = 分桶之和」，而 `AdminDashboardServiceSessions.by_status` 为三键且 `additionalProperties: false`；新增 `RESOLVED` 后必须扩桶。已补 1 条 Scenario（概览统计包含待用户确认分桶），Delta 30 → 31，用户（IO/SA 当次会话）确认选取「加待用户确认第四段」，`openspec validate --strict` 复跑 valid。
