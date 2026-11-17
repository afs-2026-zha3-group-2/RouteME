# P1 阶段记录 — add-credit-exit-restriction

- **Change：** `add-credit-exit-restriction`（能力 `credit-enforcement` ADDED）｜ **需求：** REQ-024 ｜ **故事：** S25 退出同行扣减信用分 + S26 低信用分自动限制账号
- **阶段：** P1（Intent & proposal）｜ **日期：** 2026-11-17
- **记录人：** Lewis Liu（当前开发者）
- **分支：** `feature/add-credit-exit-restriction`（P0 基线 `main@ec360dc`）

## 1. 阶段目标

把用户卡片中的 Story 4 + Story 5 收敛为可判定的 Ready 需求、影响面、OpenSpec 提案与 Delta 草稿，并完成 P1 工件评审与质量自检；P1 不写业务代码。

## 2. P1 产出

| 类型 | 路径 | 说明 |
|---|---|---|
| 意图 | `requirement-workspace/intents/REQ-024-exit-credit-restriction.md` | 原始意图、六档扣分、限制规则、用户裁决 D1–D17、证据锚点、排除项 |
| Ready 需求 | `requirement-workspace/requirements/REQ-024-exit-credit-restriction.md` | 六字段 + 46 场景（S25-1~22 / S26-1~24）+ 15 条 blocking OQ resolved + DoR 12 项 Pass |
| Deep-dive | `requirement-workspace/deep-dive.md`「REQ-024 增补」 | ① 数据契约 / ② 边界归属 / ③ 跨 REQ 一致性 / ④ 通知展示契约 + 探针 |
| 影响面 | `requirement-workspace/impact-brief.md` §22 | requirement set / as-is / delta / blast radius / artifact / dual-track / risks / split |
| 故事 S25 | `requirement-workspace/stories/add-credit-exit-restriction-exit.story.md` | 退出扣分 / 待核实 / 三入口 / 月度 / 幂等 |
| 故事 S26 | `requirement-workspace/stories/add-credit-exit-restriction-restriction.story.md` | <60 触发 / 只读 / 自动清理 / 展示 / 自动解除 |
| 故事清单 | `requirement-workspace/stories.md`「Story list — REQ-024」 | S25 / S26 表 + traceability + notes |
| 提案 | `openspec/changes/add-credit-exit-restriction/proposal.md` | Why / What / Out of Scope / Capabilities / Impact / 决策 / 验收信号 / 残余风险 |
| Delta 草稿 | `openspec/changes/add-credit-exit-restriction/specs/credit-enforcement/spec.md` | ADDED 9 Requirement / 46 Scenario |
| 登记 | `requirement-workspace/registry.md`、`handoff.md` | REQ-024 行 + 边界说明 |
| 质量报告 | `docs/ai4se-plugins/20261117-153000-quality-checklist-report.md`（+ checkpoints） | P1 Overall Pass；P1-5 / P1-6 Skipped |

## 3. Discovery / 需求收敛

- **Discovery：** Go（light intake）。两个故事共享「退出扣分 → <60 限制」信用执行链，用户 D1 明确合并为一个 change。
- **能力边界：** 新增 `credit-enforcement`（ADDED）；`user-credit` 提供账户 / 账本，`trip-companions` 提供退出 / 申请，`trip-cancellation` 提供取消事件；不改三者未归档 Delta。
- **需求口径：** 六档扣分、旅行中 -15、同月第 2 次起翻倍、免责待核实、0 分裁断计数、<60 自动限制、只读范围、自动撤回/解除/取消、系统取消原因、≥60 自动解除、不恢复关系、无管理端。
- **Open questions：** blocking 15 条全部 resolved；非阻塞 3 条 deferred（未来核实接口 / 恢复入口形态 / 低信用测试数据）+ 1 条 resolved（事务与幂等）。
- **DoR：** 12 项全 Pass；A0 ⑨–⑫ 全过（deep-dive 四表 + 探针无 `{TBD}`）。

## 4. 影响面摘要

