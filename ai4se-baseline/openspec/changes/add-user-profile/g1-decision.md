# G1 decision — add-user-profile

- **Gate:** G1（Align）
- **Change:** `add-user-profile`（`user-profile` ADDED + `user-auth` MODIFIED，REQ-008）
- **Timestamp:** 2026-11-16T11:01+0800
- **Recorded by:** opencode（AI agent），按用户 2026-11-16「git commit and run P2」指令记录

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | 问题、In/Out scope、影响面、决策与验收信号齐全；能力记为 `user-profile` ADDED + `user-auth` MODIFIED |
| Delta Spec — `user-profile` | [`specs/user-profile/spec.md`](specs/user-profile/spec.md) | 7 Requirement / 24 Scenario（G1 点数；G2 前追加 2 个「其他职业自填」场景，现为 26）；ADDED；`openspec validate add-user-profile --strict` valid |
| Delta Spec — `user-auth` | [`specs/user-auth/spec.md`](specs/user-auth/spec.md) | 1 Requirement / 6 Scenario；MODIFIED「注册账号」；保留 4 个基线场景 |
| Living Spec baseline | `openspec/specs/user-auth/spec.md`「注册账号」 | 同名 Requirement 存在（4 场景）；delta 未丢场景，校验通过 |
| Living Spec consumers | `openspec/specs/trip-plans/spec.md`、`trip-experiences/spec.md` | 卡片 / 详情 / 体验区既有场景要求发布者昵称与资料；本 change 只增加头像、入口与摘要回退，不删既有字段 |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4/4 Pass；DoV 5/5 Pass；REQ-008 17/17 场景映射；基线保留 4/4；无阻塞 |
| Consistency lint | [`consistency-lint.md`](consistency-lint.md) | Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 6 |
| Requirements | `requirement-workspace/requirements/REQ-008-user-profile.md` | §4 十七个场景；§5 必填 / 选填边界（学校选填）；§8 blocking OQ = 0；DoR BLOCKER = 0 |
| Intent | `requirement-workspace/intents/REQ-008-user-profile.md` | 候选能力 `user-profile` + `user-auth`；Discovery Decision `Go`；D1–D6 已裁决 |
| Story S18 | `requirement-workspace/stories/add-user-profile.story.md` | P0 / 迭代 1 / 3 点；AC 与场景映射齐全 |
| Impact brief | `requirement-workspace/impact-brief.md` §12 | as-is 盘点、delta、blast radius、风险与拆分边界；迁移按 8 列计 |
| Deep-dive | `requirement-workspace/deep-dive.md`「REQ-008 增补」 | ①–④ 四表，A0 ⑨–⑫ 通过 |
| Dependency | `openspec/changes/add-user-auth/` | 提供注册、会话与 `DemoUser` 既有契约；该 change 于 2026-11-16 解档补记 G1 / G2（Pending），Delta 早已并入 Living Spec |
| Implementation evidence | `frontend/src/identity/AuthPanel.tsx`、`authForm.ts`、`frontend/src/trip*`、`backend/.../AuthController.java`、`V3` / `V9` 迁移 | 注册当前收集昵称 / 学校 / 简介 / 兴趣；`app_users` 无资料新列；既有接口只返回 6 个用户字段 |
| Contract evidence | `RouteME/openapi.yaml` v0.6.0 | `DemoUser` required = `id, nickname, avatar_initial, school, bio, interests` |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-008 一致：注册瘦身、资料完善页、年龄 / 星座派生、必填校验、兴趣 3–5、旅行方式单选、头像选填、个人主页与发布者入口、跳过与补全、演示只读 | `proposal.md` §范围；`dov-ac-review.md` DoV-1；`consistency-lint.md` p2-1 |
| Ambiguity | 无未决歧义：昵称单一来源、年龄 / 星座服务端派生、学校选填覆盖原始 AC、职业四选一、头像选填回退、完善状态派生、发布者摘要回退顺序、演示只读 | `dov-ac-review.md` §规格解释裁决 1–9 |
| Conflict | 无阻塞冲突。`user-auth` 与 `add-user-logout` 改的是不同 Requirement 块（注册账号 vs 会话校验与退出），归档顺序互不阻塞；`trip-plans` / `trip-experiences` 既有发布者场景不被削弱 | `consistency-lint.md` L-01；`openspec/specs/user-auth/spec.md` |
| Traceability | REQ-008 §4 十七个场景 17/17；Living Spec 4 个基线场景 4/4 保留；proposal In scope 10/10 有场景覆盖 | `dov-ac-review.md` §Requirement mapping / §Living Spec 基线保留 / §Proposal → Delta 覆盖 |
| Residual risk | 双 capability 例外待 SA 追认；发布者展示契约归属未定；`DemoUser` 0.7.0 兼容；旧账号空值语义；兴趣词表分叉；头像存储安全 | `dov-ac-review.md` §残余风险；`consistency-lint.md` L-01 – L-06 |

