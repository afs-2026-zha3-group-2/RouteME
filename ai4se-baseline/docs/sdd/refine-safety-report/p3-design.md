# P3 设计与任务记录 — refine-safety-report

- **Change：** `refine-safety-report`｜ **阶段：** P3（Design & decompose）
- **日期：** 2026-11-16｜ **记录人：** Jacky（AO）
- **依据：** Delta Spec rev2（9 场景）、G1 rev2 Pass（IO WAYNE / SA Karena）、裁决 D5（位置 B：只保留页头入口，提示全部移除）

## 1. 阶段目标

把九条已接受场景落成设计取舍、ATDD 映射与可执行任务，并证明 Spec ↔ Design ↔ Tasks ↔ ATDD 相互对齐。本阶段不写生产代码，也不做 Gate 裁决。

## 2. 设计前的输入核对

| 输入 | 状态 |
|---|---|
| Delta Spec | 1 Requirement / 9 Scenario；`validate --strict` valid；`deltaCount: 2` |
| 后端 | `POST /api/reports` 返回 `201` + `{ "received": true }`；`ReportControllerTest` / `OpenApiTest` 已存在且无需改动 |
| 聊天面 | 已实现：`ChatController`（`GET` / `POST /trips/{tripId}/messages`、`GET /me/chat-partners`）、`ChatPage` 的 5 秒轮询、发送、已结束只读分支；由 `companions.spec.ts` 覆盖。场景 #4 只需页头入口，不需要重建聊天 |
| 设计预览 | `preview/safety-report.html`，位置 B，已由用户选定 |

**按用户要求核查「聊天是否已实现」：** 已实现。`/#/chat/1/2` 现在就能渲染已结束行程的只读会话（`该行程已结束，只能查看历史消息。`），且该状态下发送框隐藏。本次只给 `.chat-head` 增加 `举报这位用户`（实时与只读都显示），不触碰 `ChatService` 与聊天状态机。

## 3. 设计取舍

完整论证见 [`design.md`](../../../openspec/changes/refine-safety-report/design.md)。

| 编号 | 取舍 | 结论 |
|---|---|---|
| D1 | 详情页入口落点 | 放进 `.detail-badges` 末尾，`margin-left: auto`；仅非发布者渲染。与状态标签同一行，窄屏换行不隐藏 |
| D2 | 聊天页入口落点 | 作为 `.chat-head` 最后一个子节点，`margin-left: auto; align-self: flex-start; flex: none`；常驻，含只读 |
| D3 | `SafetyNote` 去留 | 仅保留给 `ShareExperiencePage`；删除 `onReport`、操作按钮与失效导入 |
| D4 | `ReportModal` 行为 | 标题与目标行随对象变化；三态都有身份保密与紧急求助；回执 `已收到，我们会处理` + 单一 `关闭`；仅 `received === true` 进回执；失败保留原因与说明 |
| D5 | 文案与原因映射 | 新增 7 个键，改写 `reportSuccess`，删除 4 个因此失效的通用键；四类原因枚举不变 |
| D6 | 样式 | 三条规则，只用既有令牌；不新增断点 |
| D7 | 测试归属 | 公共 E2E helper 抽到 `e2e/tests/support.ts`；新增 `safety-report.spec.ts`；两个既有 spec 共四处断言更新 |

## 4. ATDD 与任务

| 工件 | 路径 | 摘要 |
|---|---|---|
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/refine-safety-report/atdd-design.md) | API 仅回归；9 场景 → 既有 spec + E1–E7；RV-1–RV-7 反向检查；夹具；本地 vs CI 门禁 |
| 任务 | [`tasks.md`](../../../openspec/changes/refine-safety-report/tasks.md) | T1 e2e（红）→ T2 文案 + 弹窗 → T3 两处页头 → T4 `SafetyNote` → T5 样式 → T6 全量回归 |
| 任务层分布 | — | e2e 1、frontend 4、verify 1 |
| NFR 测试 | `atdd-design.md` §8 | **不纳入，已记录**：无新端点 / 存储 / 任务 / 异步路径；无障碍与三档响应式作为验收断言落地，不单列 NFR 章节 |

## 5. 对齐自检

记录在 `tasks.md` 末表：14 项全 Pass，结论 Pass。

