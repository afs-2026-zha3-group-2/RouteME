# G1 decision — add-admin-console

- **Gate:** G1（Align）
- **Change:** `add-admin-console`（REQ-018 / S19–S24；`admin-console` + `customer-service` ADDED、`user-auth` MODIFIED）
- **Status:** **Pass**（2026-11-17，IO WAYNE / SA Karena 具名签署）
- **Timestamp:** 2026-11-17
- **Recorded by:** AI agent（`/sdd:g1-decision-record`），按用户在 2026-11-17 会话中给出的签署人姓名（IO = WAYNE、SA = Karena）与决策结论（Pass）记录

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | Why / What Changes（16 条）/ 故事映射 S19–S24 / In scope 12 条 / Out of scope 10 条 / 三层影响面 / 决策 19 行 / 验收信号 13 条 / 残余风险；能力记为 `admin-console`（ADDED）、`customer-service`（ADDED）、`user-auth`（MODIFIED） |
| Delta Spec — `admin-console` | [`specs/admin-console/spec.md`](specs/admin-console/spec.md) | ADDED 9 Requirement / 38 Scenario：后台访问控制、用户列表、用户详情、账号状态迁移与处罚、受限账号边界、封禁信息展示、举报队列、举报详情与处理、客服工作台 |
| Delta Spec — `customer-service` | [`specs/customer-service/spec.md`](specs/customer-service/spec.md) | ADDED 4 Requirement / 13 Scenario：帮助与反馈入口与我的举报状态、会话生命周期、消息与短轮询、历史保留 |
| Delta Spec — `user-auth` | [`specs/user-auth/spec.md`](specs/user-auth/spec.md) | MODIFIED「注册账号」1 Requirement / 10 Scenario（7 个沿用基线场景名 + 3 个新增：选填邮箱、邮箱非法或重复、客户端不能指定角色或初始状态） |
| Living Spec baseline — `user-auth` | `openspec/specs/user-auth/spec.md` | 「注册账号」同名 Requirement 存在；Login / 会话校验 / 退出三个 Requirement 未被本 Delta 触碰 |
| 未归档前置 change — `user-auth` | `openspec/changes/add-user-profile/specs/user-auth/spec.md` | 7 个场景名均被本 Delta 保留；本 Delta 是其严格超集，归档顺序为先 `add-user-profile` |
| 未归档同域 change | `openspec/changes/refine-safety-report/specs/trip-companions/spec.md` | 「MVP 不要求举报处置闭环」与本 change 相反，P5 需补交叉引用（follow-up L-05） |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4/4 Pass；DoV 5/5 Pass；14 个 Requirement 全部映射到 What Changes 与故事；无阻塞 |
| Consistency lint | [`consistency-lint.md`](consistency-lint.md) | phase = p2；Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 5（L-01、L-02 当场收口）/ N/A 7 |
| P2 quality report | `docs/ai4se-plugins/20261117-103000-quality-checklist-report.md` | P2-1 / P2-2 / P2-3 Pass；P2-4 Pass；Overall Pass |
| Requirements | `requirement-workspace/requirements/REQ-018-admin-console.md` | 六字段 + 按故事索引的场景清单；blocking OQ 0；DoR BLOCKER 0 |
| Intent | `requirement-workspace/intents/REQ-018-admin-console.md` | 用户裁决（含 2026-11-17「BANNED 封禁期无求助通道」）；Discovery Decision `Go` |
| Story | `requirement-workspace/stories/add-admin-console.story.md` | S19–S24（P0 / 迭代 1–3；3 / 3 / 3 / 5 / 3 / 5 点） |
| Artifact reviews | `docs/reviews/20261117-add-admin-console-proposal-review.md`、`docs/reviews/20261117-add-admin-console-spec-review.md` | 均 Pass；2026-11-17 由 WAYNE（IO）与 Jacky（SA）签齐 |
| P1 record | [`docs/sdd/add-admin-console/p1-intent.md`](../../../docs/sdd/add-admin-console/p1-intent.md) | 范围、故事、19 项决策、13 条验收信号；§5 签署表已批准 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-018 / S19–S24 一致：管理员身份与后台访问控制、用户列表与详情、账号状态迁移与处罚（4 条合法迁移 + 8 项封禁理由 + 到期惰性解封 + 不可自罚）、受限账号边界（`SUSPENDED` 四类写操作、`BANNED` 全写拒绝只读可用）、封禁信息展示、举报队列与处理（`PENDING → PROCESSING → RESOLVED / REJECTED`）、客服会话（`WAITING → HANDLING → CLOSED`，3s 短轮询）、客服工作台；Out of scope 的 SSO / 审计 / 申诉 / 永久删除 / 内容下架 / WebSocket / 附件 / 满意度 / 邮箱验证均未在 Delta 出现 | `proposal.md`「范围」；`dov-ac-review.md` DoV-1；`consistency-lint.md` p2-1 |
| Ambiguity | 无未决阻塞歧义。19 项提案决策已写入 Delta：`SUSPENDED` 精确对应 4 类写操作、`BANNED` 只读登录 + 全部写 403、到期以「读时有效状态」为准并在下一次状态变更时落库、举报处置显式「开始处理」、举报成立与 `RESOLVED` 同事务、`OTHER` 必须填补充说明、任一管理员可继续 `PROCESSING`、举报人只见状态、3s 轮询、单用户单活跃会话、编号 `R-{id}`、无硬删除 | `proposal.md`「决策」；`dov-ac-review.md` DoV-2；`REQ-018` §4 |
| Conflict | 无阻塞冲突。① 与 `add-ai-itinerary` 的契约 0.12.0 / V18 撞号已避让为 0.13.0 / V19；② `user-auth` 与未归档 `add-user-profile` 同能力，本 Delta 是其超集，归档顺序为先 `add-user-profile`；③ 与 `refine-safety-report` 的「MVP 不要求处置闭环」表述相反，转 P5 补交叉引用；④ 未 MODIFIED `trip-plans` / `trip-companions` / `trip-experiences`，账号状态只作为新增前置守卫，不改既有状态机 | `proposal.md`「影响面」「归档顺序」；`consistency-lint.md` X-1 / X-2 / X-4、L-05 |
| Traceability | 14/14 Requirement 有 What Changes 条目与故事归属；61/61 场景均属某个 `### Requirement:`；What Changes 中 3 条构建项（契约、前端、测试）不产生 Requirement，符合 OpenSpec 结构；`user-auth` 7 个基线场景名 7/7 保留 | `dov-ac-review.md`「Requirement → proposal → story 映射」「基线保留」；`consistency-lint.md` S3 / S5 / C1 |
| Verification | `npx --no-install openspec validate add-admin-console --strict` → `Change 'add-admin-console' is valid`；`openspec show add-admin-console --json` → `deltaCount: 14`；未产生实现代码、迁移或契约改动（P1–P2 只产文档） | `dov-ac-review.md` DoV-4；`consistency-lint.md` Tooling 行 |
| Residual risk | ① `user-auth` 归档顺序是硬约束（`add-user-profile` 先行）；② `refine-safety-report` 的 `trip-companions` 文本滞后，P5 前两份规格对「处置闭环」表述相反；③ `BANNED` 封禁期无客服 / 申诉通道（发起人 2026-11-17 接受，属产品口径）；④ 封禁到期依赖系统时钟，P4 必须用固定 `Clock` 覆盖到期前 / 后；⑤ 本地 V16 迁移重复（环境问题）会阻断 P4 启动，与本 change 无关但需先清理 | `dov-ac-review.md`「Residual risk」；`consistency-lint.md`「Residual risks」；`proposal.md`「残余风险」 |

