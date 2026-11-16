# AC / DoV review — add-trip-publish

- **Change：** `add-trip-publish`（capability `trip-plans` MODIFIED，REQ-002 / S06）
- **Reviewed at：** 2026-11-16（+0800）
- **Inputs：** [`proposal.md`](proposal.md)、[`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、issue #8、原型 `docs/prototype/stories.html` S06、既有实现 `TripPlan` / `TripCreatePage`
- **裁决基线：** issue #8 的验收标准 + P1 阶段记录 [`docs/sdd/add-trip-publish/p1-intent.md`](../../../docs/sdd/add-trip-publish/p1-intent.md) §5 的三项裁定。

## Acceptance criteria（AC）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条需求至少一个可测 AC | Pass | Delta Spec 1 条 Requirement（MODIFIED）/ 11 个 Scenario | 覆盖字段级错误、日期、途经点、人数、后端独立校验、跳转、首页检索、发布者归属、持久化 |
| AC-2 AC 可观察，无「工作良好」类表述 | Pass | 全部 Then 断言可见提示、地址变更、列表命中或 400 响应码 | 不出现类名与表名 |
| AC-3 高风险负向/边界已列出 | Pass | 空表单、结束早于出发、途经点 < 2、`capacity` 为 1 / 13 / 非整数、预算倒置、绕过前端的直连请求 | 边界值来自 `TripCatalogConstant` 与 `TripCreateRequest` |
| AC-4 AC 不是伪装的实现细节 | Pass | 只写业务字段与用户可见结果 | 控件与选择器属 P3 |

## Definition of verified（DoV）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与 proposal 一致 | Pass | `proposal.md` §范围与 Delta Spec 场景一一对应 | 无静默扩张；S17 明确排除 |
| DoV-2 歧义已列出或解决 | Pass | 人数口径（2–12 含发布者）、字段级错误的归属、选点约束三项已在 P1 裁定 | `capacity = 1` 明确判为越界 |
| DoV-3 IO / SA 残余风险已记录 | Partial | 见 §残余风险 | 无阻塞；均为已指定 owner 的后续项 |
| DoV-4 未声称完成业务实现 | Pass | 本文件只评审规格 | 实现证据在 P4 |
| DoV-5 每条需求可追溯 | Pass | 场景 ← Delta Spec ← `proposal.md` §范围 ← REQ-002 / issue #8 | 单 capability |

## 需求 → 场景映射

| 来源（issue #8 AC） | Delta Spec 场景 |
|---|---|
| 必填 6 项、选填可空 | 填写完整必填项后成功发布；选填项可留空 |
| 必填为空不能提交，逐项字段级错误 | 必填项缺失时逐项给出字段级错误 |
| 结束日期早于出发直接阻断 | 日期不合法时拒绝发布 |
| 人数校验（含发布者，≥ 1 位同行者） | 计划人数越界时拒绝发布 |
| 发布成功跳转详情页、首页立刻可搜、发布者身份正确 | 发布成功后跳转详情页；首页立即可检索新发布的行程；发布者身份取自当前身份 |
| 场景：数据重启后仍在 | 发布的数据在重启后仍在 |
| 契约：后端独立校验 | 后端独立校验发布约束 |

## 残余风险

| 风险 | 影响 | Owner |
|---|---|---|
| 业务端点仍以 `X-User-Id` 表达身份 | 演示环境可伪造身份，属 `add-user-auth` 登记的遗留项 | Jay（开发） |
| 端到端套件中其它故事的陈旧选择器 | 不影响 S06 断言，但降低套件可信度 | Jay（开发，随各自 change 处理） |
| 选点控件要求地名在离线库中可解析 | 用户无法发布库外地点；属既有产品约束 | SA（确认保留） |

## 结论

- **AC/DoV：通过**（AC 4/4 Pass；DoV 4 Pass + 1 Partial，Partial 项有 owner，无阻塞）。
- **G1-ready：Yes** —— 可进入 `g1-decision-record`。

## R2 复核（2026-11-16，发布页体验）

P1 §10 的四项反馈落成一条 ADDED Requirement（5 个 Scenario），不改变既有 11 条场景。

| 检查 | 结果 | 证据 |
|---|---|---|
| AC-1 场景可测 | Pass | 日期默认值、面板可见、地图隐藏 / 聚焦、分组间距均可观察 |
| AC-2 可观察 | Pass | 断言可见日期值、面板包围盒在视口内、地图节点是否存在、同组控件宽度差 |
| AC-3 边界 | Pass | 未选目的地、只选到省（无法提交）、日期可改回非法值 |
| DoV-1 范围 | Pass | 只改前端与 e2e；后端与契约无变化 |
| DoV-3 残余风险 | Partial | 见 §残余风险 R2 项（视觉回归靠截图人工确认） |

**R2 AC/DoV：通过**；G1 追加见 `g1-decision.md`。

## R3 复核（2026-11-16，字典全国化后的返工）

同一 Requirement 增加第 6 个 Scenario（未覆盖城市的覆盖说明），并把「选定后聚焦该市」限定为「地名库覆盖的城市」。

| 检查 | 结果 | 证据 |
|---|---|---|
| AC-1 场景可测 | Pass | 断言地图节点数、提示文案是否含「暂无离线点位」且不含「先选目的地」 |
| AC-2 可观察 | Pass | 均可在浏览器与 e2e 观察 |
| AC-3 边界 | Pass | 未选 / 已选未覆盖 / 已选已覆盖三种状态互斥 |
| DoV-1 范围 | Pass | 前端映射 + 后端死代码删除；契约不变 |
| DoV-3 残余风险 | Partial | 全国离线点位仍缺（属 REQ-007 边界） |

**R3 AC/DoV：通过**。