- **信用域：** `CreditService.book` 新增退出 / 零值待核实调用方；新增限制执行服务；读取扩展 `credit_restricted`。
- **行程域：** 退出接口扩展原因/预览/确认；系统取消路径覆盖 ONGOING；`TripCancelledEvent` 复用 + 系统原因。
- **同行域：** `trip_applications.status_reason`；申请列表 / 我的旅行 / 聊天会话读取新字段。
- **体验 / 资料 / 聊天：** 发布、编辑、发消息、改资料/头像增加限制守卫。
- **契约 / 迁移：** `openapi.yaml` 0.19.0（暂定）；`V25`（暂定）新增 `credit_exit_event` + `credit_restriction` + `status_reason`。

## 5. 提案与 Delta

- **提案：** `openspec/changes/add-credit-exit-restriction/proposal.md`；Out of Scope 显式排除管理端、明细、恢复关系、安全学习/客服、通知、正向加分、修改未归档 Delta。
- **Delta：** `specs/credit-enforcement/spec.md`（ADDED 9 Requirement / 46 Scenario）：
  1. 退出原因与预计信用影响（6）
  2. 出发前退出扣分阶梯与时间边界（7）
  3. 旅行中退出与月度累进（4）
  4. 免责退出与待核实（4）
  5. 信用限制触发与记录（5）
  6. 受限账号只读与保留能力（8）
  7. 限制触发的自动清理（6）
  8. 限制展示与自动解除（4）
  9. 无管理员边界与事务一致性（2）
- **校验：** `openspec validate add-credit-exit-restriction --strict` → `Change 'add-credit-exit-restriction' is valid`。

## 6. 工件评审与签署

| 工件 | 报告 | 结论 | 工件签署 | 报告签署 |
|---|---|---|---|---|
| `proposal.md` | `docs/reviews/20261117-add-credit-exit-restriction-proposal-review.md` | Pass（0 BLOCKER / 0 WARNING / 4 SUGGESTION） | WAYNE（2026-11-17） | WAYNE + Lewis Liu（2026-11-17） |
| `specs/credit-enforcement/spec.md` | `docs/reviews/20261117-add-credit-exit-restriction-spec-review.md` | Pass（0 BLOCKER / 0 WARNING / 4 SUGGESTION，1 当场收口） | WAYNE（2026-11-17） | WAYNE + Lewis Liu（2026-11-17） |

- 两份报告的建议项：契约/错误码形态、待核实领域方法、低信用测试数据、`trip-companions` 聊天语义差异、迁移号排他；均不阻断 P1，承接至 P3 / P5。

## 7. P1 质量自检

- 报告：`docs/ai4se-plugins/20261117-153000-quality-checklist-report.md`（Overall **Pass**）。
- P1-1 Pass（workdir / intents / requirements / stories / deep-dive / impact / registry / handoff）。
- P1-2 Pass（blocking OQ 0；DoR BLOCKER 0）。
- P1-3 Pass（impact §22）。
- P1-4 Pass（proposal + Delta + 两故事；validate valid）。
- P1-5 / P1-6 Skipped（未运行 explore / evalset）。
- 工具偏差：本机无 bash，按模板手工产出 checkpoint 与报告；PowerShell 下 `npm` / `npx` 用 `.cmd` 入口。

## 8. 阶段结论

**P1 Pass。** 需求、影响面、提案、Delta 草稿、两故事与工件评审均已齐备；P1 未写业务代码。下一步 P2：`/sdd:delta-craft` → AC/DoV → consistency-lint → G1。

## 9. 阶段提交链

| 阶段 | 提交 | 说明 |
|---|---|---|
| P0 | `41c173d` | `docs(p0): add-credit-exit-restriction record the baseline and scope decisions` |
| P1 | 本次提交 | `docs(p1): add-credit-exit-restriction add REQ-024, proposal and delta draft` |

## 10. 准入 P2 的条件

- Delta 的 9 Requirement / 46 Scenario 可判定，且与 Ready 46 场景一一对应。
- 契约 / 迁移号在 P2 / P3 按实际落地顺序排他确认。
- 待核实退出的领域行为与「无管理端」边界在 P2 保持不冲突。
- 任何新增/修改场景必须回写 `requirements/REQ-024-exit-credit-restriction.md` 与两份故事文件，保持 traceability。