## Decision

**Pass**

## Conditions + owners

| 项 | Owner | 处理时机 |
|---|---|---|
| 具名追认双 capability 例外（`user-profile` ADDED + `user-auth` MODIFIED），与 REQ-005 同口径 | SA（Jacky、Karena） | G1 记录后 / 归档前必须完成 |
| 发布者展示契约归属：在 `design.md` 声明头像、主页入口与「学校 · 专业 → 职业 → 城市」回退由 `user-profile` 承载；确认 `trip-plans` / `trip-experiences` 基线场景不被削弱（lint L-01） | AO + SA | P3 `design.md` |
| 昵称唯一来源：注册写入 `app_users.nickname`，完善页编辑同一字段，不新增资料昵称（lint L-02） | AO | P3 `design.md` |
| 契约 0.7.0：`avatar_url` 新增可空；保留 `avatar_initial` 至消费方迁移；`school` 可空并同步所有响应；契约 diff 进 PR（lint L-03） | AO + Dev | P3 `design.md` / P4 契约任务 |
| 迁移：新列全部可空；完善状态派生把 NULL / 空串视为缺失；补「演示账号」「迁移前注册账号」测试（lint L-04） | AO | P3 `tasks.md` / P4 |
| 兴趣词表与行程标签别名归一化；本 change 不改匹配算法（lint L-05） | AO + BA | P3 `design.md` |
| 头像存储：服务端生成文件名、目录与访问路径；JPEG / PNG / WebP ≤2 MB；补非法文件与越权测试（lint L-06） | AO + Dev | P3 `design.md` / P4 |
| 归档合并前核对：`user-auth` 合并后仍为 6 场景且 4 个基线场景语义完整；`user-profile` 作为新 Living Spec 全量合入 | AO + SA | P3 `tasks.md` 收口任务 / G3 |
| 手机号 / 邮箱验证、头像裁剪、相册、资料可见性、演示资料编辑、兴趣词表统一保持 out of scope，不纳入本 change 回归断言 | BA | 已记录，无需动作 |

## Approvers

| 角色 | 姓名 |
|---|---|
| IO | Wanye |
| SA | Jacky、Karena |
| AO（当前开发） | Jay |
| VL | Neal |
| SM | Lewis |

签署来源：沿用 2026-11-15 归档 G1 记录与 2026-11-16 `refine-inspiration-home` / `add-user-logout` G1 记录中用户提供的角色名单；用户于 2026-11-16 指示执行 `/sdd:p2`（含 G1）。若角色名单发生变更，以变更后的具名签署为准并在本文件更新。

## Next

- Decision = Pass → `/sdd:p3`（`/sdd:atdd-design` → `/sdd:task-plan` → `/sdd:quality-checklist`）。
- 6 条 SUGGESTION 分别落入 P3 `design.md` / `tasks.md` 与 P4 契约 / 安全测试；无阻塞项。