# G1 decision — add-user-auth

- **Gate：** G1（Align）
- **Change：** `add-user-auth`（`user-auth` ADDED + `trip-plans` MODIFIED；支撑 change，无独立 REQ 行，被 REQ-006 / REQ-008 依赖）
- **Timestamp：** 2026-11-16T14:01+0800（补记）
- **Status：** **Pending** — 补记已就位，尚无具名签署人；结论留空待签
- **Recorded by：** opencode（AI agent），按用户 2026-11-16「把归档前漏掉的 G1/G2 补回来」指令整理，未代填开发者姓名

> **补记说明：** 本 change 于 2026-11-16 归档（提交 `229411a`）时未产出 G1 / G2 决策记录，`git log --all` 确认这两个文件从未存在。本文件与 [`g2-decision.md`](g2-decision.md) 依据 change 自身产物、当日本地验证报告与 GitHub Actions 运行记录**追溯补记**，不是当时会议的原始纪要。
>
> **解档说明：** 用户 2026-11-16 选择先**把本 change 从 `openspec/changes/archive/2026-11-16-add-user-auth/` 解档**回 `openspec/changes/add-user-auth/`，再补写门禁记录（归档目录视为不可改写）。**Living Spec 的合并结果不变**：`229411a` 已把两份 Delta 合并进 `openspec/specs/user-auth/spec.md` 与 `openspec/specs/trip-plans/spec.md`，因此本 change 再次归档时是 **spec no-op**（不产生新的规格差异）。

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | 问题、In/Out scope、影响面、4 条决策、6 条验收信号齐全；能力记为 `user-auth` ADDED + `trip-plans` MODIFIED；规模 M |
| Delta Spec — `user-auth` | [`specs/user-auth/spec.md`](specs/user-auth/spec.md) | ADDED 4 Requirement / 10 Scenario：注册账号、用户名密码登录、会话校验与退出、演示身份保留 |
| Delta Spec — `trip-plans` | [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md) | MODIFIED 1 Requirement / 4 Scenario：演示身份进入与切换 |
| Living Spec 基线 | `openspec/specs/trip-plans/spec.md`「演示身份进入与切换」 | 归档前后场景名 4/4 一致（选择演示身份进入系统 / 注册或登录进入系统 / 演示中切换身份 / 已登录账号退出），正文按注册 / 登录 / 退出扩展 |
| Design | [`design.md`](design.md) | 6 节：数据模型、后端分层、业务规则、前端流程、契约、测试策略 |
| Tasks | [`tasks.md`](tasks.md) | T1–T8 全部 `[x]`，每项附验证命令；T8 记录归档日复跑结果 |
| AC / DoV review | 无（`dov-ac-review.md` 从未产出） | 补记按 `proposal.md` 验收信号逐条对照 Delta 场景，见 §Findings 追溯行 |
| Consistency lint | 无（`consistency-lint.md` 从未产出） | 跨 change 冲突见 §Findings 冲突行 |
| Requirements / Intent | 无 | 本 change 由用户指令直接立项（`proposal.md` §需求来源），未走 `requirement-workspace` 意图 / Ready 条目 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 proposal 一致：账号凭据（V9 两列 + 唯一索引）、注册 / 登录 / 会话 / 退出 4 个端点、真实账号与 3 个演示身份并存、契约 0.6.0；业务端点仍用 `X-User-Id`、找回密码、验证码、第三方登录、头像上传明确 out of scope | `proposal.md` §范围 / §影响面 / §决策 |
| Ambiguity | 无未决歧义：密码用 PBKDF2-HMAC-SHA256（16 字节盐 / 12 万次迭代）、会话用数据库不透明 token（7 天）、演示账户凭据为空因而不可密码登录、退出即删除会话 | `proposal.md` §决策；`design.md` §1–§3 |
| Conflict | 无阻塞冲突。`user-auth` 的「会话校验与退出」与「注册账号」两块随后分别被 `add-user-logout`（REQ-006）与 `add-user-profile`（REQ-008）以 MODIFIED 方式接续，两者都以本 change 的归档产物为基线，编号与能力归属互不重叠 | `openspec/changes/add-user-logout/g1-decision.md`「In-flight dependency」；`openspec/specs/user-auth/spec.md` |
| Traceability | 6 条验收信号全部有 Delta 落点：①注册成功 / 重复用户名 / 非法用户名 / 非法密码；②正确凭据登录 / 错误密码 / 演示账户不能密码登录；③用有效 token 读取当前用户 / 无效或过期 token；④退出登录；⑤演示身份进入 / 注册或登录进入系统 / 演示中切换身份 / 已登录账号退出；⑥T8 全量验证 | `proposal.md` §验收信号 ↔ 两份 Delta Spec；`tasks.md` T8 |
| Residual risk | 业务端点仍信任 `X-User-Id`（token 只用于身份恢复）；并发注册唯一性依赖数据库唯一索引；`auth_sessions` 过期行无主动清理；token 存 `localStorage`；浏览器走查部分依赖临时 mock API；无 E2E 用例 | `proposal.md` §残余风险；[`summary.md`](summary.md) §Residual risks；`docs/ai4se-plugins/20261116-101702-local-verify-report.md` §5–§6 |

