# AC / DoV review — add-credit-exit-restriction

- **Change：** `add-credit-exit-restriction`
- **Delta：** [`specs/credit-enforcement/spec.md`](specs/credit-enforcement/spec.md)（ADDED 9 Requirement / 46 Scenario）
- **需求：** [`REQ-024-exit-credit-restriction.md`](../../requirement-workspace/requirements/REQ-024-exit-credit-restriction.md)（S25-1 ~ S25-22 / S26-1 ~ S26-24）
- **日期：** 2026-11-17 ｜ **阶段：** P2（delta-craft review）
- **工具：** `openspec validate add-credit-exit-restriction --strict` → `Change 'add-credit-exit-restriction' is valid`

## Acceptance criteria（AC）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条 Requirement 至少一个可测试 AC | Pass | 9 条 Requirement 均有 1 个以上 Scenario；最少 2 个（Requirement 9），最多 8 个（Requirement 6）；46 个 Scenario 均可观察 | 无空 Requirement |
| AC-2 AC 可观察 | Pass | 分数变化（80→75 / 55）、账本字段、403 `CREDIT_RESTRICTED`、限制记录状态、五人展示面、系统取消原因、事务回滚均可断言 | 无「正常/合理」类措辞 |
| AC-3 高风险分支有负向/边界场景 | Pass | 原因缺失、非同行者/终态、60/59、7d/3d/72h/24h/12h 边界、0 分裁断、待核实转扣分、幂等并发、事务失败、并发写、无管理端 | 覆盖 D8 的「核实当时取下一序号」 |
| AC-4 不混入实现细节/模糊词 | Pass | 只写可观察行为（原因、分数、状态、错误码、展示、事务结果）；未写类/方法/表名以外的实现步骤 | 「同一事务」以「无半状态」可观察方式表述 |

**AC：4/4 Pass。**

## Definition of verified（DoV）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与提案一致 | Pass | proposal What Changes 9 组 ↔ Delta 9 条 Requirement；无静默扩张或遗漏；Out of Scope 与 Delta 的无管理端/无明细/不恢复一致 | 46 场景与 Ready 46 场景一一对应 |
| DoV-2 歧义已列出或解决 | Pass | 六档边界左闭右开、集合时间优先、月度计数、0 分裁断、待核实顺序、60/59、只读范围均在 Delta 写明；blocking OQ 0 | 残余为 P3 技术口径（契约/迁移号） |
| DoV-3 IO / SA 残余风险已记录 | Pass | 本文件「Residual risks」；G1 记录将固化 IO=WAYNE / SA=Jacky 的跟踪项 | 管理端、恢复入口、低信用测试数据 |
| DoV-4 不以业务实现冒充完成 | Pass | P2 只做 Delta 与评审；未写代码、契约、迁移 | `openspec validate` 通过 |
| DoV-5 Requirement 追溯到提案/需求 | Pass | S25-1~22 → Req1/2/3/4；S26-1~24 → Req5/6/7/8/9；两故事文件有 traceability 表 | 无孤儿 Scenario |

**DoV：5/5 Pass。**

## Residual risks

- 契约 / 迁移号暂定 0.15.0 + V21；`add-ai-itinerary` 曾声明同号，P3 排他确认。
- 待核实退出的「核实」领域行为没有管理端入口；本 change 只保证 pending，未来核实 change 承接。
- 低信用演示数据 / E2E 触发路径未定；P3 决定种子 / 夹具 / 直接记账。
- 自动清理跨域事务较大；P3 需评估批量与索引，P4 用集成测试锁定「无半状态」。
- `trip-companions` 活规格与 `refine-trip-chat` 未归档 Delta 的聊天语义差异不在本 change 解决；P5 前由 SA 追认。

## Conclusion

**G1-ready（AC 4/4 + DoV 5/5）。** 本文件不是 G1 决策；G1 由 IO + SA 具名签署。
