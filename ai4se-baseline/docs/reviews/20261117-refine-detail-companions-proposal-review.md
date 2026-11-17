# Artifact review — refine-detail-companions / proposal

- **Verdict: Pass**
- **Scope:** focus=proposal（`@rule:artifact-review-gate` 的 P1 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`proposal.md`](../../openspec/changes/refine-detail-companions/proposal.md)
- **Supporting inputs:**
  - [`requirements/REQ-020-detail-companion-cards.md`](../../requirement-workspace/requirements/REQ-020-detail-companion-cards.md)（10 场景 C-1 ~ C-10，blocking OQ 0，DoR BLOCKER 0）
  - [`intents/REQ-020-detail-companion-cards.md`](../../requirement-workspace/intents/REQ-020-detail-companion-cards.md)（证据锚点 + 用户裁决 D1–D4）
  - [`deep-dive.md`](../../requirement-workspace/deep-dive.md)「REQ-020 增补」（①–④ 四表 + 探针记录）
  - [`impact-brief.md`](../../requirement-workspace/impact-brief.md) §20
  - P1 Delta 同批产出：[`specs/trip-plans/spec.md`](../../openspec/changes/refine-detail-companions/specs/trip-plans/spec.md)（MODIFIED 1 Requirement / 12 Scenario，基线 4 场景保留 + 新增 8 场景）
- **Evidence:**
  - [`openspec validate refine-detail-companions --strict`](../../openspec/changes/refine-detail-companions/) → `Change 'refine-detail-companions' is valid`
  - 规则核对：`rules/process/rules.md#spec-first`、`#artifact-review-gate`、`#git-branching-and-pr`；`rules/documentation/rules.md#sdd-artifacts`、`#document-conventions`；`rules/quality/rules.md#web-coding-style`、`#naming-conventions`；`rules/testing/rules.md#web-testing`
  - 现状核实：`TripDetailPage.tsx:468-520`（发布者卡片 vs 同行者纯姓名列表）；`DemoUserResponse.java:10-36` 与 `ApplicationServiceImpl.java:193-202`（participants 含完整资料与发布者）；`ProfileContext.tsx:27-41`（openProfile）；`Avatar.tsx:12-46`（lg 头像）；`chat-entry.spec.ts:78-84`（旧 `.detail-participants` 选择器）
  - 原型核实：`docs/prototype/ui.js:509-520`（`.companion` 紧凑行，含发布者）；`docs/prototype/styles.css:712-725`（`.host-card` 与 `.companion` 样式）
  - 契约 / 迁移核实：`openapi.yaml:1890-1895` participants 描述不变；本 change 零后端 / 契约 / 迁移
  - 工具已知偏差：`openspec show --json` 对项目中文「## 问题」标题返回 `Change must have a Why section`（既有约定差异，`validate --strict` 不受影响）

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（P3 承接） | `rules/quality/rules.md#naming-conventions` | 提案决策「摘要回退」；`profileDisplay.ts:26-28` | `publisherSummary` 原为发布者命名，复用为同行者摘要语义上成立但命名偏窄 | P3 评估是否补一个语义别名（如 `userSummary`）或保持现状并在调用处注释；不建议在本 change 扩大改名范围 | [inference] |
| F-2 | SUGGESTION（P3 承接） | `rules/testing/rules.md#web-testing` | 提案决策「测试策略」 | 仓库 `frontend/src/trips` 无 `TripDetailPage` 组件测试；仅 E2E 覆盖卡片渲染与交互 | P3 ATDD 明确是否补 Testing Library 组件测试（至少覆盖卡片字段 / 空态 / 资料点击 / 聊天入口），并说明分层理由 | [fact] |
| F-3 | SUGGESTION（P2 承接） | `rules/process/rules.md#spec-first` | 提案残余风险第 1 行；Delta Requirement 正文 | Living Spec 基线场景「当前同行者至少包含发布者本人」被 D1 有意替换为「发布者不在同行者列表重复」 | P2 G1 明确记录 D1 为语义变更，并在 `dov-ac-review.md` 标注基线 1 条被替换、其余 3 条保留 | [fact] |
| F-4 | SUGGESTION（治理漂移） | `rules/documentation/rules.md#document-conventions` | 提案「规则」行 | 权威区 `docs/knowledge/rules/` 无 `prototype-ui-alignment` 锚点，宿主投影 `project-rules.md` 仍在引用；本提案已改用普通路径引用 | 记录为既有治理漂移；后续 `/sdd:rules-govern` 补锚点或修订宿主投影，不在本 change 处理 | [fact] |
| F-5 | SUGGESTION（已记录） | `rules/documentation/rules.md#sdd-artifacts` | 需求 §8 / 提案「规模」 | 故事点未估，仅给出 S 规模与零后端结论 | SM 在排期时确认；不影响 P1 工件通过 | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 单 capability `trip-plans`（MODIFIED），符合 one change = one capability；`trip-companions` / `user-profiles` 只读消费，无新增契约 |
| B Quality | N/A | P1 无实现；提案已声明零后端 / 契约 / 迁移与原型先行 |
| C Testing | N/A（计划已列） | 提案列出 E2E 卡片 / 资料弹窗 / 空态 / 聊天 / 响应式；组件单测待 P3 决定 |
| D Security | Pass | 复用公开资料弹窗与既有聊天准入；不新增 PII 字段；不扩大聊天权限 |
| E Process | Pass | proposal 与 Delta 同批；原型先行写入范围；未触碰代码；独立 worktree 基于 `origin/main` |
| F Documentation | Pass | 正文中文、标识符英文；证据含路径与锚点；无绝对机器路径；`@rule:` 引用均指向存在锚点（原型规则改用路径） |
| G Traceability | Pass | C-1→「同行者资料卡展示」；C-2→「同行者资料卡展示」；C-3→「同行者字段回退」；C-4→「打开同行者公开资料」；C-5→「聊天入口按资格显示」；C-6→「没有其他同行者时的空态」；C-7→「人数口径与排序不变」；C-8 / C-10→Requirement 正文反向约束；C-9→「窄屏与双主题不溢出」 |

## Residual risks

- Living Spec 基线口径被 D1 有意替换，需 G1 具名确认；若 SA 要求保留「至少包含发布者本人」，则应改为「发布者以资料卡形式包含在同行者区」而非排除，会改变本轮 UI 方案。
- `styles.css` 是多人并行修改热点；P4 合并 `origin/main` 后需抽查同行者卡片样式是否仍在。
- E2E 选择器 `.detail-participants` 将被替换，`chat-entry.spec.ts` 必须同步；新增断言应优先语义定位。
- 组件测试若缺失，失败定位会落在 E2E 层；P3 需给出分层理由。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `proposal.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
