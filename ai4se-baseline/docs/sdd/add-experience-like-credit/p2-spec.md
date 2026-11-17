# P2 — add-experience-like-credit（REQ-022 旅行体验获赞增加信用分）

- **日期：** 2026-11-17 ｜ **记录人：** Lewis Liu（当前开发者，发起人确认）｜ **阶段：** P2 Pass（Delta / AC-DoV / lint 完成；G1 Pass，IO=Wanye / SA=Jacky）
- **Change：** `add-experience-like-credit`（`trip-experiences` ADDED 2 Requirement / 12 Scenario；`user-credit` ADDED 3 Requirement / 15 Scenario；合计 27）
- **基线：** `origin/main@64b38da`；worktree `.worktrees/add-experience-like-credit`

## 1. P2 产物

| 工件 | 路径 | 结论 |
|---|---|---|
| Delta Spec | `openspec/changes/add-experience-like-credit/specs/trip-experiences/spec.md` | ADDED 2 Requirement / 12 Scenario（点赞与取消、赞数与点赞态展示）；基线 7 Requirement / 22 Scenario 未改写 |
| Delta Spec | `openspec/changes/add-experience-like-credit/specs/user-credit/spec.md` | ADDED 3 Requirement / 15 Scenario（阶梯加分、月度上限、计分边界）；`add-credit-account` 的 7 Requirement 不重名、不覆盖 |
| AC / DoV 复核 | `openspec/changes/add-experience-like-credit/dov-ac-review.md` | **Pass**：AC 4/4 + DoV 5/5；基线保留；残余风险与 IO/SA 关注点已列 |
| 一致性检查 | `openspec/changes/add-experience-like-credit/consistency-lint.md` | **Pass**：0 BLOCKER / 0 WARNING / 5 SUGGESTION / 7 N/A |
| P2 质量报告 | `docs/ai4se-plugins/20261117-151904-quality-checklist-report.md` | Overall Pass（P2-1 / P2-2 / P2-4 Pass；P2-3 按 G1 未主张 Skipped） |
| 检查点日志 | `docs/ai4se-plugins/20261117-151843-quality-checklist-checkpoints.md` | C1=p2、C2=full-stage；probe 预期 FOUND / g1-decision 缺失属预期 |
| G1 决策 | `openspec/changes/add-experience-like-credit/g1-decision.md` | **Pass**（2026-11-17，IO=Wanye / SA=Jacky）；SA 接受双 capability 单 change 打包；后续跟踪 T1–T7 |

## 2. 校验证据

- `openspec validate add-experience-like-credit --strict` → `Change 'add-experience-like-credit' is valid`。
- 纯文档阶段：无代码 / 契约 / 迁移 / 原型改动。
- DoV 场景映射：L-1 ~ L-8 → 点赞与取消；D-1 / D-2 / E-2 → 赞数与点赞态展示；T-1 ~ T-6 / E-1 → 阶梯加分；T-7 ~ T-10 → 月度上限；L-8 / D-3 / T-3 → 计分边界。

## 3. G1 已决事项

| 事项 | 责任 | G1 结论 |
|---|---|---|
| 双 capability 偏离 | SA | **接受**单 change 跨 `trip-experiences` / `user-credit` 打包，不要求拆分 |
| 「信用记录」不做可见面 | IO | 确认按用户裁决 D2 执行 |
| issue 优先级 P0 / P1 | SM | 记入后续跟踪 T6，不影响 G1 |
| 月度示例口径 | SA / Dev | 确认采用通用截断公式（每档应发恒为 +1）；契约与并发设计 P3 落地 |
| 契约 / 迁移号 | Dev | 后续跟踪 T3，P3 排他确认（当前 0.14.0 / V20；`add-ai-itinerary` 声明 0.15.0 + V21） |

## 4. 下一阶段

- P3：`/sdd:atdd-design` → `/sdd:task-plan`（原型先行、契约字段 / 错误码定稿、月度并发保障设计）。