## Decision

**Pass**

## Conditions + owners

无（Decision = Pass，无整改条件）。

## Follow-ups（非条件项，不阻断 G1）

| 项 | 来源 | Owner | 处理时机 |
|---|---|---|---|
| 举报人四态文案映射（待处理 / 处理中 / 已处理 / 举报不成立）写进设计并落单测断言 | lint L-03 | AO（Jacky） | P3 `design.md` / P4 |
| 12 个错误码收敛成「端点 × 错误码 × HTTP 状态」表，并入 `OpenApiTest` | lint L-04 | AO（Jacky） | P3 `design.md` / P4 |
| `refine-safety-report` 的 `trip-companions` 补「处置闭环见 `admin-console`」交叉引用 | lint L-05 | AO（Jacky） + SA（Karena） | P5 归档前 |
| 三处 MUST 的测试落点：`404 USER_NOT_FOUND`、默认按注册时间 / ID 倒序、邮箱为空显示「未填写」 | `dov-ac-review.md` Deferred | AO（Jacky） | P4 控制器测试 + E2E |
| 举报成立且被举报用户已 `SUSPENDED` / `BANNED` 的界面三态（维持 / 升级 / 更新封禁信息） | `dov-ac-review.md` Deferred | AO（Jacky） | P3 设计稿 |
| 三档布局（390 / 768 / 1440）与窄屏卡片化走查 | `dov-ac-review.md` Deferred | AO（Jacky） | P3 / P4 |
| 封禁到期用固定 `Clock` 覆盖「到期前 / 到期后」 | `dov-ac-review.md` Residual risk | AO（Jacky） | P4 |
| 归档顺序：`add-user-profile` → `refine-safety-report` → 本 change；归档说明写明 `user-auth` 为超集合并 | `proposal.md`「归档顺序」 | AO（Jacky） + SA（Karena） | P5 / G3 |
| 清理本地重复 V16 迁移（`V16__normalize_demo_user_profiles.sql` vs `V16__add_meeting_time.sql`） | P2 环境阻塞 | AO（Jacky） | P4 启动前 |

