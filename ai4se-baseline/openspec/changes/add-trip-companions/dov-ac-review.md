# AC / DoV review — add-trip-companions

- **Change:** `add-trip-companions`（capability `trip-companions`，REQ-003）
- **Reviewed at:** 2026-11-15（+0800）
- **Inputs:** [`proposal.md`](proposal.md)、[`specs/trip-companions/spec.md`](specs/trip-companions/spec.md)、原型 `docs/prototype/`（`stories.html` S07–S14、`store.js`）、[`impact-brief.md`](../../../requirement-workspace/impact-brief.md)、[`deep-dive.md`](../../../requirement-workspace/deep-dive.md)
- **裁决基线：** 原型与 proposal 冲突或模糊处，以原型为准（用户 2026-11-15 决定）；明细见 [proposal.md §原型对齐决议](proposal.md#原型对齐决议)。

## Acceptance criteria（AC）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条需求至少一个可测 AC | Pass | 6 Requirement / 22 Scenario | 匹配、申请、处理、退出、聊天、我的旅行与安全均有 Given/When/Then |
| AC-2 AC 可观察 | Pass | 状态文字、人数变化、聊天可见性、回执文案 | 匹配理由要求写出维度，百分比不得唯一 |
| AC-3 高风险负向/边界已列出 | Pass | 申请自己、重复申请、满员/结束申请、非发布者处理、未匹配进入聊天、空白/超长消息、发布者退出、无重合匹配 | 服务端拒绝，不只前端隐藏 |
| AC-4 不是伪装的实现细节 | Pass | 无表名、接口路径、类名 | 计分规则是业务规则，保留在 spec |

## Definition of verified（DoV）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与 proposal 一致 | Pass | proposal In/Out scope 与 spec 六条需求一一对应 | 批量处理、保存筛选、WS/已读等已排除 |
| DoV-2 歧义已解决 | Pass | 匹配参照物、计分、申请说明选填、满员联动、退出规则、聊天只读、我的旅行分组均已落为 Scenario | 匹配度排序与 REQ-002 默认排序的冲突已裁决 |
| DoV-3 IO/SA 残余风险已记录 | Partial | 见 §残余风险 | 无阻塞项，均有 owner |
| DoV-4 未声称完成实现 | Pass | 仅规格与评审 | — |
| DoV-5 可追溯到 proposal / REQ-003 | Pass | proposal 引用 REQ-003 与闭环文档 §2.3–2.5 / §5.1.5–5.1.9；原型 S07–S14 | — |

## 原型 ↔ proposal 裁决记录

| # | 冲突/模糊点 | 裁决 | 落点 |
|---|---|---|---|
| 1 | 匹配计分 | 目的地 50 / 日期 30 / 相差一天 20 / 共同兴趣每项 10 上限 20，总分 ≤100 | `展示可解释的匹配原因` |
| 2 | 匹配参照 | 最近未结束的已发布行程；无则兴趣 + 当前筛选 | 同上 |
| 3 | 无重合展示 | 「暂无重合，可作为新方向的灵感」，不给高百分比 | 同上 |
| 4 | 首页默认排序 | 默认按匹配度，仍可切日期/最新 | 同上 |
| 5 | 申请说明 | 选填，≤120 字 | `提交与取消同行申请` |
| 6 | 重复申请判定 | 已有待处理或已接受即拒绝 | 同上 |
| 7 | 取消申请 | 仅待处理可取消，发布者侧计数同步 | 同上 |
| 8 | 接受联动 | 人数 +1、满员自动、双方聊天权限 | `发布者处理申请并联动人数与状态` |
| 9 | 退出同行 | 二次确认、人数 -1、聊天关闭、可再申请；发布者不可退出 | `退出同行` |
| 10 | 聊天降级 | 采用一对一聊天，手动刷新/短轮询，不做 WebSocket | `匹配后的一对一文字沟通` |
| 11 | 已结束聊天 | 只读 | 同上 |
| 12 | 我的旅行 | 四分区 + 待处理提醒（可分享体验属 REQ-004） | `我的旅行聚合与最低安全能力` |
| 13 | 举报 | 行程/用户为目标，原因 + 说明 ≤200，回执 | 同上 |
| 14 | 批量处理 | 原型有，MVP 不做 | proposal Out of scope |

## 残余风险

| 风险 | 影响 | Owner |
|---|---|---|
| 首页默认排序从「出发日期」改为「匹配度」 | 与已归档 `trip-plans` 的默认行为不同，需在 design 中记录变更 | Jay |
| `joined_count` 跨能力写入 | 必须走 trip-plans 服务方法，禁止 companions 直接改表 | Jay |
| 聊天短轮询间隔与已结束只读 | 轮询间隔待设计确定（建议 5s） | Jay |
| 发起人「退出」提示改用结束行程 | 结束行程已由 REQ-002 提供，文案需一致 | Jay |
| 批量处理与保存筛选未实现 | 原型增强，已列 Out of scope | Jay |

## 结论

- **AC/DoV：通过**（AC 4/4 Pass；DoV 4 Pass + 1 Partial，无阻塞）。
- **G1-ready：Yes**。