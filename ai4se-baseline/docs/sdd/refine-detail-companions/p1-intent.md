# P1 — refine-detail-companions（REQ-020 灵感详情页同行者卡片化）

- **日期：** 2026-11-17 ｜ **记录人：** Lewis Liu（当前开发者，发起人确认）｜ **阶段：** P1 Pass
- **需求：** REQ-020 灵感详情页同行者卡片化（用户验收反馈：同行者只展示姓名，要求与发布者一样的 card）
- **能力：** `trip-plans`（MODIFIED：「查看行程详情与清晰的状态」的同行者展示口径）；`trip-companions` / `user-profiles` 只读消费
- **分支 / 基线：** `.worktrees/refine-detail-companions` / `feature/refine-detail-companions` / `origin/main@6f9cb46`
- **P0：** 跳过（仓库基线、规则与工具链已由既有 change 建立；本需求零后端 / 契约 / 迁移，按 P1 直接核对现状）

## 1. 输入与现状核对

| 输入 | 路径 | 结论 |
|---|---|---|
| 用户指令 | 当次会话（2026-11-17） | 详情页同行者只展示姓名，视觉上与发布者资料卡断裂；要求修改 |
| 现状页面 | `RouteME/frontend/src/trips/TripDetailPage.tsx:468-520` | 发布者 `publisher-row` 资料卡；同行者 `ul.detail-participants` 纯姓名 + 聊天链接 |
| 数据来源 | `RouteME/frontend/src/types.ts:21-30,119-125`；`DemoUserResponse.java:10-36`；`ApplicationServiceImpl.java:193-202` | `participants: DemoUser[]` 已含学校 / 专业 / 职业 / 城市 / 简介 / 兴趣 / 头像；发布者在最前 |
| 资料弹窗 / 头像 | `RouteME/frontend/src/profiles/ProfileContext.tsx:27-41`；`RouteME/frontend/src/shell/Avatar.tsx:12-46` | `openProfile(userId)` 与 `lg` 头像可直接复用 |
| 契约 / 迁移 | `RouteME/openapi.yaml:1890-1895`；Flyway | `participants` 字段与描述不变；无新增迁移 |
| 原型 | `docs/prototype/ui.js:509-520`；`docs/prototype/styles.css:712-725` | 同行者当前是 `.companion` 紧凑行（含发布者），需先改原型 |
| E2E | `RouteME/e2e/tests/chat-entry.spec.ts:78-84` | 依赖 `.detail-participants` 下的「聊天」链接 |
| Living Spec | `openspec/specs/trip-plans/spec.md:191-219` | 详情页展示当前同行者，且「至少包含发布者本人」；需 MODIFIED 展示口径 |

## 2. 用户裁决

| id | 议题 | 裁决 |
|---|---|---|
| D1 | 列表范围 | 只展示同行者（不含发布者）；无其他同行者时展示空态 |
| D2 | 卡片信息密度 | 与发布者卡片一致：头像 + 昵称 + 学校 / 专业（或职业 / 城市）+ 简介 + 兴趣标签；空字段省略 |
| D3 | 卡片交互 | 整卡主体打开公开资料弹窗；聊天为卡片内独立入口，可见条件不变 |
| D4 | 开发位置 | 独立 worktree `feature/refine-detail-companions`，基于 `origin/main` |

## 3. 产出