- 9/9 场景均有测试与任务（7 条新用例 + 2 处既有 spec）。
- RV-1–RV-7 覆盖全部非目标，包括后端 / 契约冻结。
- G1 rev2 中属于 P3 的 follow-up 已在本次收口：`received=true` 守卫（D4 / E5）、`SafetyNote` 去留（D3 / T4 / RV-4）、原因 ↔ 枚举（D5）、隐私黑名单范围（E7）、旧断言同步（T1）、后端不变（RV-6 / T6）。
- 一条任务只落一层，最后一条是验证 / 回归。

## 6. 需要带下去的发现

| # | 发现 | Owner / 时机 |
|---|---|---|
| F1 | `proposal.md` / `REQ-012` 列出的两处回退文案（「尚未填写，出发前请在聊天中确认」/「待确认」）只存在于 `docs/prototype/ui.js`，实现从未渲染。移除在代码层已为真，E1 / E2 保留缺失断言防回归 | P5 归档说明 |
| F2 | 回执态当前复用 `createCancel` 作 `okText` / `cancelText`，出现两个 `取消`；本次用 `footer` 收成一个 `关闭`，`companions.spec.ts` 中依赖 `.ant-btn-primary` 的关闭断言同步改为具名按钮 | T1 / T2 |
| F3 | E2E 不在 CI 内，回执与页头换行必须本地验证并写入 `p4-verify.md` | T6 / P4 |
| F4 | 三档判定按 spec 评审 S2-04 落成可执行写法：1440 / 768 入口与标签同行靠右，390 允许换行但必须可见、不溢出 | T1 / T5 |
| F5 | `preview/ui-preview.html` 用同一组类名与 CSS 规则验证了落点：详情页三档入口均与状态标签同一行、右缘距卡片内边 17px；聊天页 1440 / 768 与头像对侧同行、390 换到文字下方；无横向溢出、控制台 0 错误；回执态 footer 仅一个「关闭」 | T1 / T5 对照 |

## 7. 质量门禁

- `/sdd:quality-checklist stage=p3` → **Pass**（P3-1–P3-4 全 Pass）。
- 报告：[`docs/ai4se-plugins/20261116-164935-quality-checklist-report.md`](../ai4se-plugins/20261116-164935-quality-checklist-report.md)；检查点日志同名 `-checkpoints.md`。

## 8. 提交链

| 阶段 | 提交 |
|---|---|
| P1 | `30085eb` docs(p1): … intent stage |
| P2 rev1 | `2ddfa03` / `43cffaa` rebase |
| P2 rev2 | `43cffaa` rebase spec on report-entry-only design · `255bd29` G1 rev2 approval |
| P3 | `docs(p3): refine-safety-report design header report entry and ATDD plan`（本阶段，仅本地） |

不 push。分支上还有并行会话的提交，因此只暂存 §9 列出的文件。

## 9. 本阶段产出

- `openspec/changes/refine-safety-report/atdd-design.md`
- `openspec/changes/refine-safety-report/design.md`
- `openspec/changes/refine-safety-report/tasks.md`
- `openspec/changes/refine-safety-report/preview/ui-preview.html`（四页切换 + 三档宽度 + 弹窗三态 + 明暗主题的实现预览，供 P4 前的视觉确认）
- `docs/sdd/refine-safety-report/p3-design.md`
- `docs/ai4se-plugins/20261116-164935-quality-checklist-report.md`（+ 同名 `-checkpoints.md`）
- `docs/sdd/README.md`（阶段索引 P3 链接）

## 10. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 状态 |
|---|---|---|---|
| AO（当前开发） | Jacky | 接受 D1–D7 与 T1–T6，承接 P4 | **待批准** —— 先跑 `design.md` / `tasks.md` 的工件评审 |
| SA | Karena | D5 落点与具名验收口径一致（两个入口、无提示、回执文案） | G1 rev2 已签；仅当评审提出时才需追加 P3 确认 |
| IO | WAYNE | 无需新增输入；REMOVED + ADDED 迁移已在 G1 rev2 签署 | 无需重签 |
| VL | Neal | 独立验证 | P4 / G2 |

**阶段结论：待工件评审。** `design.md` 与 `tasks.md` 先经 `/sdd:quality-checklist` 与 `all-specs-review` 出具评审报告并由 AO 具名批准，本记录才可标 Pass，P4 才可开工。

## 11. 准入 P4 的条件

- T1 的红态在实现前取得证据，不允许先绿后补。
- `ReportControllerTest` / `OpenApiTest` 未改且绿；`git diff main -- RouteME/backend RouteME/openapi.yaml` 为空。
- 本地证据覆盖后端测试、前端 build + vitest、整套 Playwright，以及 390 / 768 / 1440 人工核对。
- G2 由 VL Neal 签署。