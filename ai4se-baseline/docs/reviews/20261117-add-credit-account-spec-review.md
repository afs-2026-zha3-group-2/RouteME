# Artifact review — add-credit-account / spec

- **Verdict: Pass**
- **Scope:** focus=spec（`@rule:artifact-review-gate` 的 P1 Delta Spec 评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`specs/user-credit/spec.md`](../../openspec/changes/add-credit-account/specs/user-credit/spec.md)（ADDED：7 Requirement / 21 Scenario）
- **Supporting inputs:**
  - [`proposal.md`](../../openspec/changes/add-credit-account/proposal.md)
  - [`requirements/REQ-019-credit-account.md`](../../requirement-workspace/requirements/REQ-019-credit-account.md) §4（C-1 ~ C-15）
  - [`deep-dive.md`](../../requirement-workspace/deep-dive.md)「REQ-019 增补」①–④
  - Living Spec 基线：`openspec/specs/user-auth/spec.md`「注册账号」、`openspec/specs/design-system/spec.md`
- **Evidence:**
  - [`openspec validate add-credit-account --strict`](../../openspec/changes/add-credit-account/) → `Change 'add-credit-account' is valid`；Delta 为纯 ADDED（0 MODIFIED / 0 REMOVED），不与任何 Living Spec 的既有 Requirement 块相交
  - 规则核对：`rules/process/rules.md#spec-first`（P2 门槛：ADDED 描述变更 + 每条带可验证场景）、`#artifact-review-gate`；`rules/documentation/rules.md#sdd-artifacts`（capability 名词短语 kebab-case）、`#document-conventions`；`rules/architecture/rules.md#api-contract`；`rules/security/rules.md#pii-scrubbing`
  - 场景与 AC 映射核对：C-1~C-15 → 7 条 Requirement 的 21 个 Scenario，无孤儿场景、无未覆盖 AC（AC3/AC4 的推迟由 D2 + Requirement「管理后台信用分视图与计分明细的边界」承接）

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（已当场收口） | `rules/documentation/rules.md#sdd-artifacts` | Requirement「信用账户与初始分值」第 1 段、Requirement「管理后台信用分视图与计分明细的边界」标题与正文 | 初稿出现「本变更上线前」「本迭代」等时态词；Delta 归档后会成为 Living Spec，时态词会失效 | 已改写为「不存在没有信用账户的账号：无法通过注册路径建立的存量账号 MUST 由数据迁移补齐」与「管理后台…由独立需求交付，本规格不定义其行为」；Scenario「已有账号回填初始分」同步改为「存量账号补齐初始分」 | [fact] |
| F-2 | SUGGESTION（P2 承接） | `rules/architecture/rules.md#api-contract` | Requirement「信用分只读」Scenario「不存在客户端写分端点」 | Then 依赖「未找到或未允许响应」，但未点明是 404 还是 405，契约层无对应条目 | P2 契约定稿时明确断言口径（不新增端点即不写契约条目，测试断言既有错误格式）；不改变可观察结论 | [fact] |
| F-3 | SUGGESTION（保留） | `rules/process/rules.md#spec-first` | Requirement「分数区间与越界裁断」Scenario「分数始终落在闭区间内」与 Requirement「信用记录与记账服务」Scenario「记录满足前后分数等式」 | 两个场景在数值上部分重叠 | 保留互证：前者只守「分数本身在 0–100」，后者守「账本等式 + 两端在区间」；合并会丢一侧的失败信号 | [inference] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 3（1 当场收口 / 2 承接）→ **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 单一 capability `user-credit`（ADDED）；信用字段语义归属本能力，`user-profile` 不变 |
| B Quality | N/A | P1 无实现 |
| C Testing | N/A（场景已可测） | 21 个场景均含可观察结论；边界表、裁断数值、账本等式可直接转 ATDD 断言 |
| D Security | Pass | 只读约束与「无客户端写分端点」写成 MUST NOT；明细与原因不对外，符合最小披露 |
| E Process | Pass | Delta 为 ADDED，首段不带引言归档风险；`validate --strict` 通过 |
| F Documentation | Pass | Requirement / Scenario 命名清晰；区间闭合与阈值无歧义 |
| G Traceability | Pass | C-1→R1、C-2→R1、C-3→R1、C-4→R1、C-5→R3、C-6→R4、C-7→R4、C-8→R4、C-9→R4、C-10→R5、C-11→R4、C-12→R6、C-13→R2+R6、C-14→R3、C-15→R1+R6；AC3/AC4→R7 |

## Residual risks

- 等级字段的契约取值形态（中文枚举 vs 英文码 + 前端映射）未定；不论选哪种，本 Delta 的「展示等级文字」结论不变。
- 「理论变化量为 0 时是否留痕」未定，属 P3 前置 SA 决策；本 Delta 只约束「发生变化」的路径，不与其冲突。
- 管理端推迟后，故事 AC3 / AC4 在规格中以「边界 + 不提供」表达；若后续管理后台需求反向要求「管理员可排序筛选」，需以新 change MODIFY 本 Requirement。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `specs/user-credit/spec.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 全文（7 Requirement / 21 Scenario） |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