| 工件 | 路径 | 说明 |
|---|---|---|
| 意图捕获 | `requirement-workspace/intents/REQ-020-detail-companion-cards.md` | 原始意图、现状证据、D1–D4、Discovery Go |
| Ready 需求 | `requirement-workspace/requirements/REQ-020-detail-companion-cards.md` | 10 场景 C-1 ~ C-10；blocking OQ 0；DoR BLOCKER 0 |
| Deep-dive | `requirement-workspace/deep-dive.md`「REQ-020 增补」 | ① 数据契约（复用 DemoUser）/ ② 边界归属 / ③ 跨 REQ 一致 / ④ 展示契约 |
| 影响面 | `requirement-workspace/impact-brief.md` §20 | 20.1–20.8；零后端 / 契约 / 迁移 |
| 登记 | `requirement-workspace/registry.md`、`handoff.md` | REQ-020 → `refine-detail-companions` |
| 提案 | `openspec/changes/refine-detail-companions/proposal.md` | 问题 / 范围 / 影响面 / 决策 / 验收信号 / 残余风险 |
| Delta Spec | `openspec/changes/refine-detail-companions/specs/trip-plans/spec.md` | MODIFIED 1 Requirement / 12 Scenario；基线 4 场景保留，新增 8 个同行者展示场景 |
| 提案评审 | `docs/reviews/20261117-refine-detail-companions-proposal-review.md` | Pass（0 BLOCKER / 0 WARNING / 5 SUGGESTION） |
| 规格评审 | `docs/reviews/20261117-refine-detail-companions-spec-review.md` | Pass（0 BLOCKER / 0 WARNING / 5 SUGGESTION） |
| P1 质量报告 | `docs/ai4se-plugins/20261117-115805-quality-checklist-report.md` | Overall Pass；P1-5 / P1-6 可选 Skipped |
| 检查点日志 | `docs/ai4se-plugins/20261117-115737-quality-checklist-checkpoints.md` | C1=p1（skipped-preanswered）、C2=full-stage；probe 全部 FOUND |

## 4. 校验证据

- `openspec validate refine-detail-companions --strict` → `Change 'refine-detail-companions' is valid`。
- `openspec show refine-detail-companions --json` 对项目中文「## 问题」标题返回 `Change must have a Why section`（既有约定差异，不影响 `validate --strict`；记为工具偏差）。
- P1 质量报告 required 4/4 Pass；P1-5（explore）/ P1-6（agent-evalset）未运行 → Skipped，不阻断。
- 未改动任何业务代码、后端、契约、迁移或原型；本阶段只写工件与评审。

## 5. 工件签署（`@rule:artifact-review-gate`）

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 |
|---|---|---|---|---|
| `proposal.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 |
| `specs/trip-plans/spec.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 |
| proposal 评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 |
| proposal 评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） |
| spec 评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 |
| spec 评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） |

`all-specs-review` 安排在 P3 全链（proposal + Delta + design + tasks + 实现 / 测试）完成后执行；P1 以 proposal / spec 两份工件评审为门。**P1 签署位 6/6 齐备。**

## 6. 残余风险与偏离

| 项 | 说明 / 处置 |
|---|---|
| D1 替换 Living Spec 基线口径 | Delta 将「当前同行者至少包含发布者本人」替换为「发布者不在同行者列表重复」；P2 G1 需 IO / SA 具名确认 |
| `styles.css` 合并风险 | 该文件多人并行修改热点；P4 新样式追加到末段、收敛旧 `.detail-participants` 两处规则，合并后抽查 |
| E2E 选择器 | `chat-entry.spec.ts` 依赖 `.detail-participants`；P4 必须同步更新，新增断言优先语义定位 |
| 组件测试 | 当前无 `TripDetailPage` 组件测试；P3 ATDD 决定是否补 Testing Library 覆盖，并说明分层理由 |
| 治理漂移 | 权威规则区无 `prototype-ui-alignment` 锚点；本阶段工件改用 `docs/prototype` 路径引用，后续 `/sdd:rules-govern` 处理 |
| 提交约定 | 按 `docs/sdd/README.md` 阶段提交（`docs(p1): refine-detail-companions …`）；P1 只本地提交，不 push |
| P0 | 跳过并记录理由（零后端 / 契约 / 迁移，基线已由既有 change 建立） |

## 7. 下一阶段

- `/sdd:delta-craft`（P2）：AC / DoV 复核、`consistency-lint`，并把 D1 的语义变更提交 G1（IO + SA）。
- P2 前置：确认 `dov-ac-review.md` 中「基线 1 条被替换 / 其余 3 条保留」的记录；确认空态文案与组件测试分层在 P3 落点。
