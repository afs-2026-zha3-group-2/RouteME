# Consistency lint — add-admin-console

- **Change:** `add-admin-console`
- **Phase:** `p2`
- **Focus:** full change（`openspec/changes/add-admin-console/`）+ 三份 Delta + `proposal.md`
- **Timestamp:** 2026-11-17
- **Artifact level:** 2（proposal + 3 Delta Spec；无 `design.md` / `tasks.md`）
- **Tooling:** `openspec` CLI 1.16.1 可用；`npx --no-install openspec validate add-admin-console --strict` → `Change 'add-admin-console' is valid`；`openspec show add-admin-console --json` → `deltaCount: 14`；三份 Delta 结构 9/38 + 4/13 + 1/10 = 14 Requirement / 61 Scenario

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 5（2 条当场收口、3 条转 P3 / P4 / P5）/ N/A 7

| Condition | Result |
|---|---|
| ≥1 BLOCKER | No |
| ≥1 WARNING | No |
| Only SUGGESTION or no findings | Yes → Pass |
| Tooling-absent cap | Not applied（CLI 可用） |

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | `proposal.md`「影响面」 | 原表只按文件列改动，缺 self / upstream / downstream 三视角；按 lint P4 规则会被判为 BLOCKER（本报告出具前已核对） | 表头改为三层：自身（本 change 工件）、上游（REQ-018 / 故事 / 登记）、下游（Living Spec / 归档 / 其他 change），逐文件表保留为「逐文件改动」 | `proposal.md`「影响面」；lint 规则 P4 | proposal | [fact] |
| L-02 | SUGGESTION | p2 | `specs/user-auth/spec.md` 3 个场景 | 「用户名格式非法」「密码长度非法」「昵称缺失或超长」只有 When / Then，缺 `Given`（沿用 Living Spec 原写法），S4 会报 WARNING | 为三处补一行 `Given`（不新增行为、不改场景名）；按 `@rule:artifact-review-gate` 的「格式修订可复用 Pass 报告」处理，不重开 P1 | `specs/user-auth/spec.md` 场景 3 / 4 / 6；Living `openspec/specs/user-auth/spec.md` | spec | [fact] |
| L-03 | SUGGESTION | p3 | `customer-service`「帮助与反馈入口与我的举报状态」 | 四态文案（待处理 / 处理中 / 已处理 / 举报不成立）未在规格中逐字固定，只在场景里断言状态可见；实现可能把 `PENDING` 与 `PROCESSING` 都写成「已受理」 | P3 `design.md` 给出状态 → 文案映射表，并让 P4 单测断言四态文案 | `customer-service` 场景「查看我的举报状态」；`design.md` 待产出 | design | [inference] |
| L-04 | SUGGESTION | p3 | 三份 Delta 的错误码 | 12 个错误码分散在场景中，无集中表；契约 0.13.0 与 `OpenApiTest` 需要单一真源 | P3 收敛为「端点 × 错误码 × HTTP 状态」表，P4 在 `OpenApiTest` 断言 | `openapi.yaml` 0.11.0；`backend/.../test/.../OpenApiTest.java` | contract | [inference] |
| L-05 | SUGGESTION | p5 | `openspec/changes/refine-safety-report/specs/trip-companions/spec.md` | 该未归档增量仍写「MVP 不要求举报处置闭环」，与本 change 交付的处置闭环相反；两份规格并存会互相否定 | P5 在该句补「处置闭环见 `admin-console`」，不改举报原因四值；同时复核 `add-user-profile` 先于本 change 归档 | `refine-safety-report` Delta 第 15 行；`proposal.md`「归档顺序」 | spec | [fact] |

**收口状态：** L-01（影响面补三层视角）、L-02（3 个场景补 `Given`）已在 P2 直接修订并复验 `validate --strict` valid。L-03 / L-04 转 P3，L-05 转 P5。

## 检查明细

### Proposal rules

| # | Rule | Result | Evidence |
|---|---|---|---|
| P1 | `## Why` present and non-empty | Pass | 全仓 `admin` / `banned` / `suspended` 零命中；`reports` 无状态列；`app_users` 无 `email/role/status`；369 账号只能手改 SQLite |
| P2 | `## What Changes` present and non-empty | Pass | 16 条：13 条承载 Requirement，另 3 条为契约 / 前端 / 测试构建项 |
| P3 | Non-Goals / Out-of-scope present and non-empty | Pass | 「Out of scope」12 条，逐条可判定（SSO / 审计 / 申诉 / WebSocket / 附件 / 邮箱验证 / 内容下架 / 永久删除等），未出现「不做不相关的事」式空话 |
| P4 | Impact covers self / upstream / downstream | Pass（L-01 已收口） | 三层表 + 逐文件表；self = 本 change 工件，upstream = REQ-018 / 故事 / 登记，downstream = Living Spec / 归档顺序 / 其他 change |

### Spec rules

