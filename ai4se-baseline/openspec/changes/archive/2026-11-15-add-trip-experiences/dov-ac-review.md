# AC / DoV review — add-trip-experiences

- **Change:** `add-trip-experiences`（capability `trip-experiences`，REQ-004）
- **Reviewed at:** 2026-11-15（+0800）
- **Inputs:** [`proposal.md`](proposal.md)、[`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md)、原型 `docs/prototype/`（`stories.html` S15–S17、`store.js`、`ui.js`、`data.js`）、[`impact-brief.md`](../../../requirement-workspace/impact-brief.md)、[`deep-dive.md`](../../../requirement-workspace/deep-dive.md)
- **裁决基线：** 原型与需求冲突处以原型为准；例外（参考发布的人数必须重填）见 [proposal.md §原型对齐决议](proposal.md#原型对齐决议)。

## Acceptance criteria（AC）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条需求至少一个可测 AC | Pass | 6 Requirement / 14 Scenario | 资格、内容口径、两处展示、参考发布、我的旅行入口与边界均有 Given/When/Then |
| AC-2 AC 可观测 | Pass | 拒绝文案、强度标签、列表排序、表单空值、已分享标记 | 不依赖内部实现细节 |
| AC-3 高风险负向/边界已列出 | Pass | 未结束、未参加、感受 =10/400 边界、建议空/超长、再次提交、无体验空态、无图片 | 服务端拒绝，不只前端隐藏 |
| AC-4 不是伪装的实现细节 | Pass | 无表名、接口路径、类名 | 长度与档位是业务口径，保留在 spec |
| AC-5 与 REQ-004 §4 八条场景对应 | Pass | 见 §需求映射 | 需求 8 条全部落点，另补原型新增边界 |

## Definition of verified（DoV）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与 proposal 一致 | Pass | proposal In/Out 与 spec 六条需求一一对应 | 图片上传、评论、审核后台已排除 |
| DoV-2 歧义已解决 | Pass | 资格含发布者、每人一条可修改、人数必须重填、纯文字 + 内置封面 | 见 proposal 决议表 |
| DoV-3 IO/SA 残余风险已记录 | Partial | 见 §残余风险 | 无阻塞项，均有 owner |
| DoV-4 未声称完成实现 | Pass | 仅规格与评审 | — |
| DoV-5 可追溯到 proposal / REQ-004 | Pass | proposal 引用 REQ-004 与闭环文档 §2.6–2.7 / §5.2.1–5.2.2 / §7 US-06 / §13；原型 S15–S17 | — |

## 需求映射

| REQ-004 场景 | 落点 Requirement | 说明 |
|---|---|---|
| 1 分享资格（已结束且参加过） | 对已结束且参加过的行程发布游后体验 | 发布者与已接受同行者均具备 |
| 2 无资格不可分享 | 同上的三个拒绝 Scenario | 未结束 / 未参加 / 不存在 |
| 3 发布体验内容 | 内容口径与纯文字降级 | 感受、强度、建议三项必填 |
| 4 详情页展示分享 | 原计划详情页展示 | 作者、强度、感受、建议 |
| 5 首页展示分享 | 灵感首页的旅行体验视图 | 视图切换 + 筛选 + 倒序 |
| 6 参考此行程发布（预填） | 参考此行程发布以产生新灵感 | 目的地/途经点/标签 |
| 7 参考发布必填重填 | 同上的必填字段 Scenario | 标题/日期/人数/集合/说明 |
| 8 图片降级 | 内容口径与纯文字降级 | 内置封面，不阻断 |

## 原型 ↔ proposal 裁决记录

| # | 冲突/模糊点 | 裁决 | 落点 |
|---|---|---|---|
| 1 | 感受长度 | 10–400 字（trim 后） | `游后体验的内容口径与纯文字降级` |
| 2 | 建议长度 | 必填，≤120 字 | 同上 |
| 3 | 强度 | 轻松/适中/较累；wire `relaxed/moderate/tiring` | 同上 |
| 4 | 每人条数 | 一条，再次提交即修改 | `对已结束且参加过的行程发布游后体验` |
| 5 | 分享资格是否含发布者 | 含（原型 `isParticipant`） | 同上（发布者 Scenario） |
| 6 | 图片 | 不做上传，内置封面 | `内容口径与纯文字降级` |
| 7 | 首页体验筛选 | 关键词 + 目的地 + 兴趣，发布时间倒序 | `灵感首页的旅行体验视图` |
| 8 | 参考发布人数 | **不沿用**，必须重填（需求 §4.7 优先，原型复制人数记为待修） | `参考此行程发布以产生新灵感` |
| 9 | 我的旅行入口 | 已完成分组显示发表/修改 + 已分享 | `我的旅行分享入口与分享边界` |
| 10 | 分享统计 | 不做个人资料弹窗统计 | Out of scope |

## 残余风险

| 风险 | Owner | 处理 |
|---|---|---|
| 原型复制人数与需求 §4.7 冲突 | Jay | 实现按需求清空；后续同步修原型 |
| 体验内容无审核/举报 | Jay | 本迭代仅记录；后续可复用 `/reports` 扩展 target_type |
| 无图片上传 | Jay | 内置封面；增强项留待后续 |
| 一条体验的编辑时间语义 | Jay | 以最新一次保存时间排序，spec 只要求展示最新内容 |