# P3 设计与任务记录 — add-match-reason

- **Change：** `add-match-reason`｜ **阶段：** P3（Design & decompose）
- **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

把九条场景落成设计取舍、ATDD 映射与可执行任务，并完成一致性检查。

## 2. 设计取舍（详见 [`design.md`](../../../openspec/changes/add-match-reason/design.md)）

| 编号 | 取舍 | 结论 |
|---|---|---|
| D1 | 打分放在哪一层 | 后端纯计算 `TripMatch` 单点定义，前端不重复算 |
| D2 | 百分比与分值关系 | `percentage = score`（0–100），不做二次归一 |
| D3 | 降级文案边界 | 有参照行程 / 仅有兴趣 / 无重合三种文案，`reasons` 至少一条 |
| D4 | 展示位置 | 卡片「匹配度 N%」+「匹配理由 …」；详情页原因列表 + 百分比 + 参照来源 |

## 3. ATDD 与任务

| 工件 | 路径 | 摘要 |
|---|---|---|
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/add-match-reason/atdd-design.md) | 五层策略 + 9 条场景映射 + Red/Green 计划 |
| 任务 | [`tasks.md`](../../../openspec/changes/add-match-reason/tasks.md) | T1 contract → T2/T3 backend → T4 frontend → T5 e2e → T6 docs |
| 任务层分布 | — | contract 1、backend 2、frontend 1、e2e 1、docs 1 |

## 4. 一致性检查

记录：[`consistency-lint.md`](../../../openspec/changes/add-match-reason/consistency-lint.md)

- BLOCKER 0 / WARNING 2 / SUGGESTION 2
- W-01（卡片视觉变化）已在 ATDD §3 约束；W-02（门禁工时序）由阶段记录补齐。

## 5. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | docs(p0): add-match-reason baseline stage and sign-off |
| P1 | docs(p1): add-match-reason intent stage and sign-off |
| P2 | docs(p2): add-match-reason delta spec G1 and sign-off |
| P3 | 本条提交 |

## 6. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| SA | Jacky、Karena | 设计取舍与场景覆盖一致；同意卡片文案约束 | 2026-11-16 |
| AO | Jay | 任务可在本迭代完成；承担 P4 | 2026-11-16 |
| SM | Lewis | P3 产出齐备，准入 P4 | 2026-11-16 |

**阶段结论：Pass**

## 7. 准入 P4 的条件

- Red 证据来自真实失败，不得先写实现。
- 本地验证报告贴真实命令与输出；CI 在目标提交上通过。
- G2 由 VL 签署。

## 8. R2 设计（筛选不参与匹配分，2026-11-16）

| 编号 | 取舍 | 结论 |
|---|---|---|
| D11 | 匹配分的参照物 | 只认「最近一条未结束的已发布行程 / 我的兴趣」；筛选只筛选与排序 |
| D11-1 | 详情一致性 | 列表与详情共用 `TripMatch.of` 与同一参照物，不把筛选状态带进详情 |
| D11-2 | 契约 | `Match.basis` 描述更新，版本 0.8.0 → 0.8.1（行为语义变化） |

ATDD：`atdd-design.md` §6 场景 10–13。任务：`tasks.md` R2 段 T7–T9。

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SA | Jacky、Karena | 接受 D11 与契约描述修订 | 2026-11-16 |
| AO | Jay | 承担实现与验证 | 2026-11-16 |
| SM | Lewis | 准入 P4 | 2026-11-16 |

## 9. R3 设计（匹配块按原型重排，2026-11-16）

依据 `docs/prototype/ui.js` 的 `tripCard` / `matchBlock` 与 `docs/prototype/styles.css` 的 `.tc-match / .match-ring`。

| 编号 | 取舍 | 结论 |
|---|---|---|
| D12 | 卡片匹配块 | `Progress type="circle"` 圆环内直接显示分值；理由改为一段纯文本（`、`/`，` 连接），不再加「匹配度 / 匹配理由」两层标签 |
| D13 | 卡片元信息 | 日期区间后增加「周X出发」，对应原型的 calendar / clock 两段信息；移除途经点数量 |
| D14 | 详情匹配面板 | 标题改为「为什么推荐给你」；圆环 + 理由文本 + `basis` + 可解释规则说明，保持单列布局（不改详情为双栏） |
| D15 | 组件边界 | 圆环仍用 antd `Progress`，颜色取 `--warn`；不恢复手写 SVG |

ATDD：`atdd-design.md` §7 场景 14–16。任务：`tasks.md` R3 段 T12–T13。

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 承担匹配块重排与验证 | 2026-11-16 |
| SA | Jacky、Karena | 待确认 D12–D15 | 待签 |
| SM | Lewis | 待确认是否准入 P5（P5 仍暂缓） | 待签 |