## Decision

**Pending（待具名签署）**

补记只陈述上述事实与证据，不预填裁定语。待开发者与签署人具名确认后，在本节写入 `Pass` / `Conditional` / `Fail` 并追加签署时间。

## Conditions + owners

| 项 | Owner | 处理时机 |
|---|---|---|
| 业务端点从 `X-User-Id` 切换到 token 鉴权（拦截器解析 Bearer） | 待指派（待具名） | 另立 change（proposal §残余风险） |
| 并发注册的用户名冲突映射为 `USERNAME_TAKEN`（当前靠唯一索引兜底） | 待指派（待具名） | 后续迭代 |
| 找回密码 / 邮箱手机验证 / 验证码 / 第三方登录 / 账号注销保持 out of scope | 待指派（待具名） | 已记录，无需动作 |
| change 正文（`summary.md`、`HANDOFF.md`、`tasks.md` T6）中「演示身份不显示退出登录」等表述已被 `add-user-logout` 取代；本文件不改写这些正文 | 待指派（待具名） | 由 `add-user-logout` 在 P5 / G3 收口（该 change G1 条件 L-01） |
| 本 change 无 `dov-ac-review.md` / `consistency-lint.md`，补记以验收信号对照替代；此后新建 change 一律补这两份产物 | 待指派（待具名） | 已在本文件说明，后续按标准流程 |
| 本 change 的 4 份工件无 `docs/reviews/<yyyymmdd>-add-user-auth-<artifact>-review.md`：`@rule:artifact-review-gate` 于 2026-11-16 当日稍后引入，本 change 的 proposal / 两份 Delta Spec / design / tasks 均已在此之前产出 | 待指派（待具名） | 追溯豁免；此后新建或修改工件按该规则逐份评审 + approve |

## Approvers

| 角色 | 姓名 | 签署时间 |
|---|---|---|
| IO | — | — |
| SA | — | — |
| AO（当前开发） | — | — |
| VL | — | — |
| SM | — | — |

按 `docs/knowledge/rules/documentation/rules.md`「记录人与签署人」：签署人 MUST 是当次实际开发者与对应角色的具名负责人，不得用名册默认值或角色词占位。本 change 的开发者姓名未从发起人处取得，因此本节留空，`Status` 保持 **Pending**。

## 归档状态

- 2026-11-16 曾归档于 `openspec/changes/archive/2026-11-16-add-user-auth/`（提交 `229411a`），同日**解档**回 `openspec/changes/add-user-auth/`，以便在可编辑目录中补写本文件与 [`g2-decision.md`](g2-decision.md)。
- Delta 已随 `229411a` 合并进 Living Spec，**再次归档不再产生规格差异**；归档动作仅为目录搬运与索引更新。
- P3 / P4 已执行完毕（`design.md`、`tasks.md`、实现提交 `f5e984c`），验证结论见 [`g2-decision.md`](g2-decision.md)。