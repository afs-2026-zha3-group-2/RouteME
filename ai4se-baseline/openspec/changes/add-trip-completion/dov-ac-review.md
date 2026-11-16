# Delta Spec AC / DoV review — add-trip-completion

- **Change：** `add-trip-completion`（REQ-011 / S15）
- **评审日期：** 2026-11-16 ｜ **评审人：** `/sdd:delta-craft`（agent）；G1 待 IO / SA 签署
- **输入：** `openspec/changes/add-trip-completion/specs/trip-plans/spec.md`、`specs/trip-companions/spec.md`、`proposal.md`、`requirement-workspace/requirements/REQ-011-trip-completion.md`
- **校验：** `openspec validate add-trip-completion --strict` → valid

## Acceptance criteria（AC）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每个 Requirement 至少一个可测试 AC | Pass | `trip-plans` MODIFIED 4 + ADDED 3；`trip-companions` MODIFIED 5；每个 Requirement 2–10 个场景 | 场景均可直接转为 E2E / API 断言 |
| AC-2 AC 可观察、无模糊措辞 | Pass | 状态文字四态、入口可见性、二次确认、申请状态（待处理→已取消）、错误码 403 / 409 / `CHAT_READ_ONLY` | 未出现「合理」「快速」等不可判定词 |
| AC-3 高风险负向 / 边界已列出 | Pass | 非发布者、非旅行中、取消确认、过去日期、满员后、结束日期当天、提醒窗口外、无资格体验 | 越权与状态边界均成对出现 |
| AC-4 AC 不是伪装的实现细节 | Pass | 场景以业务状态与用户可见结果表达；仅使用契约错误码作为对外可观察行为 | 未出现类 / 方法 / 表结构要求 |

## Definition of verified（DoV）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与提案一致，无静默扩张 | Pass | proposal In scope 10 项 ↔ delta：四态、自动流转、发布校验、结束、善后、申请、退出、提醒、列表/统计、契约、回归 | 无超出提案的新能力 |
| DoV-2 歧义已列出或解决 | Pass | Ready 条目 7 条 blocking OQ 全 `resolved`；D9 / OQ-10 / OQ-11 为技术时机，deferred 且有 owner | 无未解决业务歧义 |
| DoV-3 角色关注点已记录 | Pass | 见下方 Residual concerns：SA 双 capability 例外；IO 统计口径 | 不阻塞 G1，但归档前需追认 |
| DoV-4 未声称已实现业务代码 | Pass | 本轮仅 delta / 评审 / lint，未改 `RouteME/` 业务代码 | — |
| DoV-5 每条需求可追溯到提案 / 已批准需求 | Pass | 见下方 Traceability；S15-26 由新增「已结束口径」+ `trip-companions`「我的旅行聚合」承接；S15-20~22 由 `trip-experiences` 既有 Requirement 承接（回归） | 无孤儿 Requirement |

## Traceability（S15 验收 → Delta）

| S15 AC | Delta / Living Spec home |
|---|---|
| S15-1 ~ S15-5 四态与自动流转 | `trip-plans` ADDED「行程四态与日期驱动的状态流转」 |
| S15-6 过去日期拒绝 | `trip-plans` MODIFIED「发布可被他人理解的旅行计划」 |
| S15-7 ~ S15-9 结束入口可见性 | `trip-plans` MODIFIED「查看行程详情与清晰的状态」+「发布者结束自己的行程」 |
| S15-10 ~ S15-11 二次确认 / 取消 | `trip-plans` MODIFIED「发布者结束自己的行程」 |
| S15-12 ~ S15-13 状态迁移 / 终态 | `trip-plans` MODIFIED「发布者结束自己的行程」 |
| S15-14 申请入口关闭 | `trip-plans` MODIFIED「发布者结束自己的行程」+ `trip-companions` MODIFIED「提交与取消同行申请」 |
| S15-15 ~ S15-16 自动取消 / 处理关闭 | `trip-plans` / `trip-companions` 同上 +「发布者处理申请并联动人数与状态」 |
| S15-17 同行者保留 | `trip-plans` MODIFIED「发布者结束自己的行程」 |
| S15-18 ~ S15-19 聊天只读 / 历史会话 | `trip-companions` MODIFIED「匹配后的一对一文字沟通」 |
| S15-20 ~ S15-22 体验入口 | `trip-experiences` Living Spec 既有「对已结束且参加过的行程发布游后体验」（无 delta；P4 回归） |
| S15-23 ~ S15-24 提醒 | `trip-plans` ADDED「行程即将结束提醒」 |
| S15-25 首页未结束列表 | `trip-plans` MODIFIED「浏览未结束的旅行计划」 |
| S15-26 我的旅行 / 统计口径 | `trip-plans` ADDED「已结束口径的统一消费」+ `trip-companions` MODIFIED「我的旅行聚合与最低安全能力」 |

## Residual concerns（IO / SA）

1. **双 capability 例外：** 本 change 同时修改 `trip-plans` 与 `trip-companions`，归档前需 SA 具名追认（参照 REQ-005 / REQ-007 / REQ-008 先例）。
2. **自动完成物化时机：** 纯推导还是懒写入 `completed_at` 与批量取消触发，属 P3 设计（D9）；规格只约束可观察结果。
3. **提醒去重：** MVP 不持久化已读状态（OQ-10），每次进入页面展示。
4. **只读消费方：** `trip-experiences` 与 `user-profiles` 不新增 delta；P4 必须以回归用例证明自动完成同样开放体验入口、统计口径一致。
5. **契约版本：** `status` 新增 `ongoing` 后需在 P3/P4 确定契约版本号并同步 `OpenApiTest`。

## 结论

- **AC：4/4 Pass；DoV：5/5 Pass。**
- 无 blocking gap，Delta Spec 可进入 G1 评审（G1 决策不由本评审代签）。

## 补记（2026-11-16，G1 后）

- 按 IO 提问补充「前端状态过期时以服务端判定为准」（`trip-plans` 四态）与「页面停留过期后申请被拒绝」（`trip-companions` 提交申请）两个边界场景。
- AC-3（高风险边界）覆盖增强；AC-1/2/4 与 DoV-1~5 结论不变。
- `openspec validate add-trip-completion --strict` 仍 valid。
