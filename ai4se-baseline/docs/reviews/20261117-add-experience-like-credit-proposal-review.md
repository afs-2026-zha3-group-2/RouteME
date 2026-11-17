# Artifact review — add-experience-like-credit / proposal

- **Verdict: Partial**
- **Scope:** focus=proposal（`@rule:artifact-review-gate` 的 P1 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`proposal.md`](../../openspec/changes/add-experience-like-credit/proposal.md)
- **Supporting inputs:**
  - [`requirements/REQ-023-experience-like-credit.md`](../../requirement-workspace/requirements/REQ-023-experience-like-credit.md)（24 场景 L / T / D / E 四组，blocking OQ 0，DoR BLOCKER 0）
  - [`intents/REQ-023-experience-like-credit.md`](../../requirement-workspace/intents/REQ-023-experience-like-credit.md)（证据锚点 + 用户裁决 D1–D4）
  - [`deep-dive.md`](../../requirement-workspace/deep-dive.md)「REQ-023 增补」（①–④ 四表 + 探针记录）
  - [`impact-brief.md`](../../requirement-workspace/impact-brief.md) §22
  - P1 Delta 同批产出：[`specs/trip-experiences/spec.md`](../../openspec/changes/add-experience-like-credit/specs/trip-experiences/spec.md)、[`specs/user-credit/spec.md`](../../openspec/changes/add-experience-like-credit/specs/user-credit/spec.md)
- **Evidence:**
  - `openspec validate add-experience-like-credit --strict` → `Change 'add-experience-like-credit' is valid`
  - 规则核对：`rules/process/rules.md#spec-first`、`#artifact-review-gate`、`#git-branching-and-pr`；`rules/documentation/rules.md#sdd-artifacts`、`#document-conventions`；`rules/architecture/rules.md#api-contract`；`rules/security/rules.md#security-baseline`；`rules/testing/rules.md#java-testing`、`#web-testing`
  - 现状核实：`CreditService` / `CreditServiceImpl`（记账服务无业务调用方）；`ExperienceResponse`（无赞数 / 点赞态字段）；`ExperienceController`（无点赞端点、无 DELETE）；`V8__create_trip_experiences.sql`（每作者每行程唯一体验）；`ExperienceCard.tsx` 与 `TripDetailPage.tsx`（无点赞交互）
  - 原型核实：`docs/prototype/ui.js` `expCard()` 与详情 `.exp-item`（无点赞按钮 / 赞数）；`docs/prototype/styles.css` 既有按钮与徽标令牌
  - 契约 / 迁移核实：`openapi.yaml` `info.version: 0.14.0`；`Error.code` 闭集枚举；`db/migration` 最大号 `V20`；在途 `add-ai-itinerary` 已声明 0.15.0 + V21
  - 工具已知偏差：`openspec show --json` 对项目中文「## 问题」标题可能返回 `Change must have a Why section`（既有约定差异，`validate --strict` 不受影响，本次未以 show 作为证据）

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | WARNING | `rules/documentation/rules.md#sdd-artifacts` | 提案头「能力」行；「归档顺序」行；残余风险「多 capability 偏离」 | 本 change 同时改 `trip-experiences` 与 `user-credit` 两个 capability，与「一个 change 只改一个 capability」存在偏离；规则检查点为「归档前」 | 提案已记录偏离理由与先例（`refine-inspiration-home`、`add-trip-completion`）。G1 需 SA 明确确认：接受单 change 的两 capability 打包，或要求拆为「点赞」「结算」两个 change | [fact] |
| F-2 | SUGGESTION（治理漂移） | `rules/documentation/rules.md#document-conventions` | 提案「规则」行与残余风险「原型先行」 | 权威规则区无 `prototype-ui-alignment` 同名锚点；提案已改用 `docs/prototype` 普通路径表述并记录漂移 | 既有治理漂移，后续 `/sdd:rules-govern` 处置；本 change 不处理 | [fact] |
| F-3 | SUGGESTION（P3 承接） | `rules/architecture/rules.md#api-contract` | 提案「契约」行与 D10 | 契约次版本与迁移号尚未定稿（当前 0.14.0 / V20；`add-ai-itinerary` 声明 0.15.0 + V21） | P3 按合并顺序排他确认，写入 `design.md` 与 `tasks.md`；不得撞号 | [fact] |
| F-4 | SUGGESTION（已记录） | `rules/documentation/rules.md#sdd-artifacts` | 提案头「触发」行与残余风险「优先级不一致」 | issue 标题 `[P0]`、正文写 P1 | 已并列记录两者，未单方面改写 issue；排期由 SM 确认 | [fact] |
| F-5 | SUGGESTION（P5 承接） | `rules/process/rules.md#spec-first` | 提案「归档顺序」行；impact §22.7 | `user-credit` / `trip-experiences` 的 Living Spec 尚未包含在途 change 的 delta | P5 归档必须排在 `add-credit-account` / `add-experience-photos` / `refine-experience-share` / `refine-inspiration-home` 之后，G3 前复核 | [fact] |

**Counts:** BLOCKER 0 / WARNING 1 / SUGGESTION 4 → **Partial**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Partial | 能力归属清晰（点赞归 `trip-experiences`、结算归 `user-credit`）；唯一偏离是双 capability 打包（F-1），已记录且待 SA 确认 |
| B Quality | N/A | P1 无实现；提案声明复用既有记账服务与既有组件令牌 |
| C Testing | N/A（计划已列） | 提案与 impact 已列单元测试（档位 / 月度 / 幂等 / 多行取最大 / 时区）与 E2E（点赞 → 跨档 → 分数变化） |
| D Security | Pass | 自赞与未登录由服务端拒绝；无客户端写分端点；不加 PII；点赞身份走既有 `X-User-Id` 校验 |
| E Process | Pass | proposal 与 Delta 同批；独立 worktree 基于 `origin/main@64b38da`；`validate --strict` valid；未触碰业务代码 |
| F Documentation | Pass（含治理漂移 SUGGESTION） | 正文中文、标识符英文；无绝对路径；`@rule:` 引用均指向存在锚点（原型规则改用路径） |
| G Traceability | Pass | 提案引用 REQ-023 / intent / deep-dive / impact；场景按 L / T / D / E 四组与 Delta 一一对应 |

## Residual risks

- 双 capability 偏离需 G1 的 SA 明确确认；若要求拆 change，需重排 proposal / Delta / 后续阶段产物。
- 归档顺序受 4 个在途 change 约束；P5 前需复核其归档状态。
- 契约版本与迁移号 P3 前未定；存在被并行 change 抢占后顺延的风险。
- 月度上限「先读累计再写账本」存在并发竞态，P3 需给出保障方案并写测试。
- 「同行程多篇体验取最高赞单篇」在当前数据模型下无法经 API 构造，需以多行数据单测覆盖，story 层不主张 E2E。
- 新增点赞按钮可能影响既有 E2E 对 `.exp-foot` / `.exp-item` 的按钮定位，P4 需同步回归。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `proposal.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
