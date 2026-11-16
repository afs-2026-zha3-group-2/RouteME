# AC / DoV review — add-match-reason

- **Change：** `add-match-reason`（capability `trip-companions` MODIFIED，REQ-003 / S07）
- **Reviewed at：** 2026-11-16（+0800）
- **Inputs：** [`proposal.md`](proposal.md)、[`specs/trip-companions/spec.md`](specs/trip-companions/spec.md)、issue #9、原型 `docs/prototype/stories.html` S07、实现 `TripMatch` / `MatchServiceImpl` / `TripCard` / `TripDetailPage`
- **裁决基线：** issue #9 的验收标准 + P1 阶段记录 [`docs/sdd/add-match-reason/p1-intent.md`](../../../docs/sdd/add-match-reason/p1-intent.md) §5 的四项裁定。

## Acceptance criteria（AC）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条需求至少一个可测 AC | Pass | Delta Spec 1 条 Requirement（MODIFIED）/ 9 个 Scenario | 权重、上限、降级、双展示、默认排序均有 Given/When/Then |
| AC-2 AC 可观察，无「工作良好」类表述 | Pass | Then 断言分值、原因文本、元素可见性与排序序列 | 不出现类名与 SQL |
| AC-3 高风险负向/边界已列出 | Pass | 共同兴趣 1 个 = 10、3 个 = 20（封顶）、全命中 = 100、无重合、无参照物 | 边界值与 `TripMatch` 常量一致 |
| AC-4 AC 不是伪装的实现细节 | Pass | 只写业务分值与用户可见文案 | 具体类与方法属 P3 |

## Definition of verified（DoV）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与 proposal 一致 | Pass | 只做匹配原因；推荐算法、多语言、排序实现均排除 | `proposal.md` §范围 |
| DoV-2 歧义已列出或解决 | Pass | `percentage = score`、参照物优先级、原因非空、卡片文案四点在 P1 裁定 | `p1-intent.md` §5 |
| DoV-3 IO / SA 残余风险已记录 | Partial | 见 §残余风险 | 无阻塞 |
| DoV-4 未声称完成业务实现 | Pass | 本文件只评审规格 | 实现证据在 P4 |
| DoV-5 每条需求可追溯 | Pass | 场景 ← Delta Spec ← `proposal.md` ← REQ-003 / issue #9 | 单 capability |

## 需求 → 场景映射

| 来源（issue #9 AC） | Delta Spec 场景 |
|---|---|
| 目的地 50 / 日期相同 30 / 差一天 20 / 共同兴趣每项 10 且 ≤ 20 | 目的地相同计 50 分；出发日期相同计 30 分、相差一天计 20 分；共同兴趣每项 10 分且合计不超过 20 分 |
| 一句话原因，含命中维度 | 展示匹配理由与百分比 |
| 不能只给一个百分比数字 | 展示匹配理由与百分比；详情页与列表页都展示匹配原因 |
| 时间不足时去掉百分比、只留文字 | 展示匹配理由与百分比（文字独立可读） |
| 场景：无参照 / 无重合 | 没有可参照的已发布行程；没有任何重合时给出提示 |
| 场景：默认排序 | 默认按匹配度排序 |
| 边界：总分上限 | 多项命中时总分不超过 100 |

## 残余风险

| 风险 | 影响 | Owner |
|---|---|---|
| 「时间不足时删掉百分比」的降级路径未触发 | 页面始终展示百分比 + 文字；文字本身可独立阅读，符合故事意图 | SA（确认接受） |
| 参照物只取最近一条未结束行程 | 用户有多条行程时，原因可能只对照其中一条 | AO（记入后续优化） |
| 卡片原因文本随标签数量变长 | 标签上限 5，当前可接受 | AO（视觉回归时复核） |

## 结论

- **AC/DoV：通过**（AC 4/4 Pass；DoV 4 Pass + 1 Partial，Partial 项有 owner，无阻塞）。
- **G1-ready：Yes**。