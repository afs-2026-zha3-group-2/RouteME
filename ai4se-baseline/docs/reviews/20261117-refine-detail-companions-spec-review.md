# Artifact review — refine-detail-companions / spec

- **Verdict: Pass**
- **Scope:** focus=spec（`@rule:artifact-review-gate` 的 P1 Delta Spec 评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`specs/trip-plans/spec.md`](../../openspec/changes/refine-detail-companions/specs/trip-plans/spec.md)（MODIFIED：1 Requirement / 12 Scenario）
- **Supporting inputs:**
  - [`proposal.md`](../../openspec/changes/refine-detail-companions/proposal.md)
  - [`requirements/REQ-020-detail-companion-cards.md`](../../requirement-workspace/requirements/REQ-020-detail-companion-cards.md) §4（C-1 ~ C-10）
  - [`deep-dive.md`](../../requirement-workspace/deep-dive.md)「REQ-020 增补」①–④
  - Living Spec 基线：`openspec/specs/trip-plans/spec.md:191-219`（「查看行程详情与清晰的状态」4 个场景）
  - 只读依赖：`openspec/specs/trip-companions/spec.md:69-83`、`openspec/specs/design-system/spec.md`
- **Evidence:**
  - [`openspec validate refine-detail-companions --strict`](../../openspec/changes/refine-detail-companions/) → `Change 'refine-detail-companions' is valid`
  - Delta 为 MODIFIED 1 个 Requirement；基线 4 场景全部保留（查看行程详情 / 状态标识清晰 / 同行申请入口按资格显示 / 已结束行程展示游后分享区占位），修改了「查看行程详情」并新增 8 个同行者卡片场景
  - 需求映射：C-1→「同行者资料卡展示」+「发布者不在同行者列表重复」；C-2→「同行者资料卡展示」；C-3→「同行者字段回退」；C-4→「打开同行者公开资料」；C-5→「聊天入口按资格显示」；C-6→「没有其他同行者时的空态」；C-7→「人数口径与排序不变」；C-8 / C-10→Requirement 正文反向约束；C-9→「窄屏与双主题不溢出」
  - 规则核对：`rules/process/rules.md#spec-first`（MODIFIED 描述变更 + 每条带可验证场景）、`#artifact-review-gate`；`rules/documentation/rules.md#sdd-artifacts`（capability 名词短语 kebab-case）、`#document-conventions`；`rules/quality/rules.md#web-coding-style`；`rules/testing/rules.md#web-testing`
  - 契约 / 迁移核实：`openapi.yaml:1890-1895` participants 字段与描述不变；Flyway 无新增迁移；后端零 diff

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（P2 承接） | `rules/documentation/rules.md#sdd-artifacts` | Scenario「同行申请入口按资格显示」 | 该基线场景包含两组 Given / When / Then，格式上与其余场景不一致（Living Spec 原样保留） | P2 delta-craft 可保持原样以避免改变基线语义；若拆成两个场景，需在 `dov-ac-review.md` 说明场景数变化 | [fact] |
| F-2 | SUGGESTION（P3 承接） | `rules/process/rules.md#spec-first` | Requirement 正文反向约束（C-8 / C-10） | 「零接口变更 / 复用设计令牌」写在 Requirement 正文而非 Scenario，运行时不可直接断言 | P3 ATDD 把 C-8 映射为 diff / 契约检查证据，C-10 映射为样式 token 审查与浏览器走查 | [inference] |
| F-3 | SUGGESTION（P3 承接） | `rules/documentation/rules.md#sdd-artifacts` | Scenario「没有其他同行者时的空态」 | 只约定「可读空态」，未固定文案 | P3 定稿 `tripMessages` 键与文案；E2E 用可见文本或语义角色断言 | [fact] |
| F-4 | SUGGESTION（P2 承接） | `rules/process/rules.md#spec-first` | Requirement 正文「发布者 MUST 以独立资料卡展示…」 | 发布者资料卡沿用既有行为，Delta 未重复其完整字段与交互，只以「独立资料卡」引用 | P2 可在 Requirement 正文补一句「发布者资料卡沿用既有展示与交互」，避免归档后读者误以为需要重做 | [inference] |
| F-5 | SUGGESTION（G1 必须确认） | `rules/process/rules.md#spec-first` | Requirement 正文与 Scenario「查看行程详情」 | Living Spec 基线「当前同行者至少包含发布者本人」被 D1 有意替换为「发布者不在同行者列表重复」 | P2 G1 具名确认 D1 为语义变更；`dov-ac-review.md` 标注基线 1 条被替换、其余 3 条保留 | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 单 capability `trip-plans`（MODIFIED）；同行规则与资料弹窗只读复用，无跨能力契约变更 |
| B Quality | N/A | P1 无实现 |
| C Testing | N/A（场景已可测） | 12 个场景均可观察；卡片数量、字段、弹窗、聊天路由、空态、人数与响应式可直接转 ATDD |
| D Security | Pass | 不新增 PII；资料弹窗沿用公开资料；聊天准入不扩大；未申请用户无聊天入口 |
| E Process | Pass | Delta 与 proposal 同批；`validate --strict` 通过；基线 4 场景保留 |
| F Documentation | Pass | Requirement / Scenario 命名清晰；MUST / MUST NOT 与展示口径无歧义 |
| G Traceability | Pass | C-1 ~ C-10 全部有落点（C-8 / C-10 在正文反向约束）；无孤儿场景 |

## Residual risks

- D1 的语义变更（发布者从同行者列表排除）需要 G1 明确确认；若 SA 要求保留「至少包含发布者本人」，则需调整 UI 方案并重写 Delta。
- 空态文案与卡片类名在 P3 定稿；E2E 选择器应与实现同步，避免悬空。
- C-8 的「零接口变更」需要在 P4 用 `git diff` 与契约 lint 证明；仅靠代码评审不足以作为运行时证据。
- 响应式与深色主题依赖人工走查；P4 需保留 1440 / 1024 / 768 / 390 × 浅 / 深色证据。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `specs/trip-plans/spec.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 全文（1 Requirement / 12 Scenario） |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
