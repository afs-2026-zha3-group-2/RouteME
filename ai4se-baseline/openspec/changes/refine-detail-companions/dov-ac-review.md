# AC / DoV review — refine-detail-companions

- **Change:** `refine-detail-companions`
- **Phase:** `p2`（Delta Spec 复核，G1 输入）
- **Delta 路径:** `openspec/changes/refine-detail-companions/specs/trip-plans/spec.md`（MODIFIED：1 Requirement / 12 Scenario）
- **Requirement 来源:** `requirement-workspace/requirements/REQ-020-detail-companion-cards.md` §4（C-1 ~ C-10）
- **Proposal:** `openspec/changes/refine-detail-companions/proposal.md`
- **Timestamp:** 2026-11-17T12:05+08:00
- **Artifact level:** 2（proposal + 1 Delta Spec；无 `design.md` / `tasks.md`）
- **Tooling:** `openspec validate refine-detail-companions --strict` → `Change 'refine-detail-companions' is valid`；Delta 为 MODIFIED 1 个 Requirement

## Verdict

**AC 4/4 Pass ｜ DoV 5/5 Pass → G1-ready（等签署）**

## AC 检查

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条 Requirement 至少一个可测 AC | Pass | 唯一 Requirement 含 12 个 Scenario（基线 4 + 新增 / 修改 8） | 卡片展示、字段回退、弹窗、聊天权限、空态、人数、响应式均可观察 |
| AC-2 AC 可观察 | Pass | 断言面：卡片数量与字段、`.detail-participants` 后继结构、资料弹窗、`#/chat/{tripId}/{memberId}`、空态文本、`3/4` 人数、宽度与主题 | 无「好看」「正常工作」类模糊表述 |
| AC-3 高风险处有负向 / 边界场景 | Pass | 发布者过滤、只有发布者空态、字段缺失回退、未申请 / 待处理 / 已拒绝 / 已取消无聊天、本人无自我聊天、窄屏与深色 | 覆盖展示重复、权限越界、空数据与布局四类风险 |
| AC-4 不把实现细节伪装成 AC | Pass | Delta 只约束可观察结果与反向约束（零接口 / 零迁移 / 设计令牌）；不指定组件名、类名或文件 | `participants` 是既有响应契约，不是实现细节；`Avatar lg` 等只在需求条目与提案中出现 |

## DoV 检查

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与提案一致 | Pass | 提案 In scope 10 条 → Delta 1 Requirement；Out of scope 全部无对应 Requirement | 未静默扩到申请 / 接受 / 退出 / 聊天准入或其它页面 |
| DoV-2 歧义已列出或解决 | Pass | 需求 §8：blocking 4 条由 D1–D4 resolved；非阻塞 3 条 resolved、2 条 deferred 且有 owner | 空态精确文案与组件测试分层留给 P3；不阻塞 G1 |
| DoV-3 角色关注点已记录 | Pass | IO：D1 语义变更 / D2 信息密度；SA：基线保留 / 空态与响应式验收 | 见下方「IO / SA 残余关注」 |
| DoV-4 未主张已实现业务 | Pass | P2 无代码 / 原型 / 契约 / 迁移变更；工作区仅 P1 工件 | 实现与原型属 P3 / P4 |
| DoV-5 Requirement 可追溯到提案 / 已批准需求 | Pass | 10/10 场景映射见下表；无孤儿 Requirement、无未覆盖 AC | C-8 / C-10 由 Requirement 正文反向约束承接 |

## Requirement 映射（REQ-020 → Delta）

| REQ-020 场景 | Delta Requirement | Delta Scenario |
|---|---|---|
| C-1 同行者卡片展示 | 查看行程详情与清晰的状态 | 查看行程详情 / 同行者资料卡展示 / 发布者不在同行者列表重复 |
| C-2 卡片字段与发布者同构 | 同上 | 同行者资料卡展示 |
| C-3 摘要回退 | 同上 | 同行者字段回退 |
| C-4 整卡打开公开资料 | 同上 | 打开同行者公开资料 |
| C-5 聊天入口独立可用 | 同上 | 同行者卡片聊天入口按资格显示 |
| C-6 发布者不在列表 / 空态 | 同上 | 发布者不在同行者列表重复 / 没有其他同行者时的空态 |
| C-7 人数与排序不变 | 同上 | 同行者人数口径与排序不变 |
| C-8 无后端与契约变化 | 同上 | Requirement 正文反向约束（零接口 / 零迁移 / 复用 `participants`） |
| C-9 响应式与双主题 | 同上 | 窄屏与双主题不溢出 |
| C-10 原型先行与令牌一致 | 同上 | Requirement 正文反向约束（复用设计令牌、禁止十六进制色值）；原型先行属 P3 / P4 过程约束 |

## Living Spec 基线保留

Living Spec `openspec/specs/trip-plans/spec.md:191-219`「查看行程详情与清晰的状态」共 4 个基线场景：

| 基线场景 | 处置 | 说明 |
|---|---|---|
| 查看行程详情 | **MODIFIED** | 保留原展示项；新增「发布者以独立资料卡展示」「当前同行者区以资料卡展示全部已接受同行者」；原句「当前同行者至少包含发布者本人」按 D1 替换为「发布者不在同行者列表重复」 |
| 状态标识清晰 | 保留 | 原文未改 |
| 同行申请入口按资格显示 | 保留 | 原文未改（含原有两组 Given / When / Then） |
| 已结束行程展示游后分享区占位 | 保留 | 原文未改 |

**基线保留 4/4（1 条修改 / 3 条原样）。** D1 的语义替换是本 change 唯一的 Living Spec 口径变更，需 G1 具名确认。

## IO / SA 残余关注

| 关注点 | 归属 | 说明 |
|---|---|---|
| D1 替换「至少包含发布者本人」 | IO / SA | 发布者保留独立资料卡、不再进入同行者列表；人数仍含发布者。若 SA 要求「同行者区也要包含发布者」，需改回并调整 UI 方案 |
| 空态文案与位置 | SA / Dev | Delta 只约定「可读空态」；P3 定稿 `tripMessages` 键与文案，E2E 断言可见文本 |
| 组件测试分层 | SA / Dev | 仓库无 `TripDetailPage` 组件测试；P3 决定是否补 Testing Library，并说明 E2E-only 理由 |
| `styles.css` 合并 | Dev | 多人并行修改热点；P4 追加式新增、收敛旧 `.detail-participants` 两处规则，合并后抽查 |
| E2E 选择器 | Dev | `chat-entry.spec.ts` 依赖 `.detail-participants`；P4 同步更新，优先语义定位 |
| 原型先行 | IO / SA | 先改 `docs/prototype/ui.js` 的 `compPanel` 与 `styles.css`，浏览器确认后再改实现 |

## Next

- 一致性检查：`openspec/changes/refine-detail-companions/consistency-lint.md`（phase=p2）
- G1：`/sdd:g1-decision-record`（需 IO + SA 具名签署）
