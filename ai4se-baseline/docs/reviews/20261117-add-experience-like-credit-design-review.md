# Artifact review — add-experience-like-credit / Design

- **Verdict: Pass**
- **Scope:** focus=design（`@rule:artifact-review-gate` 的 P3 设计评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **变更摘要（2026-11-17，签署后）：** 契约 / 迁移号由 `0.15.0` + `V21` 改为 `0.18.0` + `V24`（`0.15.0` + `V21` 已由 `add-ai-itinerary` 在 registry 台账声明，用户裁决顺延）；结论与签署不变。
- **Artifacts under review:**
  - [`design.md`](../../openspec/changes/add-experience-like-credit/design.md)（D1–D16 + 数据库 / 后端结构 / 契约 / 前端 / 测试 / 残余风险）
  - [`atdd-design.md`](../../openspec/changes/add-experience-like-credit/atdd-design.md)（作为 design 的输入一并核对）
- **Supporting inputs:**
  - [`specs/trip-experiences/spec.md`](../../openspec/changes/add-experience-like-credit/specs/trip-experiences/spec.md)（ADDED 2 / 12 Scenario）
  - [`specs/user-credit/spec.md`](../../openspec/changes/add-experience-like-credit/specs/user-credit/spec.md)（ADDED 3 / 15 Scenario）
  - [`proposal.md`](../../openspec/changes/add-experience-like-credit/proposal.md)、[`g1-decision.md`](../../openspec/changes/add-experience-like-credit/g1-decision.md)（Pass；SA 接受双 capability 打包）
  - [`tasks.md`](../../openspec/changes/add-experience-like-credit/tasks.md)（对齐自检 Pass）
- **Evidence:**
  - `openspec validate add-experience-like-credit --strict` → `Change 'add-experience-like-credit' is valid`（字段定稿 `is_liked` 后复跑）
  - 规则核对：`rules/architecture/rules.md#api-contract`、`#package-structure`、`#java-patterns`；`rules/quality/rules.md#naming-conventions`、`#web-coding-style`；`rules/testing/rules.md#java-testing`、`#web-testing`；`rules/security/rules.md#security-baseline`；`rules/documentation/rules.md#sdd-artifacts`、`#document-conventions`；`rules/process/rules.md#spec-first`、`#artifact-review-gate`
  - 现状核实：`CreditService.book`（裁断 / 幂等 / 零变化留痕）；`CreditServiceImpl`（`DuplicateKeyException` 兜底先例）；`ExperienceController`（端点与 `X-User-Id`）；`ExperienceServiceImpl.describeAll`（`photosOf` 批量先例）；`V8__create_trip_experiences.sql`（`(trip_id, author_id)` 唯一）；`V20` 与 `openapi.yaml` 0.14.0（版本 / 迁移号复核）；`TripTimeZoneConstant.ZONE`；`MyTripsPage`（`loadMyExperiences` 仅用于分享状态）
  - 字段定稿核对：`liked_by_me` → `is_liked`，Delta 两处已同步（`@rule:api-contract` 布尔 `is_` 前缀）

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| D-1 | SUGGESTION | `rules/architecture/rules.md#java-patterns` | `design.md` §2 `ExperienceLikeRewardService` 已锁定档位 | 已锁定档位按「幂等键前缀匹配」读取，依赖字符串拼接（`EXPERIENCE_LIKE:{tripId}:{authorId}:%`） | P4 实现改用 `related_type = TRIP AND related_id = tripId AND user_id = authorId AND reason_code = EXPERIENCE_LIKE` 精确过滤，再由档位反查幂等键；`(user_id, occurred_at)` 索引已覆盖 | [inference] |
| D-2 | SUGGESTION | `rules/architecture/rules.md#java-patterns` | `design.md` §2 `ExperienceLikeMapper` | `exists` 与 `countByExperience` 在「唯一冲突视为已赞」流程中无明确调用点，存在死方法风险 | P4 按实际调用保留：点赞返回赞数复用 `selectStatsByExperienceIds` 单条调用；删除无调用点的方法 | [fact] |
| D-3 | SUGGESTION | `rules/architecture/rules.md#api-contract` | `design.md` §1 迁移（V21） | 月度累计查询依赖既有 `ix_credit_ledger_user_time`，设计未写明是否需要新索引 | P4 实现时用 `EXPLAIN QUERY PLAN` 确认走既有索引；若全表扫描再补索引并回写设计 | [inference] |
| D-4 | SUGGESTION | `rules/documentation/rules.md#document-conventions` | `design.md` D9 | 复用 `TripTimeZoneConstant.ZONE`（注释语义为「行程业务日期」），语义与「月度窗口」不完全一致 | 在 `ExperienceLikeConstant` 复用处加一行注释说明「同一业务时区，月度边界复用」；不改既有类 | [fact] |
| D-5 | SUGGESTION | `rules/testing/rules.md#java-testing` | `design.md` §2 `ExperienceServiceImpl` 读取签名 | `listAll` 当前无调用方，仍计划加 `viewerId` | 保留接口一致性可以，但需在实现注释说明「内部方法，无 Controller 调用」；若确认废弃则单独清理，不混入本 change | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 契约字段 `snake_case`、`like_count` / `is_liked`、`EXPERIENCE_NOT_FOUND` 与既有先例一致；新增类落在 `entity` / `mapper` / `constant` / `service` / `exception` / `response` 层；`Clock` 注入、接口与实现分离（`java-patterns`） |
| B Quality | Pass | 类名后缀与包一致（`XxxEntity` / `XxxMapper` / `XxxService` / `XxxResponse` / `XxxConstant`）；布尔 `is_liked` 满足 `is_` 前缀；前端纯逻辑下沉到 `experiences/experienceLikes.ts` |
| C Testing | Pass | §5 与 ATDD §1–§2 一致（API 22 / E2E 4 / Defer UT 1）；先红清单、先例型测试类命名、NFR 不纳入已裁决 |
| D Security | Pass | 自赞在服务层返回 403；未登录 401；DELETE 不设自赞分支（无记录即幂等 204），与「取消未赞幂等」一致；`X-User-Id` 为既有演示桩残余风险 |
| E Process | Pass | 设计不写业务代码；单 change 双 capability 已由 G1 SA 明确接受；TDD 顺序在 tasks 层落实 |
| F Documentation | Pass | 正文中文；相对链接；无绝对路径与行号；决策表含「放弃的备选与理由」 |
| G Traceability | Pass | D1–D16 均可在 tasks 中找到落点（D1/D13→T2；D2/D5/D6→T4；D3/D4/D16→T5；D7–D11→T6；D12→T1；D14→T7/T8；D15→T0） |

## Residual risks

- 月度并发严格性依赖 SQLite 单写者；迁移多写者数据库需补行锁（已在 design §6 登记）。
- `ExperienceService` 读取签名变化会触及既有测试，P4 必须同步更新并在验证报告说明。
- 契约 `0.18.0` / `V24` 若被其他 change 越过，需整体顺延并同步 `OpenApiTest`。
- 多篇体验规则只能以单测覆盖（V8 唯一约束），E2E / API 不做假数据。
- E2E 不在 CI，属既有残余风险。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `design.md` | 1 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认「全部批准」 | 全文 |
| `design.md` | 2 / 2（非当前开发者且非 WAYNE） | Neal（VL） | 2026-11-17 | 发起人当次会话指定第二签署人 Neal + 全部批准 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
