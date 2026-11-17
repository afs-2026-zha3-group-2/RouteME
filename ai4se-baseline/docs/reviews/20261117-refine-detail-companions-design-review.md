# Artifact review — refine-detail-companions / design

- **Verdict: Pass**
- **Scope:** focus=design（`@rule:artifact-review-gate` 的 P3 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`design.md`](../../openspec/changes/refine-detail-companions/design.md)
- **Supporting inputs:**
  - [`specs/trip-plans/spec.md`](../../openspec/changes/refine-detail-companions/specs/trip-plans/spec.md)（MODIFIED 1 Requirement / 12 Scenario）
  - [`atdd-design.md`](../../openspec/changes/refine-detail-companions/atdd-design.md)（场景分层 + Red 顺序 + fixtures）
  - [`tasks.md`](../../openspec/changes/refine-detail-companions/tasks.md)（同批产出，单独报告）
  - [`g1-decision.md`](../../openspec/changes/refine-detail-companions/g1-decision.md)（G1 Pass，D1 语义替换已批准）
- **Evidence:**
  - `openspec validate refine-detail-companions --strict` → `Change 'refine-detail-companions' is valid`
  - 规则核对：`rules/process/rules.md#spec-first`、`#artifact-review-gate`、`#tdd-cycle`；`rules/testing/rules.md#web-testing`；`rules/quality/rules.md#naming-conventions`、`#web-coding-style`；`rules/documentation/rules.md#sdd-artifacts`、`#document-conventions`
  - 现状核实：`TripDetailPage.tsx` 的 `detail-section` / `publisher-row` / `detail-participants`；`profileDisplay.ts#publisherSummary`；`ProfileContext.tsx#openProfile`；`Avatar.tsx` 的 `lg`；`styles.css` 中 `.detail-stops, .detail-participants` 等旧规则；`tripMessages.ts#detailParticipants`
  - 测试基线核实：`frontend/vite.config.ts` 的 `test.environment=node`、`include=src/**/*.test.ts`；`frontend/package.json` 无 Testing Library / jsdom；`e2e/tests/support.ts` 提供 `createTripViaApi` / `applyViaApi` / `acceptApplicationViaApi`
  - 数据核实：`V13__seed_demo_user_profiles.sql`（id 4 `school=''`、`job='产品经理'`）；`AuthRegisterRequest` 仅 `username` / `password` / `nickname`
  - 实现未开始：本报告不跑前端 / E2E 用例，测试证据由 P4 给出

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| DG-1 | SUGGESTION | `rules/quality/rules.md#naming-conventions` | `design.md` D2；`CompanionCard` 复用 `.publisher-*` | 同行者卡片复用发布者字号类，类名语义偏窄，后续若发布者卡片改版会同时影响同行者 | 保持现状（同源密度是 D2 的目标）；P4 在组件顶部加一行注释说明复用原因，不新建同义类名 | [inference] |
| DG-2 | SUGGESTION | `rules/testing/rules.md#web-testing` | `design.md` D6 | 组件层不新增 Testing Library 测试，与规则分层表的组件层建议存在缺口 | 按 D6 记录为例外：仓库无 jsdom / Testing Library，阻断项（纯逻辑单测 + 受影响 E2E）已满足；后续另开基础设施 change | [fact] |
| DG-3 | SUGGESTION | `rules/quality/rules.md#web-coding-style` | `design.md` D4；`tripMessages.detailParticipantsEmpty` | 既有 `detailParticipantsPending` 文案仍未被引用，本次不清理 | 不在本 change 删除（超出 Delta 范围）；列入后续文案清理 | [fact] |
| DG-4 | SUGGESTION | `rules/testing/rules.md#web-testing` | `design.md` D6；`atdd-design.md` §4 | 稀疏同行者依赖注册接口创建，测试多跨一个入口 | 保留真实数据方案（优于 route stub）；若注册接口将来加校验，替换为 route stub 并在用例注释说明 | [inference] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 4 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 单 capability `trip-plans` MODIFIED；零后端 / 契约 / 迁移，复用既有 `participants`；不新增模块层级 |
| B Quality | Pass | 新增两个前端文件（纯函数 + 卡片组件），落点符合 `frontend/src/trips` 现有组织；样式只追加、不重定义排版 |
| C Testing | Pass（D6 例外已记录） | 纯逻辑 `companions.test.ts` + E2E 六条；组件层缺口有书面理由与残余风险 |
| D Security | Pass | 聊天入口沿用既有资格条件，不扩大可见性；资料弹窗复用公开资料，无新增 PII |
| E Process | Pass | 设计在 ATDD 之后产出，任务未越过 Delta；三份工件同批，逐份报告 |
| F Documentation | Pass | 正文中文、标识符英文；引用改为选择器 / 符号而非行号；链接均为相对路径 |
| G Traceability | Pass | 12 条场景在设计自检表逐条映射到任务与 ATDD 行；三处基线场景标注「不改代码」 |

## Residual risks

- `styles.css` 为并行修改热点；P4 需在合并 `origin/main` 后抽查 `.detail-companions` / `.companion-card` 是否仍存在。
- 组件层无单测：卡片渲染回归只能由 E2E 发现，失败定位成本略高。
- 稀疏同行者依赖注册接口；若鉴权策略调整，相关 E2E 需同步。

## Next remediations (non-Gate)

- `/sdd:quality-checklist`（P3）→ `/sdd:atdd-apply`（P4）。
- `styles.css` 合并抽查与组件注释由当前开发者在 P4 落实。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `design.md` | 1 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认「全部批准」（当前开发者 = Lewis Liu） | 全文 |
| `design.md` | 2 / 2（非当前开发者且非 WAYNE） | Jacky | 2026-11-17 | 发起人当次会话指定（候选：Jay / Jacky / Karena / Neal） | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
