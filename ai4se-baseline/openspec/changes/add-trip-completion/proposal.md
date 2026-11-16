# 变更提案：add-trip-completion

- **触发：** 用户故事 `[P0] S15 结束行程`（迭代 3 ｜ 故事点 1 ｜ 落点：我的旅行）＋ 用户在 `/sdd:p1` 中确认的 OQ-1 ~ OQ-9 决策
- **需求条目：** `requirement-workspace/requirements/REQ-011-trip-completion.md`
- **意图捕获：** `requirement-workspace/intents/REQ-011-trip-completion.md`
- **能力：** `trip-plans`（MODIFIED + ADDED）、`trip-companions`（MODIFIED）
- **规模：** M（状态机扩展 + 跨能力申请善后 + 前端两处入口与提醒；无数据库迁移）
- **规则：** `@rule:api-contract`、`@rule:package-structure`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:sdd-artifacts`
- **基线：** `main`。已完成/归档：`add-trip-plans`、`add-trip-companions`、`add-trip-experiences`、`add-user-auth`、`add-user-profile`、`add-user-profiles`；进行中：`refine-inspiration-home`、`add-destination-area-filters`、`add-match-reason`。
- **归档顺序：** 与 `add-match-reason` 共享 `trip-companions`，若同窗口归档需串行；本 change 不依赖其它未归档 change。

## Why

当前行程只有「招募中 / 已满员 / 已结束」三态，状态由 `completed_at` 与人数推导，完全不看日期。发布者可以在旅行尚未开始时就把行程标记为已结束；「我的旅行」无法区分尚未开始、正在进行与已经结束；待处理申请在结束后会悬挂；首页仍会出现计划结束日期已过的行程。S15 要求把行程生命周期补完整，并让同行成员在结束后自然进入只读聊天与体验分享环节。

## What Changes

- `trip-plans`：行程四态（recruiting / full / ongoing / completed）；日期驱动自动流转（开始日期 → 旅行中；结束日期次日 00:00 → 已结束）；结束操作收紧为「发布者 + 旅行中 + 二次确认 + 终态」；结束后批量取消待处理申请；「行程即将结束」应用内提醒；未结束列表、我的旅行已完成与统计统一为「已结束」口径。
- `trip-companions`：申请资格改为「未结束且未满员」（含旅行中）；满员后新申请拒绝、既有待处理申请保留且可拒绝不可接受；行程结束后待处理申请自动取消、处理入口全部关闭；聊天只读提示包含「该行程已结束」；旅行中退出后状态保持旅行中；我的旅行已完成/已匹配分组按「已结束」口径。
- 契约：`status` 增加 `ongoing`；`/trips/{tripId}/complete` 语义收紧为仅旅行中。
- 前端：状态徽标增加「旅行中」；「结束行程」入口落到我的旅行-我发布的与行程详情，文案由「标记为已结束」改为「结束行程」；二次确认文案说明不可恢复与申请关闭；提醒展示。

## 问题（现状差距）

1. **缺 ONGOING。** `TripStatusEnum` 只有 RECRUITING / FULL / COMPLETED；`TripPlan.status()` 只看 `completedAt` 与 `joinedCount`，开始日期与结束日期不参与判定。
2. **结束权限过宽。** `TripPlanServiceImpl.complete()` 只拒绝 COMPLETED；前端 `isPublisher && !isCompleted` 即显示按钮，招募中/已满员均可被结束，违反「仅旅行中可结束」。
3. **结束无善后。** 结束后待处理申请仍为 PENDING，发布者仍可拒绝；`ApplicationServiceImpl.decide()` 未校验行程状态。
4. **无自动流转与提醒。** 到达开始日期不会进入旅行中，到达结束时刻不会自动完成；没有「距离结束不足 3 小时」的任何提示。
5. **口径不一致。** `TripPlanMapper.xml` 用 `completed_at IS NULL` 作为未结束过滤，日期已过的行程仍在首页；`MyTripsServiceImpl` 与 `UserProfileStatsServiceImpl` 的「已完成」只认 `completed_at`，无法覆盖自动完成。
6. **落点缺失。** 故事落点「我的旅行-我发布的」没有结束入口，只有详情页有；按钮文案为「标记为已结束」。

## 范围

**In scope**

- 四态状态判定与优先级：已结束 > 旅行中 > 已满员 > 招募中。
- 日期驱动流转：开始日期当天 00:00 起为旅行中；结束日期次日 00:00 起为已结束。
- 发布校验：开始日期不得早于今天；开始日期等于今天时发布后即为旅行中。
- 结束行程：仅发布者、仅旅行中、二次确认、手动结束时间、COMPLETED 终态、不可撤销。
- 结束善后：同事务批量把待处理申请置为已取消；已接受同行者保留；聊天历史与体验数据保留。
- 申请规则：旅行中仍可提交与接受；满员后禁止新申请与接受，既有待处理申请可拒绝不可接受；结束后提交/接受/拒绝全部关闭。
- 退出同行：旅行中退出后人数 -1、聊天关闭、状态保持旅行中；未开始的满员行程退出后仍回退招募中。
- 提醒：结束日期 21:00 起至次日 00:00，在我的旅行与行程详情向发布者与已接受同行者展示「行程即将结束」。
- 列表与统计：首页/匹配列表继续包含旅行中，排除已结束（含自动完成）；我的旅行已完成分组与公开资料已完成统计采用同一「已结束」口径。
- 契约：`status` 增加 `ongoing`；complete 的 403/409 语义收紧；错误码保持不变。
- 回归：聊天只读、体验入口资格、同行者列表、我的旅行四分组。

**Out of scope**

- 撤销结束 / 恢复行程；结束后的数据删除或归档清理。
- 推送、短信、邮件、定时任务等外部通知渠道（提醒仅应用内展示）。
- 行程取消能力、改期/改线、签到与实时定位。
- 结束后的评价、评分与信用体系。
- 修改体验内容结构或统计接口形状。

## 关键决策（摘要）

| # | 决策 | 结论 |
|---|---|---|
| D1 | 计划结束时刻 | 结束日期次日 00:00；结束日期当天仍为旅行中 |
| D2 | 提醒窗口 | 结束日期 21:00 起至次日 00:00，距结束不足 3 小时 |
| D3 | 提醒落点与接收者 | 我的旅行 + 行程详情；发布者与已接受同行者；无 push |
| D4 | 结束入口 | 我的旅行-我发布的 ONGOING 卡片 + 行程详情；文案统一「结束行程」 |
| D5 | 结束后待处理申请 | 系统自动取消（PENDING → CANCELLED）；接受与拒绝全部关闭 |
| D6 | 旅行中申请 | 仍可提交与接受；满员后状态仍为旅行中；满员后仅可拒绝既有待处理申请 |
| D7 | 过去日期 | 禁止发布开始日期早于今天的行程 |
| D8 | 首页展示 | 旅行中继续出现在未结束列表并可申请；已结束（含自动完成）不出现 |
| D9 | 自动完成物化 | 规格只约束可观察结果；是否写入 `completed_at`、批量取消触发时机由 P3 设计决定（deferred） |

## 影响面

| 位置 | 改动 |
|---|---|
| `openspec/specs/trip-plans/spec.md` | 归档时以本 change 的 delta 覆盖「浏览未结束的旅行计划」「发布可被他人理解的旅行计划」「查看行程详情与清晰的状态」「发布者结束自己的行程」，并新增「行程四态与日期驱动的状态流转」「行程即将结束提醒」「已结束口径的统一消费」 |
| `openspec/specs/trip-companions/spec.md` | 归档时替换「提交与取消同行申请」「发布者处理申请并联动人数与状态」「匹配后的一对一文字沟通」「退出同行」「我的旅行聚合与最低安全能力」 |
| `RouteME/backend/.../pojo/TripPlan.java`、`enums/TripStatusEnum.java` | 四态推导与日期边界 |
| `RouteME/backend/.../service/impl/TripPlanServiceImpl.java` | 结束校验、发布校验、批量取消待处理申请 |
| `RouteME/backend/.../service/impl/ApplicationServiceImpl.java` | 申请/接受/拒绝的状态资格 |
| `RouteME/backend/.../service/impl/MyTripsServiceImpl.java`、`UserProfileStatsServiceImpl.java` | 已完成口径含自动完成 |
| `RouteME/backend/.../mapper/TripPlanMapper.xml` | 未结束过滤排除到期自动完成 |
| `RouteME/frontend/src/mine/MyTripsPage.tsx` | 已完成分组含自动完成，旅行中归入已匹配/我发布的 |
| `RouteME/frontend/src/trips/TripDetailPage.tsx`、`mine/MyTripsPage.tsx`、`TripCard.tsx`、`tripStatus.ts`、`StatusBadge.tsx`、`i18n/tripMessages.ts` | 四态徽标、结束入口、二次确认、提醒 |
| `RouteME/frontend/src/applications/`（申请处理页） | 满员禁用接受、结束只读 |
| `RouteME/frontend/src/chat/ChatPage.tsx` | 只读提示含「该行程已结束」 |
| `openapi.yaml` | `status` 增加 `ongoing`；complete 描述收紧 |
| 测试 | 四态与日期边界、结束权限、批量取消、申请分支、列表/统计口径、E2E 入口与提醒 |

## 需求与证据

- **上游依赖：** 无新增上游 change；四态只依赖现有 `trip_plans` 日期与人数字段，不新增迁移。
- **下游消费：** `trip-experiences` 与 `user-profiles` 只读消费「已结束」判定；接口形状不变，但统计/分享口径随四态生效（回归 + 已结束口径 delta）。
- 故事来源：`[P0] S15 结束行程`（迭代 3，1 点，落点：我的旅行）。
- 现状证据：`TripPlan.java`（三态推导）、`TripPlanServiceImpl.complete()`（仅校验非 COMPLETED）、`TripDetailPage.tsx`（`isPublisher && !isCompleted`）、`MyTripsPage.tsx`（无结束入口）、`ApplicationServiceImpl.decide()`（未校验行程状态）、`TripPlanMapper.xml`（`completed_at IS NULL`）。
- 已具备能力：`ChatServiceImpl` 的 `CHAT_READ_ONLY`、`ExperienceServiceImpl` 的分享资格、`MyTripsServiceImpl` 四分组。
- 用户裁决：OQ-1 ~ OQ-9 全部 resolved，见 Ready 条目 §8。

## Effort / size

- **相对规模：** M。状态推导与契约较小；主要成本在跨能力申请善后、前端两处入口与提醒、以及既有测试口径更新。
- **建议实施顺序：** ① 四态推导 + 契约 → ② 结束权限与批量取消 → ③ 申请资格/处理分支 → ④ 前端徽标/入口/确认/提醒 → ⑤ 列表与统计口径 + 回归。

## Spec ID

`add-trip-completion`，业务增量规格见 `specs/trip-plans/spec.md` 与 `specs/trip-companions/spec.md`。
