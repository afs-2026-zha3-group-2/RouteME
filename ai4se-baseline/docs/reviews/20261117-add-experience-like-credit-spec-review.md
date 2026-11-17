# Artifact review — add-experience-like-credit / Delta Spec

- **Verdict: Pass**
- **Scope:** focus=spec（`@rule:artifact-review-gate` 的 P1 Delta 评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifacts under review:**
  - [`specs/trip-experiences/spec.md`](../../openspec/changes/add-experience-like-credit/specs/trip-experiences/spec.md)（ADDED 2 Requirement / 12 Scenario）
  - [`specs/user-credit/spec.md`](../../openspec/changes/add-experience-like-credit/specs/user-credit/spec.md)（ADDED 3 Requirement / 12 Scenario）
- **Supporting inputs:**
  - [`requirements/REQ-022-experience-like-credit.md`](../../requirement-workspace/requirements/REQ-022-experience-like-credit.md)（24 场景，blocking OQ 0，DoR BLOCKER 0）
  - [`intents/REQ-022-experience-like-credit.md`](../../requirement-workspace/intents/REQ-022-experience-like-credit.md)（D1–D4）
  - [`deep-dive.md`](../../requirement-workspace/deep-dive.md)「REQ-022 增补」（数据契约 / 边界 / 跨 REQ / 展示契约）
  - [`impact-brief.md`](../../requirement-workspace/impact-brief.md) §22
- **Evidence:**
  - `openspec validate add-experience-like-credit --strict` → `Change 'add-experience-like-credit' is valid`
  - 基线核对：Living Spec [`trip-experiences/spec.md`](../../openspec/specs/trip-experiences/spec.md)（7 Requirement / 22 Scenario，无点赞需求；本 Delta 只 ADDED，不改写基线）；[`add-credit-account/specs/user-credit/spec.md`](../../openspec/changes/add-credit-account/specs/user-credit/spec.md)（7 Requirement，含账户 / 裁断 / 等级 / 展示面 / 只读 / 账本 / 管理端边界；本 Delta 不重名、不覆盖）
  - 规则核对：`rules/documentation/rules.md#sdd-artifacts`、`#document-conventions`；`rules/process/rules.md#spec-first`、`#artifact-review-gate`；`rules/architecture/rules.md#api-contract`；`rules/security/rules.md#security-baseline`
  - 现状核实：`CreditService.book`（裁断 / 快照 / 幂等 / 零变化留痕）；`ExperienceResponse`（字段清单）；`ExperienceController`（端点与 `X-User-Id` 校验）；`V8__create_trip_experiences.sql`（`(trip_id, author_id)` 唯一）；`openapi.yaml` `Error.code` 闭集

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| S-1 | SUGGESTION（G1 确认） | `rules/documentation/rules.md#sdd-artifacts` | 两个 capability 的 Delta 文件（`specs/trip-experiences`、`specs/user-credit`） | 单 change 跨两个 capability 的偏离（详见 proposal 评审 F-1）；Delta 本身按 capability 分文件、无混写 | G1 由 SA 确认单 change 打包；若要求拆分，Delta 可原样迁入两个 change，不重写内容 | [fact] |
| S-2 | SUGGESTION（P2 定稿） | `rules/architecture/rules.md#api-contract` | `trip-experiences` Delta「体验赞数与点赞态的展示」 | `like_count` / `liked_by_me` 为候选字段名；「体验不存在」错误码尚未在 `Error.code` 闭集中登记 | P2 / P3 与契约版本一并定稿；若新增 `EXPERIENCE_NOT_FOUND`，同步扩充枚举与契约测试 | [fact] |
| S-3 | SUGGESTION（P3 承接） | `rules/documentation/rules.md#sdd-artifacts` | `user-credit` Delta「体验获赞阶梯加分」「月度上限」 | 档位幂等键与月度累计读取方式属设计层细节，Delta 只约束语义（每档一次 / 锁定 / 不回滚 / 实发消耗），未写表名 | P3 在 `design.md` 记录幂等键格式与聚合查询方案，并写并发 / 时区边界测试 | [fact] |
| S-4 | SUGGESTION（P3/P4 承接） | `rules/documentation/rules.md#sdd-artifacts` | `trip-experiences` Delta「体验赞数与点赞态的展示」 | 两个展示面尚无原型交互；Delta 已要求展示与交互行为 | 按原型先行约定先改 `docs/prototype`，P3 / P4 保留原型变更证据 | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 4 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 点赞归 `trip-experiences`、结算归 `user-credit`，Delta 按 capability 分文件；跨 capability 偏离见 proposal F-1 |
| B Quality | N/A | P1 无实现 |
| C Testing | N/A（计划已列） | 每 Requirement 的场景均可落为单元 / E2E 断言（赞数、点赞态、分数、账本、月度边界、幂等） |
| D Security | Pass | 自赞拒绝与未登录拒绝为服务端 MUST；无客户端写分端点 |
| E Process | Pass | 纯 ADDED 追加，不改写任何基线 Requirement；`validate --strict` valid |
| F Documentation | Pass | 正文中文、`SHALL` / `MUST` 保留英文；无绝对路径；场景格式与既有 Living Spec 一致 |
| G Traceability | Pass | REQ-022 场景映射：L-1 ~ L-8 → `trip-experiences` 点赞与取消；D-1 / D-2 → 展示 Requirement；T-1 ~ T-10 + E-1 → `user-credit` 阶梯与月度；E-2 → 展示一致性；E-3 → 账户兜底；D-3 / L-8 → 计分边界 |

## Residual risks

- 若 SA 在 G1 要求拆分 change，Delta 内容可原样迁移，但阶段产物（质量报告 / 评审报告）需重编号。
- `like_count` / `liked_by_me` 若在 P2 改名，前端类型、契约测试与 E2E 需同步。
- 月度累计的并发严格性尚未设计；P3 必须以测试固定「单月 ≤ +20」。
- 每日历月边界依赖 Asia/Shanghai 换算，需单测覆盖 UTC 16:00 边界。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `specs/trip-experiences/spec.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 全文 |
| `specs/user-credit/spec.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