| # | Rule | Result | Evidence |
|---|---|---|---|
| S1 | Spec structure follows project OpenSpec schema | Pass | `## ADDED Requirements` ×2 + `## MODIFIED Requirements` ×1；每 Requirement ≥1 Scenario；`validate --strict` valid |
| S2 | Citation prefixes stay in agreed set | Pass | 仅 `@rule:`；Delta 正文无引用前缀 |
| S2b | `@knowledge:` paths resolve | N/A | 无 `@knowledge:` 引用 |
| S2c | `@rule:<ID>` resolves to rules file | Pass | 8 个 ID 全部命中：`spec-first` / `artifact-review-gate` / `git-branching-and-pr`（process）、`sdd-artifacts`（documentation）、`api-contract`（architecture）、`web-coding-style`（quality）、`web-testing`（testing）、`pii-scrubbing`（security） |
| S3 | Every Requirement traces to proposal What Changes | Pass | 14/14 见 `dov-ac-review.md`「Requirement → proposal → story 映射」 |
| S4 | Scenarios use Given / When / Then | Pass（L-02 已收口） | 61/61 三要素齐全（机器逐块检查，0 缺失） |
| S5 | Scenarios belong to a numbered Requirement | Pass | 9 + 4 + 1 个 `### Requirement:` 下分别挂 38 / 13 / 10 个场景，无孤儿场景 |

### Tasks / Design rules

| # | Rule | Result |
|---|---|---|
| T1–T3 | tasks rules | N/A：无 `tasks.md`（P3 产出） |
| D1–D3 | design rules | N/A：无 `design.md`（P3 产出） |

### Shared / cross-artifact

| # | Check | Result | Evidence |
|---|---|---|---|
| C1 | proposal → spec: What Changes covered by Requirements | Pass | 13 条能力条目全部有 Requirement；契约 / 前端 / 测试 3 条为构建项，不产生 Requirement |
| C2 | spec → tasks: each Requirement has ≥1 task | N/A | 无 `tasks.md` |
| C6 | `@knowledge:` / `@rule:` reachability | Pass | 见 S2c |
| X-1 | Cross-refs point at existing sections / capabilities | Pass | `openspec/specs/` 现有 `design-system` / `hello-world` / `trip-companions` / `trip-experiences` / `trip-plans` / `user-auth`；`admin-console` / `customer-service` 为新增能力，无同名冲突 |
| X-2 | Same capability stated incompatibly in two places | Pass | `admin-console` / `customer-service` / `user-auth` 三份 Delta 之间无重复定义；账号状态机只在 `admin-console` 定义，客服状态机只在 `customer-service` 定义；注册规则只在 `user-auth` |
| X-3 | Acceptance criteria vague / untestable | Pass | 全文无「适当 / 友好 / 及时 / 尽快」类措辞；断言均为状态、错误码、字段、排序或时间窗口 |
| X-4 | Blast radius vs `trip-plans` / `trip-companions` / `trip-experiences` | Pass | 本 change 不 MODIFIED 三个 Living 能力；账号状态守卫作为 `admin-console` 的新前置条件，未改写既有 happy path |

### phase=p2 checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Proposal scope vs Delta scope（no silent expansion / drop） | Pass | In scope 12 条与 14 个 Requirement 一一对应；Out of scope 未在 Delta 出现（SSO / WebSocket / 申诉 / 附件 / 邮箱验证 / 永久删除检索 0 命中，`永久删除` 仅在「MUST NOT 提供」禁令句出现） |
| 2 | Delta capabilities internally consistent（actors / constraints / scenarios） | Pass | 账号状态机 4 条迁移封闭；举报状态机 `PENDING → PROCESSING → RESOLVED / REJECTED` 封闭；客服会话 `WAITING → HANDLING → CLOSED` 封闭；角色只有 `USER` / `ADMIN`，无 `STAFF` 残留 |
| 3 | Key proposal constraints have a home in Delta | Pass | 8 项封禁理由、未来解封时间、`OTHER` 必填说明、不可自罚、惰性解封、无永久删除、举报成立同事务、3s 轮询、单活跃会话、`R-{id}`、双端只读——均有场景或 Requirement 句承载 |
| 4 | tasks.md direction check | N/A | 无 `tasks.md` |
| 5 | Requirement / delta cannot trace to proposal | Pass | 无不可追溯项（见 C1） |

## N/A / skipped

| 项 | 原因 |
|---|---|
| S2b | 无 `@knowledge:` 引用 |
| T1 / T2 / T3 | `tasks.md` 属 P3 |
| D1 / D2 / D3 | `design.md` 属 P3 |
| C2 | 同上 |
| 单测 / E2E 证据 | P1–P2 无实现，DoV-4 记 N/A |

## Residual risks

- `user-auth` 归档顺序（`add-user-profile` 先行）是硬约束，归档器不会替我们判断；P5 必须按提案顺序执行并复核合并结果。
- `refine-safety-report` 的 `trip-companions` 文本滞后（L-05），P5 前两份规格对「举报处置闭环」的表述相反。
- `BANNED` 封禁期无客服 / 申诉通道（发起人 2026-11-17 接受），属产品口径而非规格缺陷。
- 契约 0.13.0 与 V19 尚未落地，12 个错误码与迁移回填只能靠 P3 / P4 实现兑现；本报告不对未实现项作肯定判断。
- 本地 V16 迁移重复（环境）会阻断 P4 启动，与本 change 无关但需先清理。

## Reviewer metadata

- 执行：AI agent（`/sdd:consistency-lint phase=p2`），2026-11-17
- 人工签署：本报告属 lint 辅助证据，不单独设签署位；其结论进入 G1（IO = WAYNE、SA = Karena）
- 下一步（非 Gate）：`/sdd:g1-decision-record`