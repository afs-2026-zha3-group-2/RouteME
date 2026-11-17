# Artifact review — add-credit-recovery / spec

- **Verdict: Pass**
- **Scope:** focus=spec（`@rule:artifact-review-gate` 的 P2 Delta Spec 评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`specs/user-credit/spec.md`](../../openspec/changes/add-credit-recovery/specs/user-credit/spec.md)（ADDED：7 Requirement / 29 Scenario）
- **Supporting inputs:**
  - [`proposal.md`](../../openspec/changes/add-credit-recovery/proposal.md)（D1–D7）
  - [`requirements/REQ-022-credit-recovery.md`](../../requirement-workspace/requirements/REQ-022-credit-recovery.md)（27 条验收）
  - [`deep-dive.md`](../../requirement-workspace/deep-dive.md)「REQ-022 增补」
  - Living Spec 基线：`openspec/specs/user-credit/spec.md`（由未归档 `add-credit-account` 提供）、`openspec/specs/design-system/spec.md`
- **Evidence:**
  - `npx --no-install openspec validate add-credit-recovery --strict` → `Change 'add-credit-recovery' is valid`；Delta 为纯 ADDED（0 MODIFIED / 0 REMOVED）
  - 规则核对：`rules/process/rules.md#spec-first`（P2 门槛：每条 Requirement 带可验证 Scenario、数值与阈值无歧义）、`#artifact-review-gate`；`rules/documentation/rules.md#sdd-artifacts`（capability 名词短语 kebab-case）、`#document-conventions`
  - 数值复核：阈值 60（R1 / R2 / R4 / R5）、通过线 8 题（R3）、题量 10 / 题库 20 / 四类覆盖（R3）、次数 2 考 1 恢复（R5）、初始分 80（R7）、0 分恢复 +60（R7）——与 D1–D7 及 P3-D1~P3-D6 全部一致
  - 时区复核：R5「月份边界按北京时间」的 Given 用「北京时间 2026-12-01 07:30 / UTC 2026-11-30 23:30」构造跨月样本，与 `TripTimeZoneConstant.ZONE = Asia/Shanghai` 一致
  - 边界复核：R1 第 4 条 Scenario 枚举了「提交申请 / 接受申请 / 聊天 / 改资料」四类不受限路径，覆盖 proposal DoR #10 的原 Partial 项
- **变更摘要（2026-11-17，评审中修订）：** R6 首段由「MUST 立即展示」改为「MUST 展示」并追加取数时机限定句（F-1 收口）。Requirement 数量、Scenario 数量与全部数值未变，不构成语义放宽——原表述未定义「立即」的观察点，补充后与五展示面共用 `GET /users/credits` 的实现事实一致。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | WARNING（已收口） | `rules/process/rules.md#spec-first` | Requirement「恢复后的展示一致性」首段 | 原文「MUST 立即展示」+「MUST NOT …需要手动刷新才更新」在字面上要求同页驻留期间的实时更新，而实现是路由切换时重新取数且不建全局信用状态；P4 若照字面验收则必然失败，属规格与可实现性的冲突 | 已改为「MUST 展示」并追加「本约束作用于进入或重新进入展示面时的取数结果；不要求同页驻留期间由服务端主动推送」；设计 §5 同步写同口径 | [fact] |
| F-2 | SUGGESTION（P4 承接） | `rules/testing/rules.md#java-testing` | Requirement「每月考试次数与恢复次数」Scenario「月份边界按北京时间」 | Given「用户 11 月已恢复一次」蕴含分数已 ≥ 60，与 R2「仅 < 60 可开始考试」合起来使该前提**不可自然到达**；测试若不复位分数会先被资格校验拒绝，断言不到跨月行为 | 不改为规格：P4 的 `CreditLearningQuotaApiTest` 必须显式造分（把分数压回 < 60 并写入上月恢复账本）再推进时钟；验证报告需注明造分方式 | [inference] |
| F-3 | SUGGESTION（保留） | `rules/security/rules.md#pii-scrutiny` | Requirement「安全学习恢复记账」Scenario「恢复记录文案」 | 规格要求「展示文案为『安全学习信用恢复』」，但同场景又要求「该记录对普通用户不可见」，本 change 无任何读取该文案的界面，文案成为无展示面的契约 | 保留：由 D14 的 `enums/CreditReason.label()` + `CreditLearningReasonLabelTest`（A17）承接，未来明细页直接复用；不删规格句，避免后续重开 G1 | [inference] |
| F-4 | SUGGESTION（已收口） | `rules/process/rules.md#artifact-review-gate` | Requirement「每月考试次数与恢复次数」 | proposal R-16 提到「本月仅有未通过与**取消**的会话」，Delta 全文无「取消」语义，两端对同一条次数真相的描述粒度不同 | 以 Delta 为准：会话一经建立即计次，不存在取消或退还（R3「未完成学习不能提交」场景已写明「MUST NOT 退还次数」）；proposal 侧措辞随 P3 回填收敛 | [fact] |
| F-5 | SUGGESTION（保留） | `rules/process/rules.md#spec-first` | Requirement「题库与答题判定」Scenario「未完成学习不能提交」 | 「保留已产生的学习进度」在 OQ-5 裁定（只存完成标记 + 结果）下只能表达为「会话仍存在且可继续完成学习」，无法恢复逐题进度 | 保留：归档时该句成为 Living Spec 的既有约束；实现只在会话行保留 `learning_completed_at` 与题号集合，不承担逐题进度 | [inference] |

**Counts:** BLOCKER 0 / WARNING 1（已收口）/ SUGGESTION 4（2 保留 / 1 P4 承接 / 1 已收口）→ **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 单一 capability `user-credit`（ADDED）；不改 `user_credit_account` / `credit_ledger` 结构；恢复只经 `CreditService.book` |
| B Quality | N/A | P2 无实现 |
| C Testing | Pass（含 1 条承接） | 29 个 Scenario 均含可观察结论；仅 R5 跨月场景需造分前提（F-2 已转 P4） |
| D Security | Pass | 答案不下发、明细不可见、只能操作本人均写成 MUST NOT；无客户端写分端点 |
| E Process | Pass | 纯 ADDED、无时态词、`validate --strict` 通过；6 个 blocking OQ 已具名裁定 |
| F Documentation | Pass | Requirement / Scenario 命名与既有 `user-credit` 风格一致；阈值与区间闭合无歧义 |
| G Traceability | Pass | 7 Requirement ↔ proposal R-1~R-25 ↔ REQ-022 的 27 条验收：无孤儿场景；25 → 29 的增量来自把 R-8/R-17/R-18 拆成可独立失败的 Scenario |

## Residual risks

- R4 的「文案」与 R6 的「五展示面」都依赖既有 `creditDisplay.ts` 与 `GET /users/credits`；若未来该端点改为分页或加缓存，本 Delta 的展示结论不受影响，但实现需重评。
- 恢复链路先于扣分链路交付，R5 的跨月与「已恢复后再次低于 60」两个场景在线上不可自然到达，只能由测试造分证明。
- OQ-8（人工封禁不因学习解除）未建模型；若封禁能力引入，需以新 change MODIFY R1 的「恢复即放行」措辞。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `specs/user-credit/spec.md` | 1 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 7 Requirement / 29 Scenario 全文 |
| `specs/user-credit/spec.md` | 2 / 2（非当前开发者且非 WAYNE） | Jay | 2026-11-17 | 发起人当次会话指定 | 7 Requirement / 29 Scenario 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准 Pass」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