## Approvers

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | 需求来源与跨能力影响：`admin-console` / `customer-service` 新建两个能力、`user-auth` MODIFIED 并须在 `add-user-profile` 归档后合入；不 MODIFIED `trip-plans` / `trip-companions` / `trip-experiences`；契约 0.13.0 / V19 避让 `add-ai-itinerary` | 2026-11-17 |
| SA | Karena | 规格与验收口径：4 条合法状态迁移、8 项封禁理由、`SUSPENDED` 四类写操作与 `BANNED` 全写拒绝、到期惰性解封、处罚不删数据、举报 `PENDING → PROCESSING → RESOLVED / REJECTED`、客服 `WAITING → HANDLING → CLOSED` 与 3s 轮询、12 个错误码、`R-{id}` | 2026-11-17 |
| AO（当前开发） | Jacky | 承接 P3–P4 实现与本地验证；Follow-ups 按上表收口 | 2026-11-17 |

签署来源：用户在 2026-11-17 会话中就「G1 签署人」明确回答 **IO = WAYNE、SA = Karena**，并就决策结论选择 **Pass**。本次 change 的 AO 为 Jacky，故 SA 由 Karena 签署，避免 AO 自签 SA；VL（Neal）在 G2 / P4 独立验证，SM（Lewis）在 P1 范围确认，两者不属 G1 签署人。

## Signature-status note

- P1 四份工件（`proposal.md` + 3 份 Delta Spec）与两份 `docs/reviews/` 报告已于 **2026-11-17** 签齐：proposal / Delta 由 WAYNE（IO）批准；报告由 WAYNE（IO）+ Jacky（SA）批准。
- P2 对 Delta 的改动仅两类：① 3 个 `user-auth` 场景补 `Given` 行（格式类，不加行为）；② 举报成立处置规则与「客服消息与行程聊天隔离」的显式化（已在 P1 决策与验收信号内）。按 `@rule:artifact-review-gate`，格式类修订复用既有 Pass 结论，语义类补强已在 `dov-ac-review.md` DoV-1 / DoV-2 中记明。
- 本记录不替代 P3 的 `design` / `tasks` 签署位（那两类工件需当前开发者 + 一位既非当前开发者亦非 WAYNE 的成员）。

## Next

- Decision = Pass → P3 解锁：`/sdd:atdd-design` → `/sdd:task-plan` → `/sdd:quality-checklist`。
- 上表 9 条 Follow-ups 分别落入 P3 设计与任务、P4 测试矩阵与本地验证、P5 归档说明；无阻塞项。
- P5 归档前须复核：同一 `user-auth` 能力的 `add-user-profile` 已归档；`refine-safety-report` 已归档或已补交叉引用；契约 0.13.0 与 V19 未被其他并行 change 抢占编号。